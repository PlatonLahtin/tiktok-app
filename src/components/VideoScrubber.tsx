/* Пауза и перемотка на экране видео из профиля. Всё снято с эталонных
   скриншотов (точки экрана, iPhone 14 Plus):

   • тап по видео — пауза; посередине плавно проявляется полупрозрачный
     треугольник «play», при продолжении так же плавно исчезает;
   • полоса над нижней панелью: пока видео идёт — тонкая серая (2 точки);
     на паузе — потолще (4.3), белая, с кругляшом на конце;
   • тянешь полосу — она становится толстой (12.3) со светлой «ручкой»,
     над ней кадр из этого места ролика и «00:40 / 01:49», а лайки,
     ник и прочее прячутся; отпустил — видео перематывается и играет. */

import React, { useEffect, useRef } from 'react';
import { View, Animated, PanResponder, Platform, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { VideoView, VideoPlayer } from 'expo-video';
import { Text } from './FixedText';
import { roundedTriangle } from '../lib/shapes';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/* сняты на экране высотой 926 точек: всё, что над полосой, считаем от низа */
const REF_H = 926;
const native = Platform.OS !== 'web';

export const SCRUB = {
  left: 12, right: 12.3,
  bottom: 82.8,             // нижний край полосы от низа экрана (над разделителем панели)
  hit: 30,                  // зона, за которую можно хвататься: чуть выше полосы
  hitBelow: 7,              // и немного ниже неё — до кнопок панели
  play:  { h: 2,    track: '#1f1f1f', fill: '#808080', knob: 3.7 },   // шарик чуть толще полосы
  pause: { h: 4.3,  track: '#333333', fill: '#ffffff', knob: 8 },
  drag:  { h: 12.3, track: '#343434', fill: '#c0c0c0', knobW: 9.3, knobH: 16 },
  preview: { w: 87.3, h: 140, top: 584, radius: 7, border: '#9a9a9a' },
  time: { top: 740.5, font: 16.5, now: '#f6f6f6', rest: '#999999', slashGap: 9 },
  icon: { w: 34, h: 48, cx: 210, cy: 420, color: 'rgba(255,255,255,0.45)', round: 6 },
};

export const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/* полупрозрачный «play» посередине: проявляется из пустоты и уходит */
export function PauseIcon({ visible }: { visible: boolean }) {
  const a = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: visible ? 1 : 0, duration: 90, useNativeDriver: native }).start();
  }, [visible, a]);
  const I = SCRUB.icon;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: SCREEN_W / 2 + (I.cx - 214) - I.w / 2, top: SCREEN_H / 2 + (I.cy - REF_H / 2) - I.h / 2, zIndex: 6,
        opacity: a,
        transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }) }],
      }}
    >
      <Svg width={I.w} height={I.h}>
        <Path d={roundedTriangle([[0, 0], [I.w, I.h / 2], [0, I.h]], I.round)} fill={I.color} />
      </Svg>
    </Animated.View>
  );
}

