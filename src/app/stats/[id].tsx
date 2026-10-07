/* Экран «Анализ видео». Пока это макет: числа и дата взяты с эталона,
   своей логики под ними нет — живой только первый кадр ролика.

   Все размеры сняты с эталонного скриншота и переведены в точки экрана.
   Отсчёт идёт от безопасной зоны сверху (у эталона она 59). */

import React, { createContext, useContext, useRef, useState } from 'react';
import { View, Image, Pressable, StatusBar, Dimensions } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text } from '../../components/FixedText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEventListener } from 'expo';
import { ChevronLeft, ChevronRight, Info, ArrowUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import Svg, {
  Path, Line, Circle, Defs, LinearGradient, Stop, Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, useAnimatedRef,
  scrollTo, withTiming, interpolate, type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { useVideoStore, videoSource } from '../../store/useVideoStore';
import VideoFrame from '../../components/VideoFrame';
import {
  VideoStats, DEFAULT_STATS, StatRow, retentionLead, retentionNote, likesNote,
  autoRetention, autoLikesPeak,
} from '../../lib/videoStats';
import StatsEditSheet, { Section } from '../../components/stats/StatsEditor';
import PresetsSheet from '../../components/stats/PresetsSheet';
import { Pencil, Bookmark } from 'lucide-react-native';
import { roundedTriangle } from '../../lib/shapes';
import { goBack } from '../../lib/goBack';

const STUDIO = require('../../../assets/icons/studio-pill.png');

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* Карточки одинаковые: поля 8 по бокам, отступ 8,5 между ними.
   Внутри всё расставлено по координатам эталона, считая от угла карточки. */
const CARD = { side: 8, radius: 8, bg: '#1e1e1e', pad: 16, gap: 8.5 };
const CW = SCREEN_W - CARD.side * 2;   // ширина карточки

const S = {
  /* шапка */
  back: { x: 16.6, cy: 16.8, size: 28 },
  title: { font: 17, capTop: 10.8 },
  studio: { right: 11.5, top: 2.7, h: 28.1, ratio: 3.985 },

  /* обложка ролика: 80×107 (3:4), углы 8 — с эталона.
     В нашем ролике 720×1280 картинка — только полоса 720×588 посередине,
     сверху и снизу чёрные поля. Кадр увеличиваем так, чтобы эта полоса
     ровно заполнила обложку по высоте, и ставим по центру. */
  thumb: { w: 80, h: 107, top: 58.9, radius: 8, frameW: 720, frameH: 1280, bandH: 588 },
  /* длительность: у TikTok тройка с плоским верхом — ближе всех
     встроенный в айфон Avenir Next, полужирный */
  dur: { font: 14.7, bottom: 2.2, family: 'AvenirNext-DemiBold', track: 0.1 },

  /* дата публикации */
  pub: { capTop: 177.7, font: 13.7, color: '#e8e8e8' },

  /* ряд из пяти значков */
  row: { side: 17.3, iconTop: 208.4, numTop: 238.8, numFont: 13.8, numWeight: '800' as const, numColor: '#c0c0c0' },
  rule: { top: 215, h: 20, color: '#242424' },
  iconColor: '#666666',
  play: { w: 14.9, h: 16.6, round: 2 },
  icons: [
    { key: 'likes',    src: require('../../../assets/icons/feed-like.png'),    h: 13.6, ratio: 1.104 },
    { key: 'comments', src: require('../../../assets/icons/feed-comment.png'), h: 17.5, ratio: 1.029 },
    { key: 'shares',   src: require('../../../assets/icons/feed-share.png'),   h: 17.0, ratio: 1.075 },
    { key: 'saves',    src: require('../../../assets/icons/feed-save.png'),    h: 14.1, ratio: 0.788 },
  ],

  /* Шапка и разделы прибиты к верху, под ними уезжает всё остальное.
     44.8 — где в приложении оказывается строка разделов, когда её прижало. */
  headH: 44.8,

  /* переключатели разделов */
  tabs: { left: 27.3, right: 26.3, gap: 19.8, capTop: 279.9, font: 15, off: '#a0a0a0', textDrop: 5.2 },
  underline: { top: 302.9, h: 2.1, pad: 9.8 },
  divider: { top: 304.6, h: 0.8, color: '#2d2d2d' },

  /* у правого края строка разделов уходит в тёмно-серый. Затемнение
     начинается на 5,5 выше строки — и в прижатом виде тоже,
     поэтому шапка на столько же ниже, а строка выше. */
  fade: { up: 5.5, w: 30.7, color: '#111111' },

  /* карточка «Основные метрики» */
  card: { top: 313.1, h: 607.6 }, // верх первой карточки и её высота
};

const TABS = ['Вдохновение', 'Обзор', 'Зрители', 'Вовлеченность'];
const START_TAB = 1;             // открываемся на «Обзоре»
/* Строка разделов стоит в одном из двух положений: у левого края
   («Вдохновение», «Обзор») или у правого («Зрители», «Вовлеченность»). */
const stripAtEnd = (i: number) => {
  'worklet';
  return i >= 2;
};
const SWITCH = { duration: 300 };   // скорость линии и строки при нажатии

/* Внутри карточки всё расставлено по координатам эталона,
   считая от её левого верхнего угла. */
const C = {
  head: { x: 16, capTop: 24.3, font: 17.7 },
  info: { size: 15, gap: 5 },
  sub: { capTop: 47, font: 13, color: '#a5a5a5' },

  tile: { h: 76, gapX: 8.3, gapY: 8.3, top: 77.3, radius: 8 },
  tileOn: { bg: '#1e2125', border: '#3273d4' },
  tileOff: { bg: '#1e1e1e', border: '#6e6e6e' },
  tilePad: 13.7,
  tileLabel: { capTop: 15.7, font: 13 },
  tileValue: { capTop: 37, font: 21.5 },

  /* просмотры за 7 дней после публикации */
  chart: {
    left: 22, rightGap: 44.4,        // сетка: пунктир и нулевая линия
    firstX: 22, lastGap: 39.05,      // крайние точки — последняя правее сетки
    lines: [{ y: 348.1 }, { y: 399.0 }, { y: 450.0 }],   // подписи считаются по данным
    base: 500.9,                     // ноль шкалы
    labelRight: 21.6, labelUp: 4.85, labelFont: 11.5, labelColor: '#a9a9a9',
    dateCapTop: 508.7, dateFont: 11.5, dateRight: 38.1,
    dash: '#8c8c8c', axis: '#5a5a5a',
    line: '#9fc8ea', dotR: 2.45, dotCore: 1.25,
  },

  /* плашка под графиком */
  note: {
    top: 535.6, h: 52, radius: 8, bg: '#3b3b3b',
    pad: 16, capTop: 14.9, font: 12.6, line: 15.3, track: -0.48, color: '#ececec',
  },
  noteOffPad: 4,   // без плашки: низ карточки — на 4 ниже места, где была плашка
};

const TILES: { label: string; key: keyof VideoStats['tiles'] }[] = [
  { label: 'Просмотры видео',           key: 'views' },
  { label: 'Общее время просмотра',     key: 'totalTime' },
  { label: 'Среднее время просмотра',   key: 'avgTime' },
  { label: 'Просмотрели видео целиком', key: 'fullWatch' },
  { label: 'Новые подписчики',          key: 'newFollowers' },
];

/* Первый кадр ролика: плеер стоит на паузе, кадр обрезан по коробке. */
/* Какое видео открыто: его ролик и длина. Обложка, удержание
   и лайки берут ролик отсюда. */
const StatsVideo = createContext<{
  uri: string | null; duration: number; stats: VideoStats;
  /* режим «Настройки статы»: блоки обведены, нажатие открывает форму */
  editable?: boolean; edit?: (s: Section) => void;
}>({
  uri: null, duration: 33.2, stats: DEFAULT_STATS,
});

/* Блок, который можно править: в обычном режиме ничего не добавляет,
   в режиме правки — пунктирная рамка по краю карточки, карандаш
   и касание по всей карточке открывает её форму. */
function EditZone({ s, children }: { s: Section; children: React.ReactNode }) {
  const { editable, edit } = useContext(StatsVideo);
  if (!editable) return <>{children}</>;
  return (
    <View>
      {children}
      <Pressable
        onPress={() => edit?.(s)}
        style={{
          position: 'absolute', left: CARD.side, right: CARD.side, top: 0, bottom: CARD.gap,
          borderRadius: CARD.radius, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#fe2c55',
        }}
      >
        <View style={{
          position: 'absolute', right: 8, top: 8, width: 26, height: 26, borderRadius: 13,
          backgroundColor: '#fe2c55', alignItems: 'center', justifyContent: 'center',
        }}>
          <Pencil size={13} color="#ffffff" strokeWidth={2.5} />
        </View>
      </Pressable>
    </View>
  );
}
const useStats = () => useContext(StatsVideo).stats;

/* Шкала графика по данным: три линии с «круглым» шагом — 15/10/5, 3K/2K/1K… */
function chartScale(maxValue: number) {
  const raw = maxValue > 0 ? maxValue / 3 : 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  const step = Math.max(1, nice * p);
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n));
  return { max: step * 3, labels: [fmt(step * 3), fmt(step * 2), fmt(step)] };
}
const pctText = (share: number) => `${Math.round(share * 100)}%`;

