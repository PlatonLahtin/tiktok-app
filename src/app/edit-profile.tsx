/* Экран «Изменить профиль».
   Вёрстка повторяет приложение, логика целиком наша:
   меняем имя, имя пользователя, описание и аватарку,
   всё сохраняется в память телефона и переживает перезапуск.

   Числа ниже сняты с эталонного скриншота и переведены
   в точки экрана, поэтому собраны в одном месте. */

import React, { useState } from 'react';
import { View, Image, ScrollView, Modal, Alert, Platform } from 'react-native';
import { TouchableOpacity } from '../components/Touchable';
import { Text, TextInput } from '../components/FixedText';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoStore, keepImageFile } from '../store/useVideoStore';
import { goBack } from '../lib/goBack';

const CAMERA = require('../../assets/icons/camera.png');
const MENU = require('../../assets/icons/menu.png');

const UI = {
  side: 11.9,        // от края экрана до карточки
  radius: 9,         // скругление карточки
  bg: '#1e1e1e',     // фон карточки
  padL: 16.6,        // от края карточки до подписи
  padR: 17.1,        // от стрелки до края карточки
  labelW: 120,       // ширина колонки с подписью
  font: 15,
  line: 16.5,     // межстрочный шаг: в приложении он тесный
  rowPadV: 9,        // отступ внутри строки
  rowMinH: 48,       // минимальная высота строки: в одну строку она
                     // не сжимается, в две — вырастает лишь немного
  cardPadV: 1.5,     // запас сверху и снизу внутри карточки
  label: '#e3e3e3',
  text: '#f6f6f6',   // не «value»: так Reanimated принимает цвет за анимацию
  muted: '#787878',  // «Добавить ссылку», «Выберите призыв…»
  section: '#666666',
  chevron: '#8e8e93',
  avatar: 111.6,
  cam: { h: 31.9, ratio: 1.179 },
  dim: 0.39,         // затемнение аватарки
  /* нижний блок «TikTok Studio»: строка чуть выше обычной,
     значок полосок отодвинут от края дальше, чем стрелка */
  studioH: 52.1,
  studioIcon: 9.5,
  studioIconRatio: 1.332,
  studioIconPad: 22.1,
  studioIconColor: '#a5a5a5',
  blue: '#20d5ec',
};

type Field = 'name' | 'username' | 'bio';

const LABELS: Record<Field, string> = {
  name: 'Имя',
  username: 'Имя пользователя',
  bio: 'Описание',
};

/* Одна строка списка: подпись слева, значение в своей колонке, стрелка.
   Разделителей между строками в приложении нет. */
