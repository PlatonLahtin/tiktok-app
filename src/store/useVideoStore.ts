import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';
import { AV1, AV2, ME } from '../constants/mockAssets';
import {
  VideoStats, DEFAULT_STATS, emptyStats, publishedNow, randomFeedStats, FeedCounts, normalizeStats,
  shortCount,
} from '../lib/videoStats';

// ключи, под которыми всё лежит в памяти телефона
const PROFILE_KEY = 'mockup-profile';
const MYVIDEOS_KEY = 'mockup-my-videos';
const FEEDSTATS_KEY = 'mockup-feed-stats';   // случайные цифры роликов ленты
const FEEDMINE_KEY = 'mockup-feed-mine';     // свои ролики, загруженные в ленту
const FEEDHIDDEN_KEY = 'mockup-feed-hidden'; // встроенные ролики, убранные из ленты
const ACCOUNTS_KEY = 'mockup-accounts';      // список аккаунтов и какой из них открыт
const PRESETS_KEY = 'mockup-stat-presets';   // пресеты статистики — общие для всех аккаунтов
const ACCOUNT_KEYS = [PROFILE_KEY, MYVIDEOS_KEY, FEEDSTATS_KEY, FEEDMINE_KEY, FEEDHIDDEN_KEY];

/* У каждого аккаунта свой набор данных: профиль, видео со статистикой,
   свои ролики в ленте. Первый («главный») аккаунт лежит под старыми
   ключами — так всё, что было до аккаунтов, осталось на месте;
   у остальных к ключу дописан номер аккаунта. */
const MAIN_ACCOUNT = 'main';
let account = MAIN_ACCOUNT;
/* встроенные ролики ленты, какими они были при запуске (заполняется
   сразу после создания хранилища): новый аккаунт начинает ленту с них */
let BUILT_IN: VideoPost[] = [];
const keyFor = (key: string, id: string) => (id === MAIN_ACCOUNT ? key : `${key}@${id}`);
const k = (key: string) => keyFor(key, account);

/* Цифры видео вне статистики. В TikTok одно и то же число в разных местах
   записано по-разному (в статистике «133,534», в профиле «133,5 тыс.»),
   поэтому у каждого места своё поле. Пустое поле — берём цифру
   из статистики и пишем её так, как пишет TikTok. */
export interface VideoDisplay {
  tileViews: string;       // плитка в профиле: ▷ 264
  screenViews: string;     // экран видео внизу: «Просмотры: 264»
  screenLikes: string;     // экран видео, правая колонка
  screenComments: string;
  screenSaves: string;
}

/* Видео в профиле: ролик, его длина, подписи и статистика */
export interface MyVideo {
  id: string;
  uri: string | null;   // файл в памяти приложения; null — встроенный ролик-заглушка
  duration: number;     // длина в секундах — единственное, что нельзя править
  date: string;         // подпись у ника на экране видео: «2 д. назад»
  description: string;
  display: VideoDisplay;
  stats: VideoStats;
}

/* Пресет: снимок всей настройки видео для «Анализа видео» —
   статистика целиком плюс то, что правится в блоке «Цифры видео»
   (дата у ника, описание, цифры на экране видео и плитке). */
export interface StatPreset {
  id: string;
  name: string;
  savedAt: number;
  stats: VideoStats;
  date: string;
  description: string;
  display: VideoDisplay;
}

const AUTO_DISPLAY: VideoDisplay = {
  tileViews: '', screenViews: '', screenLikes: '', screenComments: '', screenSaves: '',
};

/* из какой цифры статистики берётся каждое место */
const DISPLAY_SOURCE: Record<keyof VideoDisplay, keyof VideoStats['counts']> = {
  tileViews: 'views', screenViews: 'views', screenLikes: 'likes', screenComments: 'comments', screenSaves: 'saves',
};

/* что показать: вписанное руками или цифру статистики в записи TikTok */
export function shownCount(v: MyVideo, k: keyof VideoDisplay) {
  return v.display?.[k]?.trim() || shortCount(v.stats.counts[DISPLAY_SOURCE[k]]);
}

export const MY_VIDEO_SRC = require('../../assets/mock/my-video.mp4');
const MY_VIDEO_DURATION = 11.634;   // длина встроенного ролика

/* откуда плееру брать ролик: свой файл или встроенная заглушка */
export const videoSource = (v: { uri: string | null }) => (v.uri ? { uri: v.uri } : MY_VIDEO_SRC);