/* кадр из выбранного места и время — над полосой, пока тянешь */
export function ScrubPreview({ player, frac, duration }: { player: VideoPlayer; frac: number; duration: number }) {
  const P = SCRUB.preview, T = SCRUB.time;
  return (
    <>
      <View pointerEvents="none" style={{
        position: 'absolute', left: (SCREEN_W - P.w) / 2, top: SCREEN_H - (REF_H - P.top), width: P.w, height: P.h, zIndex: 30,
        borderRadius: P.radius, borderWidth: 0.8, borderColor: P.border, backgroundColor: '#000000', overflow: 'hidden',
      }}>
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          nativeControls={false}
          allowsVideoFrameAnalysis={false}
        />
      </View>
      <View pointerEvents="none" style={{
        position: 'absolute', left: 0, right: 0, top: SCREEN_H - (REF_H - T.top), zIndex: 30,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ color: T.now, fontSize: T.font, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {mmss(frac * duration)}
        </Text>
        <Text style={{ color: T.rest, fontSize: T.font * 0.7, marginHorizontal: T.slashGap }}>/</Text>
        <Text style={{ color: T.rest, fontSize: T.font, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {mmss(duration)}
        </Text>
      </View>
    </>
  );
}

/* сама полоса. frac — где сейчас (0…1). mode: идёт / пауза / тянут */
export function ScrubBar({ getTime, duration, active = true, mode, onStart, onMove, onEnd, onTouch }: {
  getTime: () => number; duration: number; active?: boolean;
  mode: 'play' | 'pause' | 'drag';
  onStart: (f: number) => void; onMove: (f: number) => void; onEnd: (f: number) => void;
  /* палец на полосе / убран — чтобы экран сразу перестал листаться */
  onTouch?: (down: boolean) => void;
}) {
  const barW = SCREEN_W - SCRUB.left - SCRUB.right;
  const offset = useRef(0);   // где полоса на странице (pageX её левого края)
  const toFrac = (pageX: number) => Math.min(1, Math.max(0, (pageX - offset.current) / barW));

  /* Положение полосы — анимированное значение, а не состояние экрана:
     так она двигается каждый кадр (плавно), а весь экран не перерисовывается.
     Пока видео идёт — каждый кадр берём время прямо у плеера;
     пока тянут — ставим туда, где палец. */
  const pos = useRef(new Animated.Value(0)).current;
  const draggingRef = useRef(false);
  const durRef = useRef(duration);
  durRef.current = duration;
  const timeRef = useRef(getTime);
  timeRef.current = getTime;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      if (!draggingRef.current && durRef.current > 0) {
        let t = 0;
        try { t = timeRef.current() || 0; } catch { /* плеер отпущен */ }
        pos.setValue(Math.min(1, Math.max(0, t / durRef.current)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, pos]);

  const handlers = useRef({ onStart, onMove, onEnd });
  handlers.current = { onStart, onMove, onEnd };
  const lastMove = useRef(0);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      /* locationX — от края зоны (дети её не перехватывают), pageX — от края страницы */
      offset.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
      const f = toFrac(e.nativeEvent.pageX);
      draggingRef.current = true;
      pos.setValue(f);
      handlers.current.onStart(f);
    },
    onPanResponderMove: (e) => {
      const f = toFrac(e.nativeEvent.pageX);
      pos.setValue(f);                         // полоса — сразу, каждый кадр
      const now = Date.now();
      if (now - lastMove.current > 50) {       // кадр и время над полосой — ~20 раз в секунду
        lastMove.current = now;
        handlers.current.onMove(f);
      }
    },
    onPanResponderRelease: (e) => finish(toFrac(e.nativeEvent.pageX)),
    onPanResponderTerminate: (e) => finish(toFrac(e.nativeEvent.pageX)),
  })).current;
  function finish(f: number) {
    pos.setValue(f);
    handlers.current.onEnd(f);
    /* плеер ещё секунду может отдавать старое время — не дёргаем полосу назад */
    setTimeout(() => { draggingRef.current = false; }, 250);
  }

  const S = mode === 'drag' ? SCRUB.drag : mode === 'pause' ? SCRUB.pause : SCRUB.play;
  const fillW = pos.interpolate({ inputRange: [0, 1], outputRange: [0, barW], extrapolate: 'clamp' });
  /* шарик: по центру конца заливки, но не вылезает за края полосы */
  const knobLeft = (k: number) => pos.interpolate({
    inputRange: [0, k / 2 / barW, 1 - k / 2 / barW, 1],
    outputRange: [0, 0, barW - k, barW - k],
    extrapolate: 'clamp',
  });
  const K = mode === 'pause' ? SCRUB.pause : SCRUB.play;

  return (
    <View
      {...pan.panHandlers}
      onTouchStart={() => onTouch?.(true)}
      onTouchEnd={() => onTouch?.(false)}
      onTouchCancel={() => onTouch?.(false)}
      style={{
        position: 'absolute', left: SCRUB.left, width: barW, bottom: SCRUB.bottom - SCRUB.hitBelow,
        height: SCRUB.hit, paddingBottom: SCRUB.hitBelow, justifyContent: 'flex-end', zIndex: 40,
      }}
    >
      <View pointerEvents="none" style={{ height: S.h, width: barW }}>
        <View style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: S.h,
          /* концы полосы скруглены во всех трёх видах — как в приложении */
          backgroundColor: S.track, borderRadius: S.h / 2, overflow: 'hidden',
        }}>
          <Animated.View style={{ width: fillW, height: S.h, backgroundColor: S.fill, borderRadius: S.h / 2 }} />
        </View>

        {/* шарик на конце: на паузе белый побольше, пока идёт — маленький серый */}
        {mode !== 'drag' ? (
          <Animated.View style={{
            position: 'absolute', left: knobLeft(K.knob),
            bottom: (K.h - K.knob) / 2,
            width: K.knob, height: K.knob, borderRadius: K.knob / 2,
            backgroundColor: K.fill,
          }} />
        ) : (
          <Animated.View style={{
            position: 'absolute', left: knobLeft(SCRUB.drag.knobW),
            bottom: (SCRUB.drag.h - SCRUB.drag.knobH) / 2,
            width: SCRUB.drag.knobW, height: SCRUB.drag.knobH, borderRadius: SCRUB.drag.knobW / 2,
            backgroundColor: '#ffffff',
          }} />
        )}
      </View>
    </View>
  );
}
