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

export interface OpenAIServiceConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  tools?: OpenAIFunctionDefinition[];
}

export class OpenAIChatService implements IChatService<OpenAIServiceConfig> {
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
        const errorData = await response.json();
        const message = errorData?.error?.message || JSON.stringify(errorData);
        throw new Error(`API error (${response.status}): ${message}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to get response reader for OpenAI stream.");
      
      const decoder = new TextDecoder('utf-8');
      while (true) {
        if (signal?.aborted) {
          throw new AppError('CANCELLED', 'Request was cancelled by the user.');
        }
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') return;
            try {
              const json = JSON.parse(data);
              const content = json.choices[0].delta.content;
              if (content) onChunk(content);
            } catch (e) {
              console.warn("Could not parse OpenAI stream chunk:", e, data);
            }
          }
        }
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
          const errorData = await response.json();
          const message = errorData?.error?.message || JSON.stringify(errorData);
          throw new Error(`API error (${response.status}): ${message}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const message = choice?.message;

        if (!choice || !message) {
          onChunk('OpenAI returned an empty response.');
          break;
        }

        let textChunk = '';
        if (typeof message.content === 'string') {
          textChunk = message.content;
        } else if (Array.isArray(message.content)) {
          textChunk = message.content
            .map((part: { type?: string; text?: string }) => (part?.type === 'text' ? part.text ?? '' : ''))
            .join('');
        }

        if (textChunk) {
          onChunk(textChunk);
        }

        const assistantMessage = {
          role: 'assistant' as const,
          content: typeof message.content === 'string' ? message.content : '',
          tool_calls: message.tool_calls,
        };
        messages.push(assistantMessage);

        const toolCalls = message.tool_calls ?? [];
        if (toolCalls.length === 0) {
          break;
        }

        const toolCallPayloads = toolCalls.map((toolCall: OpenAIToolCall) => {
          const toolName = toolCall.function?.name ?? 'unknown_tool';
          const argsString = toolCall.function?.arguments ?? '{}';
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(argsString || '{}');
          } catch (error) {
            parsedArgs = {};
          }

          const toolCallId = toolCall.id ?? `${toolName}-${Date.now()}`;

          if (onToolCall) {
            onToolCall({
              id: toolCallId,
              name: toolName,
              status: 'calling',
              parameters: parsedArgs,
              timestamp: Date.now(),
            });
          }

          return { toolName, parsedArgs, toolCallId };
        });

        const toolResults = await Promise.all(
          toolCallPayloads.map(async ({ toolName, parsedArgs, toolCallId }: { toolName: string; parsedArgs: Record<string, unknown>; toolCallId: string }) => {
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
            content: JSON.stringify({
              success: result.success,
              data: result.data ?? null,
              error: result.error ?? null,
            }),
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