/* сегодняшняя дата в том же виде, что показывает приложение */
const today = () => {
  const d = new Date();
  return `${d.getDate()}-${d.getMonth() + 1}`;
};

/* ролик-заглушка, с которого всё начиналось */
const defaultMyVideo = (): MyVideo => ({
  id: 'my-1',
  uri: null,
  duration: MY_VIDEO_DURATION,
  date: today(),
  description: 'Описание видео — заглушка',
  display: AUTO_DISPLAY,
  stats: DEFAULT_STATS,
});

/* Записи старого вида (цифры лежали прямо в видео) переводим в новый:
   вписанные руками цифры переносим в stats.counts. */
function migrateMyVideo(v: any): MyVideo {
  if (v && v.stats) {
    const stats = normalizeStats(v.stats);
    return {
      ...v,
      date: v.date || today(),
      /* поле, где просто повторена цифра статистики, делаем автоматическим —
         тогда оно запишется как в TikTok («133,5 тыс.») */
      display: Object.fromEntries(
        (Object.keys(AUTO_DISPLAY) as (keyof VideoDisplay)[]).map((k) => {
          const val: string = v.display?.[k] ?? '';
          const digits = (t: string) => t.replace(/[\s,.]/g, '');
          const same = /^\d+$/.test(digits(val)) && digits(val) === digits(stats.counts[DISPLAY_SOURCE[k]]);
          return [k, same ? '' : val];   // то же число, только без запятых — это не своё значение
        }),
      ) as unknown as VideoDisplay,
      stats,
    };
  }
  const base = defaultMyVideo();
  return {
    ...base,
    id: v?.id ?? base.id,
    date: v?.date || today(),
    description: v?.description ?? base.description,
    display: AUTO_DISPLAY,
    stats: {
      ...DEFAULT_STATS,
      counts: {
        views: v?.views ?? DEFAULT_STATS.counts.views,
        likes: v?.likes ?? DEFAULT_STATS.counts.likes,
        comments: v?.comments ?? DEFAULT_STATS.counts.comments,
        shares: v?.shares ?? DEFAULT_STATS.counts.shares,
        saves: v?.saves ?? DEFAULT_STATS.counts.saves,
      },
    },
  };
}

/* Файл из галереи копируем в папку приложения — галерейная копия
   временная и может пропасть после перезапуска. */
async function keepFile(pickedUri: string, folder: string, fallbackExt: string): Promise<string> {
  const dir = new Directory(Paths.document, folder);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const ext = (pickedUri.split('?')[0].split('.').pop() || fallbackExt).toLowerCase();
  const dest = new File(dir, `f_${Date.now()}.${ext}`);
  await new File(pickedUri).copy(dest);
  return dest.uri;
}
export const keepVideoFile = (uri: string) => keepFile(uri, 'videos', 'mp4');
export const keepImageFile = (uri: string) => keepFile(uri, 'images', 'jpg');

/* В полном адресе файла iOS хранит номер «ячейки» приложения
   (…/Application/<номер>/…), и после каждого обновления он другой:
   файл на месте, а старый адрес пустой. Ячеек две: «Data» — наши
   данные (свои видео, картинки), «Bundle» — файлы самого приложения
   (встроенные аватарки). Каждую меняем на нынешнюю. */
const CELL = /\/(Data|Bundle)\/Application\/[0-9A-Fa-f-]{36}\//;
const cellOf = (uri: string) => uri.match(CELL)?.[0];
export function liveUri<T>(uri: T): T {
  if (typeof uri !== 'string' || !uri.startsWith('file:')) return uri;
  const kind = uri.match(CELL)?.[1];
  const now = kind === 'Data' ? cellOf(Paths.document.uri) : kind === 'Bundle' ? cellOf(ME) : undefined;
  return (now ? uri.replace(CELL, now) : uri) as T;
}

/* что из видео кладём в пресет — глубокая копия, чтобы правки видео не меняли пресет */
function snapshotOf(v: MyVideo) {
  return JSON.parse(JSON.stringify({
    stats: v.stats, date: v.date, description: v.description, display: v.display ?? AUTO_DISPLAY,
  })) as Pick<StatPreset, 'stats' | 'date' | 'description' | 'display'>;
}

