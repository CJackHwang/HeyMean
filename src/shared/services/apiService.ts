import { Message, ApiProvider, RetryStatus, ToolCall } from '@shared/types';
import { AppError, handleError } from './errorHandler';
import { getToolsForProvider, GeminiFunctionDeclaration, OpenAIFunctionDefinition } from './toolService';
import { GeminiChatService, GeminiServiceConfig, OpenAIChatService, OpenAIServiceConfig } from './providers';
import { getRetryDelayMs, isClientConfigError, shouldRetryRequest, UNIFIED_REQUEST_POLICY } from './requestPolicy';

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


const REQUEST_TIMEOUT_REASON = 'REQUEST_TIMEOUT';

const withTimeoutSignal = (signal: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(REQUEST_TIMEOUT_REASON), timeoutMs);

  const mergedController = new AbortController();
  const abortMerged = (reason?: unknown) => {
    if (!mergedController.signal.aborted) mergedController.abort(reason);
  };

  const abortFromSourceSignal = () => abortMerged(signal?.reason);
  const abortFromTimeoutSignal = () => abortMerged(timeoutController.signal.reason);

  signal?.addEventListener('abort', abortFromSourceSignal, { once: true });
  timeoutController.signal.addEventListener('abort', abortFromTimeoutSignal, { once: true });

  return {
    signal: mergedController.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromSourceSignal);
      timeoutController.signal.removeEventListener('abort', abortFromTimeoutSignal);
    },
  };
};

export const streamChatResponse = async (
  chatHistory: Message[],
  newMessage: Message,
  config: StreamChatConfig,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  onToolCall?: (toolCall: ToolCall) => void,
  onRetry?: (status: RetryStatus) => void,
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
      const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, UNIFIED_REQUEST_POLICY.timeoutMs);
      try {
        try {
          await service.stream(
            chatHistory,
            newMessage,
            systemInstruction,
            serviceConfig,
            accumulatingOnChunk,
            timedSignal,
            onToolCall
          );
        } catch (error) {
          if (timedSignal.aborted && timedSignal.reason === REQUEST_TIMEOUT_REASON) {
            throw new AppError('TIMEOUT_ERROR', `Error: Request timed out after ${UNIFIED_REQUEST_POLICY.timeoutMs / 1000}s.`);
          }
          throw error;
        }
      } finally {
        cleanup();
      }
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
      const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, UNIFIED_REQUEST_POLICY.timeoutMs);
      try {
        try {
          await service.stream(
            chatHistory,
            newMessage,
            systemInstruction,
            serviceConfig,
            accumulatingOnChunk,
            timedSignal,
            onToolCall
          );
        } catch (error) {
          if (timedSignal.aborted && timedSignal.reason === REQUEST_TIMEOUT_REASON) {
            throw new AppError('TIMEOUT_ERROR', `Error: Request timed out after ${UNIFIED_REQUEST_POLICY.timeoutMs / 1000}s.`);
          }
          throw error;
        }
      } finally {
        cleanup();
      }
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

    const wasCancelled = appError.code === 'CANCELLED' || (error instanceof Error && error.name === 'AbortError');

    const statusCode = appError.details?.statusCode as number | undefined;
    const isNetworkFailure = appError.userMessage.toLowerCase().includes('failed to fetch') || appError.code === 'UNKNOWN_ERROR';
    const retryable = shouldRetryRequest(statusCode, isNetworkFailure);
    const isBadConfig4xx = isClientConfigError(statusCode) || appError.code === 'CONFIG_ERROR';

    if (!wasCancelled && !isBadConfig4xx && retryable && retryTimes < UNIFIED_REQUEST_POLICY.maxRetries) {
      const backoffMs = getRetryDelayMs(retryTimes);
      onRetry?.({
        attempt: retryTimes + 1,
        maxRetries: UNIFIED_REQUEST_POLICY.maxRetries,
        delayMs: backoffMs,
      });
      await new Promise((res) => setTimeout(res, backoffMs));
      return await streamChatResponse(
        chatHistory,
        newMessage,
        config,
        onChunk,
        signal,
        onToolCall,
        onRetry,
        retryTimes + 1
      );
    }

    if (!wasCancelled) {
      accumulatingOnChunk(appError.userMessage);
    }
  }

  return fullText;
};
