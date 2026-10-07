/* Статистика одного видео — всё, что показывает экран «Анализ видео».
   Цифры храним строкой там, где их вписывают руками («1,004», «3 ч.:27 мин.:13 с.»),
   и числом там, где по ним рисуются графики и полоски. */

/* строка списка «подпись — процент — полоска» */
export type StatRow = { label: string; value: number; text?: string; chevron?: boolean };

export interface VideoStats {
  /* ряд из пяти значков под обложкой; они же — цифры на экране видео */
  counts: { views: string; likes: string; comments: string; shares: string; saves: string };
  published: string;               // «Опубликовано 21 сент 2026, 02:06»

  /* «Обзор» → «Основные метрики» */
  metricsNote: string;             // «Обновление в реальном времени.»
  tiles: { views: string; totalTime: string; avgTime: string; fullWatch: string; newFollowers: string };
  /* просмотры по дням: от 2 до 7 точек; trendNote — плашка
     «График показывает тренд…» под графиком */
  daily: { points: number[]; from: string; to: string; trendNote: boolean };

  /* «Обзор» → «Коэффициент удержания»: доля зрителей в процентах.
     Фразы собираются из шаблона — вписываются только цифры. */
  retention: {
    curve: number[];
    avg: string;       // «35» → «В среднем, зрители смотрели ваше видео на 35%.»
    dropAt: string;    // «0:02» → «…прекратили просмотр на отметке 0:02…»
  };

  traffic: StatRow[];              // «Источники трафика»
  queries: StatRow[];              // «Поисковые запросы»

  /* «Зрители» */
  viewers: {
    total: string;                 // «935»
    delta: string;                 // «+827»
    newShare: number;              // доля новых зрителей, 0…1
    followerShare: number;         // доля подписчиков, 0…1
    gender: [number, number, number];   // мужской, женский, другое — в процентах
    ages: StatRow[];
    places: StatRow[];
  };

  /* «Вовлеченность» */
  words: { word: string; count: number }[];

  /* «Посмотреть данные других публикаций»: три картинки справа.
     null — обложка ролика из профиля (как было), строка — своя картинка */
  otherCovers?: (string | null)[];
  likes: {
    curve: number[];   // лайки по секундам, в процентах
    peakAt: string;    // «0:01» → «…поставили лайк этому видео на отметке 0:01…»
  };
}

