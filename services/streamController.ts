import { ApiProvider, Message } from '../types';
import { streamChatResponse } from './apiService';

type StreamOptions = {
  provider: ApiProvider;
  systemInstruction: string;
  geminiApiKey: string;
  geminiModel: string;
  openAiApiKey: string;
  openAiModel: string;
  openAiBaseUrl: string;
};

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
    // Cancel any previous stream to avoid re-entrancy issues
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