/* удалить свой файл из памяти приложения; встроенные ролики не трогаем */
function dropFile(uri: string | undefined) {
  if (!uri || !uri.startsWith('file:')) return;
  try { const f = new File(uri); if (f.exists) f.delete(); } catch { /* уже нет — и ладно */ }
}

import { create } from 'zustand';

const DEFAULT_USER: UserProfile = {
  name: 'Пользователь',
  username: 'user_profile',
  bio: 'Описание профиля — заглушка',
  avatar: ME,
  following: '12',
  followers: '3456',
  likes: '78,9 тыс.',
  peekCount: '99',
  inboxBadge: '99+',
};

/* новый аккаунт — с нуля: без видео, счётчики по нулям */
const newUser = (n: number): UserProfile => ({
  name: 'Пользователь',
  username: `user_${n}`,
  bio: '',
  avatar: ME,
  following: '0',
  followers: '0',
  likes: '0',
  peekCount: '',
  inboxBadge: '',
});

const infoOf = (id: string, u: UserProfile): AccountInfo =>
  ({ id, name: u.name, username: u.username, avatar: u.avatar });

function saveAccounts(list: AccountInfo[]) {
  AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ list, current: account })).catch(() => {});
}

/* подставить свежие имя/ник/аватарку открытого аккаунта в список */
function syncAccount(list: AccountInfo[], u: UserProfile): AccountInfo[] {
  const next = list.some((a) => a.id === account)
    ? list.map((a) => (a.id === account ? infoOf(account, u) : a))
    : [...list, infoOf(account, u)];
  saveAccounts(next);
  return next;
}

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  /* Счётчики профиля. Храним строкой: что вбили — то и показываем. */
  following: string;
  followers: string;
  likes: string;
  peekCount: string;    // число у кружков-аватарок «недавно смотрели профиль»
  inboxBadge: string;   // надпись на значке «Входящие»; пусто — значка нет
}

/* строка в списке аккаунтов: чтобы показать его, не открывая */
export interface AccountInfo {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: string;
  isLiked?: boolean;
  replies?: Comment[];
}

export interface VideoPost {
  id: string;
  videoUrl: any;
  username: string;
  userAvatar: string;
  description: string;
  music: string;
  views: number;
  likes: number;
  commentsCount: number;
  saves: number;
  shares: number;
  isLiked: boolean;
  isFollowing: boolean;
  comments: Comment[];
}

interface VideoState {
  accounts: AccountInfo[];
  currentAccountId: string;
  hydrateAll: () => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
  addAccount: () => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  isLoggedIn: boolean;
  showAuthModal: boolean;
  login: () => void;
  logout: () => void;
  setShowAuthModal: (show: boolean) => void;
  currentUser: UserProfile;
  updateProfile: (profile: Partial<UserProfile>) => void;
  hydrateProfile: () => Promise<void>;
  myVideos: MyVideo[];
  addMyVideo: (file?: { uri: string; duration: number }) => void;
  removeMyVideo: (id: string) => void;
  updateMyVideo: (id: string, patch: Partial<MyVideo>) => void;
  updateMyVideoStats: (id: string, patch: Partial<VideoStats>) => void;
  hydrateMyVideos: () => Promise<void>;
  presets: StatPreset[];
  savePreset: (name: string, videoId: string) => void;
  overwritePreset: (presetId: string, videoId: string) => void;
  applyPreset: (presetId: string, videoId: string) => void;
  removePreset: (presetId: string) => void;
  hydratePresets: () => Promise<void>;
  addFeedVideo: (file: { uri: string; description?: string }) => void;
  hydrateFeed: () => Promise<void>;
  videos: VideoPost[];
  hiddenVideoIds: string[];
  toggleLike: (id: string) => void;
  toggleFollow: (id: string) => void;
  addComment: (videoId: string, commentText: string) => void;
  toggleCommentLike: (videoId: string, commentId: string) => void;
  replyToComment: (videoId: string, commentId: string, replyText: string) => void;
  addVideo: (video: Omit<VideoPost, 'id' | 'username' | 'userAvatar' | 'views' | 'likes' | 'commentsCount' | 'saves' | 'shares' | 'isLiked' | 'isFollowing' | 'comments'>) => void;
  hideVideo: (id: string) => void;
  removeFeedVideo: (id: string) => void;
  restoreBuiltInFeed: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  accounts: [],
  currentAccountId: MAIN_ACCOUNT,

