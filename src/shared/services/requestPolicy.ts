export interface UnifiedRequestPolicy {
  timeoutMs: number;
  maxRetries: number;
  retryableStatusCodes: number[];
  baseDelayMs: number;
}

export interface RetryContext {
  attempt: number;
  maxRetries: number;
  delayMs: number;
  statusCode?: number;
}

export const UNIFIED_REQUEST_POLICY: UnifiedRequestPolicy = {
  timeoutMs: 30000,
  maxRetries: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  baseDelayMs: 500,
};

export const shouldRetryRequest = (statusCode?: number, isNetworkError: boolean = false): boolean => {
  if (isNetworkError) return true;
  if (typeof statusCode !== 'number') return false;
  return UNIFIED_REQUEST_POLICY.retryableStatusCodes.includes(statusCode);
};

export const isClientConfigError = (statusCode?: number): boolean => {
  if (typeof statusCode !== 'number') return false;
  return statusCode >= 400 && statusCode < 500 && statusCode !== 429;
};

export const getRetryDelayMs = (attempt: number): number => {
  return UNIFIED_REQUEST_POLICY.baseDelayMs * Math.pow(2, attempt);
};
