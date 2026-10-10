/* Экран видео из профиля. От ленты он отличается:
   сверху строка поиска связанного контента, вместо «Поделиться» —
   три точки, снизу полоса с просмотрами и кнопкой.
   Все числа сняты с эталона, в точках экрана. */

import React, { useCallback, useRef, useState } from 'react';
import { View, Image, StatusBar, Dimensions, Pressable, StyleSheet } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text } from '../../components/FixedText';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import Svg, { Path } from 'react-native-svg';
import { useVideoStore, videoSource, shownCount } from '../../store/useVideoStore';
import { roundedTriangle } from '../../lib/shapes';
import ShareSheet from '../../components/ShareSheet';
import LikerBubbles from '../../components/LikerBubbles';
import { goBack } from '../../lib/goBack';
import { ScrubBar, ScrubPreview, PauseIcon } from '../../components/VideoScrubber';

const { width, height } = Dimensions.get('window');

const V = {
  /* верхняя строка */
  back: { x: 14, size: 28, cy: 80.7 },
  /* плашка скруглена умеренно: радиус ≈ 10, а не «таблетка» */
  pill: {
    left: 47.7, right: 16.6, top: 63.4, h: 34.9, radius: 9,
    border: 'rgba(255,255,255,0.5)', padL: 13.6, padR: 12.3,
  },
  pillIcon: 17,
  pillFont: 15,
  pillGap: 11.1,          // от значка лупы до текста
  divider: { w: 1, h: 19, color: 'rgba(255,255,255,0.45)' },
  searchWord: 'Поиск',

  /* правая колонка */
  colW: 61,
  ava: 43.6, ring: 1.3, ringColor: 'rgba(235,235,235,0.55)',
  avaBottom: 422.4,
  disc: 36.5, discBottom: 100.1,
  font: 11.1, line: 13,
  items: [
    { key: 'likes',    src: require('../../../assets/icons/feed-like.png'),    h: 26.3, ratio: 1.104, iconB: 358.9, textB: 339.8 },
    { key: 'comments', src: require('../../../assets/icons/feed-comment.png'), h: 27.3, ratio: 1.029, iconB: 292.5, textB: 276.3 },
    { key: 'saves',    src: require('../../../assets/icons/feed-save.png'),    h: 23.4, ratio: 0.876, iconB: 229.1, textB: 210.3 },
  ],
  dots: { bottom: 172.0, d: 4.3, gap: 4.6 },

  /* текст под видео. В приложении под описанием идёт ещё строка со звуком —
     её мы не делаем, поэтому весь блок опущен на строку вниз,
     чтобы под ним не оставалось пустоты до полосы с просмотрами. */
  textLeft: 12.4, textWidth: 285,
  nameBottom: 124.4, nameFont: 16.5, nameLine: 19.5,
  dateFont: 15, dateColor: '#9e9e9e', dateGap: 5.5,
  descBottom: 96.0, descFont: 14, descLine: 17.5, descColor: '#ededed',

  /* нижняя полоса */
  barH: 83.0,
  rule: { h: 0.5, color: '#303030' },   // еле заметный разделитель сверху
  views: {
    /* рамка svg чуть больше самого треугольника: скруглённые углы
       и обводка «съедают» край, поэтому размеры подобраны по отрисовке */
    left: 19.6, bottom: 48.5, font: 14.3, color: '#828282', gap: 6.1,
    tri: { w: 16.4, h: 18.5, line: 1.5, round: 2.0 },
  },
  btn: {
    right: 11.9, bottom: 39.2, w: 140.1, h: 35.8,
    bg: '#363636', font: 9.8, text: 'Настройк...иальности',
  },
};

