import { Message, ApiProvider, ToolCall } from '@shared/types';
import { AppError, handleError } from './errorHandler';
import { getToolsForProvider, GeminiFunctionDeclaration, OpenAIFunctionDefinition } from './toolService';
import { GeminiChatService, GeminiServiceConfig, OpenAIChatService, OpenAIServiceConfig } from './providers';

const apiServices = {
  [ApiProvider.GEMINI]: new GeminiChatService(),
  [ApiProvider.OPENAI]: new OpenAIChatService(),
};

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
  const {
    systemInstruction,
    provider: selectedApiProvider,
    geminiApiKey,
    geminiModel,
    openAiApiKey,
    openAiModel,
    openAiBaseUrl,
  } = config;

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
        throw new AppError('CONFIG_ERROR', 'Error: Gemini API key is not configured. Please add it in settings.');
      }
      const serviceConfig: GeminiServiceConfig = {
        apiKey: effectiveGeminiKey,
        model: geminiModel,
        tools: hasTools ? (toolDefinitions as GeminiFunctionDeclaration[]) : undefined,
      };
      await service.stream(
        chatHistory,
        newMessage,
        systemInstruction,
        serviceConfig,
        accumulatingOnChunk,
        signal,
        onToolCall
      );
    } else if (selectedApiProvider === ApiProvider.OPENAI) {
      const service = apiServices[ApiProvider.OPENAI];
      if (!openAiApiKey) {
        throw new AppError('CONFIG_ERROR', 'Error: OpenAI API key is not configured in settings.');
      }
      const serviceConfig: OpenAIServiceConfig = {
        apiKey: openAiApiKey,
        model: openAiModel,
        baseUrl: openAiBaseUrl,
        tools: hasTools ? (toolDefinitions as OpenAIFunctionDefinition[]) : undefined,
      };
      await service.stream(
        chatHistory,
        newMessage,
        systemInstruction,
        serviceConfig,
        accumulatingOnChunk,
        signal,
        onToolCall
      );
    } else {
      throw new AppError('CONFIG_ERROR', `Error: API provider "${selectedApiProvider}" is not supported.`);
    }
  } catch (error) {
    const appError = handleError(error, 'api', {
      provider: selectedApiProvider === ApiProvider.GEMINI ? 'gemini' : 'openai',
      model: selectedApiProvider === ApiProvider.GEMINI ? geminiModel : openAiModel,
      endpoint:
        selectedApiProvider === ApiProvider.GEMINI
          ? 'google-genai'
          : openAiBaseUrl || 'https://api.openai.com/v1',
    });

    const isRecoverable =
      appError.code === 'API_RATE_LIMIT' || appError.userMessage.toLowerCase().includes('failed to fetch');
    const wasCancelled = appError.code === 'CANCELLED' || (error instanceof Error && error.name === 'AbortError');

    if (!wasCancelled && isRecoverable && retryTimes < 2) {
      const backoffMs = 500 * Math.pow(2, retryTimes);
      await new Promise((res) => setTimeout(res, backoffMs));
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
