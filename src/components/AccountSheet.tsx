/* Шторка «Сменить аккаунт» — выезжает по нажатию на имя с треугольником
   в профиле. Список аккаунтов (у открытого — красная галочка),
   ниже «Добавить аккаунт». Удержание на аккаунте — удалить его.
   Эталона нет, поэтому в стиле шторки «Отправить». */

import React from 'react';
import { View, Image, ScrollView, Modal, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Plus } from 'lucide-react-native';
import { TouchableOpacity } from './Touchable';
import { Text } from './FixedText';
import { useVideoStore } from '../store/useVideoStore';

const A = {
  radius: 15,
  bg: '#2c2c2c',
  handle: { w: 36, h: 4.5, color: '#5a5a5a', top: 8 },
  titleTop: 26, titleFont: 17, titleH: 60,
  rowH: 68, side: 16, ava: 48, gap: 12,
  name: 16, user: 13.5,
  muted: '#9a9a9a',
  red: '#fe2c55',
  plusBg: '#3d3d3d',
};

export default function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const accounts = useVideoStore((s) => s.accounts);
  const current = useVideoStore((s) => s.currentAccountId);
  const switchAccount = useVideoStore((s) => s.switchAccount);
  const addAccount = useVideoStore((s) => s.addAccount);
  const removeAccount = useVideoStore((s) => s.removeAccount);

  const pick = (id: string) => {
    onClose();
    switchAccount(id);
  };

  const add = () => {
    onClose();
    addAccount();
  };

  const askRemove = (id: string, username: string) => {
    if (accounts.length < 2) {
      Alert.alert('Это единственный аккаунт', 'Сначала добавь другой — тогда этот можно будет удалить.');
      return;
    }
    Alert.alert(
      `Удалить аккаунт @${username}?`,
      'Все его видео, статистика и настройки удалятся насовсем.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => removeAccount(id) },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{
        backgroundColor: A.bg,
        borderTopLeftRadius: A.radius, borderTopRightRadius: A.radius,
        paddingBottom: insets.bottom + 8,
        maxHeight: '75%',
      }}>
        <View style={{
          alignSelf: 'center', marginTop: A.handle.top,
          width: A.handle.w, height: A.handle.h, borderRadius: A.handle.h / 2,
          backgroundColor: A.handle.color,
        }} />
        <Text style={{
          textAlign: 'center', color: '#ffffff', fontSize: A.titleFont, fontWeight: '700',
          marginTop: A.titleTop - A.handle.top - A.handle.h, marginBottom: 14,
        }}>
          Сменить аккаунт
        </Text>

        <ScrollView>
          {accounts.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => pick(a.id)}
              onLongPress={() => askRemove(a.id, a.username)}
              style={{ height: A.rowH, flexDirection: 'row', alignItems: 'center', paddingHorizontal: A.side }}
            >
              <Image
                source={{ uri: a.avatar }}
                style={{ width: A.ava, height: A.ava, borderRadius: A.ava / 2, backgroundColor: '#3a3a3a' }}
              />
              <View style={{ flex: 1, marginLeft: A.gap }}>
                <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: A.name, fontWeight: '700' }}>
                  {a.name}
                </Text>
                <Text numberOfLines={1} style={{ color: A.muted, fontSize: A.user, marginTop: 2 }}>
                  @{a.username}
                </Text>
              </View>
              {a.id === current && <Check size={22} color={A.red} strokeWidth={2.6} />}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={add}
            style={{ height: A.rowH, flexDirection: 'row', alignItems: 'center', paddingHorizontal: A.side }}
          >
            <View style={{
              width: A.ava, height: A.ava, borderRadius: A.ava / 2, backgroundColor: A.plusBg,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={24} color="#ffffff" strokeWidth={2.4} />
            </View>
            <Text style={{ marginLeft: A.gap, color: '#ffffff', fontSize: A.name, fontWeight: '700' }}>
              Добавить аккаунт
            </Text>
          </TouchableOpacity>

          <Text style={{ color: A.muted, fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 4 }}>
            Удержи аккаунт, чтобы удалить его
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
