
import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, MessageSender, ApiProvider } from '@shared/types';
import { getTextFromDataUrl, getInlineDataFromDataUrl } from "@shared/lib/fileHelpers";
import { AppError, handleError } from "./errorHandler";
import type { ToolDefinition } from '@ai/tools/types';
import { toGeminiTools, toOpenAITools } from '@ai/tools/adapters';
import { defaultToolRegistry, createToolContext, ToolRegistry } from '@ai/tools/registry';

// --- HELPER FUNCTIONS ---

// Represents a single part in an OpenAI multimodal message.
type OpenAITextContentPart = { type: 'text'; text: string; };
type OpenAIImageContentPart = { type: 'image_url'; image_url: { url: string; }; };
type OpenAIMessageContentPart = OpenAITextContentPart | OpenAIImageContentPart;

type OpenAIMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | OpenAIMessageContentPart[];
    name?: string;
    tool_call_id?: string;
};


// --- SERVICE INTERFACE AND IMPLEMENTATIONS (STRATEGY PATTERN) ---

interface GeminiServiceConfig {
    apiKey: string;
    model: string;
}

interface OpenAIServiceConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
}

interface IChatService<T> {
    stream(
        chatHistory: Message[],
        newMessage: Message,
        systemInstruction: string,
        config: T,
        onChunk: (text: string) => void,
        signal?: AbortSignal,
        tools?: ToolDefinition[],
        toolRegistry?: ToolRegistry
    ): Promise<void>;
}

class GeminiChatService implements IChatService<GeminiServiceConfig> {
    private messageToContent(msg: Message): Content {
        const parts: Part[] = [];
        if (msg.text && msg.text.trim() !== '') {
            parts.push({ text: msg.text });
        }
        if (msg.attachments) {
            for (const att of msg.attachments) {
                try {
                    const { base64Data, mimeType } = getInlineDataFromDataUrl(att.data, att.type);
                    parts.push({ inlineData: { data: base64Data, mimeType } });
                } catch (e) {
                    console.error("Error processing attachment for Gemini:", e);
                }
            }
        }
        if (parts.length === 0) {
            parts.push({ text: '' });
        }
        return { role: msg.sender === MessageSender.USER ? 'user' : 'model', parts };
    }

    async stream(chatHistory: Message[], newMessage: Message, systemInstruction: string, config: GeminiServiceConfig, onChunk: (text: string) => void, signal?: AbortSignal, tools?: ToolDefinition[], toolRegistry?: ToolRegistry): Promise<void> {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const model = config.model || 'gemini-2.5-flash';
        
        const history: Content[] = chatHistory.map(this.messageToContent);
        const newContent = this.messageToContent(newMessage);
        let contents: Content[] = [...history, newContent];

        try {
            // Convert tools if provided
            const geminiTools = tools && tools.length > 0 ? toGeminiTools(tools) : undefined;
            const registry = toolRegistry || defaultToolRegistry;

            // Function calling loop - may need multiple iterations
            let maxIterations = 5;
            let iteration = 0;

            while (iteration < maxIterations) {
                iteration++;

                const response = await ai.models.generateContentStream({
                    model: model,
                    contents: contents,
                    config: {
                        systemInstruction,
                        thinkingConfig: { thinkingBudget: 8192 },
                        tools: geminiTools,
                    }
                });

                let hasFunctionCalls = false;
                const functionCalls: any[] = [];

                for await (const chunk of response) {
                    if (signal?.aborted) {
                        throw new AppError('CANCELLED', 'Request was cancelled by the user.');
                    }
                    
                    // Check for function calls
                    if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                        hasFunctionCalls = true;
                        functionCalls.push(...chunk.functionCalls);
                    }

                    // Output text chunks
                    if (chunk.text) {
                        onChunk(chunk.text);
                    }
                }

                // If no function calls, we're done
                if (!hasFunctionCalls || functionCalls.length === 0) {
                    break;
                }

                // Execute function calls
                const functionResponseParts: Part[] = [];
                for (const fnCall of functionCalls) {
                    const toolName = fnCall.name;
                    const toolArgs = fnCall.args || {};
                    
                    const context = createToolContext();
                    const result = await registry.execute(toolName, toolArgs, context);

                    functionResponseParts.push({
                        functionResponse: {
                            name: toolName,
                            response: result.success ? result.data : { error: result.error },
                        }
                    });
                }

                // Add model response (with function calls) and function responses to history
                contents.push({
                    role: 'model',
                    parts: functionCalls.map(fc => ({ functionCall: fc }))
                });
                contents.push({
                    role: 'user',
                    parts: functionResponseParts
                });
            }
        } catch (error) {
            const appError = handleError(error, 'api', { provider: 'gemini', model, endpoint: 'google-genai' });
            if (appError.code === 'CANCELLED') return;
            onChunk(appError.userMessage);
        }
    }
}

