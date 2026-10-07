/* Значки нижней панели — файлы из assets/icons.
   У картинок нет полей: край файла = край значка.
   Поэтому задаём высоту, а ширину считаем по пропорции —
   иначе значки с разной формой сплющивались бы. */

import React from 'react';
import { Image, View } from 'react-native';
import { Text } from './FixedText';
import { useVideoStore } from '../store/useVideoStore';

/* Общей высоты нет: в приложении у каждого значка она своя.
   Числа сняты с эталона, ширина считается по пропорции файла. */
const ICON = {
  home:    { off: require('../../assets/icons/home.png'),    on: require('../../assets/icons/home-active.png'),    ratio: 0.954, h: 21.1 },
  friends: { off: require('../../assets/icons/friends.png'), on: require('../../assets/icons/friends-active.png'), ratio: 1.200, h: 19.7 },
  inbox:   { off: require('../../assets/icons/inbox.png'),   on: require('../../assets/icons/inbox-active.png'),   ratio: 1.025, h: 21.2 },
  profile: { off: require('../../assets/icons/profile.png'), on: require('../../assets/icons/profile-active.png'), ratio: 0.906, h: 20.1 },
};

type P = { size?: number; color?: string; active?: boolean };

const make = (key: keyof typeof ICON) =>
  ({ active = false }: P) => {
    const it = ICON[key];
    return (
      <Image
        source={active ? it.on : it.off}
        style={{ height: it.h, width: it.h * it.ratio }}
        resizeMode="contain"
      />
    );
  };

export const IconHome    = make('home');
export const IconFriends = make('friends');
export const IconProfile = make('profile');

/* ─── Входящие со счётчиком ───
   Надпись берётся из «Настройки визуала». «99+» — ровно по эталону (ширина 35);
   короткая — кружок, длинная — плашка растёт вправо, левый край на месте. */
const BADGE = { text: '99+', fontSize: 11.5, width: 35, height: 15, radius: 8, top: -7, right: -15.7, padX: 4.5 };

export function IconInbox({ active = false }: P) {
  const it = ICON.inbox;
  const text = useVideoStore((s) => s.currentUser.inboxBadge);
  const iconW = it.h * it.ratio;
  return (
    <View style={{ height: it.h, width: it.h * it.ratio }}>
      <Image
        source={active ? it.on : it.off}
        style={{ height: it.h, width: it.h * it.ratio }}
        resizeMode="contain"
      />
      {/* внешний слой даёт плашке место расти вправо — иначе её
         сжимает ширина самой иконки и текст обрезается */}
      {!!text && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: BADGE.top,
            left: iconW + BADGE.right * -1 - BADGE.width,
            width: 120,
            flexDirection: 'row',
          }}
        >
          <View
            style={{
              height: BADGE.height,
              ...(text === BADGE.text
                ? { width: BADGE.width }
                : { minWidth: BADGE.height, paddingHorizontal: BADGE.padX }),
              borderRadius: BADGE.radius,
              backgroundColor: '#fe2c55',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: '#ffffff',
                fontSize: BADGE.fontSize,
                fontWeight: '800',
                includeFontPadding: false,
                textAlign: 'center',
              }}
            >
              {text}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

/* ─── Кнопка «плюс» ─── */
const CREATE = { height: 28.7, ratio: 1.6, shiftY: 5.6 };   // размер и сдвиг сняты от низа экрана

export function IconCreate() {
  // сдвигаем не отступом, а смещением: отступ панель обрезает
  return (
    <View style={{ height: CREATE.height, width: CREATE.height * CREATE.ratio,
                   transform: [{ translateY: CREATE.shiftY }] }}>
      <Image
        source={require('../../assets/icons/create.png')}
        style={{ height: CREATE.height, width: CREATE.height * CREATE.ratio }}
        resizeMode="contain"
      />
    </View>
  );
}
