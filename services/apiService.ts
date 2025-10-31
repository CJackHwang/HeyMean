
import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, MessageSender, ApiProvider } from '../types';

// --- HELPER FUNCTIONS ---

// Represents a single part in an OpenAI multimodal message.
type OpenAITextContentPart = { type: 'text'; text: string; };
type OpenAIImageContentPart = { type: 'image_url'; image_url: { url: string; }; };
type OpenAIMessageContentPart = OpenAITextContentPart | OpenAIImageContentPart;

type OpenAIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string | OpenAIMessageContentPart[];
};


const getTextFromDataUrl = async (dataUrl: string): Promise<string> => {
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`Failed to fetch data URL: ${response.statusText}`);
        return response.text();
    } catch (error) {
        console.error("Error fetching text from data URL:", error);
        try {
            const base64 = dataUrl.split(',')[1];
            return atob(base64);
        } catch (decodeError) {
             console.error("Error decoding base64 from data URL:", decodeError);
             return "";
        }
    }
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
        onChunk: (text: string) => void
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
                    const base64Data = att.data.split(',')[1];
                    if (base64Data) {
                        parts.push({ inlineData: { data: base64Data, mimeType: att.type } });
                    }
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

    async stream(chatHistory: Message[], newMessage: Message, systemInstruction: string, config: GeminiServiceConfig, onChunk: (text: string) => void): Promise<void> {
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
                if (chunk.text) {
                    onChunk(chunk.text);
                }
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            onChunk(`Sorry, an error occurred with the Gemini API: ${(error as Error).message}. Please try again or check settings.`);
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
                    if (att.type.startsWith('image/')) {
                        contentParts.push({ type: 'image_url', image_url: { url: att.data } });
                    } else if (att.type.startsWith('text/')) {
                        const text = await getTextFromDataUrl(att.data);
                        fileTextContent += `\n\n--- Attachment: ${att.name} ---\n${text}`;
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

    async stream(chatHistory: Message[], newMessage: Message, systemInstruction: string, config: OpenAIServiceConfig, onChunk: (text: string) => void): Promise<void> {
        const openaiEndpoint = `${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
        const messages = await this.messagesToOpenAIChatFormat([...chatHistory, newMessage], systemInstruction);
        const model = config.model || 'gpt-4o';

        try {
             // Add checks for user configuration errors before making the API call.
            if (model.includes('veo')) {
                onChunk("Configuration Error: Video generation models are not supported in chat. Please select a text-based model in settings.");
                return;
            }

            const response = await fetch(openaiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                body: JSON.stringify({ model, messages, stream: true }),
            });

            if (!response.ok) {
                if (response.status === 404 && config.baseUrl.includes('googleapis.com')) {
                    onChunk("Configuration Error: It looks like you've set a Google API endpoint for the OpenAI provider. Please switch to the 'Google Gemini' provider in Settings to use Google models.");
                    return;
                }
                const errorData = await response.json();
                const message = errorData?.error?.message || JSON.stringify(errorData);
                throw new Error(`API error (${response.status}): ${message}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("Failed to get response reader for OpenAI stream.");
            
            const decoder = new TextDecoder('utf-8');
            while (true) {
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
            console.error("Error with OpenAI compatible provider:", error);
            onChunk(`Sorry, an error occurred: ${(error as Error).message}. Please check your settings or try again.`);
        }
    }
}

const apiServices = {
    [ApiProvider.GEMINI]: new GeminiChatService(),
    [ApiProvider.OPENAI]: new OpenAIChatService(),
};

// --- DISPATCHER FUNCTION ---

export const streamChatResponse = async (
  chatHistory: Message[],
  newMessage: Message,
  systemInstruction: string,
  selectedApiProvider: ApiProvider,
  geminiApiKey: string,
  geminiModel: string,
  openAiApiKey: string,
  openAiModel: string,
  openAiBaseUrl: string,
  onChunk: (text: string) => void
) => {
    if (selectedApiProvider === ApiProvider.GEMINI) {
        const service = apiServices[ApiProvider.GEMINI];
        const effectiveGeminiKey = geminiApiKey || process.env.API_KEY;
        if (!effectiveGeminiKey) {
            onChunk("Error: Gemini API key is not configured. Please add it in settings.");
            return;
        }
        const config: GeminiServiceConfig = { apiKey: effectiveGeminiKey, model: geminiModel };
        await service.stream(chatHistory, newMessage, systemInstruction, config, onChunk);
    } else if (selectedApiProvider === ApiProvider.OPENAI) {
        const service = apiServices[ApiProvider.OPENAI];
        if (!openAiApiKey) {
            onChunk("Error: OpenAI API key is not configured in settings.");
            return;
        }
        const config: OpenAIServiceConfig = { apiKey: openAiApiKey, model: openAiModel, baseUrl: openAiBaseUrl };
        await service.stream(chatHistory, newMessage, systemInstruction, config, onChunk);
    } else {
        onChunk(`Error: API provider "${selectedApiProvider}" is not supported.`);
        return;
    }
};
