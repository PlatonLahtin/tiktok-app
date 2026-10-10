/* Раздел «+» — наши настройки макета. Камеры тут нет.
   Каждая кнопка открывает свой раздел. */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SlidersHorizontal, Clapperboard, ChartColumn, Smartphone } from 'lucide-react-native';
import { useDeviceId, findDevice } from '../../lib/device';
import { ScreenHeader, MenuCard, UI } from '../../components/settings/ui';

export default function MockupSettings() {
  const router = useRouter();
  const deviceId = useDeviceId();

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScreenHeader title="Настройки макета" back={false} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: UI.side, paddingTop: 4, paddingBottom: 60 }}>
        <MenuCard
          icon={<SlidersHorizontal size={20} color="#ffffff" />}
          title="Настройка визуала"
          subtitle="Цифры в профиле, число у аватарок, «Входящие»"
          onPress={() => router.push('/settings/visual')}
        />
        <MenuCard
          icon={<Clapperboard size={20} color="#ffffff" />}
          title="Добавить видео"
          subtitle="Своё видео из галереи — в ленту или в профиль"
          onPress={() => router.push('/settings/upload')}
        />
        <MenuCard
          icon={<ChartColumn size={20} color="#ffffff" />}
          title="Настройка статы"
          subtitle="Любая цифра в статистике видео из профиля"
          onPress={() => router.push('/settings/stats')}
        />
        <MenuCard
          icon={<Smartphone size={20} color="#ffffff" />}
          title="Устройство"
          subtitle={`Под какой айфон раскладывать: ${findDevice(deviceId)?.name ?? 'автоматически'}`}
          onPress={() => router.push('/settings/device')}
        />
      </ScrollView>
    </View>
  );
}