  /* запуск: узнаём, какой аккаунт открыт, и достаём его данные */
  hydrateAll: async () => {
    try {
      const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const list: AccountInfo[] = (saved.list ?? []).map((a: AccountInfo) => ({ ...a, avatar: liveUri(a.avatar) }));
        account = list.some((a) => a.id === saved.current) ? saved.current : MAIN_ACCOUNT;
        set({ accounts: list, currentAccountId: account });
      }
    } catch {
      // списка нет — значит, аккаунт один, главный
    }
    const st = get();
    await Promise.all([st.hydrateProfile(), st.hydrateMyVideos(), st.hydrateFeed(), st.hydratePresets()]);
    if (get().accounts.length === 0) set((state) => ({ accounts: syncAccount([], state.currentUser) }));
  },

  /* переключиться: всё на экранах сбрасываем и читаем данные того аккаунта */
  switchAccount: async (id) => {
    if (id === account) return;
    account = id;
    set((state) => {
      saveAccounts(state.accounts);
      return {
        currentAccountId: id,
        currentUser: DEFAULT_USER,
        myVideos: id === MAIN_ACCOUNT ? [defaultMyVideo()] : [],
        videos: BUILT_IN.map((v) => ({ ...v, ...randomFeedStats() })),
        hiddenVideoIds: [],
      };
    });
    const st = get();
    await Promise.all([st.hydrateProfile(), st.hydrateMyVideos(), st.hydrateFeed()]);
  },

  /* новый аккаунт с нуля; сразу открываем его */
  addAccount: async () => {
    const id = `acc-${Date.now()}`;
    const taken = new Set(get().accounts.map((a) => a.username));
    let n = get().accounts.length + 1;
    while (taken.has(`user_${n}`)) n++;
    const user = newUser(n);
    await AsyncStorage.multiSet([
      [keyFor(PROFILE_KEY, id), JSON.stringify(user)],
      [keyFor(MYVIDEOS_KEY, id), JSON.stringify([])],
    ]).catch(() => {});
    set((state) => ({ accounts: [...state.accounts, infoOf(id, user)] }));
    await get().switchAccount(id);
  },

  /* удалить аккаунт вместе с его видео; открытый — сначала уходим с него */
  removeAccount: async (id) => {
    const rest = get().accounts.filter((a) => a.id !== id);
    if (rest.length === 0) return;
    if (id === account) await get().switchAccount(rest[0].id);
    try {
      const [mine, feed] = await Promise.all([
        AsyncStorage.getItem(keyFor(MYVIDEOS_KEY, id)),
        AsyncStorage.getItem(keyFor(FEEDMINE_KEY, id)),
      ]);
      (mine ? JSON.parse(mine) : []).forEach((v: MyVideo) => dropFile(liveUri(v.uri) ?? undefined));
      (feed ? JSON.parse(feed) : []).forEach((v: VideoPost) => dropFile(liveUri(v.videoUrl?.uri)));
    } catch {
      // файлы не нашлись — не страшно
    }
    await AsyncStorage.multiRemove(ACCOUNT_KEYS.map((key) => keyFor(key, id))).catch(() => {});
    set(() => {
      saveAccounts(rest);
      return { accounts: rest };
    });
  },

  isLoggedIn: true,   // макет сразу показывает профиль, стенки входа нам не нужно
  showAuthModal: false,
  login: () => set({ isLoggedIn: true, showAuthModal: false }),
  logout: () => set({ isLoggedIn: false }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  currentUser: DEFAULT_USER,
  updateProfile: (profile) =>
    set((state) => {
      const next = { ...state.currentUser, ...profile };
      // пишем в память телефона, чтобы пережило перезапуск
      AsyncStorage.setItem(k(PROFILE_KEY), JSON.stringify(next)).catch(() => {});
      const accounts = syncAccount(state.accounts, next);
      return { currentUser: next, accounts };
    }),

  myVideos: [defaultMyVideo()],

  /* без файла — ещё одна копия ролика-заглушки (как раньше);
     с файлом — свой ролик с пустой статистикой */
  addMyVideo: (file) =>
    set((state) => {
      const video: MyVideo = file
        ? {
            id: `my-${Date.now()}`,
            uri: file.uri,
            duration: file.duration,
            date: today(),
            description: '',
            display: AUTO_DISPLAY,
            stats: emptyStats(file.duration, publishedNow()),
          }
        : { ...defaultMyVideo(), id: `my-${Date.now()}` };
      /* как в TikTok: новое видео — первым, слева сверху */
      const next = [video, ...state.myVideos];
      AsyncStorage.setItem(k(MYVIDEOS_KEY), JSON.stringify(next)).catch(() => {});
      return { myVideos: next };
    }),

  removeMyVideo: (id) =>
    set((state) => {
      dropFile(state.myVideos.find((v) => v.id === id)?.uri ?? undefined);
      const next = state.myVideos.filter((v) => v.id !== id);
      AsyncStorage.setItem(k(MYVIDEOS_KEY), JSON.stringify(next)).catch(() => {});
      return { myVideos: next };
    }),

  updateMyVideo: (id, patch) =>
    set((state) => {
      const next = state.myVideos.map((v) => (v.id === id ? { ...v, ...patch } : v));
      AsyncStorage.setItem(k(MYVIDEOS_KEY), JSON.stringify(next)).catch(() => {});
      return { myVideos: next };
    }),

  updateMyVideoStats: (id, patch) =>
    set((state) => {
      const next = state.myVideos.map((v) => (v.id === id ? { ...v, stats: { ...v.stats, ...patch } } : v));
      AsyncStorage.setItem(k(MYVIDEOS_KEY), JSON.stringify(next)).catch(() => {});
      return { myVideos: next };
    }),

  /* ── пресеты ── */
  presets: [],

  savePreset: (name, videoId) =>
    set((state) => {
      const v = state.myVideos.find((x) => x.id === videoId);
      if (!v) return {};
      const preset: StatPreset = {
        id: `preset-${Date.now()}`,
        name: name.trim() || `Пресет ${state.presets.length + 1}`,
        savedAt: Date.now(),
        ...snapshotOf(v),
      };
      const next = [preset, ...state.presets];
      AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(next)).catch(() => {});
      return { presets: next };
    }),

  overwritePreset: (presetId, videoId) =>
    set((state) => {
      const v = state.myVideos.find((x) => x.id === videoId);
      if (!v) return {};
      const next = state.presets.map((p) => (p.id === presetId ? { ...p, savedAt: Date.now(), ...snapshotOf(v) } : p));
      AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(next)).catch(() => {});
      return { presets: next };
    }),

  /* длина ролика своя у каждого видео — её пресет не трогает */
  applyPreset: (presetId, videoId) =>
    set((state) => {
      const p = state.presets.find((x) => x.id === presetId);
      if (!p) return {};
      const copy = JSON.parse(JSON.stringify(p)) as StatPreset;
      const next = state.myVideos.map((v) => (v.id === videoId
        ? { ...v, stats: copy.stats, date: copy.date, description: copy.description, display: copy.display }
        : v));
      AsyncStorage.setItem(k(MYVIDEOS_KEY), JSON.stringify(next)).catch(() => {});
      return { myVideos: next };
    }),

  removePreset: (presetId) =>
    set((state) => {
      const next = state.presets.filter((p) => p.id !== presetId);
      AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(next)).catch(() => {});
      return { presets: next };
    }),

  hydratePresets: async () => {
    try {
      const raw = await AsyncStorage.getItem(PRESETS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        set({
          presets: list.map((p: StatPreset) => {
            const stats = normalizeStats(p.stats);
            return {
              ...p,
              display: { ...AUTO_DISPLAY, ...(p.display ?? {}) },
              stats: stats.otherCovers ? { ...stats, otherCovers: stats.otherCovers.map(liveUri) } : stats,
            };
          }),
        });
      }
    } catch {
      // пресетов нет — список пустой
    }
  },

  hydrateMyVideos: async () => {
    try {
      const raw = await AsyncStorage.getItem(k(MYVIDEOS_KEY));
      if (raw) {
        const list = JSON.parse(raw);
        /* старые записи переводим в новый вид и сразу пересохраняем */
        if (Array.isArray(list)) {
          const next = list.map(migrateMyVideo).map((v) => ({
            ...v,
            uri: liveUri(v.uri),
            stats: v.stats.otherCovers
              ? { ...v.stats, otherCovers: v.stats.otherCovers.map(liveUri) }
              : v.stats,
          }));
          set({ myVideos: next });
          AsyncStorage.setItem(k(MYVIDEOS_KEY), JSON.stringify(next)).catch(() => {});
        }
      }
    } catch {
      // нет сохранённого — остаёмся на заглушке
    }
  },

  /* свой ролик в ленту: первым, со случайными правдоподобными цифрами */
  addFeedVideo: (file) =>
    set((state) => {
      const video: VideoPost = {
        id: `feed-${Date.now()}`,
        videoUrl: { uri: file.uri },
        username: state.currentUser.username,
        userAvatar: state.currentUser.avatar,
        description: file.description ?? '',
        music: 'оригинальный звук',
        ...randomFeedStats(),
        isLiked: false,
        isFollowing: false,
        comments: [],
      };
      const mine = [video, ...state.videos.filter((v) => v.id.startsWith('feed-'))];
      AsyncStorage.setItem(k(FEEDMINE_KEY), JSON.stringify(mine)).catch(() => {});
      return { videos: [video, ...state.videos] };
    }),

  /* Цифры встроенных роликов ленты случайные, но выпадают один раз:
     при первом запуске запоминаем, дальше показываем те же. */
  hydrateFeed: async () => {
    try {
      const [rawStats, rawMine] = await Promise.all([
        AsyncStorage.getItem(k(FEEDSTATS_KEY)),
        AsyncStorage.getItem(k(FEEDMINE_KEY)),
      ]);
      const mine: VideoPost[] = (rawMine ? JSON.parse(rawMine) : []).map((v: VideoPost) => ({
        ...v,
        videoUrl: v.videoUrl?.uri ? { uri: liveUri(v.videoUrl.uri) } : v.videoUrl,
        userAvatar: liveUri(v.userAvatar),
      }));
      const rawHidden = await AsyncStorage.getItem(k(FEEDHIDDEN_KEY));
      if (rawHidden) set({ hiddenVideoIds: JSON.parse(rawHidden) });
      set((state) => {
        let saved: Record<string, FeedCounts> = rawStats ? JSON.parse(rawStats) : {};
        const builtIn = state.videos.filter((v) => !v.id.startsWith('feed-'));
        const withStats = builtIn.map((v) => (saved[v.id] ? { ...v, ...saved[v.id] } : v));
        if (!rawStats) {
          saved = Object.fromEntries(withStats.map((v) => [v.id, {
            views: v.views, likes: v.likes, commentsCount: v.commentsCount, saves: v.saves, shares: v.shares,
          }]));
          AsyncStorage.setItem(k(FEEDSTATS_KEY), JSON.stringify(saved)).catch(() => {});
        }
        return { videos: [...mine, ...withStats] };
      });
    } catch {
      // память недоступна — остаёмся на цифрах этого запуска
    }
  },

  // читаем сохранённое при запуске приложения
  hydrateProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem(k(PROFILE_KEY));
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.avatar) saved.avatar = liveUri(saved.avatar);
        set((state) => {
          const currentUser = { ...state.currentUser, ...saved };
          return { currentUser, accounts: syncAccount(state.accounts, currentUser) };
        });
      }
    } catch {
      // нет сохранённого или память недоступна — остаёмся на значениях по умолчанию
    }
  },
  videos: [
    {
      id: '1',
      videoUrl: require('../../assets/mock/video1.mp4'),
      username: 'twitrixx',
      userAvatar: AV2,
      description: 'Кс2, но я...',
      music: 'оригинальный звук',
      ...randomFeedStats(),
      isLiked: false,
      isFollowing: false,
      comments: [
        {
          id: 'c1',
          username: 'user_03',
          avatar: ME,
          text: 'Комментарий — заглушка',
          timestamp: '1 нед.'
        },
        {
          id: 'c2',
          username: 'user_04',
          avatar: ME,
          text: 'Комментарий — заглушка',
          timestamp: '1 нед.'
        }
      ]
    },
    {
      id: '2',
      videoUrl: require('../../assets/mock/video2.mp4'),
      username: 'checkunets007',
      userAvatar: AV1,
      description: 'Кс2, но я...',
      music: 'оригинальный звук',
      ...randomFeedStats(),
      isLiked: false,
      isFollowing: true,
      comments: [
        {
          id: 'c3',
          username: 'user_05',
          avatar: ME,
          text: 'Комментарий — заглушка',
          timestamp: '1 нед.'
        }
      ]
    },
    {
      id: '3',
      videoUrl: require('../../assets/mock/video1.mp4'),
      username: 'user_01',
      userAvatar: AV1,
      description: 'Кс2, но я...',
      music: 'оригинальный звук',
      ...randomFeedStats(),
      isLiked: true,
      isFollowing: false,
      comments: [
        {
          id: 'c4',
          username: 'user_06',
          avatar: ME,
          text: 'Комментарий — заглушка',
          timestamp: '1 нед.'
        }
      ]
    },
    {
      id: '4',
      videoUrl: require('../../assets/mock/video2.mp4'),
      username: 'user_02',
      userAvatar: AV1,
      description: 'Кс2, но я...',
      music: 'оригинальный звук',
      ...randomFeedStats(),
      isLiked: false,
      isFollowing: false,
      comments: []
    }
  ],
  toggleLike: (id) => set((state) => ({
    videos: state.videos.map((vid) =>
      vid.id === id
        ? {
            ...vid,
            isLiked: !vid.isLiked,
            likes: vid.isLiked ? vid.likes - 1 : vid.likes + 1,
          }
        : vid
    ),
  })),
  toggleFollow: (id) => set((state) => ({
    videos: state.videos.map((vid) =>
      vid.id === id ? { ...vid, isFollowing: !vid.isFollowing } : vid
    ),
  })),
  addComment: (videoId, commentText) => set((state) => ({
    videos: state.videos.map((vid) => {
      if (vid.id === videoId) {
        const newComment: Comment = {
          id: `c_${Date.now()}`,
          username: state.currentUser.username,
          avatar: state.currentUser.avatar,
          text: commentText,
          timestamp: '1 нед.',
        };
        return {
          ...vid,
          comments: [newComment, ...vid.comments],
          commentsCount: vid.commentsCount + 1,
        };
      }
      return vid;
    }),
  })),
  toggleCommentLike: (videoId, commentId) => set((state) => ({
    videos: state.videos.map(vid => {
      if (vid.id !== videoId) return vid;
      return {
        ...vid,
        comments: vid.comments.map(c => 
          c.id === commentId ? { ...c, isLiked: !c.isLiked } : c
        )
      };
    })
  })),
  replyToComment: (videoId, commentId, replyText) => set((state) => ({
    videos: state.videos.map(vid => {
      if (vid.id !== videoId) return vid;
      const newReply: Comment = {
        id: `r_${Date.now()}`,
        username: state.currentUser.username,
        avatar: state.currentUser.avatar,
        text: replyText,
        timestamp: '1 нед.',
      };
      return {
        ...vid,
        commentsCount: vid.commentsCount + 1,
        comments: vid.comments.map(c => 
          c.id === commentId 
            ? { ...c, replies: [...(c.replies || []), newReply] } 
            : c
        )
      };
    })
  })),
  hiddenVideoIds: [],
  addVideo: (video) => set((state) => ({
    videos: [
      {
        ...video,
        username: state.currentUser.username,
        userAvatar: state.currentUser.avatar,
        id: `v_${Date.now()}`,
        ...randomFeedStats(),
        isLiked: false,
        isFollowing: false,
        comments: [],
      },
      ...state.videos,
    ],
  })),
  /* Убрать ролик из ленты: свой — удаляем совсем вместе с файлом,
     встроенный — прячем (его можно вернуть) */
  removeFeedVideo: (id) => set((state) => {
    if (id.startsWith('feed-')) {
      const video = state.videos.find((v) => v.id === id);
      dropFile(video?.videoUrl?.uri);
      const videos = state.videos.filter((v) => v.id !== id);
      AsyncStorage.setItem(k(FEEDMINE_KEY), JSON.stringify(videos.filter((v) => v.id.startsWith('feed-')))).catch(() => {});
      return { videos };
    }
    const hiddenVideoIds = [...new Set([...state.hiddenVideoIds, id])];
    AsyncStorage.setItem(k(FEEDHIDDEN_KEY), JSON.stringify(hiddenVideoIds)).catch(() => {});
    return { hiddenVideoIds };
  }),

  restoreBuiltInFeed: () => set(() => {
    AsyncStorage.removeItem(k(FEEDHIDDEN_KEY)).catch(() => {});
    return { hiddenVideoIds: [] };
  }),

  hideVideo: (id) => set((state) => ({
    hiddenVideoIds: [...state.hiddenVideoIds, id],
  })),
}));

BUILT_IN = useVideoStore.getState().videos;