export default function ProfileVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { myVideos, currentUser } = useVideoStore();
  const [shareOpen, setShareOpen] = useState(false);

  const video = myVideos.find((v) => v.id === id) ?? myVideos[0];

  const player = useVideoPlayer(videoSource(video ?? { uri: null }), (p) => {
    p.loop = true;
    p.muted = false;
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });

  /* второй, беззвучный плеер — только для кадра над полосой при перемотке */
  const preview = useVideoPlayer(videoSource(video ?? { uri: null }), (p) => {
    p.muted = true;
    p.loop = false;
  });

  /* пауза, перемотка, где сейчас ролик */
  const [paused, setPaused] = useState(false);
  const [dragFrac, setDragFrac] = useState<number | null>(null);   // не null — тянут полосу
  const [now, setNow] = useState(0);
  const [dur, setDur] = useState(video?.duration ?? 0);
  useEventListener(player, 'timeUpdate', ({ currentTime }) => setNow(currentTime));
  useEventListener(player, 'sourceLoad', ({ duration }) => { if (duration > 0) setDur(duration); });
  const lastSeek = useRef(0);

  const togglePause = () => {
    if (paused) { player.play(); setPaused(false); }
    else { player.pause(); setPaused(true); }
  };
  const previewAt = (f: number, force = false) => {
    const t = Date.now();
    if (!force && t - lastSeek.current < 60) return;   // не чаще ~15 раз в секунду
    lastSeek.current = t;
    try { preview.currentTime = f * dur; } catch { /* плеер ещё не готов */ }
  };
  const scrubStart = (f: number) => { setDragFrac(f); previewAt(f, true); };
  const scrubMove = (f: number) => { setDragFrac(f); previewAt(f); };
  const scrubEnd = (f: number) => {
    /* отпустили — перематываем и сразу играем, даже если стояла пауза */
    try { player.currentTime = f * dur; } catch { /* ещё не готов */ }
    setNow(f * dur);
    player.play();
    setPaused(false);
    setDragFrac(null);
  };
  const dragging = dragFrac !== null;

  /* ушли на другой экран (статистика лежит поверх этого) — на паузу,
     вернулись — играем дальше; иначе звук идёт из-под статистики */
  useFocusEffect(
    useCallback(() => {
      player.play();
      setPaused(false);
      return () => {
        try { player.pause(); } catch { /* экран закрыли — плеер уже отпущен */ }
      };
    }, [player]),
  );

  if (!video) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#888888' }}>Видео не найдено</Text>
      </View>
    );
  }

  const value = (key: string) =>
    shownCount(video, key === 'likes' ? 'screenLikes' : key === 'comments' ? 'screenComments' : 'screenSaves');

  const T = V.views.tri;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" />

      <VideoView
        player={player}
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
        contentFit="contain"   /* ролик не вертикальный: вписываем целиком */
        nativeControls={false}
        allowsVideoFrameAnalysis={false}
      />

      {/* тап по видео — пауза / дальше; кнопки и подписи лежат выше и ловят свои нажатия */}
      <Pressable onPress={togglePause} style={[StyleSheet.absoluteFill, { zIndex: 5 }]} />
      <PauseIcon visible={paused && !dragging} />

      {/* верх: назад и строка поиска связанного контента */}
      <View style={{
        position: 'absolute', left: V.back.x, top: V.back.cy - V.back.size / 2, zIndex: 20,
      }}>
        <TouchableOpacity onPress={() => goBack(router, '/profile')}>
          <ChevronLeft size={V.back.size} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={{
        position: 'absolute', left: V.pill.left, right: V.pill.right, top: V.pill.top,
        height: V.pill.h, borderRadius: V.pill.radius,
        borderWidth: 1, borderColor: V.pill.border,
        flexDirection: 'row', alignItems: 'center',
        paddingLeft: V.pill.padL, paddingRight: V.pill.padR, zIndex: 20,
      }}>
        <Search size={V.pillIcon} color="#ffffff" strokeWidth={2.4} />
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: '#ffffff', fontSize: V.pillFont, fontWeight: '700', marginLeft: V.pillGap }}
        >
          Найти связанный контент
        </Text>
        <View style={{ width: V.divider.w, height: V.divider.h, backgroundColor: V.divider.color, marginHorizontal: 10 }} />
        <Text style={{ color: '#ffffff', fontSize: V.pillFont, fontWeight: '700' }}>{V.searchWord}</Text>
      </View>

      {/* правая колонка */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: V.colW, zIndex: 10, opacity: dragging ? 0 : 1 }}
      >
        {/* своё видео — кнопки «подписаться» под аватаркой нет */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: V.avaBottom, alignItems: 'center' }}>
          <Image
            source={{ uri: currentUser.avatar }}
            style={{
              width: V.ava, height: V.ava, borderRadius: V.ava / 2,
              borderWidth: V.ring, borderColor: V.ringColor,
            }}
          />
        </View>

        {V.items.map((it) => (
          <React.Fragment key={it.key}>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: it.iconB, alignItems: 'center' }}>
              <Image source={it.src} style={{ height: it.h, width: it.h * it.ratio }} resizeMode="contain" />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{
              /* длинное («169,4 тыс.») чуть ужимается, чтобы не переносилось и не лезло за край */
              position: 'absolute', left: 0, right: 0, bottom: it.textB, textAlign: 'center',
              color: '#ffffff', fontSize: V.font, fontWeight: '700', lineHeight: V.line,
            }}>
              {value(it.key)}
            </Text>
          </React.Fragment>
        ))}

        {/* три точки вместо «Поделиться» — открывают шторку «Отправить» */}
        <TouchableOpacity
          onPress={() => setShareOpen(true)}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: V.dots.bottom - 10,
            paddingVertical: 10,
            flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
          }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: V.dots.d, height: V.dots.d, borderRadius: V.dots.d / 2,
                backgroundColor: '#ffffff', marginLeft: i === 0 ? 0 : V.dots.gap,
              }}
            />
          ))}
        </TouchableOpacity>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: V.discBottom, alignItems: 'center' }}>
          <Image
            source={{ uri: currentUser.avatar }}
            style={{ width: V.disc, height: V.disc, borderRadius: V.disc / 2 }}
          />
        </View>
      </View>

      {/* аватарки тех, кто лайкнул — идут снизу вверх */}
      {/* нет лайков — некому и всплывать */}
      {/* пока тянут полосу — всё лишнее прячется (как в приложении) */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 10, opacity: dragging ? 0 : 1 }]}>
        {!/^\s*0?\s*$/.test(shownCount(video, 'screenLikes')) && <LikerBubbles />}
      </View>

      {/* ник и описание */}
      {/* Ник и описание в одной колонке, прижатой к низу: если описание
          занимает две строки, ник сам поднимается выше и не перекрывается.
          При одной строке всё стоит ровно там же, где и раньше. */}
      <View style={{ position: 'absolute', left: V.textLeft, bottom: V.descBottom, width: V.textWidth, zIndex: 10, opacity: dragging ? 0 : 1 }}>
        <View style={{ flexDirection: 'row' }}>
          {/* над описанием — ник (имя профиля), а не @имя пользователя */}
          <Text numberOfLines={1} style={{ flexShrink: 1, color: '#ffffff', fontSize: V.nameFont, fontWeight: '700', lineHeight: V.nameLine }}>
            {currentUser.name}
          </Text>
          <Text style={{
            color: V.dateColor, fontSize: V.dateFont, fontWeight: '700',
            lineHeight: V.nameLine, marginLeft: V.dateGap,
          }}>
            {'\u00B7 ' + video.date}
          </Text>
        </View>
        {video.description ? (
          <Text
            numberOfLines={2}
            style={{
              color: V.descColor, fontSize: V.descFont, lineHeight: V.descLine,
              marginTop: V.nameBottom - V.descBottom - V.descLine,
            }}
          >
            {video.description}
          </Text>
        ) : (
          // без описания ник остаётся на прежней высоте
          <View style={{ height: V.nameBottom - V.descBottom }} />
        )}
      </View>

      {/* нижняя полоса: просмотры и кнопка */}
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: V.barH,
        backgroundColor: '#000000', zIndex: 15,
      }} />
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: V.barH,
        height: V.rule.h, backgroundColor: V.rule.color, zIndex: 16,
      }} />

      <View style={{
        position: 'absolute', left: V.views.left, bottom: V.views.bottom,
        flexDirection: 'row', alignItems: 'center', zIndex: 20,
      }}>
        {/* треугольник пустой внутри, как в приложении */}
        <Svg width={T.w} height={T.h}>
          <Path
            d={roundedTriangle([
              [T.line / 2, T.line / 2],
              [T.w - T.line / 2, T.h / 2],
              [T.line / 2, T.h - T.line / 2],
            ], T.round)}
            fill="none" stroke={V.views.color}
            strokeWidth={T.line} strokeLinejoin="round"
          />
        </Svg>
        <Text style={{
          color: V.views.color, fontSize: V.views.font,
          fontWeight: '700', marginLeft: V.views.gap,
        }}>
          Просмотры: {shownCount(video, 'screenViews')}
        </Text>
      </View>

      <TouchableOpacity style={{
        position: 'absolute', right: V.btn.right, bottom: V.btn.bottom,
        width: V.btn.w, height: V.btn.h, borderRadius: V.btn.h / 2,
        backgroundColor: V.btn.bg, alignItems: 'center', justifyContent: 'center', zIndex: 20,
      }}>
        <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: V.btn.font, fontWeight: '700' }}>
          {V.btn.text}
        </Text>
      </TouchableOpacity>

      {/* полоса перемотки и, пока её тянут, кадр с временем над ней */}
      {dragging && <ScrubPreview player={preview} frac={dragFrac!} duration={dur} />}
      <ScrubBar
        frac={dragging ? dragFrac! : dur > 0 ? now / dur : 0}
        mode={dragging ? 'drag' : paused ? 'pause' : 'play'}
        onStart={scrubStart}
        onMove={scrubMove}
        onEnd={scrubEnd}
      />

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        avatar={currentUser.avatar}
        username={currentUser.username}
        onOpenStats={() => {
          /* сначала убираем шторку, потом открываем статистику —
             иначе они наезжают друг на друга */
          setShareOpen(false);
          setTimeout(() => router.push(`/stats/${video.id}` as any), 180);
        }}
      />
    </View>
  );
}
