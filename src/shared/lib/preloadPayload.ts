// Ephemeral route-level preload payload registry
// Use setPayload(key, data) before route commit; read via getPayload(key) in page component on mount; then clear.

const store = new Map<string, unknown>();

export function setPayload(key: string, data: unknown) {
  store.set(key, data);
}

export function getPayload<T = unknown>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function clearPayload(key: string) {
  store.delete(key);
}

export function clearAllPayloads() {
  store.clear();
}