/* Обложка: первый кадр ролика и его длина, как в TikTok — «11.63 с.» */
function Cover() {
  const v = useContext(StatsVideo);
  return (
    <View>
      <VideoFrame uri={v.uri} width={S.thumb.w} height={S.thumb.h} radius={S.thumb.radius} />
      <Text style={{
        position: 'absolute', left: 0, right: 0, bottom: S.dur.bottom,
        textAlign: 'center', color: '#ffffff',
        fontSize: S.dur.font, fontFamily: S.dur.family, letterSpacing: S.dur.track,
      }}>
        {`${v.duration.toFixed(2)} с.`}
      </Text>
    </View>
  );
}

function MetricsCard() {
  const st = useStats();
  const ch = C.chart;
  const w = CW;
  const points = st.daily.points.length >= 2 ? st.daily.points : [0, 0];
  const scale = chartScale(Math.max(...points));
  const lines = ch.lines.map((g, i) => ({ y: g.y, label: scale.labels[i] }));
  const span = ch.base - ch.lines[0].y;                 // сколько точек занимает вся шкала
  const n = points.length - 1;
  const lastX = w - ch.lastGap;
  const tileW = (w - CARD.pad * 2 - C.tile.gapX) / 2;
  const xs = points.map((_, i) => ch.firstX + (i * (lastX - ch.firstX)) / n);
  /* без плашки карточка заканчивается чуть ниже дат */
  const cardH = st.daily.trendNote ? S.card.h : C.note.top + C.noteOffPad;
  const ys = points.map((v) => ch.base - (v / scale.max) * span);
  const line = xs.map((x, i) => `${i ? 'L' : 'M'} ${x} ${ys[i]}`).join(' ');
  const area = `${line} L ${xs[xs.length - 1]} ${ch.base} L ${xs[0]} ${ch.base} Z`;

  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      width: CW, height: cardH,
      backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      {/* заголовок и подпись */}
      <View style={{
        position: 'absolute', left: C.head.x, top: C.head.capTop - C.head.font * 0.21,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Text style={{ color: '#ffffff', fontSize: C.head.font, fontWeight: '700' }}>
          Основные метрики
        </Text>
        <View style={{ marginLeft: C.info.gap }}>
          <Info size={C.info.size} color="#a5a5a5" strokeWidth={2} />
        </View>
      </View>
      <Text style={{
        position: 'absolute', left: C.head.x, top: C.sub.capTop - C.sub.font * 0.21,
        color: C.sub.color, fontSize: C.sub.font,
      }}>
        {st.metricsNote}
      </Text>

      {/* плитки: два столбца */}
      {TILES.map((t, i) => {
        const col = i % 2, rowN = Math.floor(i / 2);
        const on = i === 0;
        return (
          <View
            key={t.label}
            style={{
              position: 'absolute',
              left: C.head.x + col * (tileW + C.tile.gapX),
              top: C.tile.top + rowN * (C.tile.h + C.tile.gapY),
              width: tileW, height: C.tile.h,
              borderRadius: C.tile.radius, borderWidth: 0.7,
              backgroundColor: on ? C.tileOn.bg : C.tileOff.bg,
              borderColor: on ? C.tileOn.border : C.tileOff.border,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                position: 'absolute', left: C.tilePad, right: C.tilePad,
                top: C.tileLabel.capTop - C.tileLabel.font * 0.21,
                color: '#ffffff', fontSize: C.tileLabel.font,
              }}
            >
              {t.label}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.62}
              style={{
                position: 'absolute', left: C.tilePad, right: C.tilePad,
                top: C.tileValue.capTop - C.tileValue.font * 0.21,
                color: '#ffffff', fontSize: C.tileValue.font, fontWeight: '700',
              }}
            >
              {st.tiles[t.key]}
            </Text>
          </View>
        );
      })}

      {/* график */}
      <Svg
        width={w} height={cardH}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <Defs>
          {/* сверху голубоватая, у нуля чуть темнее фона карточки */}
          <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#9fc8ea" stopOpacity="0.21" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        <Path d={area} fill="url(#chartFill)" />

        {lines.map((g) => (
          <Line
            key={g.label}
            x1={ch.left} y1={g.y} x2={w - ch.rightGap} y2={g.y}
            stroke={ch.dash} strokeWidth={0.6} strokeDasharray="1.7 1.7"
          />
        ))}
        <Line
          x1={ch.left} y1={ch.base} x2={w - ch.rightGap} y2={ch.base}
          stroke={ch.axis} strokeWidth={0.8}
        />

        <Path d={line} stroke={ch.line} strokeWidth={1} fill="none" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <React.Fragment key={i}>
            <Circle cx={x} cy={ys[i]} r={ch.dotR} fill={ch.line} />
            <Circle cx={x} cy={ys[i]} r={ch.dotCore} fill="#ffffff" />
          </React.Fragment>
        ))}
      </Svg>

      {lines.map((g) => (
        <Text
          key={g.label}
          style={{
            position: 'absolute', right: ch.labelRight,
            top: g.y - ch.labelUp - ch.labelFont * 0.21,
            color: ch.labelColor, fontSize: ch.labelFont,
          }}
        >
          {g.label}
        </Text>
      ))}
      {/* даты: первая под первой точкой, вторая — под последней */}
      <Text style={{
        position: 'absolute', left: ch.firstX, top: ch.dateCapTop - ch.dateFont * 0.21,
        color: ch.labelColor, fontSize: ch.dateFont,
      }}>
        {st.daily.from}
      </Text>
      <Text style={{
        position: 'absolute', right: ch.dateRight, top: ch.dateCapTop - ch.dateFont * 0.21,
        color: ch.labelColor, fontSize: ch.dateFont,
      }}>
        {st.daily.to}
      </Text>

      {/* плашка-пояснение (её можно выключить в «Настройке статы») */}
      {st.daily.trendNote && <View style={{
        position: 'absolute', left: CARD.pad, right: CARD.pad, top: C.note.top,
        height: C.note.h, borderRadius: C.note.radius, backgroundColor: C.note.bg,
      }}>
        <Text style={{
          position: 'absolute', left: C.note.pad, right: 0,
          top: C.note.capTop - C.note.font * 0.21 - (C.note.line - C.note.font) / 2,
          color: C.note.color, fontSize: C.note.font, lineHeight: C.note.line,
          letterSpacing: C.note.track,
        }}>
          {'График показывает тренд данных за последние 7\nдней после публикации.'}
        </Text>
      </View>}
    </View>
  );
}


/* ── Коэффициент удержания ──
   Кривая снята с эталона: доля зрителей от начала ролика к концу. */
const R = {
  h: 587,
  head: { capTop: 24.7, font: 17.7 },
  lead: { capTop: 61.7, font: 13.7, line: 18 },          // белая фраза
  note: { capTop: 103.9, font: 13.7, line: 17.6, color: '#acacac' },
  clip: { w: 165.6, h: 263.6, top: 173.7, radius: 8 },
  chart: {
    left: 26.1, rightGap: 56.3,
    y100: 456.4, y50: 486.7, base: 516.9,
    labelGap: 53, labelFont: 11, labelColor: '#aaaaaa',
    line: '#71b0ed', dash: '#6e6e6e', axis: '#535353',
  },
  slider: { left: 20.9, rightGap: 56.7, y: 534.4, h: 3.4, knob: 27.9, track: '#666666' },
  foot: { capTop: 555.2, left: 26.9, rightGap: 57.6, font: 12.5, color: '#aaaaaa' },
};

/* Кривая «по секундам»: точка i стоит на i-й секунде ролика. Если ролик
   длиннее последней целой секунды, кривая тянется ровно до его конца. */
function perSecond(curve: number[], dur: number) {
  const t = curve.map((_, i) => Math.min(i, dur));
  const v = [...curve];
  if (curve.length - 1 < dur) { t.push(dur); v.push(curve[curve.length - 1]); }
  return { t, v };
}
function perSecondAt(curve: number[], dur: number, time: number) {
  const { t, v } = perSecond(curve, dur);
  if (time <= 0) return v[0];
  for (let i = 1; i < t.length; i++) {
    if (time <= t[i]) return v[i - 1] + (v[i] - v[i - 1]) * ((time - t[i - 1]) / (t[i] - t[i - 1] || 1));
  }
  return v[v.length - 1];
}

/* значение кривой на доле ролика 0…1 — между точками по прямой,
   ровно так же, как её рисует график */
function curveAt(curve: number[], frac: number) {
  const pos = Math.min(Math.max(frac, 0), 1) * (curve.length - 1);
  const i = Math.min(Math.floor(pos), curve.length - 2);
  return curve[i] + (curve[i + 1] - curve[i]) * (pos - i);
}

/* Ролик в карточке статистики: стоит на паузе, касание — пуск/пауза,
   после конца — заново. Как в TikTok, всё под графиком сдвигается
   рывком раз в секунду, поэтому наружу отдаём только целые секунды. */
