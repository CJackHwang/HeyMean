const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

const INVALID_URL_MESSAGE =
  'Configuration Error: Invalid OpenAI Base URL. Please enter a valid URL, such as https://api.openai.com or https://api.openai.com/v1.';

export const normalizeOpenAIBaseUrl = (baseUrl?: string): string => {
  const rawBaseUrl = (baseUrl || '').trim();
  if (!rawBaseUrl) {
    return DEFAULT_OPENAI_BASE_URL;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawBaseUrl);
  } catch {
    throw new Error(INVALID_URL_MESSAGE);
  }

  const path = parsedUrl.pathname.replace(/\/+$/, '');
  parsedUrl.pathname = path.endsWith('/v1') ? path : `${path}/v1`;

  return parsedUrl.toString().replace(/\/+$/, '');
};

export const buildOpenAIEndpoint = (baseUrl: string, path: string): string => {
  return new URL(path, `${baseUrl}/`).toString();
};
