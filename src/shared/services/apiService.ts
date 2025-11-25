
import { GoogleGenAI, Content, Part, FunctionCallingConfigMode, createPartFromFunctionResponse } from "@google/genai";
import { Message, MessageSender, ApiProvider, ToolCall } from '@shared/types';
import { getTextFromDataUrl, getInlineDataFromDataUrl } from "@shared/lib/fileHelpers";
import { AppError, handleError } from "./errorHandler";
import { getToolsForProvider, executeTool } from "./toolService";
import { GeminiFunctionDeclaration, OpenAIFunctionDefinition } from "./toolService";

// --- HELPER FUNCTIONS ---

// Represents a single part in an OpenAI multimodal message.
type OpenAITextContentPart = { type: 'text'; text: string; };
type OpenAIImageContentPart = { type: 'image_url'; image_url: { url: string; }; };
type OpenAIMessageContentPart = OpenAITextContentPart | OpenAIImageContentPart;

type OpenAIToolCall = {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
};

type OpenAIMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | OpenAIMessageContentPart[];
    tool_calls?: OpenAIToolCall[];
    tool_call_id?: string;
};


// --- SERVICE INTERFACE AND IMPLEMENTATIONS (STRATEGY PATTERN) ---

interface GeminiServiceConfig {
    apiKey: string;
    model: string;
    tools?: GeminiFunctionDeclaration[];
}

interface OpenAIServiceConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
    tools?: OpenAIFunctionDefinition[];
}

interface IChatService<T> {
    stream(
        chatHistory: Message[],
        newMessage: Message,
        systemInstruction: string,
        config: T,
        onChunk: (text: string) => void,
        signal?: AbortSignal,
        onToolCall?: (toolCall: ToolCall) => void
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

    async stream(chatHistory: Message[], newMessage: Message, systemInstruction: string, config: GeminiServiceConfig, onChunk: (text: string) => void, signal?: AbortSignal, onToolCall?: (toolCall: ToolCall) => void): Promise<void> {
        if (config.tools && config.tools.length > 0) {
            await this.streamWithTools(chatHistory, newMessage, systemInstruction, config, onChunk, signal, onToolCall);
            return;
        }

        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const model = config.model || 'gemini-2.5-flash';
        
        const history: Content[] = chatHistory.map(this.messageToContent);
        const newContent = this.messageToContent(newMessage);
        const contents: Content[] = [...history, newContent];

        try {
            const response = await ai.models.generateContentStream({
                model: model,
                contents: contents,
                config: {
                    systemInstruction,
                    thinkingConfig: { thinkingBudget: 8192 }
                }
            });
            for await (const chunk of response) {
                if (signal?.aborted) {
                    throw new AppError('CANCELLED', 'Request was cancelled by the user.');
                }
                if (chunk.text) {
                    onChunk(chunk.text);
                }
            }
        } catch (error) {
            const appError = handleError(error, 'api', { provider: 'gemini', model, endpoint: 'google-genai' });
            if (appError.code === 'CANCELLED') return;
            onChunk(appError.userMessage);
        }
    }

    private async streamWithTools(
        chatHistory: Message[],
        newMessage: Message,
        systemInstruction: string,
        config: GeminiServiceConfig,
        onChunk: (text: string) => void,
        signal?: AbortSignal,
        onToolCall?: (toolCall: ToolCall) => void
    ): Promise<void> {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const model = config.model || 'gemini-2.5-flash';
        const tools = config.tools ?? [];
        const toolNames = tools.map(tool => tool.name);

        const MAX_TOOL_ITERATIONS = 10;
        const history: Content[] = chatHistory.map(this.messageToContent);
        const conversation: Content[] = [...history, this.messageToContent(newMessage)];

        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
            if (signal?.aborted) {
                throw new AppError('CANCELLED', 'Request was cancelled by the user.');
            }

            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: conversation,
                    config: {
                        systemInstruction,
                        thinkingConfig: { thinkingBudget: 8192 },
                        tools: [{ functionDeclarations: tools as unknown as import("@google/genai").FunctionDeclaration[] }],
                        toolConfig: {
                            functionCallingConfig: {
                                mode: FunctionCallingConfigMode.AUTO,
                                allowedFunctionNames: toolNames,
                            },
                        },
                    },
                });

                const text = response.text ?? '';
                if (text) {
                    onChunk(text);
                }

                const candidateContent = response.candidates?.[0]?.content;
                if (candidateContent) {
                    conversation.push(candidateContent);
                }

                const functionCalls = response.functionCalls ?? [];
                if (functionCalls.length === 0) {
                    break;
                }

