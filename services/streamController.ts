import { Message, StreamOptions } from '../types';
import { streamChatResponse } from './apiService';

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
    aiMessageId: string,
    options: StreamOptions,
    onChunk: (text: string) => void
  ): Promise<string> {
    this.cancel();
    this.controller = new AbortController();

    const { provider, systemInstruction, geminiApiKey, geminiModel, openAiApiKey, openAiModel, openAiBaseUrl } = options;
    return await streamChatResponse(
      chatHistory,
      userMessage,
      systemInstruction,
      provider,
      geminiApiKey,
      geminiModel,
      openAiApiKey,
      openAiModel,
      openAiBaseUrl,
      onChunk,
      this.controller.signal
    );
  }
}

