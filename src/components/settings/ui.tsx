/* Общие детали экранов раздела «+»: шапка, поле ввода, кнопка-карточка.
   Это наши собственные экраны, без эталона, — стиль в тон приложению. */

import React from 'react';
import { View } from 'react-native';
import { TouchableOpacity } from '../Touchable';
import { Text, TextInput } from '../FixedText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { goBack } from '../../lib/goBack';

export const UI = {
  bg: '#1e1e1e', label: '#e3e3e3', text: '#f6f6f6',   // не «value»: так Reanimated принимает цвет за анимацию
  muted: '#787878', accent: '#fe2c55', side: 16, radius: 10,
};

/* шапка: «назад» слева, заголовок по центру */
export function ScreenHeader({ title, back = true }: { title: string; back?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 14, backgroundColor: '#000000' }}>
      {back && (
        <TouchableOpacity
          onPress={() => goBack(router, '/create')}
          hitSlop={12}
          style={{ position: 'absolute', left: 8, top: insets.top + 2 }}
        >
          <ChevronLeft size={28} color="#ffffff" />
        </TouchableOpacity>
      )}
      {/* заголовок во всю ширину не должен перехватывать нажатие «назад» */}
      <Text
        pointerEvents="none"
        style={{ color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center' }}
      >
        {title}
      </Text>
    </View>
  );
}

/* одно поле ввода с подписью */
export function Field({
  label, hint, value, onChange, note,
}: { label: string; hint: string; value: string; onChange: (t: string) => void; note?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: UI.label, fontSize: 14, marginBottom: 7, marginLeft: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={hint}
        placeholderTextColor="#555555"
        maxLength={40}
        style={{
          backgroundColor: UI.bg, borderRadius: UI.radius,
          paddingHorizontal: 14, paddingVertical: 12,
          color: UI.text, fontSize: 15, fontWeight: '600',
        }}
      />
      {note ? (
        <Text style={{ color: UI.muted, fontSize: 12, marginTop: 6, marginLeft: 4 }}>{note}</Text>
      ) : null}
    </View>
  );
}

/* большая кнопка-карточка: значок, заголовок, пояснение, стрелка */
export function MenuCard({
  icon, title, subtitle, onPress,
}: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: UI.bg, borderRadius: UI.radius,
        paddingHorizontal: 14, paddingVertical: 16, marginBottom: 12,
      }}
    >
      <View style={{
        width: 42, height: 42, borderRadius: 21, backgroundColor: '#2c2c2c',
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: UI.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: UI.muted, fontSize: 13, marginTop: 3 }}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={UI.muted} />
    </TouchableOpacity>
  );
}

/* заглушка для разделов, которые появятся на следующих этапах */
export function ComingSoon({ text }: { text: string }) {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text style={{ color: UI.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{text}</Text>
    </View>
  );
}
