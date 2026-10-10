/* Файлы в веб-версии (запуск в браузере на компьютере).

   На телефоне ролики и картинки копируются в папку приложения
   (expo-file-system). В браузере такой папки нет, поэтому файл кладём
   в хранилище браузера (IndexedDB), а в данных приложения запоминаем
   его ключ вида «idb:videos/f_123.mp4». При запуске ключи заново
   превращаются в адреса, которые умеют играть плеер и картинки.

   Здесь же — выбор видео с компьютера, его длина и первый кадр
   для обложки (expo-video в браузере кадры вынимать не умеет). */

const DB = 'tiktok-mockup-files';
const STORE = 'files';

const keyToUrl = new Map<string, string>();
const urlToKey = new Map<string, string>();

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function remember(key: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  keyToUrl.set(key, url);
  urlToKey.set(url, key);
  return url;
}

export const isIdbKey = (s: unknown): s is string => typeof s === 'string' && s.startsWith('idb:');

/* сохранить файл (по адресу из выбора файла) — вернёт адрес для показа */
export async function keepWebFile(pickedUri: string, folder: string, ext: string): Promise<string> {
  const blob = await (await fetch(pickedUri)).blob();
  return keepWebBlob(blob, folder, ext);
}

export async function keepWebBlob(blob: Blob, folder: string, ext: string): Promise<string> {
  const key = `idb:${folder}/f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  await tx('readwrite', (s) => s.put(blob, key));
  return remember(key, blob);
}

/* адрес для показа: ключ хранилища → живой адрес (если уже загружен) */
export function webUri<T>(uri: T): T {
  return (isIdbKey(uri) ? keyToUrl.get(uri) ?? uri : uri) as T;
}

/* перед чтением сохранённых данных: достать из хранилища все файлы, на которые они ссылаются */
export async function warmWebFiles(text: string | null) {
  if (!text) return;
  const keys = [...new Set(text.match(/idb:[^"\\]+/g) ?? [])].filter((k) => !keyToUrl.has(k));
  await Promise.all(keys.map(async (k) => {
    try {
      const blob = await tx<Blob | undefined>('readonly', (s) => s.get(k) as IDBRequest<Blob | undefined>);
      if (blob) remember(k, blob);
    } catch {
      // файла нет — останется пустая обложка
    }
  }));
}

/* при сохранении данных живые адреса заменяем обратно на ключи */
export function storedJSON(value: unknown) {
  return JSON.stringify(value, (_k, v) => (typeof v === 'string' && urlToKey.has(v) ? urlToKey.get(v) : v));
}

export async function dropWebFile(uri: string | undefined) {
  if (!uri) return;
  const key = isIdbKey(uri) ? uri : urlToKey.get(uri);
  if (!key) return;
  try { await tx('readwrite', (s) => s.delete(key)); } catch { /* уже нет */ }
  const url = keyToUrl.get(key);
  if (url) { URL.revokeObjectURL(url); urlToKey.delete(url); }
  keyToUrl.delete(key);
}

/* окно выбора файла на компьютере */
export function pickWebFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = () => { resolve(input.files?.[0] ?? null); input.remove(); };
    input.addEventListener('cancel', () => { resolve(null); input.remove(); });
    document.body.appendChild(input);
    input.click();
  });
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.crossOrigin = 'anonymous';
    const t = setTimeout(() => reject(new Error('timeout')), 15000);
    v.onloadedmetadata = () => { clearTimeout(t); resolve(v); };
    v.onerror = () => { clearTimeout(t); reject(new Error('video error')); };
    v.src = src;
  });
}

/* длина ролика в секундах */
export async function webVideoDuration(src: string): Promise<number | null> {
  try {
    const v = await loadVideo(src);
    const d = v.duration;
    v.removeAttribute('src'); v.load();
    return Number.isFinite(d) && d > 0 ? d : null;
  } catch {
    return null;
  }
}

/* первый кадр ролика картинкой (data:…) — для обложек в браузере */
export async function webVideoFrame(src: string, maxWidth = 480): Promise<{ uri: string; width: number; height: number } | null> {
  try {
    const v = await loadVideo(src);
    await new Promise<void>((resolve) => {
      const done = () => { v.removeEventListener('seeked', done); resolve(); };
      v.addEventListener('seeked', done);
      v.currentTime = Math.min(0.05, (v.duration || 1) / 2);
      setTimeout(done, 3000);
    });
    const k = Math.min(1, maxWidth / (v.videoWidth || maxWidth));
    const w = Math.round((v.videoWidth || 720) * k), h = Math.round((v.videoHeight || 1280) * k);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')?.drawImage(v, 0, 0, w, h);
    const uri = canvas.toDataURL('image/jpeg', 0.85);
    v.removeAttribute('src'); v.load();
    return { uri, width: w, height: h };
  } catch {
    return null;
  }
}
