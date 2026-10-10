/* Облачко с фразой над аватаркой в профиле («Кофе или чай?»).
   Раньше это была готовая картинка с текстом. Теперь облачко рисуется
   кодом (размеры и цвета сняты с той картинки), поэтому текст любой:
   нажал на облачко → выбрал одну из готовых фраз или написал свою.

   Правый край облачка и точка под ним стоят на месте, а при длинной
   фразе облачко растёт влево — как в приложении. */

import React, { useState } from 'react';
import { View, Modal, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TouchableOpacity } from './Touchable';
import { Text, TextInput } from './FixedText';
import { Check } from 'lucide-react-native';

export const NOTE_DEFAULT = 'Кофе или чай?';

export const NOTE_PHRASES = [
  'Кофе или чай?',
  'Что хорошего?',
  'Как дела?',
  'Чем занят?',
  'Какой фильм посоветуешь?',
  'Кошки или собаки?',
  'Что слушаешь?',
  'Как настроение?',
  'Лето или зима?',
  'Во что играешь?',
];

const N = {
  bg: '#383838',
  text: '#bdbdbd',
  font: 10.6,       // высота заглавной ≈ 7 точек — как на картинке-эталоне
  h: 30.2,          // высота облачка
  radius: 11.9,
  padX: 8.9,
  maxW: 300,        // длинная фраза целиком (как в приложении), облачко растёт влево
  tail: { fromRight: 29.5, w: 12.6, h: 5.8 },     // «язычок» под облачком
  dot: { fromRight: 27.5, below: 9.7, r: 2.7 },   // точка под язычком
};

/* само облачко. right/top — где стоит его правый верхний угол */
export function NoteBubble({ text, right, top, onPress }: {
  text: string; right: number; top: number; onPress?: () => void;
}) {
  /* Внешний слой — широкая прозрачная рамка: без неё облачко сжималось
     до ширины аватарки и фраза обрезалась троеточием. Нажатия она
     не ловит (box-none), ловит только само облачко. */
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right, top, width: N.maxW, alignItems: 'flex-end' }}>
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{ alignItems: 'flex-end' }}
    >
      <View style={{
        height: N.h, borderRadius: N.radius, backgroundColor: N.bg,
        paddingHorizontal: N.padX, justifyContent: 'center', maxWidth: N.maxW,
      }}>
        <Text numberOfLines={1} style={{ color: N.text, fontSize: N.font, fontWeight: '500' }}>
          {text}
        </Text>
      </View>
      {/* язычок прилегает к низу облачка, точка — чуть ниже */}
      <Svg
        width={N.tail.w} height={N.tail.h + 0.6}
        viewBox={`0 -0.6 ${N.tail.w} ${N.tail.h + 0.6}`}
        style={{ position: 'absolute', right: N.tail.fromRight - N.tail.w, top: N.h - 0.6 }}
      >
        <Path
          d="M0,-0.6 L0,0.16 C0.8,0.6 1.7,1.4 1.95,2.4 L2.1,3.6 C2.3,4.6 3,5.75 4.68,5.75
             C5.9,5.75 6.9,4.8 7.6,4.0 C8.4,3.0 9.0,1.9 10.0,1.2 C10.8,0.6 11.8,0.25 12.56,0.16 L12.56,-0.6 Z"
          fill={N.bg}
        />
      </Svg>
      <View style={{
        position: 'absolute',
        right: N.dot.fromRight - N.dot.r, top: N.h + N.dot.below - N.dot.r,
        width: N.dot.r * 2, height: N.dot.r * 2, borderRadius: N.dot.r, backgroundColor: N.bg,
      }} />
    </TouchableOpacity>
    </View>
  );
}

/* окно выбора фразы */
export function NotePicker({ visible, current, onPick, onClose }: {
  visible: boolean; current: string; onPick: (t: string) => void; onClose: () => void;
}) {
  const [own, setOwn] = useState('');
  const saveOwn = () => {
    const t = own.trim();
    if (!t) return;
    onPick(t);
    setOwn('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 22 }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}
          style={{ backgroundColor: '#1c1c1c', borderRadius: 16, padding: 16, maxHeight: '85%' }}>
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
            Фраза над аватаркой
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {NOTE_PHRASES.map((p) => {
                const on = p === current;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => onPick(p)}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: on ? '#fe2c55' : '#2e2e2e', borderRadius: 16,
                      paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8,
                    }}
                  >
                    {on && <View style={{ marginRight: 5 }}><Check size={13} color="#ffffff" strokeWidth={3} /></View>}
                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: on ? '700' : '500' }}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ color: '#9a9a9a', fontSize: 13, marginTop: 10, marginBottom: 6 }}>Или напиши свою</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                value={own}
                onChangeText={setOwn}
                onSubmitEditing={saveOwn}
                maxLength={30}
                placeholder={NOTE_PHRASES.includes(current) ? 'Своя фраза' : current}
                placeholderTextColor="#666666"
                style={{
                  flex: 1, backgroundColor: '#000000', color: '#ffffff', fontSize: 15,
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                  borderWidth: 1, borderColor: '#333333',
                }}
              />
              <TouchableOpacity
                onPress={saveOwn}
                disabled={!own.trim()}
                style={{
                  marginLeft: 8, backgroundColor: '#fe2c55', borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 11, opacity: own.trim() ? 1 : 0.4,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>Готово</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