/* Ровно то, что сейчас на экране статистики, — с эталонных скриншотов */
export const DEFAULT_STATS: VideoStats = {
  counts: { views: '1,004', likes: '30', comments: '0', shares: '1', saves: '5' },
  published: 'Опубликовано 21 сент 2026, 02:06',

  metricsNote: 'Обновление в реальном времени.',
  tiles: {
    views: '1K',
    totalTime: '3 ч.:27 мин.:13 с.',
    avgTime: '11.8 с.',
    fullWatch: '10.33%',
    newFollowers: '1',
  },
  daily: { points: [1, 0, 0, 0, 13, 1, 5], from: '13 сент', to: '19 сент', trendNote: true },

  retention: {
    curve: [100, 93, 72, 65, 58, 53, 49, 44, 39, 34, 29, 26, 25, 25, 24, 23, 22, 21, 20, 17, 13, 11, 10, 10, 10],
    avg: '35',
    dropAt: '0:02',
  },

  traffic: [
    { label: 'Для вас', value: 98.0 },
    { label: 'Личный профиль', value: 1.9 },
    { label: 'Другое', value: 0.1 },
    { label: 'Подписки', value: 0.0 },
    { label: 'Личные сообщения', value: 0.0 },
    { label: 'Звук', value: 0.0 },
    { label: 'Поиск', value: 0.0 },
  ],
  queries: [
    { label: 'средний возраст милионеров', value: 8.7 },
    { label: 'миллионер в 16', value: 3.4 },
    { label: 'доход по возрасту', value: 2.2 },
    { label: 'средний возраст милионеров', value: 2.0 },
    { label: 'миллионер', value: 2.0 },
  ],

  viewers: {
    total: '935',
    delta: '+827',
    newShare: 0.85,
    followerShare: 0,
    gender: [40, 58, 2],
    ages: [
      { label: '18 - 24', value: 37, text: '37%' },
      { label: '25 - 34', value: 34, text: '34%' },
      { label: '35 - 44', value: 11, text: '11%' },
      { label: '45 - 54', value: 9, text: '9%' },
      { label: '55+', value: 9, text: '9%' },
    ],
    places: [
      { label: 'Польша', value: 14.3 },
      { label: 'Соединенные Штаты', value: 11.8, chevron: true },
      { label: 'Германия', value: 8.3 },
      { label: 'Соединенное Королевство', value: 7.9 },
      { label: 'Латвия', value: 6.8 },
      { label: 'Беларусь', value: 6.7 },
      { label: 'Эстония', value: 4.6, chevron: true },
      { label: 'Украина', value: 4.5 },
      { label: 'Нидерланды', value: 3.5 },
      { label: 'Литва', value: 3.2 },
      { label: 'Другое', value: 28.4, chevron: true },
    ],
  },

  words: [
    { word: 'это просто', count: 1 },
    { word: 'тик токе', count: 1 },
    { word: 'насамом деле', count: 1 },
    { word: 'жи ес', count: 1 },
  ],
  likes: {
    curve: [15, 17.7, 6.5, 3.5, 5.8, 3.2, 7.1, 17.3, 6.2, 3, 2.8, 0],
    peakAt: '0:01',
  },
};

/* Пустая статистика для только что загруженного в профиль ролика:
   счётчики по нулям, графики лежат на нуле — по точке на секунду. */
export function emptyStats(durationSec: number, published: string): VideoStats {
  const perSec = Array(Math.max(2, Math.floor(durationSec) + 1)).fill(0);
  return {
    counts: { views: '0', likes: '0', comments: '0', shares: '0', saves: '0' },
    published,
    metricsNote: 'Обновление в реальном времени.',
    tiles: { views: '0', totalTime: '0 ч.:00 мин.:00 с.', avgTime: '0.0 с.', fullWatch: '0%', newFollowers: '0' },
    daily: { points: [0, 0, 0, 0, 0, 0, 0], from: '', to: '', trendNote: true },
    retention: { curve: [...perSec], avg: '', dropAt: '' },
    traffic: [],
    queries: [],
    viewers: {
      total: '0', delta: '+0', newShare: 0, followerShare: 0,
      gender: [0, 0, 0], ages: [], places: [],
    },
    words: [],
    likes: { curve: [...perSec], peakAt: '' },
  };
}

/* ── Фразы «Удержания» и «Лайков»: дословно как в TikTok, меняются только цифры.
   Пустая цифра — фразы нет (у нового видео данных ещё нет). ── */
export const retentionLead = (avg: string) =>
  (avg.trim() ? `В среднем, зрители смотрели ваше видео на ${avg.trim()}%.` : '');
export const retentionNote = (at: string) =>
  (at.trim()
    ? `Большинство зрителей прекратили просмотр на отметке ${at.trim()}. Узнайте, с какого момента они потеряли интерес к вашему видео.`
    : '');
/* строки разбиты как на эталоне — на экране пошире иначе переносится по-другому */
export const likesNote = (at: string) =>
  (at.trim()
    ? `Большинство зрителей поставили лайк этому\nвидео на отметке ${at.trim()}. Узнайте, какой момент\nпонравился зрителям.`
    : '');

/* ── Автоматические значения: пустое поле в редакторе = посчитать самим ── */

