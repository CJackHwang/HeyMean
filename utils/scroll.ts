// Simple per-path scroll position persistence using sessionStorage

const KEY = 'hm_scroll_positions';

type Positions = Record<string, number>;

function read(): Positions {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Positions) : {};
  } catch {
    return {};
  }
}

function write(pos: Positions) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pos));
  } catch {}
}

export function saveScroll(path: string, y: number) {
  const pos = read();
  pos[path] = y;
  write(pos);
}

export function getScroll(path: string): number | undefined {
  const pos = read();
  return pos[path];
}

