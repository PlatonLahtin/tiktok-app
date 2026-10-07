/* Аватарки тех, кто лайкнул видео. Кружки идут снизу вверх:
   новый внизу проявляется быстро, верхний растворяется дольше.
   На экране держатся три непрозрачных плюс один затухающий.

   Числа сняты с эталона и переведены в точки экрана. */

import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, Easing } from 'react-native';
import { AVATARS } from '../lib/avatars';

const HEART = require('../../assets/icons/like-badge.png');


const L = {
  left: 12.0,
  box: 48.0,                              // серый кружок-подложка
  pad: 4.0,                               // он шире аватарки на рамку
  ringColor: 'rgba(255,255,255,0.16)',
  heart: 20.0, heartLeft: 30.0, heartTop: 24.0,
  gap: 60.0,                              // шаг между кружками
  bottom: 176.0,                          // нижний кружок от низа экрана
  slots: 4,                               // сколько держим на экране
  period: 1400,                           // один шаг
  delay: 1000,                            // пауза после открытия экрана
};

/* Прозрачность зависит от места: снизу быстро набирается,
   сверху медленно сходит на нет. */
function slotOpacity(t: Animated.Value, slot: number) {
  if (slot === 0) return t.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1, 1] });
  if (slot === L.slots - 1) return t.interpolate({ inputRange: [0, 0.1, 1], outputRange: [1, 1, 0] });
  return 1;
}

export default function LikerBubbles() {
  const t = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(-1);   // -1 — ещё ни одного кружка

  useEffect(() => {
    let stopped = false;
    const run = () => {
      if (stopped) return;
      t.setValue(0);
      Animated.timing(t, {
        toValue: 1, duration: L.period, easing: Easing.linear, useNativeDriver: true,
      }).start(({ finished }) => {
        if (stopped || !finished) return;
        setStep((s) => s + 1);
        run();
      });
    };
    const id = setTimeout(() => { setStep(0); run(); }, L.delay);
    return () => { stopped = true; clearTimeout(id); t.stopAnimation(); };
  }, [t]);

  if (step < 0) return null;

  const rise = t.interpolate({ inputRange: [0, 1], outputRange: [0, -L.gap] });
  const inner = L.box - L.pad * 2;

  return (
    <>
      {Array.from({ length: L.slots }, (_, slot) => slot)
        /* пока кружков вышло меньше, чем мест, лишние не рисуем —
           так они и выходят по одному после открытия экрана */
        .filter((slot) => slot <= step)
        .map((slot) => {
          const avatar = AVATARS[(((step - slot) % AVATARS.length) + AVATARS.length) % AVATARS.length];
          return (
            <Animated.View
              key={slot}
              pointerEvents="none"
              style={{
                position: 'absolute', left: L.left, bottom: L.bottom + slot * L.gap,
                width: L.box, height: L.box, borderRadius: L.box / 2,
                backgroundColor: L.ringColor, padding: L.pad,
                opacity: slotOpacity(t, slot),
                transform: [{ translateY: rise }],
                zIndex: 10,
              }}
            >
              <Image
                source={avatar}
                style={{ width: inner, height: inner, borderRadius: inner / 2 }}
              />
              <Image
                source={HEART}
                style={{
                  position: 'absolute', left: L.heartLeft, top: L.heartTop,
                  width: L.heart, height: L.heart,
                }}
              />
            </Animated.View>
          );
        })}
    </>
  );
}
