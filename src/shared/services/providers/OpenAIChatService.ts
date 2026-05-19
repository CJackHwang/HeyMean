import { Message, MessageSender, ToolCall } from '@shared/types';
import { getTextFromDataUrl } from '@shared/lib/fileHelpers';
import { AppError, handleError } from '../errorHandler';
import { executeTool } from '../toolService';
import { OpenAIFunctionDefinition } from '../toolService';
import { IChatService } from './types';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIMessageContentPart[];
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

export type OpenAITextContentPart = { type: 'text'; text: string };
export type OpenAIImageContentPart = { type: 'image_url'; image_url: { url: string } };
export type OpenAIMessageContentPart = OpenAITextContentPart | OpenAIImageContentPart;

export type OpenAIToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};



const ERROR_BODY_SNIPPET_MAX_LENGTH = 500;

const safeReadErrorBody = async (response: Response): Promise<string> => {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  let rawBody = '';

  if (contentType.includes('application/json')) {
    try {
      const jsonBody = await response.json();
      rawBody = jsonBody?.error?.message || jsonBody?.message || JSON.stringify(jsonBody);
    } catch {
      rawBody = await response.text();
    }
  } else {
    rawBody = await response.text();
  }

  const trimmedBody = rawBody.trim();
  if (!trimmedBody) {
    return response.statusText || `HTTP ${response.status}`;
  }

  return trimmedBody;
};

const buildApiErrorMessage = (response: Response, normalizedMessage: string): string =>
  `API error (${response.status}): ${normalizedMessage}`;

export interface OpenAIServiceConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  tools?: OpenAIFunctionDefinition[];
  toolResultSerialization?: 'json' | 'text';
}

type ToolCallSchemaValidation = {
  toolName: string;
  toolCallId: string;
  parsedArgs: Record<string, unknown>;
  parseError?: string;
  rawArgumentsSnippet?: string;
};

export class OpenAIChatService implements IChatService<OpenAIServiceConfig> {
  private normalizeAssistantMessage(message: unknown): OpenAIMessage {
    const msg = (message ?? {}) as Record<string, unknown>;
    const rawContent = msg.content;
    const normalizedContent: string | OpenAIMessageContentPart[] = typeof rawContent === 'string' || Array.isArray(rawContent)
      ? (rawContent as string | OpenAIMessageContentPart[])
      : '';

    return {
      role: 'assistant',
      content: normalizedContent,
      tool_calls: Array.isArray(msg.tool_calls) ? (msg.tool_calls as OpenAIToolCall[]) : undefined,
      name: typeof msg.name === 'string' ? msg.name : undefined,
    };
  }

