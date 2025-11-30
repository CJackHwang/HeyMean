import { GoogleGenAI, Content, Part, FunctionCallingConfigMode, createPartFromFunctionResponse } from "@google/genai";
import { Message, MessageSender, ToolCall } from '@shared/types';
import { getInlineDataFromDataUrl } from "@shared/lib/fileHelpers";
import { AppError, handleError } from "../errorHandler";
import { executeTool } from "../toolService";
import { GeminiFunctionDeclaration } from "../toolService";
import { IChatService } from "./types";

export interface GeminiServiceConfig {
    apiKey: string;
    model: string;
    tools?: GeminiFunctionDeclaration[];
}

export class GeminiChatService implements IChatService<GeminiServiceConfig> {
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
        
        const history: Content[] = chatHistory.map(this.messageToContent.bind(this));
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
        const history: Content[] = chatHistory.map(this.messageToContent.bind(this));
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

                // Notify UI about all tool calls starting
                const toolCallsData = functionCalls.map((functionCall: {
                    name?: string | null;
                    id?: string | null;
                    args?: Record<string, unknown>;
                }): {
                    toolName: string;
                    toolParams: Record<string, unknown>;
                    toolCallId: string;
                } => {
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
                    
                    return { toolName, toolParams, toolCallId };
                });

                // Execute all tools in parallel
                const results = await Promise.all(
                    toolCallsData.map(async ({ toolName, toolParams, toolCallId }: {
                        toolName: string;
                        toolParams: Record<string, unknown>;
                        toolCallId: string;
                    }) => {
                        if (signal?.aborted) {
                            throw new AppError('CANCELLED', 'Request was cancelled by the user.');
                        }

                        const result = await executeTool({
                            name: toolName,
                            parameters: toolParams,
                        });

                        // Notify UI about tool call result
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
                    })
                );

                // Add all function responses to conversation
                for (const { toolCallId, toolName, result } of results) {
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
