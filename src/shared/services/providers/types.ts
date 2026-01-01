import { Message, ToolCall } from '@shared/types';

export interface IChatService<TConfig> {
  stream(
    chatHistory: Message[],
    newMessage: Message,
    systemInstruction: string,
    config: TConfig,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
    onToolCall?: (toolCall: ToolCall) => void
  ): Promise<void>;
}