function useStepPlayback() {
  const v = useContext(StatsVideo);
  const player = useVideoPlayer(videoSource(v), (p) => {
    p.muted = true;
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
    p.pause();
  });
  const [sec, setSec] = useState(0);
  const [dur, setDur] = useState(v.duration);
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEventListener(player, 'sourceLoad', ({ duration }) => { if (duration > 0) setDur(duration); });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => setSec(Math.floor(currentTime)));
  useEventListener(player, 'playingChange', ({ isPlaying }) => setPlaying(isPlaying));
  useEventListener(player, 'playToEnd', () => setEnded(true));

  const toggle = () => {
    if (player.playing) { player.pause(); return; }
    if (ended) { player.currentTime = 0; setSec(0); setEnded(false); }
    player.play();
  };
  const time = ended ? dur : sec;    // досмотрели — встаём в самый конец графика
  return { player, time, dur, playing, toggle, frac: Math.min(Math.max(time / dur, 0), 1) };
}

/* чёрный «плей» по центру ролика, пока он на паузе */
function PausedMark() {
  return (
    <Svg
      width={LK.play.w} height={LK.play.h} pointerEvents="none"
      style={{
        position: 'absolute',
        left: R.clip.w / 2 - LK.play.w / 2 + LK.play.shift, top: R.clip.h / 2 - LK.play.h / 2,
      }}
    >
      <Path
        d={roundedTriangle([[0, 0], [LK.play.w, LK.play.h / 2], [0, LK.play.h]], LK.play.round)}
        fill="#000000"
      />
    </Svg>
  );
}