                const toolCallPromises = functionCalls.map(async (functionCall) => {
                    if (signal?.aborted) {
                        throw new AppError('CANCELLED', 'Request was cancelled by the user.');
                    }

                    const toolName = functionCall.name ?? 'unknown_tool';
                    const toolParams = functionCall.args ?? {};
                    const toolCallId = functionCall.id ?? `${toolName}-${Date.now()}`;

                    if (onToolCall) {
                        onToolCall({
                            id: toolCallId,
                            name: toolName,
                            status: 'calling',
                            parameters: toolParams,
                            timestamp: Date.now(),
                        });
                    }

                    const result = await executeTool({
                        name: toolName,
                        parameters: toolParams,
                    });

                    if (onToolCall) {
                        onToolCall({
                            id: toolCallId,
                            name: toolName,
                            status: result.success ? 'success' : 'error',
                            parameters: toolParams,
                            result: result,
                            timestamp: Date.now(),
                        });
                    }

                    return {
                        toolCallId,
                        toolName,
                        result,
                    };
                });

                const toolResults = await Promise.all(toolCallPromises);

                for (const { toolCallId, toolName, result } of toolResults) {
                    const responsePart = createPartFromFunctionResponse(
                        toolCallId,
                        toolName,
                        {
                            success: result.success,
                            data: result.data ?? null,
                            error: result.error ?? null,
                        }
                    );

                    conversation.push({
                        role: 'function',
                        parts: [responsePart],
                    });
                }
            } catch (error) {
                const appError = handleError(error, 'api', { provider: 'gemini', model, endpoint: 'google-genai' });
                if (appError.code === 'CANCELLED') return;
                onChunk(appError.userMessage);
                break;
            }
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

                const assistantMessage: OpenAIMessage = {
                    role: 'assistant',
                    content: typeof message.content === 'string' ? message.content : '',
                    tool_calls: message.tool_calls,
                };
                messages.push(assistantMessage);

                const toolCalls = message.tool_calls ?? [];
                if (toolCalls.length === 0) {
                    break;
                }

                const toolResults = await Promise.all(toolCalls.map(async (toolCall: OpenAIToolCall) => {
                    if (signal?.aborted) {
                        throw new AppError('CANCELLED', 'Request was cancelled by the user.');
                    }

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

                    return {
                        toolCallId,
                        result,
                    };
                }));

                toolResults.forEach(({ toolCallId, result }) => {
                    const toolMessage: OpenAIMessage = {
                        role: 'tool',
                        content: JSON.stringify({
                            success: result?.success ?? false,
                            data: result?.data ?? null,
                            error: result?.error ?? null,
                        }),
                        tool_call_id: toolCallId,
                    };
                    messages.push(toolMessage);
                });
            } catch (error) {
                const appError = handleError(error, 'api', { provider: 'openai', model, endpoint: openaiEndpoint });
                if (appError.code === 'CANCELLED') return;
                onChunk(appError.userMessage);
                break;
            }
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
}

export const streamChatResponse = async (
  chatHistory: Message[],
  newMessage: Message,
  config: StreamChatConfig,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  onToolCall?: (toolCall: ToolCall) => void,
  retryTimes: number = 0
): Promise<string> => {
    const { systemInstruction, provider: selectedApiProvider, geminiApiKey, geminiModel, openAiApiKey, openAiModel, openAiBaseUrl } = config;

    let fullText = '';
    const accumulatingOnChunk = (chunk: string) => {
        fullText += chunk;
        onChunk(chunk);
    };

    try {
        const toolDefinitions = getToolsForProvider(selectedApiProvider);
        const hasTools = Array.isArray(toolDefinitions) && toolDefinitions.length > 0;

        if (selectedApiProvider === ApiProvider.GEMINI) {
            const service = apiServices[ApiProvider.GEMINI];
            const effectiveGeminiKey = geminiApiKey;
            if (!effectiveGeminiKey) {
                throw new AppError("CONFIG_ERROR", "Error: Gemini API key is not configured. Please add it in settings.");
            }
            const config: GeminiServiceConfig = {
                apiKey: effectiveGeminiKey,
                model: geminiModel,
                tools: hasTools ? (toolDefinitions as GeminiFunctionDeclaration[]) : undefined,
            };
            await service.stream(chatHistory, newMessage, systemInstruction, config, accumulatingOnChunk, signal, onToolCall);
        } else if (selectedApiProvider === ApiProvider.OPENAI) {
            const service = apiServices[ApiProvider.OPENAI];
            if (!openAiApiKey) {
                throw new AppError("CONFIG_ERROR", "Error: OpenAI API key is not configured in settings.");
            }
            const config: OpenAIServiceConfig = {
                apiKey: openAiApiKey,
                model: openAiModel,
                baseUrl: openAiBaseUrl,
                tools: hasTools ? (toolDefinitions as OpenAIFunctionDefinition[]) : undefined,
            };
            await service.stream(chatHistory, newMessage, systemInstruction, config, accumulatingOnChunk, signal, onToolCall);
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
                onToolCall,
                retryTimes + 1
            );
        }
        if (!wasCancelled) {
            accumulatingOnChunk(appError.userMessage);
        }
    }
    
    return fullText;
};