  private toDisplayText(content: string | OpenAIMessageContentPart[]): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
      .map((part: { type?: string; text?: string }) => (part?.type === 'text' ? part.text ?? '' : ''))
      .join('');
  }

  private validateToolCallSchema(toolCall: OpenAIToolCall): ToolCallSchemaValidation {
    const toolName = typeof toolCall.function?.name === 'string' && toolCall.function.name.trim() ? toolCall.function.name : 'unknown_tool';
    const argsString = typeof toolCall.function?.arguments === 'string' ? toolCall.function.arguments : '{}';
    const toolCallId = toolCall.id ?? `${toolName}-${Date.now()}`;

    let parsedArgs: Record<string, unknown> = {};
    let parseError: string | undefined;
    let rawArgumentsSnippet: string | undefined;

    try {
      const parsed = JSON.parse(argsString || '{}');
      parsedArgs = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        parseError = 'Tool arguments must be a JSON object.';
      }
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Failed to parse tool arguments as JSON.';
      rawArgumentsSnippet = argsString.slice(0, 500);
    }

    return { toolName, toolCallId, parsedArgs, parseError, rawArgumentsSnippet };
  }

  private serializeToolResult(
    result: { success: boolean; data?: unknown; error?: string },
    strategy: OpenAIServiceConfig['toolResultSerialization'] = 'json'
  ): string {
    if (strategy === 'text') {
      if (!result.success) {
        return `success: false\nerror: ${result.error ?? 'Unknown error'}`;
      }
      if (typeof result.data === 'string') return result.data;
      return `success: true\ndata: ${JSON.stringify(result.data ?? null)}`;
    }

    return JSON.stringify({
      success: result.success,
      data: result.data ?? null,
      error: result.error ?? null,
    });
  }
  private async messagesToOpenAIChatFormat(messages: Message[], systemInstruction: string): Promise<OpenAIMessage[]> {
    const openAIMessages: OpenAIMessage[] = [];
    if (systemInstruction) {
      openAIMessages.push({ role: 'system', content: systemInstruction });
    }

    for (const msg of messages) {
      const role = msg.sender === MessageSender.USER ? 'user' : 'assistant';
      if (role === 'assistant') {
        openAIMessages.push({ role, content: msg.text || '' });
        continue;
      }

      const contentParts: OpenAIMessageContentPart[] = [];
      let fileTextContent = '';

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.type === 'application/pdf') {
            throw new AppError('UNSUPPORTED_ATTACHMENT', 'PDF attachments are not supported for OpenAI-compatible providers. Please switch to Gemini to analyze PDFs.');
          }
          if (att.type.startsWith('image/')) {
            contentParts.push({ type: 'image_url', image_url: { url: att.data } });
          } else if (att.type.startsWith('text/')) {
            const text = await getTextFromDataUrl(att.data);
            const MAX_TEXT_ATTACHMENT_CHARS = 4000;
            let summary = text;
            if (text.length > MAX_TEXT_ATTACHMENT_CHARS) {
              summary = text.slice(0, MAX_TEXT_ATTACHMENT_CHARS) + '\n... [truncated]';
            }
            fileTextContent += `\n\n--- Attachment summary: ${att.name} ---\n${summary}`;
          } else {
            fileTextContent += `\n\n[Attachment ${att.name} (${att.type}) omitted. Unsupported type for OpenAI]`;
          }
        }
      }
      
      const finalUserText = (msg.text || '') + fileTextContent;
      contentParts.unshift({ type: 'text', text: finalUserText });

      const hasImages = contentParts.some(p => p.type === 'image_url');
      const content: string | OpenAIMessageContentPart[] = hasImages ? contentParts : finalUserText;
      openAIMessages.push({ role, content });
    }
    return openAIMessages;
  }

  async stream(chatHistory: Message[], newMessage: Message, systemInstruction: string, config: OpenAIServiceConfig, onChunk: (text: string) => void, signal?: AbortSignal, onToolCall?: (toolCall: ToolCall) => void): Promise<void> {
    if (config.tools && config.tools.length > 0) {
      await this.streamWithTools(chatHistory, newMessage, systemInstruction, config, onChunk, signal, onToolCall);
      return;
    }

    const openaiEndpoint = `${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    const messages = await this.messagesToOpenAIChatFormat([...chatHistory, newMessage], systemInstruction);
    const model = config.model || 'gpt-4o';

    try {
      if (model.includes('veo')) {
        throw new AppError("CONFIG_ERROR", "Configuration Error: Video generation models are not supported in chat. Please select a text-based model in settings.");
      }

      const response = await fetch(openaiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
      });

      if (!response.ok) {
        if (response.status === 404 && config.baseUrl.includes('googleapis.com')) {
          throw new AppError("CONFIG_ERROR", "Configuration Error: It looks like you've set a Google API endpoint for the OpenAI provider. Please switch to the 'Google Gemini' provider in Settings to use Google models.");
        }
        const normalizedMessage = await safeReadErrorBody(response);
        console.debug('[OpenAIChatService] API error body snippet:', normalizedMessage.slice(0, ERROR_BODY_SNIPPET_MAX_LENGTH));
        throw new Error(buildApiErrorMessage(response, normalizedMessage));
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to get response reader for OpenAI stream.");
      
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processSSEEvent = (eventRaw: string): boolean => {
        const dataLines = eventRaw
          .split(/\r?\n/)
          .map(line => line.trimEnd())
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trimStart());

        if (dataLines.length === 0) return false;
        const data = dataLines.join('\n');

        if (data === '[DONE]') {
          return true;
        }

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (error) {
          console.warn('Failed to parse OpenAI SSE event', {
            provider: 'openai',
            model,
            endpoint: openaiEndpoint,
            error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
            rawEvent: eventRaw,
            parsedData: data,
          });
        }

        return false;
      };

      while (true) {
        if (signal?.aborted) {
          throw new AppError('CANCELLED', 'Request was cancelled by the user.');
        }
        const { value, done } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';

        for (const eventRaw of events) {
          const shouldStop = processSSEEvent(eventRaw);
          if (shouldStop) return;
        }
      }

      if (buffer.trim()) {
        processSSEEvent(buffer);
      }
    } catch (error) {
      const appError = handleError(error, 'api', { provider: 'openai', model, endpoint: openaiEndpoint });
      if (appError.code === 'CANCELLED') return;
      onChunk(appError.userMessage);
    }
  }

  private async streamWithTools(
    chatHistory: Message[],
    newMessage: Message,
    systemInstruction: string,
    config: OpenAIServiceConfig,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
    onToolCall?: (toolCall: ToolCall) => void
  ): Promise<void> {
    const openaiEndpoint = `${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    const model = config.model || 'gpt-4o';
    const tools = config.tools ?? [];
    const MAX_TOOL_ITERATIONS = 10;

    let messages = await this.messagesToOpenAIChatFormat([...chatHistory, newMessage], systemInstruction);

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      if (signal?.aborted) {
        throw new AppError('CANCELLED', 'Request was cancelled by the user.');
      }

      try {
        const response = await fetch(openaiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model,
            messages,
            tools,
            tool_choice: 'auto',
          }),
          signal,
        });

        if (!response.ok) {
          if (response.status === 404 && config.baseUrl.includes('googleapis.com')) {
            throw new AppError("CONFIG_ERROR", "Configuration Error: It looks like you've set a Google API endpoint for the OpenAI provider. Please switch to the 'Google Gemini' provider in Settings to use Google models.");
          }
          const normalizedMessage = await safeReadErrorBody(response);
          console.debug('[OpenAIChatService] API error body snippet:', normalizedMessage.slice(0, ERROR_BODY_SNIPPET_MAX_LENGTH));
          throw new Error(buildApiErrorMessage(response, normalizedMessage));
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const message = this.normalizeAssistantMessage(choice?.message);

        if (!choice) {
          onChunk('OpenAI returned an empty response.');
          break;
        }

        const textChunk = this.toDisplayText(message.content);

        if (textChunk) {
          onChunk(textChunk);
        }

        messages.push(message);

        const toolCalls = message.tool_calls ?? [];
        if (toolCalls.length === 0) {
          break;
        }

        const toolCallPayloads = toolCalls.map((toolCall: OpenAIToolCall) => {
          const validation = this.validateToolCallSchema(toolCall);

          if (onToolCall) {
            onToolCall({
              id: validation.toolCallId,
              name: validation.toolName,
              status: validation.parseError ? 'error' : 'calling',
              parameters: {
                ...validation.parsedArgs,
                _schemaValidation: validation.parseError
                  ? { error: validation.parseError, rawArgumentsSnippet: validation.rawArgumentsSnippet }
                  : { ok: true },
              },
              timestamp: Date.now(),
            });
          }

          return validation;
        });

        const toolResults = await Promise.all(
          toolCallPayloads.map(async ({ toolName, parsedArgs, toolCallId }: ToolCallSchemaValidation) => {
            if (signal?.aborted) {
              throw new AppError('CANCELLED', 'Request was cancelled by the user.');
            }

            const result = await executeTool({
              name: toolName,
              parameters: parsedArgs,
            });

            if (onToolCall) {
              onToolCall({
                id: toolCallId,
                name: toolName,
                status: result.success ? 'success' : 'error',
                parameters: parsedArgs,
                result: result,
                timestamp: Date.now(),
              });
            }

            return { toolCallId, result };
          })
        );

        for (const { toolCallId, result } of toolResults) {
          const toolMessage: OpenAIMessage = {
            role: 'tool',
            content: this.serializeToolResult(result, config.toolResultSerialization),
            tool_call_id: toolCallId,
          };
          messages.push(toolMessage);
        }
      } catch (error) {
        const appError = handleError(error, 'api', { provider: 'openai', model, endpoint: openaiEndpoint });
        if (appError.code === 'CANCELLED') return;
        onChunk(appError.userMessage);
        break;
      }
    }
  }
}
