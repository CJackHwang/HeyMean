export type RequestMode = 'direct' | 'proxy';

const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const OPENAI_PROXY_BASE_URL = '/api/llm/openai/v1';

const trimSlash = (url: string): string => url.replace(/\/+$/, '');

export const resolveOpenAIBaseUrl = (baseUrl: string, mode: RequestMode): string => {
  if (mode === 'proxy') {
    return OPENAI_PROXY_BASE_URL;
  }
  return trimSlash(baseUrl || OPENAI_DEFAULT_BASE_URL);
};

export const buildOpenAIModelsUrl = (baseUrl: string, mode: RequestMode): string => {
  return `${resolveOpenAIBaseUrl(baseUrl, mode)}/models`;
};

export const buildOpenAIChatCompletionsUrl = (baseUrl: string, mode: RequestMode): string => {
  return `${resolveOpenAIBaseUrl(baseUrl, mode)}/chat/completions`;
};