/* «0:02» — как TikTok пишет отметку в ролике */
export const markText = (sec: number) => {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/* время точки кривой: по точке на секунду — секунда; иначе равномерно по ролику */
const pointTime = (i: number, n: number, duration: number) =>
  (n === Math.floor(duration) + 1 ? i : (i / Math.max(n - 1, 1)) * duration);

const hasData = (curve: number[]) => curve.some((v) => v > 0);

/* удержание: средний процент — среднее по кривой; обрыв — где кривая падает сильнее всего */
export function autoRetention(curve: number[], duration: number) {
  if (!hasData(curve)) return { avg: '', dropAt: '' };
  const avg = Math.round(curve.reduce((a, v) => a + v, 0) / curve.length);
  let at = 0, worst = -Infinity;
  for (let i = 1; i < curve.length; i++) {
    const drop = curve[i - 1] - curve[i];
    if (drop > worst) { worst = drop; at = i; }
  }
  return { avg: String(avg), dropAt: markText(pointTime(at, curve.length, duration)) };
}

/* лайки: секунда, на которой лайков больше всего */
export function autoLikesPeak(curve: number[], duration: number) {
  if (!hasData(curve)) return '';
  let at = 0;
  curve.forEach((v, i) => { if (v > curve[at]) at = i; });
  return markText(pointTime(at, curve.length, duration));
}

/* Число как его пишет TikTok на экране видео и в профиле:
   345 → «345», 1200 → «1,2 тыс.», 11012 → «11 тыс.», 2 500 000 → «2,5 млн».
   Если вписан текст («51,5 тыс.») — оставляем как есть. */
export function shortCount(raw: string) {
  const digits = raw.replace(/[\s,.]/g, '');
  if (!/^\d+$/.test(digits)) return raw;
  const n = parseInt(digits, 10);
  const short = (v: number, unit: string) => `${v.toFixed(1).replace(/\.0$/, '').replace('.', ',')} ${unit}`;
  if (n >= 1_000_000) return short(n / 1_000_000, 'млн');
  if (n >= 1_000) return short(n / 1_000, 'тыс.');
  return String(n);
}

/* Статистика, сохранённая раньше, хранила фразы целиком — достаём из них цифры */
export function normalizeStats(st: any): VideoStats {
  const r = st.retention ?? {};
  const l = st.likes ?? {};
  const pick = (text: unknown, re: RegExp) => (typeof text === 'string' ? (text.match(re)?.[1] ?? '') : '');
  return {
    ...st,
    /* статистика, сохранённая до выключателя плашки, — с плашкой */
    daily: { ...st.daily, trendNote: st.daily?.trendNote ?? true },
    retention: {
      curve: r.curve ?? [],
      avg: r.avg ?? pick(r.lead, /на\s+([\d.,]+)%/),
      dropAt: r.dropAt ?? pick(r.note, /отметке\s+(\d+:\d{2})/),
    },
    likes: {
      curve: l.curve ?? [],
      peakAt: l.peakAt ?? pick(l.note, /отметке\s+(\d+:\d{2})/),
    },
  };
}

/* «Опубликовано 27 сент 2026, 14:05» — для текущего момента */
const MONTHS = ['янв', 'февр', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сент', 'окт', 'нояб', 'дек'];
export function publishedNow(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Опубликовано ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

/* ── Лента рекомендаций: случайные, но правдоподобные цифры ──
   Всё считается от просмотров: лайки 5–15 %, сохранения 10–20 %,
   репосты 15–25 %, комментарии 0,5–1,5 %. */
export interface FeedCounts { views: number; likes: number; commentsCount: number; saves: number; shares: number }

const between = (a: number, b: number) => a + Math.random() * (b - a);

export function randomFeedStats(): FeedCounts {
  /* просмотры: от 5 тыс. до 2 млн, чаще — ближе к нижней границе */
  const views = Math.round(5_000 * Math.pow(400, Math.random()));
  return {
    views,
    likes: Math.round(views * between(0.05, 0.15)),
    commentsCount: Math.round(views * between(0.005, 0.015)),
    saves: Math.round(views * between(0.10, 0.20)),
    shares: Math.round(views * between(0.15, 0.25)),
  };
}
