/* Значки верхней строки профиля.
   Картинки без полей: край файла = край рисунка,
   поэтому задаём высоту, ширину считаем по пропорции.

   Значок с аватаркой и числом собран вручную:
   белые цифры с толстой чёрной обводкой лежат поверх кружка,
   обводка и «выкусывает» у кружка кусок справа — как в приложении. */

import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

/* ── простые значки ── */
const PENCIL = require('../../assets/icons/pencil.png');
const ADD    = require('../../assets/icons/add-friend.png');
const MENU   = require('../../assets/icons/menu.png');

const SIZES = {
  pencil: { src: PENCIL, h: 19.0, ratio: 0.995 },
  add:    { src: ADD,    h: 19.0, ratio: 1.068 },
  menu:   { src: MENU,   h: 13.3, ratio: 1.332 },
};

const make = (key: keyof typeof SIZES) => () => {
  const it = SIZES[key];
  return (
    <Image
      source={it.src}
      style={{ height: it.h, width: it.h * it.ratio, tintColor: '#ffffff' }}
      resizeMode="contain"
    />
  );
};

export const IconPencil    = make('pencil');
export const IconAddFriend = make('add');
export const IconMenu      = make('menu');

/* ── аватарка с числом ──
   Все числа — в точках, сняты с эталона (скриншот 3x, поделено на 3). */
const AC = {
  circle:   23.7,   // диаметр кружка
  numLeft:  16.35,   // от левого края кружка до начала цифр
  baseline: 21.3,   // низ цифр от верха кружка
  font:     11.0,   // размер цифр
  outline:  2.33,   // насколько чёрная обводка вылезает за цифры
  width:    29.0,   // общая ширина значка вместе с цифрами
};

export function AvatarCount({ avatar, count }: { avatar: any; count: string }) {
  const pad = AC.outline + 1;                 // запас холста под обводку
  return (
    <View style={{ width: AC.width, height: AC.circle }}>
      <Image
        source={avatar}
        style={{ width: AC.circle, height: AC.circle, borderRadius: AC.circle / 2 }}
      />
      <Svg
        style={{ position: 'absolute', left: 0, top: 0 }}
        width={AC.width + pad + 40}   // запас справа — под длинное число из настроек
        height={AC.circle + pad}
      >
        {/* сначала чёрный контур, поверх — белая заливка */}
        <SvgText
          x={AC.numLeft} y={AC.baseline}
          fontSize={AC.font} fontWeight="bold"
          fill="#000000" stroke="#000000" strokeWidth={AC.outline * 2}
          strokeLinejoin="round"
        >
          {count}
        </SvgText>
        <SvgText
          x={AC.numLeft} y={AC.baseline}
          fontSize={AC.font} fontWeight="bold"
          fill="#ffffff"
        >
          {count}
        </SvgText>
      </Svg>
    </View>
  );
}
