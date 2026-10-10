/* Устройство, под которое строится приложение.

   Всё в приложении снято со скриншотов iPhone 13 Pro Max (экран 428×926
   точек, сверху 47 точек под часы и «чёлку», снизу 34 под полоску).
   У других айфонов другая ширина и высота, а главное — другой отступ
   сверху: у моделей с «островом» он 59–62 точки. Размеры элементов
   в точках у TikTok одинаковые на всех айфонах, поэтому приложение
   не «растягивается», а раскладывается по размеру экрана, а всё,
   что прижато к верху, отсчитывается от отступа конкретной модели.

   На телефоне размер экрана и отступы берутся у самого телефона
   («Автоматически»). Выбор модели вручную нужен в основном для
   браузера на компьютере: там приложение рисуется ровно размером
   экрана выбранного айфона и с его отступами. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';

export const DEVICE_KEY = 'mockup-device';

export type Device = {
  id: string;
  name: string;
  w: number; h: number;     // экран в точках
  top: number;              // отступ сверху (часы, «чёлка» или «остров»)
  bottom: number;           // отступ снизу (полоска «домой»)
};

/* Все айфоны начиная с X. Одинаковые по экрану стоят рядом */
export const DEVICES: Device[] = [
  { id: 'x',        name: 'iPhone X',           w: 375, h: 812, top: 44, bottom: 34 },
  { id: 'xs',       name: 'iPhone XS',          w: 375, h: 812, top: 44, bottom: 34 },
  { id: 'xsmax',    name: 'iPhone XS Max',      w: 414, h: 896, top: 44, bottom: 34 },
  { id: 'xr',       name: 'iPhone XR',          w: 414, h: 896, top: 48, bottom: 34 },
  { id: '11',       name: 'iPhone 11',          w: 414, h: 896, top: 48, bottom: 34 },
  { id: '11pro',    name: 'iPhone 11 Pro',      w: 375, h: 812, top: 44, bottom: 34 },
  { id: '11promax', name: 'iPhone 11 Pro Max',  w: 414, h: 896, top: 44, bottom: 34 },
  { id: '12mini',   name: 'iPhone 12 mini',     w: 375, h: 812, top: 50, bottom: 34 },
  { id: '12',       name: 'iPhone 12',          w: 390, h: 844, top: 47, bottom: 34 },
  { id: '12pro',    name: 'iPhone 12 Pro',      w: 390, h: 844, top: 47, bottom: 34 },
  { id: '12promax', name: 'iPhone 12 Pro Max',  w: 428, h: 926, top: 47, bottom: 34 },
  { id: '13mini',   name: 'iPhone 13 mini',     w: 375, h: 812, top: 50, bottom: 34 },
  { id: '13',       name: 'iPhone 13',          w: 390, h: 844, top: 47, bottom: 34 },
  { id: '13pro',    name: 'iPhone 13 Pro',      w: 390, h: 844, top: 47, bottom: 34 },
  { id: '13promax', name: 'iPhone 13 Pro Max',  w: 428, h: 926, top: 47, bottom: 34 },
  { id: '14',       name: 'iPhone 14',          w: 390, h: 844, top: 47, bottom: 34 },
  { id: '14plus',   name: 'iPhone 14 Plus',     w: 428, h: 926, top: 47, bottom: 34 },
  { id: '14pro',    name: 'iPhone 14 Pro',      w: 393, h: 852, top: 59, bottom: 34 },
  { id: '14promax', name: 'iPhone 14 Pro Max',  w: 430, h: 932, top: 59, bottom: 34 },
  { id: '15',       name: 'iPhone 15',          w: 393, h: 852, top: 59, bottom: 34 },
  { id: '15plus',   name: 'iPhone 15 Plus',     w: 430, h: 932, top: 59, bottom: 34 },
  { id: '15pro',    name: 'iPhone 15 Pro',      w: 393, h: 852, top: 59, bottom: 34 },
  { id: '15promax', name: 'iPhone 15 Pro Max',  w: 430, h: 932, top: 59, bottom: 34 },
  { id: '16',       name: 'iPhone 16',          w: 393, h: 852, top: 59, bottom: 34 },
  { id: '16plus',   name: 'iPhone 16 Plus',     w: 430, h: 932, top: 59, bottom: 34 },
  { id: '16pro',    name: 'iPhone 16 Pro',      w: 402, h: 874, top: 62, bottom: 34 },
  { id: '16promax', name: 'iPhone 16 Pro Max',  w: 440, h: 956, top: 62, bottom: 34 },
  { id: '16e',      name: 'iPhone 16e',         w: 390, h: 844, top: 47, bottom: 34 },
  { id: '17',       name: 'iPhone 17',          w: 402, h: 874, top: 62, bottom: 34 },
  { id: 'air',      name: 'iPhone Air',         w: 420, h: 912, top: 62, bottom: 34 },
  { id: '17pro',    name: 'iPhone 17 Pro',      w: 402, h: 874, top: 62, bottom: 34 },
  { id: '17promax', name: 'iPhone 17 Pro Max',  w: 440, h: 956, top: 62, bottom: 34 },
];

/* эталон, по которому сняты все размеры */
export const REF_DEVICE = DEVICES.find((d) => d.id === '13promax')!;

export const findDevice = (id: string) => DEVICES.find((d) => d.id === id);

/* Какой это айфон — по размеру экрана (и отступу сверху, если он известен).
   Модели с одинаковым экраном неотличимы — берётся первая подходящая. */
export function detectDevice(w: number, h: number, top?: number): Device | undefined {
  const same = DEVICES.filter((d) => Math.abs(d.w - w) < 1 && Math.abs(d.h - h) < 1);
  if (same.length) return (top !== undefined && same.find((d) => Math.abs(d.top - top) < 1)) || same[same.length - 1];
  /* точного нет (например, окно браузера другого размера) — ближайший по ширине */
  return [...DEVICES].sort((a, b) => Math.abs(a.w - w) - Math.abs(b.w - w) || Math.abs(a.h - h) - Math.abs(b.h - h))[0];
}

/* ── выбранное устройство: «auto» или id модели ── */
let selected = 'auto';
const listeners = new Set<(id: string) => void>();

/* В браузере выбор читается сразу при запуске (до отрисовки), на телефоне — чуть позже */
if (Platform.OS === 'web') {
  try { selected = window.localStorage.getItem(DEVICE_KEY) || 'auto'; } catch { /* нет доступа */ }
} else {
  AsyncStorage.getItem(DEVICE_KEY).then((v) => {
    if (v && v !== selected) { selected = v; listeners.forEach((l) => l(v)); }
  }).catch(() => {});
}

export const getDeviceId = () => selected;

export function setDeviceId(id: string) {
  selected = id;
  AsyncStorage.setItem(DEVICE_KEY, id).catch(() => {});
  listeners.forEach((l) => l(id));
  /* в браузере размер «экрана» задаётся при запуске — перезагружаем страницу */
  if (Platform.OS === 'web') {
    try { window.localStorage.setItem(DEVICE_KEY, id); } catch { /* ничего */ }
    setTimeout(() => window.location.reload(), 150);
  }
}

export function useDeviceId() {
  const [id, setId] = useState(selected);
  useEffect(() => {
    const l = (v: string) => setId(v);
    listeners.add(l);
    if (selected !== id) setId(selected);
    return () => { listeners.delete(l); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return id;
}