function Row({
  label, value, muted, onPress, trailing,
}: {
  label?: string; value?: string; muted?: boolean;
  onPress?: () => void; trailing?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingLeft: UI.padL, paddingRight: UI.padR,
        paddingVertical: UI.rowPadV, minHeight: UI.rowMinH,
      }}
    >
      <Text style={{
        width: UI.labelW, paddingRight: 18,   // перенос строк совпадает с эталоном
        color: UI.label, fontSize: UI.font, lineHeight: UI.line,
      }}>
        {label ?? ''}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          flex: 1, color: muted ? UI.muted : UI.text,
          fontSize: UI.font, lineHeight: UI.line,
          /* серые подсказки набраны тем же начертанием, что и подписи слева */
          fontWeight: muted ? '400' : '600',
        }}
      >
        {value ?? ''}
      </Text>
      {/* у стрелки внутри значка есть своё пустое поле справа —
          компенсируем его отрицательным отступом */}
      <View style={{ marginLeft: 8, marginRight: trailing ? 0 : -7.5 }}>
        {trailing ?? <ChevronRight size={20} color={UI.chevron} />}
      </View>
    </TouchableOpacity>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      marginHorizontal: UI.side, backgroundColor: UI.bg,
      borderRadius: UI.radius, overflow: 'hidden',
      paddingVertical: UI.cardPadV,
    }}>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{
      color: UI.section, fontSize: 13, fontWeight: '600',
      marginLeft: UI.side + UI.padL, marginTop: 16.3, marginBottom: 7.2,
    }}>
      {children}
    </Text>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();   // отступ сверху под «остров» айфона
  const { currentUser, updateProfile } = useVideoStore();

  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState('');

  const openEditor = (field: Field) => {
    setDraft((currentUser as any)[field] ?? '');
    setEditing(field);
  };

  const saveEditor = () => {
    if (!editing) return;
    const value = draft.trim();
    if (value) updateProfile({ [editing]: value } as any);
    setEditing(null);
  };

  /* выбор новой аватарки из галереи телефона */
  const pickAvatar = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Нет доступа', 'Разрешите приложению доступ к фотографиям.');
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        /* копия в память приложения: временная из галереи со временем пропадает */
        updateProfile({ avatar: await keepImageFile(res.assets[0].uri) });
      }
    } catch {
      Alert.alert('Не получилось', 'Картинку выбрать не удалось.');
    }
  };

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 6 }}>
      {/* шапка: назад + заголовок по центру */}
      <View className="flex-row items-center px-4 pb-3">
        <TouchableOpacity onPress={() => goBack(router, '/profile')} className="w-10">
          <ChevronLeft size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text className="flex-1 text-white text-[17px] font-bold text-center">Изменить профиль</Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 21.3 }}>
        {/* аватарка: поверх неё затемнение, поверх затемнения — фотоаппарат */}
        <View style={{ alignItems: 'center', marginTop: 5.4 }}>
          <TouchableOpacity onPress={pickAvatar}>
            <View style={{ width: UI.avatar, height: UI.avatar }}>
              <Image
                source={{ uri: currentUser.avatar }}
                style={{
                  width: UI.avatar, height: UI.avatar,
                  borderRadius: UI.avatar / 2, backgroundColor: '#27272a',
                }}
              />
              <View style={{
                position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
                borderRadius: UI.avatar / 2, backgroundColor: `rgba(0,0,0,${UI.dim})`,
              }} />
              <View style={{
                position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Image
                  source={CAMERA}
                  style={{ height: UI.cam.h, width: UI.cam.h * UI.cam.ratio }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={pickAvatar} style={{ marginTop: 10.5 }}>
            <Text style={{ color: UI.blue, fontSize: 14.6, fontWeight: '700' }}>
              Изменить фото или аватар
            </Text>
          </TouchableOpacity>
        </View>

        {/* имя, имя пользователя, адрес профиля */}
        <View style={{ marginTop: 21.3 }}>
          <Card>
            <Row label="Имя" value={currentUser.name} onPress={() => openEditor('name')} />
            <Row label="Имя пользователя" value={currentUser.username} onPress={() => openEditor('username')} />
            <Row
              value={`tiktok.com/@${currentUser.username}`}
              trailing={
                /* у ТикТока значок развёрнут: передний квадрат слева снизу */
                <View style={{ transform: [{ scaleX: -1 }] }}>
                  <Copy size={14} color={UI.chevron} />
                </View>
              }
            />
          </Card>
        </View>

        <SectionTitle>Основные сведения</SectionTitle>
        <Card>
          <Row label="Описание" value={currentUser.bio} onPress={() => openEditor('bio')} />
          <Row label="Ссылки" value="Добавить ссылку" muted />
        </Card>

        <SectionTitle>Сведения о компании</SectionTitle>
        <Card>
          <Row label="Кнопки действий" />
          <Row label="Отображение профиля" />
          <Row label="Лиды" value="Выберите призыв к действию" muted />
          <Row label="Категория" value="Другое" />
          <Row label="TikTok Shop for Seller" />
        </Card>

        <SectionTitle>Изменение порядка отображения</SectionTitle>
        <Card>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingLeft: UI.padL, paddingRight: UI.studioIconPad,
            minHeight: UI.studioH,
          }}>
            <Text style={{
              flex: 1, color: UI.text,
              fontSize: UI.font, lineHeight: UI.line, fontWeight: '600',
            }}>
              TikTok Studio
            </Text>
            <Image
              source={MENU}
              style={{
                height: UI.studioIcon, width: UI.studioIcon * UI.studioIconRatio,
                tintColor: UI.studioIconColor,
              }}
              resizeMode="contain"
            />
          </View>
        </Card>
      </ScrollView>

      {/* окошко ввода для выбранного поля */}
      <Modal visible={editing !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center px-8">
          <View className="bg-zinc-900 rounded-2xl p-5">
            <Text className="text-white font-bold text-[16px] mb-3">
              {editing ? LABELS[editing] : ''}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              multiline={editing === 'bio'}
              maxLength={editing === 'bio' ? 80 : 40}
              placeholder={editing ? LABELS[editing] : ''}
              placeholderTextColor="#666666"
              className="bg-black text-white px-3 py-3 rounded-xl text-[15px] border border-zinc-800"
              style={{ minHeight: editing === 'bio' ? 80 : 44, textAlignVertical: 'top' }}
            />
            <Text className="text-zinc-500 text-[12px] mt-2 text-right">
              {draft.length}/{editing === 'bio' ? 80 : 40}
            </Text>

            <View className="flex-row gap-x-3 mt-4">
              <TouchableOpacity
                onPress={() => setEditing(null)}
                className="flex-1 bg-zinc-800 py-3 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-[15px]">Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEditor}
                className="flex-1 bg-[#fe2c55] py-3 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-[15px]">Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
