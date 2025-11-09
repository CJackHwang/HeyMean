// Lightweight generic preload cache utility to support route-level data prefetching
// and avoid duplicate loads across overlays/components during transitions.

export type Loader<K, V> = (key: K) => Promise<V>;

class PreloadCache<K, V> {
  private map = new Map<string, Promise<V> | V>();
  private keyToString: (key: K) => string;
  public readonly name: string;

  constructor(name: string, keyToString?: (key: K) => string) {
    this.name = name;
    this.keyToString = keyToString || ((k) => String(k));
  }

  has(key: K): boolean {
    return this.map.has(this.keyToString(key));
  }

  get(key: K): V | Promise<V> | undefined {
    return this.map.get(this.keyToString(key));
  }

  // Ensure a value is loading/cached, but don't await it here
  preload(key: K, loader: Loader<K, V>): Promise<V> {
    const k = this.keyToString(key);
    const existing = this.map.get(k);
    if (existing) return Promise.resolve(existing as Promise<V> | V);
    const p = loader(key);
    this.map.set(k, p);
    return p;
  }

  // Return cached value if present, otherwise load and cache
  async load(key: K, loader: Loader<K, V>): Promise<V> {
    const k = this.keyToString(key);
    const existing = this.map.get(k);
    if (existing) return await (existing as Promise<V> | V);
    const p = loader(key);
    this.map.set(k, p);
    const v = await p;
    this.map.set(k, v);
    return v;
  }

  set(key: K, value: V): void {
    this.map.set(this.keyToString(key), value);
  }

  delete(key: K): void {
    this.map.delete(this.keyToString(key));
  }

  clear(): void {
    this.map.clear();
  }

  // Drop cache entries and return current size
  size(): number {
    return this.map.size;
  }
}

// Named singleton caches registry
const registry = new Map<string, PreloadCache<any, any>>();

export function getCache<K, V>(name: string, keyToString?: (key: K) => string): PreloadCache<K, V> {
  if (registry.has(name)) return registry.get(name) as PreloadCache<K, V>;
  const cache = new PreloadCache<K, V>(name, keyToString);
  registry.set(name, cache);
  return cache;
}

export function clearCache(name: string): void {
  const c = registry.get(name);
  if (c) c.clear();
}

export function clearAllCaches(): void {
  registry.forEach((c) => c.clear());
}
