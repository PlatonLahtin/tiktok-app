/* «Устройство»: под какой айфон раскладывать приложение.
   «Автоматически» — размеры берутся у самого телефона. Модель вручную
   нужна в браузере на компьютере (там приложение рисуется размером
   экрана этой модели) или если автоматика ошиблась. */

import React from 'react';
import { View, ScrollView, Dimensions, Platform } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text } from '../../components/FixedText';
import { Check, Smartphone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, UI } from '../../components/settings/ui';
import { DEVICES, useDeviceId, setDeviceId, detectDevice, findDevice, twinNames } from '../../lib/device';

function Row({ title, subtitle, on, onPress }: { title: string; subtitle: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: on ? '#2a1a1e' : UI.bg, borderRadius: UI.radius,
        borderWidth: 1, borderColor: on ? UI.accent : 'transparent',
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: UI.text, fontSize: 15, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: UI.muted, fontSize: 12, marginTop: 3 }}>{subtitle}</Text>
      </View>
      {on && <Check size={20} color={UI.accent} strokeWidth={3} />}
    </TouchableOpacity>
  );
}

export default function DeviceSettings() {
  const id = useDeviceId();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const guess = detectDevice(width, height, Platform.OS === 'web' ? undefined : insets.top);
  const current = findDevice(id);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScreenHeader title="Устройство" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: UI.side, paddingBottom: 60 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414',
          borderRadius: UI.radius, padding: 12, marginBottom: 14,
        }}>
          <Smartphone size={18} color={UI.muted} />
          <Text style={{ color: UI.muted, fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 }}>
            Сейчас: {current ? current.name : `автоматически${guess ? ` — похоже на iPhone ${twinNames(guess)}` : ''}`}
            {'\n'}Экран {Math.round(width)} × {Math.round(height)}, отступ сверху {Math.round(insets.top)}
            {Platform.OS === 'web' ? '\nВ браузере после выбора страница перезагрузится.' : ''}
          </Text>
        </View>

        <Row
          title="Автоматически"
          subtitle={Platform.OS === 'web' ? 'По размеру окна браузера' : 'Размер экрана и отступы — от самого телефона'}
          on={id === 'auto'}
          onPress={() => id !== 'auto' && setDeviceId('auto')}
        />

        <Text style={{ color: UI.muted, fontSize: 13, fontWeight: '600', margin: 4, marginTop: 14, marginBottom: 10 }}>
          МОДЕЛИ
        </Text>
        {DEVICES.map((d) => (
          <Row
            key={d.id}
            title={d.name}
            subtitle={`${d.w} × ${d.h} · сверху ${d.top}${d.top >= 59 ? ' (остров)' : ' (чёлка)'}`}
            on={id === d.id}
            onPress={() => id !== d.id && setDeviceId(d.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
