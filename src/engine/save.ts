// IndexedDB persistence with in-memory fallback. World index + per-world blobs.
const DB_NAME = 'emberfall-chronicles';
const DB_VER = 1;
let db: IDBDatabase | null = null;
let memFallback = false;
const memStore = new Map<string, any>();

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (memFallback) return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { memFallback = true; resolve(null); };
    } catch { memFallback = true; resolve(null); }
  });
}
export async function initDB(): Promise<void> {
  if (db || memFallback) return;
  db = await openDB();
}
function store(mode: IDBTransactionMode): IDBObjectStore | null {
  if (!db) return null;
  try { return db.transaction('kv', mode).objectStore('kv'); } catch { return null; }
}
export async function dbGet<T>(key: string): Promise<T | null> {
  await initDB();
  if (memFallback || !db) return memStore.has(key) ? (memStore.get(key) as T) : null;
  return new Promise((resolve) => {
    try {
      const s = store('readonly'); if (!s) return resolve(null);
      const req = s.get(key);
      req.onsuccess = () => resolve(req.result === undefined ? null : req.result as T);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
export async function dbSet(key: string, value: any): Promise<boolean> {
  await initDB();
  if (memFallback || !db) { memStore.set(key, value); return true; }
  return new Promise((resolve) => {
    try {
      const s = store('readwrite'); if (!s) { memStore.set(key, value); return resolve(true); }
      const req = s.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => { memStore.set(key, value); resolve(true); };
    } catch { memStore.set(key, value); resolve(true); }
  });
}
export async function dbDel(key: string): Promise<void> {
  await initDB();
  memStore.delete(key);
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const s = store('readwrite'); if (!s) return resolve();
      const req = s.delete(key);
      req.onsuccess = () => resolve(); req.onerror = () => resolve();
    } catch { resolve(); }
  });
}
// Simple string compression (RLE on JSON) to shrink chunk diffs
export function compress(s: string): string {
  if (s.length < 64) return s;
  let out = ''; let i = 0;
  while (i < s.length) {
    let j = i + 1;
    while (j < s.length && s[j] === s[i] && j - i < 255) j++;
    const run = j - i;
    if (run >= 4) { out += `\u0001${String.fromCharCode(run)}${s[i]}`; }
    else out += s.slice(i, j);
    i = j;
  }
  return '\u0002' + out;
}
export function decompress(s: string): string {
  if (!s.startsWith('\u0002')) return s;
  const b = s.slice(1);
  let out = '';
  for (let i = 0; i < b.length; i++) {
    if (b[i] === '\u0001' && i + 2 < b.length + 1) {
      const n = b.charCodeAt(i + 1); const ch = b[i + 2];
      out += ch.repeat(n); i += 2;
    } else out += b[i];
  }
  return out;
}
