
import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, MessageSender, ApiProvider } from '../types';
import { getTextFromDataUrl, getInlineDataFromDataUrl } from "../utils/fileHelpers";
import { AppError, handleError } from "./errorHandler";

// --- HELPER FUNCTIONS ---

// Represents a single part in an OpenAI multimodal message.
type OpenAITextContentPart = { type: 'text'; text: string; };
type OpenAIImageContentPart = { type: 'image_url'; image_url: { url: string; }; };
type OpenAIMessageContentPart = OpenAITextContentPart | OpenAIImageContentPart;

type OpenAIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string | OpenAIMessageContentPart[];
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
        signal?: AbortSignal
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

    async stream(chatHistory: Message[], newMessage: Message, systemInstruction: string, config: GeminiServiceConfig, onChunk: (text: string) => void, signal?: AbortSignal): Promise<void> {
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

    async stream(chatHistory: Message[], newMessage: Message, systemInstruction: string, config: OpenAIServiceConfig, onChunk: (text: string) => void, signal?: AbortSignal): Promise<void> {
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
  retryTimes: number = 0
): Promise<string> => {
    const { systemInstruction, provider: selectedApiProvider, geminiApiKey, geminiModel, openAiApiKey, openAiModel, openAiBaseUrl } = config;

    let fullText = '';
    const accumulatingOnChunk = (chunk: string) => {
        fullText += chunk;
        onChunk(chunk);
    };

    try {
        if (selectedApiProvider === ApiProvider.GEMINI) {
            const service = apiServices[ApiProvider.GEMINI];
            const effectiveGeminiKey = geminiApiKey;
            if (!effectiveGeminiKey) {
                throw new AppError("CONFIG_ERROR", "Error: Gemini API key is not configured. Please add it in settings.");
            }
            const config: GeminiServiceConfig = { apiKey: effectiveGeminiKey, model: geminiModel };
            await service.stream(chatHistory, newMessage, systemInstruction, config, accumulatingOnChunk, signal);
        } else if (selectedApiProvider === ApiProvider.OPENAI) {
            const service = apiServices[ApiProvider.OPENAI];
            if (!openAiApiKey) {
                throw new AppError("CONFIG_ERROR", "Error: OpenAI API key is not configured in settings.");
            }
            const config: OpenAIServiceConfig = { apiKey: openAiApiKey, model: openAiModel, baseUrl: openAiBaseUrl };
            await service.stream(chatHistory, newMessage, systemInstruction, config, accumulatingOnChunk, signal);
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
