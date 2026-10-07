/* «Настройка визуала»: цифры в профиле, число у кружков-аватарок
   и надпись на значке «Входящие». Всё сохраняется в память телефона. */

import React from 'react';
import { View, ScrollView, Keyboard } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text } from '../../components/FixedText';
import { useVideoStore } from '../../store/useVideoStore';
import { ScreenHeader, Field, UI } from '../../components/settings/ui';

type Key = 'following' | 'followers' | 'likes' | 'peekCount' | 'inboxBadge';

const DEFAULTS: Record<Key, string> = {
  following: '12', followers: '3456', likes: '78,9 тыс.', peekCount: '99', inboxBadge: '99+',
};

const GROUPS: { title: string; fields: { key: Key; label: string; hint: string; note?: string }[] }[] = [
  {
    title: 'Профиль',
    fields: [
      { key: 'following', label: 'Подписки', hint: 'например 12' },
      { key: 'followers', label: 'Подписчики', hint: 'например 3456' },
      { key: 'likes', label: 'Лайки', hint: 'например 78,9 тыс.' },
      { key: 'peekCount', label: 'Число у кружков-аватарок', hint: 'например 99',
        note: 'Вверху профиля, рядом с меняющимися аватарками' },
    ],
  },
  {
    title: 'Нижняя панель',
    fields: [
      { key: 'inboxBadge', label: 'Значок «Входящие»', hint: 'например 99+',
        note: 'Оставь пустым — значок пропадёт' },
    ],
  },
];

export default function VisualSettings() {
  const { currentUser, updateProfile } = useVideoStore();

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScreenHeader title="Настройка визуала" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"          // потянул экран — клавиатура спряталась
        automaticallyAdjustKeyboardInsets      // нижние поля не прячутся под клавиатурой
        contentContainerStyle={{ paddingHorizontal: UI.side, paddingBottom: 60 }}
      >
        {GROUPS.map((g) => (
          <View key={g.title} style={{ marginBottom: 10 }}>
            <Text style={{ color: UI.muted, fontSize: 13, fontWeight: '600', margin: 4, marginBottom: 10 }}>
              {g.title.toUpperCase()}
            </Text>
            {g.fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                hint={f.hint}
                note={f.note}
                value={currentUser[f.key]}
                onChange={(text) => updateProfile({ [f.key]: text })}
              />
            ))}
          </View>
        ))}

        <TouchableOpacity
          onPress={() => updateProfile(DEFAULTS)}
          style={{ alignItems: 'center', paddingVertical: 10 }}
        >
          <Text style={{ color: UI.muted, fontSize: 13 }}>Вернуть как было</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Keyboard.dismiss()}
          style={{ alignItems: 'center', paddingVertical: 10 }}
        >
          <Text style={{ color: UI.muted, fontSize: 13 }}>Свернуть клавиатуру</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
