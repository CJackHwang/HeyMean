import { Message, StreamOptions } from '@shared/types';
import { streamChatResponse, StreamChatConfig } from './apiService';
import { injectToolInstructions, executeToolCallsFromText } from '@shared/services/tools';

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

    const config: StreamChatConfig = {
      provider: options.provider,
      systemInstruction: injectToolInstructions(options.systemInstruction),
      geminiApiKey: options.geminiApiKey,
      geminiModel: options.geminiModel,
      openAiApiKey: options.openAiApiKey,
      openAiModel: options.openAiModel,
      openAiBaseUrl: options.openAiBaseUrl,
    };
    
    const finalText = await streamChatResponse(
      chatHistory,
      userMessage,
      config,
      onChunk,
      this.controller.signal
    );

    try {
      await executeToolCallsFromText(finalText, { origin: 'ai-chat' });
    } catch (error) {
      console.error('[tools] Failed to execute tool calls', error);
    }

    return finalText;
  }
}