const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function RetentionCard() {
  const st = useStats();
  /* цифры фраз: вписанные в редакторе, а если пусто — посчитанные по графику */
  const auto = autoRetention(st.retention.curve, useContext(StatsVideo).duration);
  const avg = st.retention.avg.trim() || auto.avg;
  const dropAt = st.retention.dropAt.trim() || auto.dropAt;
  const curve = st.retention.curve.length >= 2 ? st.retention.curve : [0, 0];
  const { player, time, dur, playing, toggle, frac } = useStepPlayback();

  const ch = R.chart;
  const right = CW - ch.rightGap;
  const span = ch.base - ch.y100;
  /* кривая с точкой на каждую секунду (после правки в редакторе) ставится
     по времени; старая — равномерно по всей длине ролика, как на эталоне */
  const perSec = curve.length === Math.floor(dur) + 1;
  const pts = perSec ? perSecond(curve, dur) : null;
  const xs = pts
    ? pts.t.map((t) => ch.left + (t / dur) * (right - ch.left))
    : curve.map((_, i) => ch.left + (i * (right - ch.left)) / (curve.length - 1));
  const ys = (pts ? pts.v : curve).map((v) => ch.base - (v / 100) * span);
  const line = xs.map((x, i) => `${i ? 'L' : 'M'} ${x} ${ys[i]}`).join(' ');
  const area = `${line} L ${xs[xs.length - 1]} ${ch.base} L ${xs[0]} ${ch.base} Z`;

  /* где сейчас ролик: ползунок, вертикальная линия и точка на кривой */
  const pct = perSec ? perSecondAt(curve, dur, time) : curveAt(curve, frac);
  const markX = ch.left + frac * (right - ch.left);
  const markY = ch.base - (pct / 100) * span;

  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      width: CW, height: R.h, backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      <View style={{
        position: 'absolute', left: CARD.pad, top: R.head.capTop - R.head.font * 0.21,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Text style={{ color: '#ffffff', fontSize: R.head.font, fontWeight: '700' }}>
          Коэффициент удержания
        </Text>
        <View style={{ marginLeft: 5 }}>
          <Info size={15} color="#a5a5a5" strokeWidth={2} />
        </View>
      </View>

      <Text style={{
        position: 'absolute', left: CARD.pad, right: CARD.pad,
        top: R.lead.capTop - R.lead.font * 0.21 - (R.lead.line - R.lead.font) / 2,
        color: '#ffffff', fontSize: R.lead.font, lineHeight: R.lead.line, fontWeight: '700',
      }}>
        {retentionLead(avg)}
      </Text>
      <Text style={{
        position: 'absolute', left: CARD.pad, right: CARD.pad,
        top: R.note.capTop - R.note.font * 0.21 - (R.note.line - R.note.font) / 2,
        color: R.note.color, fontSize: R.note.font, lineHeight: R.note.line,
      }}>
        {retentionNote(dropAt)}
      </Text>

      {/* ролик целиком, с чёрными полями сверху и снизу; касание — пуск/пауза */}
      <Pressable onPress={toggle} style={{
        position: 'absolute', left: (CW - R.clip.w) / 2, top: R.clip.top,
        width: R.clip.w, height: R.clip.h,
        borderRadius: R.clip.radius, overflow: 'hidden', backgroundColor: '#000000',
      }}>
        <VideoView
          player={player}
          style={{ width: R.clip.w, height: R.clip.h }}
          contentFit="contain"
          nativeControls={false}
          allowsVideoFrameAnalysis={false}   // без значка «текст на кадре» на паузе
          pointerEvents="none"
        />
        {!playing && <PausedMark />}
      </Pressable>

      <Svg
        width={CW} height={R.h} pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <Defs>
          <LinearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#71b0ed" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#71b0ed" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#retFill)" />
        {[ch.y100, ch.y50].map((y) => (
          <Line key={y} x1={ch.left} y1={y} x2={right} y2={y}
                stroke={ch.dash} strokeWidth={0.7} strokeDasharray="2 4" />
        ))}
        <Line x1={ch.left} y1={ch.base} x2={right} y2={ch.base} stroke={ch.axis} strokeWidth={0.9} />
        <Path d={line} stroke={ch.line} strokeWidth={1.6} fill="none" />
        {/* вертикальная метка — сплошная до линии 100%, и точка на кривой */}
        <Line x1={markX} y1={ch.y100} x2={markX} y2={ch.base} stroke={ch.line} strokeWidth={0.9} />
        <Circle cx={markX} cy={markY} r={5.2} fill={ch.line} />
        <Circle cx={markX} cy={markY} r={3} fill="#ffffff" />
      </Svg>

      <Text style={{
        position: 'absolute', left: CW - ch.labelGap, top: ch.y100 - ch.labelFont * 0.7,
        color: ch.labelColor, fontSize: ch.labelFont,
      }}>
        100%
      </Text>
      <Text style={{
        position: 'absolute', left: CW - ch.labelGap, top: ch.y50 - ch.labelFont * 0.7,
        color: ch.labelColor, fontSize: ch.labelFont,
      }}>
        50%
      </Text>

      {/* ползунок: центр кружка идёт вместе с вертикальной линией */}
      <View style={{
        position: 'absolute', left: R.slider.left, width: CW - R.slider.rightGap - R.slider.left,
        top: R.slider.y, height: R.slider.h, borderRadius: R.slider.h / 2,
        backgroundColor: R.slider.track,
      }} />
      <View style={{
        position: 'absolute', left: markX - R.slider.knob / 2,
        top: R.slider.y + R.slider.h / 2 - R.slider.knob / 2,
        width: R.slider.knob, height: R.slider.knob, borderRadius: R.slider.knob / 2,
        backgroundColor: '#ffffff',
      }} />

      <Text style={{
        position: 'absolute', left: R.foot.left, top: R.foot.capTop - R.foot.font * 0.21,
        color: R.foot.color, fontSize: R.foot.font,
      }}>
        {`${mmss(time)} (${Math.round(pct)}%)`}
      </Text>
      <Text style={{
        position: 'absolute', right: R.foot.rightGap - 32, top: R.foot.capTop - R.foot.font * 0.21,
        color: R.foot.color, fontSize: R.foot.font,
      }}>
        {mmss(dur)}
      </Text>
    </View>
  );
}

/* ── Карточка со списком «подпись — процент — полоска» ──
   По такому шаблону сделаны «Источники трафика» и «Поисковые запросы». */
const BAR = {
  headCapTop: 24.3, headFont: 17.7,
  firstBarTop: 81.75, pitch: 50.0, barH: 10.2,
  radius: 2,                      // у TikTok углы полосок почти прямые
  labelUp: 20.0,                  // подпись стоит выше полоски
  labelFont: 14, valueFont: 14,
  track: '#484848', fill: '#60b3ff',
  padBottom: 31.5,
};

type BarRow = StatRow;   // подпись — процент — полоска

/* пустая карточка: только заголовок и, если есть, серый текст (как в TikTok) */
const EMPTY = { capTop: 46.8, font: 14.3, line: 17.2, color: '#acacac', h: 119, bare: 64 };

function BarCard({
  title, rows, info = true, padBottom = BAR.padBottom, empty,
}: { title: string; rows: BarRow[]; info?: boolean; padBottom?: number; empty?: string }) {
  const barW = CW - CARD.pad * 2;
  const height = rows.length
    ? BAR.firstBarTop + (rows.length - 1) * BAR.pitch + BAR.barH + padBottom
    : empty ? EMPTY.h : EMPTY.bare;

  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      width: CW, height, backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      <View style={{
        position: 'absolute', left: CARD.pad, top: BAR.headCapTop - BAR.headFont * 0.21,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Text style={{ color: '#ffffff', fontSize: BAR.headFont, fontWeight: '700' }}>
          {title}
        </Text>
        {info && (
          <View style={{ marginLeft: 5 }}>
            <Info size={15} color="#a5a5a5" strokeWidth={2} />
          </View>
        )}
      </View>

      {!rows.length && !!empty && (
        <Text style={{
          position: 'absolute', left: CARD.pad, right: CARD.pad,
          top: EMPTY.capTop - EMPTY.font * 0.21 - (EMPTY.line - EMPTY.font) / 2,
          color: EMPTY.color, fontSize: EMPTY.font, lineHeight: EMPTY.line,
        }}>
          {empty}
        </Text>
      )}

      {rows.map((r, i) => {
        const barTop = BAR.firstBarTop + i * BAR.pitch;
        return (
          <React.Fragment key={r.label + i}>
            <Text
              numberOfLines={1}
              style={{
                position: 'absolute', left: CARD.pad, right: CARD.pad + 60,
                top: barTop - BAR.labelUp - BAR.labelFont * 0.21,
                color: '#ffffff', fontSize: BAR.labelFont,
              }}
            >
              {r.label}
            </Text>
            <View style={{
              position: 'absolute', right: CARD.pad - (r.chevron ? 12 : 0),
              top: barTop - BAR.labelUp - BAR.valueFont * 0.21,
              flexDirection: 'row', alignItems: 'center',
            }}>
              <Text style={{ color: '#ffffff', fontSize: BAR.valueFont, fontWeight: '600' }}>
                {r.text ?? `${r.value.toFixed(1)}%`}
              </Text>
              {r.chevron && <ChevronRight size={15} color="#8e8e93" strokeWidth={2.2} />}
            </View>
            <View style={{
              position: 'absolute', left: CARD.pad, top: barTop,
              width: barW, height: BAR.barH, borderRadius: BAR.radius,
              backgroundColor: BAR.track, overflow: 'hidden',
            }}>
              {r.value > 0 && (
                <View style={{
                  width: Math.max(barW * r.value / 100, 2),
                  height: BAR.barH, borderRadius: BAR.radius,
                  backgroundColor: BAR.fill,
                }} />
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const QUERIES_EMPTY = 'Сейчас у всех поисковых запросов низкий трафик. Данные появятся, когда хотя бы у 1 запроса будет достаточно трафика.';

function TrafficCard() {
  return <BarCard title="Источники трафика" rows={useStats().traffic} />;
}
function QueriesCard() {
  return <BarCard title="Поисковые запросы" rows={useStats().queries} empty={QUERIES_EMPTY} />;
}

/* ── «Хотите больше трафика?» ── */
const PROMO = {
  h: 90,
  /* у TikTok свой шрифт — уже системного, поэтому буквы плотнее */
  title: { capTop: 18.45, font: 15.9, track: -0.44 },
  body: { capTop: 43.57, font: 15, line: 18.3, track: -0.55, color: '#e3e3e3' },
  chev: { w: 7, h: 12, right: 18.7, down: 0.33, stroke: 1.7, color: '#000000' },   // шеврон чёрный
};

function PromoCard() {
  const c = PROMO.chev;
  const k = c.stroke / 2;    // линия не должна вылезать за габарит шеврона
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={{
        marginHorizontal: CARD.side, marginBottom: CARD.gap,
        width: CW, height: PROMO.h, backgroundColor: CARD.bg, borderRadius: CARD.radius,
      }}
    >
      <Text style={{
        position: 'absolute', left: CARD.pad, top: PROMO.title.capTop - PROMO.title.font * 0.21,
        color: '#ffffff', fontSize: PROMO.title.font, fontWeight: '700',
        letterSpacing: PROMO.title.track,
      }}>
        Хотите больше трафика?
      </Text>
      <Text style={{
        position: 'absolute', left: CARD.pad,
        top: PROMO.body.capTop - PROMO.body.font * 0.21 - (PROMO.body.line - PROMO.body.font) / 2,
        color: PROMO.body.color, fontSize: PROMO.body.font, lineHeight: PROMO.body.line,
        letterSpacing: PROMO.body.track,
      }}>
        {'Используйте функцию продвижения, чтобы\nувеличить аудиторию.'}
      </Text>
      <Svg
        width={c.w} height={c.h}
        style={{ position: 'absolute', right: c.right, top: (PROMO.h - c.h) / 2 + c.down }}
      >
        <Path
          d={`M ${k} ${k} L ${c.w - k} ${c.h / 2} L ${k} ${c.h - k}`}
          stroke={c.color} strokeWidth={c.stroke} fill="none"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

/* ── «Посмотреть данные других публикаций» ──
   Справа — обложки трёх последних публикаций, каждая отдельно.
   У нас одно видео, поэтому все три одинаковые. */
const MORE = {
  h: 60,
  text: { capTop: 17.0, font: 14.26, line: 18.0, track: -0.36, weight: '600' as const },
  thumb: { w: 25.67, h: 28, radius: 4, right: 16, gap: 6 },
};
const MY_COVER = require('../../../assets/mock/my-video-cover.jpg');

function MoreDataRow() {
  const t = MORE.thumb;
  /* три последние публикации профиля; если их меньше — повторяем по кругу */
  const myVideos = useVideoStore((st) => st.myVideos);
  const covers = myVideos.length
    ? [0, 1, 2].map((i) => myVideos[i % myVideos.length])
    : [];
  /* свои картинки из «Настройки статы» — поверх автоматических */
  const custom = useStats().otherCovers ?? [];
  const tx = MORE.text;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={{
        marginHorizontal: CARD.side, marginBottom: CARD.gap,
        width: CW, height: MORE.h, backgroundColor: CARD.bg, borderRadius: CARD.radius,
      }}
    >
      <Text style={{
        position: 'absolute', left: CARD.pad,
        top: tx.capTop - tx.font * 0.21 - (tx.line - tx.font) / 2,
        color: '#ffffff', fontSize: tx.font, lineHeight: tx.line, fontWeight: tx.weight,
        letterSpacing: tx.track,
      }}>
        {'Посмотреть данные других\nпубликаций'}
      </Text>
      <View style={{
        position: 'absolute', right: t.right, top: (MORE.h - t.h) / 2,
        flexDirection: 'row',
      }}>
        {covers.map((v, i) => (
          <View key={i} style={{ marginLeft: i ? t.gap : 0 }}>
            {custom[i]
              ? <Image source={{ uri: custom[i] as string }} resizeMode="cover"
                       style={{ width: t.w, height: t.h, borderRadius: t.radius }} />
              : v.uri
                ? <VideoFrame uri={v.uri} width={t.w} height={t.h} radius={t.radius} />
                : <Image source={MY_COVER} resizeMode="cover"
                         style={{ width: t.w, height: t.h, borderRadius: t.radius }} />}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}


/* ══════ раздел «Зрители» ══════ */

const BLUE = '#9bc8fa';        // светлая доля
const BLUE_DIM = '#5c738d';    // вторая доля
const BLUE_DARK = '#36404a';   // третья, самая тёмная
const SPLIT_GAP = 2;           // зазор между долями полоски

/* Всего зрителей */
const TV = { h: 105.2, capTop: 20.9, font: 17.7, num: { top: 46.4, font: 22.7 },
             row: { top: 74.0, dot: 13, font: 13.7, grey: '#7f7f7f' } };

function TotalViewersCard() {
  const st = useStats();
  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      width: CW, height: TV.h, backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      <View style={{
        position: 'absolute', left: CARD.pad, top: TV.capTop - TV.font * 0.21,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Text style={{ color: '#ffffff', fontSize: TV.font, fontWeight: '700' }}>Всего зрителей</Text>
        <View style={{ marginLeft: 5 }}><Info size={15} color="#a5a5a5" strokeWidth={2} /></View>
      </View>

      <Text style={{
        position: 'absolute', left: CARD.pad, top: TV.num.top - TV.num.font * 0.21,
        color: '#ffffff', fontSize: TV.num.font, fontWeight: '700',
      }}>
        {st.viewers.total}
      </Text>

      <View style={{
        position: 'absolute', left: CARD.pad - 2, top: TV.row.top,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <View style={{
          width: TV.row.dot, height: TV.row.dot, borderRadius: TV.row.dot / 2,
          backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center',
        }}>
          <ArrowUp size={9} color="#20344e" strokeWidth={3.2} />
        </View>
        <Text style={{ color: BLUE, fontSize: TV.row.font, fontWeight: '700', marginLeft: 6.4 }}>
          {st.viewers.delta}
        </Text>
        <Text style={{ color: TV.row.grey, fontSize: TV.row.font, marginLeft: 8.5 }}>
          (в сравнении со вчерашним днем)
        </Text>
      </View>
    </View>
  );
}

/* Типы зрителей: две составные полоски */
const VT = { h: 221.8, capTop: 25.1, font: 17.7,
             pctTop: 62.2, barTop: 83.9, barH: 10.2, nameTop: 103.9,
             pitch: 83.9, font2: 14.3, font3: 13.7 };

function SplitBar({ top, left, right, share }: { top: number; left: [string, string]; right: [string, string]; share: number }) {
  const barW = CW - CARD.pad * 2;
  return (
    <>
      <Text style={{
        position: 'absolute', left: CARD.pad, top: top + VT.pctTop - VT.font2 * 0.21,
        color: '#ffffff', fontSize: VT.font2,
      }}>
        {left[0]}
      </Text>
      <Text style={{
        position: 'absolute', right: CARD.pad, top: top + VT.pctTop - VT.font2 * 0.21,
        color: '#ffffff', fontSize: VT.font2,
      }}>
        {right[0]}
      </Text>
      {/* две доли с зазором между ними: светлая своей ширины, потом
         зазор, потом тёмная своей — на эталоне она заходит за край на зазор */}
      {share > 0 && (
        <View style={{
          position: 'absolute', left: CARD.pad, top: top + VT.barTop,
          width: barW * share, height: VT.barH, borderRadius: 2, backgroundColor: BLUE,
        }} />
      )}
      {share < 1 && (
        <View style={{
          position: 'absolute', left: CARD.pad + barW * share + (share > 0 ? SPLIT_GAP : 0),
          top: top + VT.barTop,
          width: barW * (1 - share), height: VT.barH, borderRadius: 2, backgroundColor: BLUE_DIM,
        }} />
      )}
      <Text style={{
        position: 'absolute', left: CARD.pad, top: top + VT.nameTop - VT.font3 * 0.21,
        color: '#ffffff', fontSize: VT.font3,
      }}>
        {left[1]}
      </Text>
      <Text style={{
        position: 'absolute', right: CARD.pad, top: top + VT.nameTop - VT.font3 * 0.21,
        color: '#ffffff', fontSize: VT.font3,
      }}>
        {right[1]}
      </Text>
    </>
  );
}

function ViewerTypesCard() {
  const v = useStats().viewers;
  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      width: CW, height: VT.h, backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      <View style={{
        position: 'absolute', left: CARD.pad, top: VT.capTop - VT.font * 0.21,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Text style={{ color: '#ffffff', fontSize: VT.font, fontWeight: '700' }}>Типы зрителей</Text>
        <View style={{ marginLeft: 5 }}><Info size={15} color="#a5a5a5" strokeWidth={2} /></View>
      </View>
      <SplitBar top={0} share={v.newShare}
        left={[pctText(v.newShare), 'Новые зрители']} right={[pctText(1 - v.newShare), 'Вернувшиеся зрители']} />
      <SplitBar top={VT.pitch} share={1 - v.followerShare}
        left={[pctText(1 - v.followerShare), 'Не подписчики']} right={[pctText(v.followerShare), 'Подписчики']} />
    </View>
  );
}

/* Пол: полукольцо и список под ним */
const GN = {
  h: 305.6, capTop: 25.1, font: 17.7,
  /* полукольцо: центр — середина его прямого низа; доли обведены тёмным */
  ring: { cy: 148, outer: 90, inner: 57.5, stroke: 1.33, strokeColor: '#121212' },
  row: { first: 178.8, pitch: 42.33, dotLeft: 16, dot: 8, label: 35.9, labelTrack: -0.3, font: 14.3, color: '#e9e9e9' },
  rule: { off: 26.2, left: 16, color: '#3d3d3d', h: 0.4 },
  chev: { w: 5, h: 8.7, gap: 6, stroke: 1.4 },
};

/* кусок кольца от угла a1 до a2 (в градусах, 180 — слева, 0 — справа) */
function ringSector(cx: number, cy: number, R: number, r: number, a1: number, a2: number) {
  const P = (rad: number, ang: number) => [
    cx + rad * Math.cos((ang * Math.PI) / 180),
    cy - rad * Math.sin((ang * Math.PI) / 180),
  ];
  const [x1, y1] = P(R, a1), [x2, y2] = P(R, a2);
  const [x3, y3] = P(r, a2), [x4, y4] = P(r, a1);
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 0 0 ${x4} ${y4} Z`;
}

/* доли по часовой стрелке слева направо: как на эталоне */
const GENDER = [
  { label: 'Мужской', color: BLUE },
  { label: 'Женский', color: BLUE_DIM },
  { label: 'Другое', color: BLUE_DARK, chevron: true },
];

function GenderCard() {
  const values = useStats().viewers.gender;
  const rows = GENDER.map((g, i) => ({ ...g, value: values[i] ?? 0 }));
  const cx = CW / 2;
  const cy = GN.ring.cy;
  const R = GN.ring.outer, r = GN.ring.inner;
  /* углы: 180° — левый край, 0° — правый; доли откладываем подряд */
  let from = 180;
  const total = rows.reduce((a, g) => a + g.value, 0);
  const arcs = total > 0
    ? rows.map((g) => {
        const to = from - (g.value / 100) * 180;
        const a = { a1: from, a2: to, color: g.color };
        from = to;
        return a;
      })
    : [{ a1: 180, a2: 0, color: '#2c2c2c' }];   // данных нет — пустое серое полукольцо

  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      width: CW, height: GN.h, backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      <Text style={{
        position: 'absolute', left: CARD.pad, top: GN.capTop - GN.font * 0.21,
        color: '#ffffff', fontSize: GN.font, fontWeight: '700',
      }}>
        Пол
      </Text>

      <Svg width={CW} height={GN.h} style={{ position: 'absolute', left: 0, top: 0 }}>
        {arcs.map((a, i) => (
          <Path key={i} d={ringSector(cx, cy, R, r, a.a1, a.a2)} fill={a.color}
                stroke={GN.ring.strokeColor} strokeWidth={GN.ring.stroke} strokeLinejoin="miter" />
        ))}
      </Svg>

      {rows.map((g, i) => {
        const capTop = GN.row.first + i * GN.row.pitch;
        return (
          <React.Fragment key={g.label}>
            <View style={{
              position: 'absolute', left: GN.row.dotLeft,
              top: capTop + 5.2 - GN.row.dot / 2,       // середина точки — на середине строчных
              width: GN.row.dot, height: GN.row.dot, borderRadius: GN.row.dot / 2,
              backgroundColor: g.color,
            }} />
            <Text style={{
              position: 'absolute', left: GN.row.label, top: capTop - GN.row.font * 0.21,
              color: GN.row.color, fontSize: GN.row.font, fontWeight: '600',
              letterSpacing: GN.row.labelTrack,
            }}>
              {g.label}
            </Text>
            <View style={{
              position: 'absolute', right: CARD.pad,
              top: capTop - GN.row.font * 0.21,
              flexDirection: 'row', alignItems: 'center',
            }}>
              <Text style={{ color: GN.row.color, fontSize: GN.row.font, fontWeight: '500' }}>
                {`${g.value}%`}
              </Text>
              {g.chevron && (
                <Svg width={GN.chev.w} height={GN.chev.h} style={{ marginLeft: GN.chev.gap }}>
                  <Path
                    d={`M ${GN.chev.stroke / 2} ${GN.chev.stroke / 2} L ${GN.chev.w - GN.chev.stroke / 2} ${GN.chev.h / 2} L ${GN.chev.stroke / 2} ${GN.chev.h - GN.chev.stroke / 2}`}
                    stroke={GN.row.color} strokeWidth={GN.chev.stroke} fill="none"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </Svg>
              )}
            </View>
            {i < GENDER.length - 1 && (
              <View style={{
                position: 'absolute', left: GN.rule.left, right: CARD.pad,
                top: capTop + GN.rule.off, height: GN.rule.h, backgroundColor: GN.rule.color,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function AgeCard() {
  return <BarCard title="Возраст" rows={useStats().viewers.ages} info={false} padBottom={16} />;
}
function PlacesCard() {
  return <BarCard title="Места" rows={useStats().viewers.places} padBottom={16} />;
}


/* ══════ раздел «Вовлеченность» ══════ */

/* У TikTok свой шрифт: буквы выше и уже системных. Чтобы строки
   совпали с эталоном по высоте и длине, размер чуть больше,
   а буквы сдвинуты плотнее. */
const TRACK = { head: -0.3 };

/* Самые частые слова в комментариях: заголовок в две строки, «i» справа
   по его середине, ниже — слова с числом упоминаний и полоской */
const WD = {
  padBottom: 20,
  head: { capTop: 25.7, font: 17.7, line: 21.9 },
  info: { size: 14.3, right: 15.7, cy: 42 },
  firstBarTop: 104, pitch: 50, barH: 10, radius: 2, fill: '#74b1f8',
  labelUp: 20, font: 14, color: '#f6f6f6',
  chev: { w: 5, h: 8.7, gap: 6.3, stroke: 1.4, right: 16.3 },
};

/* данных нет — заголовок в одну строку и серый текст (сняты с эталона) */
const WD_EMPTY = { h: 97.9, capTop: 24.2, font: 17.7,
                   sub: { capTop: 49.4, font: 13.6, track: -0.5, line: 17.0, color: '#acacac' } };

function WordsEmpty() {
  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      width: CW, height: WD_EMPTY.h, backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      <View style={{
        position: 'absolute', left: CARD.pad, top: WD_EMPTY.capTop - WD_EMPTY.font * 0.21,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Text style={{ color: '#ffffff', fontSize: WD_EMPTY.font, fontWeight: '700', letterSpacing: TRACK.head }}>
          Самые частые слова в комментариях
        </Text>
        <View style={{ marginLeft: 5 }}><Info size={15} color="#a5a5a5" strokeWidth={2} /></View>
      </View>
      <Text style={{
        position: 'absolute', left: CARD.pad, right: CARD.pad,
        top: WD_EMPTY.sub.capTop - WD_EMPTY.sub.font * 0.21 - (WD_EMPTY.sub.line - WD_EMPTY.sub.font) / 2,
        color: WD_EMPTY.sub.color, fontSize: WD_EMPTY.sub.font, lineHeight: WD_EMPTY.sub.line,
        letterSpacing: WD_EMPTY.sub.track,
      }}>
        Аналитические данные о самых часто используемых словах пока не готовы. Зайдите позже.
      </Text>
    </View>
  );
}

function WordsCard() {
  const WORDS = useStats().words;
  if (!WORDS.length) return <WordsEmpty />;
  const max = Math.max(1, ...WORDS.map((w) => w.count));
  const barW = CW - CARD.pad * 2;
  const c = WD.chev;
  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      /* высота по числу слов: 4 слова — 284, как на эталоне */
      width: CW, height: WD.firstBarTop + (WORDS.length - 1) * WD.pitch + WD.barH + WD.padBottom,
      backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      <Text style={{
        position: 'absolute', left: CARD.pad,
        top: WD.head.capTop - WD.head.font * 0.21 - (WD.head.line - WD.head.font) / 2,
        color: '#ffffff', fontSize: WD.head.font, lineHeight: WD.head.line,
        fontWeight: '700',
      }}>
        {'Самые частые слова в\nкомментариях'}
      </Text>
      <View style={{ position: 'absolute', right: WD.info.right, top: WD.info.cy - WD.info.size / 2 }}>
        <Info size={WD.info.size} color="#a5a5a5" strokeWidth={2} />
      </View>

      {WORDS.map((w, i) => {
        const barTop = WD.firstBarTop + i * WD.pitch;
        const capTop = barTop - WD.labelUp;
        return (
          <React.Fragment key={w.word + i}>
            <Text style={{
              position: 'absolute', left: CARD.pad, top: capTop - WD.font * 0.21,
              color: WD.color, fontSize: WD.font,
            }}>
              {w.word}
            </Text>
            <View style={{
              position: 'absolute', right: c.right, top: capTop - WD.font * 0.21,
              flexDirection: 'row', alignItems: 'center',
            }}>
              <Text style={{ color: WD.color, fontSize: WD.font, fontWeight: '700' }}>{w.count}</Text>
              <Svg width={c.w} height={c.h} style={{ marginLeft: c.gap }}>
                <Path
                  d={`M ${c.stroke / 2} ${c.stroke / 2} L ${c.w - c.stroke / 2} ${c.h / 2} L ${c.stroke / 2} ${c.h - c.stroke / 2}`}
                  stroke={WD.color} strokeWidth={c.stroke} fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={{
              position: 'absolute', left: CARD.pad, top: barTop,
              width: barW * (w.count / max), height: WD.barH,
              borderRadius: WD.radius, backgroundColor: WD.fill,
            }} />
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* Лайки: кадр ролика и кривая «в какую секунду ставили лайк».
   Сетка, ползунок и подписи — как у удержания, но шкала до 20%. */
const LK = {
  h: 545.7,
  head: { capTop: 23.6, font: 17.7 },
  note: { capTop: 63.5, font: 14.3, track: -0.22, line: 17.6, color: '#acacac' },
  clipTop: 131.9,
  play: { w: 23.5, h: 26.1, shift: 2.65, round: 2.5 },   // «плей» чуть правее середины
  chart: {
    left: 26.1, rightGap: 55.6,
    y20: 416.5, y10: 446.0, base: 475.6,
    labelRight: 25.5, labelFont: 11.4, labelUp: 5.3,
    dash: '#9a9a9a',
  },
  slider: { y: 493.2, h: 3.4, knob: 27.9, rightGap: 56 },
  foot: { capTop: 514.4, left: 26.2, right: 56.1, font: 12.1, track: -0.15, color: '#aaaaaa' },
};

function LikesCard() {
  const st = useStats();
  const peakAt = st.likes.peakAt.trim() || autoLikesPeak(st.likes.curve, useContext(StatsVideo).duration);
  const { player, time, dur, playing, toggle, frac } = useStepPlayback();
  const ch = LK.chart;
  const right = CW - ch.rightGap;
  const span = ch.base - ch.y20;
  /* по точке на секунду: иксы — время, а не номер точки */
  const likesCurve = st.likes.curve.length >= 2 ? st.likes.curve : [0, 0];
  const pts = perSecond(likesCurve, dur);
  const xs = pts.t.map((t) => ch.left + (t / dur) * (right - ch.left));
  const ys = pts.v.map((v) => ch.base - (v / 20) * span);
  const line = xs.map((x, i) => `${i ? 'L' : 'M'} ${x} ${ys[i]}`).join(' ');
  const area = `${line} L ${xs[xs.length - 1]} ${ch.base} L ${xs[0]} ${ch.base} Z`;
  const clipLeft = (CW - R.clip.w) / 2;

  /* где сейчас ролик: ползунок, вертикальная линия и точка на кривой */
  const pct = perSecondAt(likesCurve, dur, time);
  const markX = ch.left + frac * (right - ch.left);
  const markY = ch.base - (pct / 20) * span;

  return (
    <View style={{
      marginHorizontal: CARD.side, marginBottom: CARD.gap,
      width: CW, height: LK.h, backgroundColor: CARD.bg, borderRadius: CARD.radius,
    }}>
      <View style={{
        position: 'absolute', left: CARD.pad, top: LK.head.capTop - LK.head.font * 0.21,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Text style={{ color: '#ffffff', fontSize: LK.head.font, fontWeight: '700', letterSpacing: TRACK.head }}>
          Лайки
        </Text>
        <View style={{ marginLeft: 5 }}><Info size={15} color="#a5a5a5" strokeWidth={2} /></View>
      </View>

      <Text style={{
        position: 'absolute', left: CARD.pad, right: CARD.pad,
        top: LK.note.capTop - LK.note.font * 0.21 - (LK.note.line - LK.note.font) / 2,
        color: LK.note.color, fontSize: LK.note.font, lineHeight: LK.note.line,
        letterSpacing: LK.note.track,
      }}>
        {likesNote(peakAt)}
      </Text>

      {/* ролик целиком; касание — пуск/пауза, как у удержания */}
      <Pressable onPress={toggle} style={{
        position: 'absolute', left: clipLeft, top: LK.clipTop,
        width: R.clip.w, height: R.clip.h,
        borderRadius: R.clip.radius, overflow: 'hidden', backgroundColor: '#000000',
      }}>
        <VideoView
          player={player}
          style={{ width: R.clip.w, height: R.clip.h }}
          contentFit="contain"
          nativeControls={false}
          allowsVideoFrameAnalysis={false}   // без значка «текст на кадре» на паузе
          pointerEvents="none"
        />
        {!playing && <PausedMark />}
      </Pressable>

      <Svg
        width={CW} height={LK.h} pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <Defs>
          <LinearGradient id="likeFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={R.chart.line} stopOpacity="0.22" />
            <Stop offset="1" stopColor={R.chart.line} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#likeFill)" />
        {[ch.y20, ch.y10].map((y) => (
          <Line key={y} x1={ch.left} y1={y} x2={right} y2={y}
                stroke={ch.dash} strokeWidth={0.8} strokeDasharray="1.7 1.6" />
        ))}
        <Line x1={ch.left} y1={ch.base} x2={right} y2={ch.base} stroke={R.chart.axis} strokeWidth={0.9} />
        <Path d={line} stroke={R.chart.line} strokeWidth={1.6} fill="none" />
        {/* вертикальная метка — сплошная до верхней линии, и точка на кривой */}
        <Line x1={markX} y1={ch.y20} x2={markX} y2={ch.base} stroke={R.chart.line} strokeWidth={0.7} />
        <Circle cx={markX} cy={markY} r={5.2} fill={R.chart.line} />
        <Circle cx={markX} cy={markY} r={3} fill="#ffffff" />
      </Svg>

      {[{ y: ch.y20, t: '20%' }, { y: ch.y10, t: '10%' }].map((g) => (
        <Text
          key={g.t}
          style={{
            position: 'absolute', right: ch.labelRight,
            top: g.y - ch.labelUp - ch.labelFont * 0.21,
            color: R.chart.labelColor, fontSize: ch.labelFont,
          }}
        >
          {g.t}
        </Text>
      ))}

      {/* ползунок: центр кружка идёт вместе с вертикальной линией */}
      <View style={{
        position: 'absolute', left: ch.left, width: CW - LK.slider.rightGap - ch.left,
        top: LK.slider.y, height: LK.slider.h, borderRadius: LK.slider.h / 2,
        backgroundColor: R.slider.track,
      }} />
      <View style={{
        position: 'absolute', left: markX - LK.slider.knob / 2,
        top: LK.slider.y + LK.slider.h / 2 - LK.slider.knob / 2,
        width: LK.slider.knob, height: LK.slider.knob, borderRadius: LK.slider.knob / 2,
        backgroundColor: '#ffffff',
      }} />

      <Text style={{
        position: 'absolute', left: LK.foot.left, top: LK.foot.capTop - LK.foot.font * 0.21,
        color: LK.foot.color, fontSize: LK.foot.font, letterSpacing: LK.foot.track,
      }}>
        {`${mmss(time)} (${Math.round(pct)}%)`}
      </Text>
      <Text style={{
        position: 'absolute', right: LK.foot.right, top: LK.foot.capTop - LK.foot.font * 0.21,
        color: LK.foot.color, fontSize: LK.foot.font, letterSpacing: LK.foot.track,
      }}>
        {mmss(dur)}
      </Text>
    </View>
  );
}

/* Один раздел — своя вертикальная прокрутка. Сверху отступ под общую
   шапку; своё положение прокрутки раздел сообщает наверх. */
function Page({
  index, current, headerY, ys, aref, topPad, minH, children,
}: {
  index: number;
  current: SharedValue<number>;
  headerY: SharedValue<number>;
  ys: SharedValue<number[]>;
  aref: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  topPad: number;
  minH: number;
  children?: React.ReactNode;
}) {
  const onScroll = useAnimatedScrollHandler((e) => {
    const y = e.contentOffset.y;
    ys.modify((arr) => { 'worklet'; arr[index] = y; return arr; });
    if (current.value === index) headerY.value = y;
  });
  return (
    <Animated.ScrollView
      ref={aref}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      directionalLockEnabled
      style={{ width: SCREEN_W }}
      /* страница всегда может уехать так, чтобы шапка скрылась целиком */
      contentContainerStyle={{ paddingTop: topPad, minHeight: minH, paddingBottom: 42 - CARD.gap }}
    >
      {children}
    </Animated.ScrollView>
  );
}

/* обычный экран статистики — открывается из шторки «Отправить» */
export default function VideoStatsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StatsScreen videoId={id} />;
}

/* Экран статистики. С editable — это «Настройка статы»: выглядит так же,
   но блоки обведены и открывают формы с цифрами. */
export function StatsScreen({ videoId, editable = false }: { videoId?: string; editable?: boolean }) {
  const router = useRouter();
  const myVideos = useVideoStore((st) => st.myVideos);
  const updateMyVideoStats = useVideoStore((st) => st.updateMyVideoStats);
  const updateMyVideo = useVideoStore((st) => st.updateMyVideo);
  const video = myVideos.find((v) => v.id === videoId) ?? myVideos[0];
  const stats = video?.stats ?? DEFAULT_STATS;
  const [editing, setEditing] = useState<Section | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const statsVideo = {
    uri: video?.uri ?? null, duration: video?.duration ?? 11.634, stats,
    editable, edit: setEditing,
  };
  const counts = [stats.counts.views, stats.counts.likes, stats.counts.comments, stats.counts.shares, stats.counts.saves];
  const insets = useSafeAreaInsets();
  const top = insets.top;
  const P = S.play;

  /* ширина колонки под один значок: поля по краям сняты с эталона */
  const colW = (SCREEN_W - S.row.side * 2) / 5;

  /* всё, что уезжает под шапку, считаем от её низа */
  const HEAD = S.headH - S.fade.up;           // шапка короче на затемнение
  const headH = top + HEAD;
  const tabsTop = S.tabs.capTop - 9;          // верх строки разделов до прижатия
  const boxTop = tabsTop - S.fade.up;         // верх прилипающего блока
  const scrollTop = boxTop - HEAD;            // высота блока с обложкой и значками
  const tabsH = S.card.top - boxTop;          // высота блока с разделами
  const collapse = scrollTop;                 // на столько шапка уезжает вверх
  const blockH = scrollTop + tabsH;           // общая шапка: обложка + разделы
  const pageMinH = SCREEN_H - headH + collapse;

  const [active, setActive] = useState(START_TAB);

  /* всё движение считается на стороне интерфейса, без участия JS */
  const current = useSharedValue(START_TAB);   // открытый раздел
  const headerY = useSharedValue(0);           // прокрутка открытого раздела
  const ys = useSharedValue([0, 0, 0, 0]);     // прокрутка каждого раздела
  const indicator = useSharedValue(START_TAB); // где линия: 1.5 — между «Обзором» и «Зрителями»
  const dragging = useSharedValue(false);      // палец тянет разделы вбок
  const stripX = useSharedValue(0);            // сдвиг строки разделов
  const stripMax = useSharedValue(0);
  const tabL = useSharedValue([0, 0, 0, 0]);   // где стоит текст каждого раздела
  const tabW = useSharedValue([0, 0, 0, 0]);
  const tabBoxes = useRef<{ x: number; w: number }[]>([]);

  const pager = useAnimatedRef<Animated.ScrollView>();
  const r0 = useAnimatedRef<Animated.ScrollView>();
  const r1 = useAnimatedRef<Animated.ScrollView>();
  const r2 = useAnimatedRef<Animated.ScrollView>();
  const r3 = useAnimatedRef<Animated.ScrollView>();
  const pages = [r0, r1, r2, r3];

  /* Куда встать разделу, когда на него переходим: если шапка видна —
     на ту же высоту, чтобы она не прыгнула; если скрыта — раздел
     остаётся где был, но не ниже того места, где шапка скрыта. */
  const targetFor = (from: number, to: number) => {
    'worklet';
    const y = ys.value[from];
    return y < collapse ? y : Math.max(ys.value[to], collapse);
  };
  const syncFrom = (from: number) => {
    'worklet';
    for (let j = 0; j < TABS.length; j++) {
      if (j === from) continue;
      const t = targetFor(from, j);
      if (Math.abs(t - ys.value[j]) > 0.5) scrollTo(pages[j], 0, t, false);
    }
  };
  const moveStrip = (idx: number) => {
    'worklet';
    stripX.value = withTiming(stripAtEnd(idx) ? stripMax.value : 0, SWITCH);
  };

  /* свайп вбок: линия едет вслед за пальцем, строка — после остановки */
  const settle = (x: number) => {
    'worklet';
    dragging.value = false;
    const idx = Math.round(x / SCREEN_W);
    indicator.value = idx;
    if (idx !== current.value) {
      headerY.value = targetFor(current.value, idx);
      current.value = idx;
      moveStrip(idx);
      scheduleOnRN(setActive, idx);
    }
  };
  const onPager = useAnimatedScrollHandler({
    onBeginDrag: () => {
      dragging.value = true;
      syncFrom(current.value);
    },
    onScroll: (e) => {
      if (dragging.value) indicator.value = e.contentOffset.x / SCREEN_W;
    },
    /* палец отпустили ровно на границе раздела — докатываться нечему */
    onEndDrag: (e) => {
      const p = e.contentOffset.x / SCREEN_W;
      if (Math.abs(p - Math.round(p)) < 0.002 && Math.abs(e.velocity?.x ?? 0) < 0.01) settle(e.contentOffset.x);
    },
    /* докатилось после свайпа. Прыжок по нажатию тоже присылает это
       событие — его пропускаем, иначе линия не доедет плавно */
    onMomentumEnd: (e) => {
      if (dragging.value) settle(e.contentOffset.x);
    },
  });

  /* нажатие: раздел меняется сразу, а линия плавно проезжает к нему */
  const pick = (idx: number) => {
    if (idx === active) return;
    setActive(idx);
    scheduleOnUI(() => {
      'worklet';
      const from = current.value;
      syncFrom(from);
      headerY.value = targetFor(from, idx);
      current.value = idx;
      scrollTo(pager, idx * SCREEN_W, 0, false);
      indicator.value = withTiming(idx, SWITCH);
      moveStrip(idx);
    });
  };

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(headerY.value, collapse) }],
  }));
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -stripX.value }],
  }));
  const lineStyle = useAnimatedStyle(() => {
    const L = tabL.value, Wd = tabW.value;
    if (!Wd[TABS.length - 1]) return { opacity: 0 };
    const at = [0, 1, 2, 3];
    return {
      opacity: 1,
      left: interpolate(indicator.value, at, L) - S.underline.pad,
      width: interpolate(indicator.value, at, Wd) + S.underline.pad * 2,
    };
  });

  const onTabLayout = (i: number, x: number, w: number) => {
    tabBoxes.current[i] = { x, w };
    const boxes = tabBoxes.current;
    if (TABS.every((_, j) => boxes[j])) {
      tabL.value = boxes.map((b) => b.x);
      tabW.value = boxes.map((b) => b.w);
    }
  };

  return (
    <StatsVideo.Provider value={statsVideo}>
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" />

      {/* разделы рядом друг с другом, листаются свайпом */}
      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        onScroll={onPager}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        contentOffset={{ x: START_TAB * SCREEN_W, y: 0 }}
        style={{ marginTop: headH }}
      >
        <Page index={0} aref={r0} current={current} headerY={headerY} ys={ys} topPad={blockH} minH={pageMinH} />
        <Page index={1} aref={r1} current={current} headerY={headerY} ys={ys} topPad={blockH} minH={pageMinH}>
          <EditZone s="metrics"><MetricsCard /></EditZone>
          <EditZone s="retention"><RetentionCard /></EditZone>
          <EditZone s="traffic"><TrafficCard /></EditZone>
          <EditZone s="queries"><QueriesCard /></EditZone>
          <PromoCard />
          <EditZone s="moreData"><MoreDataRow /></EditZone>
        </Page>
        <Page index={2} aref={r2} current={current} headerY={headerY} ys={ys} topPad={blockH} minH={pageMinH}>
          <EditZone s="viewersTotal"><TotalViewersCard /></EditZone>
          <EditZone s="viewerTypes"><ViewerTypesCard /></EditZone>
          <EditZone s="gender"><GenderCard /></EditZone>
          <EditZone s="ages"><AgeCard /></EditZone>
          <EditZone s="places"><PlacesCard /></EditZone>
        </Page>
        <Page index={3} aref={r3} current={current} headerY={headerY} ys={ys} topPad={blockH} minH={pageMinH}>
          <EditZone s="words"><WordsCard /></EditZone>
          <EditZone s="likes"><LikesCard /></EditZone>
        </Page>
      </Animated.ScrollView>

      {/* общая шапка поверх разделов: уезжает вверх вместе с прокруткой
         открытого раздела, строка разделов при этом прилипает к верху.
         Касания мимо строки разделов проходят к прокрутке под ней. */}
      <Animated.View
        pointerEvents="box-none"
        style={[{
          position: 'absolute', left: 0, right: 0, top: headH, height: blockH,
        }, headerStyle]}
      >
        {/* уезжает: обложка, дата, значки */}
        <View pointerEvents="none" style={{ height: scrollTop, backgroundColor: '#000000' }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: S.thumb.top - HEAD, alignItems: 'center' }}>
            <Cover />
          </View>
          <Text style={{
            position: 'absolute', left: 0, right: 0,
            top: S.pub.capTop - HEAD - S.pub.font * 0.21,
            textAlign: 'center', color: S.pub.color, fontSize: S.pub.font,
          }}>
            {stats.published}
          </Text>

          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                position: 'absolute', left: S.row.side + colW * (i + 1) - 0.5,
                top: S.rule.top - HEAD, width: 1, height: S.rule.h,
                backgroundColor: S.rule.color,
              }}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                position: 'absolute', left: S.row.side + colW * i, top: S.row.iconTop - HEAD,
                width: colW, alignItems: 'center',
              }}
            >
              {i === 0 ? (
                <Svg width={P.w} height={P.h}>
                  <Path
                    d={roundedTriangle([[0, 0], [P.w, P.h / 2], [0, P.h]], P.round)}
                    fill={S.iconColor}
                  />
                </Svg>
              ) : (
                <Image
                  source={S.icons[i - 1].src}
                  style={{
                    height: S.icons[i - 1].h,
                    width: S.icons[i - 1].h * S.icons[i - 1].ratio,
                    tintColor: S.iconColor,
                  }}
                  resizeMode="contain"
                />
              )}
            </View>
          ))}
          {counts.map((c, i) => (
            <Text
              key={i}
              style={{
                position: 'absolute', left: S.row.side + colW * i, width: colW,
                top: S.row.numTop - HEAD - S.row.numFont * 0.21,
                textAlign: 'center', color: S.row.numColor,
                fontSize: S.row.numFont, fontWeight: S.row.numWeight,
              }}
            >
              {c}
            </Text>
          ))}
        </View>

        {/* «Настройка статы»: дата и цифры под обложкой правятся здесь */}
        {editable && (
          <Pressable
            onPress={() => setEditing('header')}
            style={{
              position: 'absolute', left: CARD.side, right: CARD.side,
              top: S.pub.capTop - HEAD - 12, height: S.row.numTop - S.pub.capTop + 34,
              borderRadius: CARD.radius, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#fe2c55',
            }}
          >
            <View style={{
              position: 'absolute', right: 8, top: 8, width: 26, height: 26, borderRadius: 13,
              backgroundColor: '#fe2c55', alignItems: 'center', justifyContent: 'center',
            }}>
              <Pencil size={13} color="#ffffff" strokeWidth={2.5} />
            </View>
          </Pressable>
        )}

        {/* разделы: прилипают к низу шапки */}
        <View style={{ height: tabsH, backgroundColor: '#000000', overflow: 'hidden' }}>
          <Animated.View
            onLayout={(e) => { stripMax.value = Math.max(0, e.nativeEvent.layout.width - SCREEN_W); }}
            style={[{
              position: 'absolute', left: 0, top: S.fade.up, height: 36,
              flexDirection: 'row', paddingLeft: S.tabs.left, paddingRight: S.tabs.right,
            }, stripStyle]}
          >
            {TABS.map((t, i) => (
              <TouchableOpacity
                key={t}
                onPress={() => pick(i)}
                onLayout={(e) => onTabLayout(i, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
                style={{ marginLeft: i === 0 ? 0 : S.tabs.gap, alignItems: 'center' }}
              >
                {/* выбранный раздел просто белый, толщина у всех одна — жирная */}
                <Text style={{
                  color: active === i ? '#ffffff' : S.tabs.off,
                  fontSize: S.tabs.font, fontWeight: '700',
                  marginTop: S.tabs.textDrop,
                }}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}

            {/* белая линия под выбранным разделом */}
            <Animated.View
              pointerEvents="none"
              style={[{
                position: 'absolute', top: S.underline.top - tabsTop,
                height: S.underline.h, backgroundColor: '#ffffff', borderRadius: 1,
              }, lineStyle]}
            />
          </Animated.View>

          {/* затемнение у правого края: поверх текста и подчёркивания */}
          <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0 }}>
            <Svg width={S.fade.w} height={S.divider.top - boxTop}>
              <Defs>
                <LinearGradient id="tabFade" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={S.fade.color} stopOpacity="0" />
                  <Stop offset="1" stopColor={S.fade.color} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={S.fade.w} height={S.divider.top - boxTop} fill="url(#tabFade)" />
            </Svg>
          </View>

          <View style={{
            position: 'absolute', left: 0, right: 0, top: S.divider.top - boxTop,
            height: S.divider.h, backgroundColor: S.divider.color,
          }} />
        </View>
      </Animated.View>

      {/* прибитая шапка */}
      <View style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: headH,
        backgroundColor: '#000000',
      }}>
        <TouchableOpacity
          onPress={() => goBack(router, editable ? '/settings/stats' : '/profile')}
          style={{ position: 'absolute', left: S.back.x - 9, top: top + S.back.cy - S.back.size / 2 }}
        >
          <ChevronLeft size={S.back.size} color="#ffffff" />
        </TouchableOpacity>
        {/* заголовок во всю ширину не должен перехватывать нажатие «назад» */}
        <Text pointerEvents="none" style={{
          position: 'absolute', left: 0, right: 0,
          top: top + S.title.capTop - S.title.font * 0.21,
          textAlign: 'center', color: '#ffffff',
          fontSize: S.title.font, fontWeight: '700',
        }}>
          Анализ видео
        </Text>
        <TouchableOpacity style={{ position: 'absolute', right: S.studio.right, top: top + S.studio.top }}>
          <Image
            source={STUDIO}
            style={{ height: S.studio.h, width: S.studio.h * S.studio.ratio }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* подсказка в режиме правки и кнопка пресетов над ней */}
      {editable && (
        <View pointerEvents="box-none" style={{
          position: 'absolute', left: 0, right: 0, bottom: 34, alignItems: 'center',
        }}>
          {video && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowPresets(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', marginBottom: 8,
                backgroundColor: 'rgba(40,40,40,0.97)', borderRadius: 18,
                borderWidth: 1, borderColor: '#fe2c55',
                paddingHorizontal: 16, paddingVertical: 8,
              }}
            >
              <Bookmark size={14} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700', marginLeft: 6 }}>Пресеты</Text>
            </TouchableOpacity>
          )}
          <View pointerEvents="none" style={{
            backgroundColor: 'rgba(254,44,85,0.95)', borderRadius: 16,
            paddingHorizontal: 14, paddingVertical: 7,
          }}>
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>
              Нажми на блок, чтобы поменять цифры
            </Text>
          </View>
        </View>
      )}

      {video && (
        <StatsEditSheet
          section={editing}
          stats={stats}
          duration={video.duration}
          extra={{ description: video.description, date: video.date, display: video.display }}
          onClose={() => setEditing(null)}
          onSave={(patch, extra) => {
            updateMyVideoStats(video.id, patch);
            if (extra) updateMyVideo(video.id, extra);
            setEditing(null);
          }}
        />
      )}
      {video && editable && (
        <PresetsSheet visible={showPresets} videoId={video.id} onClose={() => setShowPresets(false)} />
      )}
    </View>
    </StatsVideo.Provider>
  );
}