class OpenAIChatService implements IChatService<OpenAIServiceConfig> {
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
                        // For unknown types on OpenAI, ignore (don't break)
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

    async stream(chatHistory: Message[], newMessage: Message, systemInstruction: string, config: OpenAIServiceConfig, onChunk: (text: string) => void, signal?: AbortSignal, tools?: ToolDefinition[], toolRegistry?: ToolRegistry): Promise<void> {
        const openaiEndpoint = `${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
        let messages = await this.messagesToOpenAIChatFormat([...chatHistory, newMessage], systemInstruction);
        const model = config.model || 'gpt-4o';
        const registry = toolRegistry || defaultToolRegistry;
        const openAITools = tools && tools.length > 0 ? toOpenAITools(tools) : undefined;

        try {
            if (model.includes('veo')) {
                throw new AppError("CONFIG_ERROR", "Configuration Error: Video generation models are not supported in chat. Please select a text-based model in settings.");
            }

            let iteration = 0;
            const maxIterations = 6;

            while (iteration < maxIterations) {
                iteration++;

                if (signal?.aborted) {
                    throw new AppError('CANCELLED', 'Request was cancelled by the user.');
                }

                const payload: Record<string, any> = {
                    model,
                    messages,
                    stream: false,
                    temperature: 0.7,
                };

                if (openAITools) {
                    payload.tools = openAITools;
                    payload.tool_choice = 'auto';
                }

                const response = await fetch(openaiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                    body: JSON.stringify(payload),
                    signal,
                });

                if (!response.ok) {
                    if (response.status === 404 && config.baseUrl.includes('googleapis.com')) {
                        throw new AppError("CONFIG_ERROR", "Configuration Error: It looks like you've set a Google API endpoint for the OpenAI provider. Please switch to the 'Google Gemini' provider in Settings to use Google models.");
                    }
                    const errorData = await response.json().catch(() => undefined);
                    const message = errorData?.error?.message || JSON.stringify(errorData) || response.statusText;
                    throw new Error(`API error (${response.status}): ${message}`);
                }

                const completion = await response.json();
                const choice = completion?.choices?.[0];
                const finishReason: string | undefined = choice?.finish_reason;
                const assistantMessage = choice?.message;

                if (!assistantMessage) {
                    onChunk('[Error: Empty assistant response]');
                    break;
                }

                // Handle tool calls
                const toolCalls = assistantMessage.tool_calls || [];
                if (toolCalls.length > 0 && finishReason === 'tool_calls') {
                    messages = [...messages, assistantMessage];

                    for (const toolCall of toolCalls) {
                        const toolName = toolCall.function?.name;
                        if (!toolName) continue;

                        let parsedArgs: Record<string, any> = {};
                        try {
                            parsedArgs = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
                        } catch (e) {
                            parsedArgs = {};
                        }

                        const context = createToolContext();
                        const result = await registry.execute(toolName, parsedArgs, context);

                        const toolContent = JSON.stringify(result.success ? result : { success: false, error: result.error });

                        messages = [
                            ...messages,
                            {
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                name: toolName,
                                content: toolContent,
                            },
                        ];
                    }

                    continue;
                }

                // Handle refusal or content
                let textContent = '';
                if (typeof assistantMessage.content === 'string') {
                    textContent = assistantMessage.content;
                } else if (Array.isArray(assistantMessage.content)) {
                    textContent = assistantMessage.content
                        .map((part: any) => {
                            if (typeof part === 'string') return part;
                            if (part?.type === 'text') return part.text || '';
                            return '';
                        })
                        .join('');
                }

                if (assistantMessage.refusal?.length) {
                    textContent += `\n\n[Refusal]: ${assistantMessage.refusal.join('\n')}`;
                }

                if (textContent.trim().length === 0) {
                    textContent = '[No content returned]';
                }

                onChunk(textContent);
                break;
            }
        } catch (error) {
            const appError = handleError(error, 'api', { provider: 'openai', model, endpoint: openaiEndpoint });
            if (appError.code === 'CANCELLED') return;
            onChunk(appError.userMessage);
        }
    }
}

const apiServices = {
    [ApiProvider.GEMINI]: new GeminiChatService(),
    [ApiProvider.OPENAI]: new OpenAIChatService(),
};

// --- DISPATCHER FUNCTION ---

export interface StreamChatConfig {
  systemInstruction: string;
  provider: ApiProvider;
  geminiApiKey: string;
  geminiModel: string;
  openAiApiKey: string;
  openAiModel: string;
  openAiBaseUrl: string;
  tools?: ToolDefinition[];
  toolRegistry?: ToolRegistry;
}

export const streamChatResponse = async (
  chatHistory: Message[],
  newMessage: Message,
  config: StreamChatConfig,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  retryTimes: number = 0
): Promise<string> => {
    const { systemInstruction, provider: selectedApiProvider, geminiApiKey, geminiModel, openAiApiKey, openAiModel, openAiBaseUrl, tools, toolRegistry } = config;

    let fullText = '';
    const accumulatingOnChunk = (chunk: string) => {
        fullText += chunk;
        onChunk(chunk);
    };

    try {
        const registry = toolRegistry || defaultToolRegistry;
        const activeTools = tools && tools.length > 0 ? tools : registry.getAllDefinitions();

        if (selectedApiProvider === ApiProvider.GEMINI) {
            const service = apiServices[ApiProvider.GEMINI];
            const effectiveGeminiKey = geminiApiKey;
            if (!effectiveGeminiKey) {
                throw new AppError("CONFIG_ERROR", "Error: Gemini API key is not configured. Please add it in settings.");
            }
            const serviceConfig: GeminiServiceConfig = { apiKey: effectiveGeminiKey, model: geminiModel };
            await service.stream(chatHistory, newMessage, systemInstruction, serviceConfig, accumulatingOnChunk, signal, activeTools, registry);
        } else if (selectedApiProvider === ApiProvider.OPENAI) {
            const service = apiServices[ApiProvider.OPENAI];
            if (!openAiApiKey) {
                throw new AppError("CONFIG_ERROR", "Error: OpenAI API key is not configured in settings.");
            }
            const serviceConfig: OpenAIServiceConfig = { apiKey: openAiApiKey, model: openAiModel, baseUrl: openAiBaseUrl };
            await service.stream(chatHistory, newMessage, systemInstruction, serviceConfig, accumulatingOnChunk, signal, activeTools, registry);
        } else {
            throw new AppError("CONFIG_ERROR", `Error: API provider "${selectedApiProvider}" is not supported.`);
        }
    } catch (error) {
        const appError = handleError(error, 'api', {
            provider: selectedApiProvider === ApiProvider.GEMINI ? 'gemini' : 'openai',
            model: selectedApiProvider === ApiProvider.GEMINI ? geminiModel : openAiModel,
            endpoint: selectedApiProvider === ApiProvider.GEMINI ? 'google-genai' : (openAiBaseUrl || 'https://api.openai.com/v1')
        });
        // Retry on recoverable errors (network issues, 429), up to 2 times with backoff
        const isRecoverable = appError.code === 'API_RATE_LIMIT' || appError.userMessage.toLowerCase().includes('failed to fetch');
        const wasCancelled = appError.code === 'CANCELLED' || (error instanceof Error && error.name === 'AbortError');
        if (!wasCancelled && isRecoverable && retryTimes < 2) {
            const backoffMs = 500 * Math.pow(2, retryTimes);
            await new Promise(res => setTimeout(res, backoffMs));
            return await streamChatResponse(
                chatHistory,
                newMessage,
                config,
                onChunk,
                signal,
                retryTimes + 1
            );
        }
        if (!wasCancelled) {
            accumulatingOnChunk(appError.userMessage);
        }
    }
    
    return fullText;
};
