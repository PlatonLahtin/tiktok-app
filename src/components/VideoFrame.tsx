/* Первый кадр ролика, заполняющий рамку целиком: для обложек
   в профиле и статистике.

   Кадр — обычная картинка, а не плеер на паузе: у айфона видеодекодеров
   считанное число, и когда плееров-обложек много, часть из них
   не грузится и показывает перечёркнутый треугольник. Поэтому кадр
   один раз вынимаем временным плеером, плеер закрываем, картинку помним.

   Встроенный ролик-заглушка 720×1280 — это картинка 720×588 посередине
   и чёрные поля сверху и снизу. Его увеличиваем так, чтобы картинка
   заполнила рамку, а поля ушли за край. Свои ролики из галереи
   обычные — их просто обрезаем по рамке. */

import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { createVideoPlayer, VideoThumbnail } from 'expo-video';
import { MY_VIDEO_SRC } from '../store/useVideoStore';
import { webVideoFrame } from '../lib/webFiles';

const DEFAULT_FRAME = { w: 720, h: 1280, bandH: 588 };

/* готовые кадры: один ролик — одна картинка на всё приложение */
const thumbs = new Map<string, Promise<VideoThumbnail | null>>();
/* кадры вынимаем по одному, чтобы не занять разом все декодеры */
let queue: Promise<unknown> = Promise.resolve();

function waitReady(player: ReturnType<typeof createVideoPlayer>, ms: number) {
  return new Promise<void>((resolve) => {
    if (player.status === 'readyToPlay') return resolve();
    const timer = setTimeout(() => { sub.remove(); resolve(); }, ms);
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' || status === 'error') {
        clearTimeout(timer); sub.remove(); resolve();
      }
    });
  });
}

async function grabFrame(source: any): Promise<VideoThumbnail | null> {
  /* в браузере expo-video кадры не вынимает — берём кадр через <video> и canvas */
  if (Platform.OS === 'web') {
    /* встроенный ролик в браузере бывает номером, строкой или объектом — достаём адрес из любого */
    let src: string | undefined;
    try {
      src = typeof source === 'string' ? source
        : typeof source === 'number' ? Asset.fromModule(source).uri
        : source?.uri ?? (source?.default ? Asset.fromModule(source.default).uri : undefined);
    } catch { src = undefined; }
    return src ? ((await webVideoFrame(src)) as unknown as VideoThumbnail | null) : null;
  }
  const player = createVideoPlayer(source);
  player.muted = true;
  try {
    await waitReady(player, 5000);
    const [frame] = await player.generateThumbnailsAsync(0, { maxWidth: 480 });
    return frame ?? null;
  } catch {
    return null;
  } finally {
    player.release();
  }
}

export function useVideoThumb(source: any): VideoThumbnail | null {
  const key = typeof source === 'number' ? `asset:${source}` : typeof source === 'string' ? source : String(source?.uri ?? JSON.stringify(source ?? ''));
  const [thumb, setThumb] = useState<VideoThumbnail | null>(null);

  useEffect(() => {
    let alive = true;
    let job = thumbs.get(key);
    if (!job) {
      job = queue.then(() => grabFrame(source));
      queue = job;
      thumbs.set(key, job);
      /* не вышло — в следующий раз попробуем заново */
      job.then((t) => { if (!t) thumbs.delete(key); });
    }
    job.then((t) => { if (alive) setThumb(t); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return thumb;
}

export default function VideoFrame({
  uri, source, width, height, radius = 0,
}: {
  uri?: string | null;
  source?: any;          // любой другой ролик (например, встроенный в ленту) — просто по рамке
  width: number; height: number; radius?: number;
}) {
  const thumb = useVideoThumb(source ?? (uri ? { uri } : MY_VIDEO_SRC));

  if (uri || source) {
    return (
      <View style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: '#141414' }}>
        {thumb && <Image source={thumb} style={{ width, height }} contentFit="cover" />}
      </View>
    );
  }

  /* заглушка: картинка заполняет рамку и по ширине, и по высоте */
  const F = DEFAULT_FRAME;
  const k = Math.max(width / F.w, height / F.bandH);
  const vw = F.w * k, vh = F.h * k;
  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: '#141414' }}>
      {thumb && (
        <Image
          source={thumb}
          style={{ width: vw, height: vh, marginLeft: (width - vw) / 2, marginTop: (height - vh) / 2 }}
          contentFit="contain"
        />
      )}
    </View>
  );
}
