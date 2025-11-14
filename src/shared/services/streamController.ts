import { Message, StreamOptions } from '@shared/types';
import { streamChatResponse, StreamChatConfig } from './apiService';

export class StreamController {
  private controller: AbortController | null = null;

  cancel() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  async start(
    chatHistory: Message[],
    userMessage: Message,
    _aiMessageId: string,
    options: StreamOptions,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.cancel();
    this.controller = new AbortController();

    const config: StreamChatConfig = {
      provider: options.provider,
      systemInstruction: options.systemInstruction,
      geminiApiKey: options.geminiApiKey,
      geminiModel: options.geminiModel,
      openAiApiKey: options.openAiApiKey,
      openAiModel: options.openAiModel,
      openAiBaseUrl: options.openAiBaseUrl,
    };
    
    return await streamChatResponse(
      chatHistory,
      userMessage,
      config,
      onChunk,
      this.controller.signal
    );
  }
}

