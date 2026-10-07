/* «Настройка статы»: список видео профиля. Выбираешь видео —
   открывается его статистика в режиме правки. */

import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { TouchableOpacity } from '../../../components/Touchable';
import { Text } from '../../../components/FixedText';
import { useRouter } from 'expo-router';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { useVideoStore } from '../../../store/useVideoStore';
import VideoFrame from '../../../components/VideoFrame';
import { ScreenHeader, ComingSoon, UI } from '../../../components/settings/ui';

export default function StatsSettings() {
  const router = useRouter();
  const myVideos = useVideoStore((s) => s.myVideos);
  const removeMyVideo = useVideoStore((s) => s.removeMyVideo);

  const askRemove = (id: string) =>
    Alert.alert('Удалить видео из профиля?', 'Вместе с ним удалится и его статистика.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeMyVideo(id) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScreenHeader title="Настройка статы" />

      {myVideos.length === 0 ? (
        <ComingSoon text="В профиле пока нет видео. Добавь его в разделе «Добавить видео»." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: UI.side, paddingBottom: 60 }}>
          <Text style={{ color: UI.muted, fontSize: 13, margin: 4, marginBottom: 12 }}>
            Выбери видео — откроется его статистика, где можно поменять любую цифру
          </Text>
          {myVideos.map((v, i) => (
            <TouchableOpacity
              key={v.id}
              activeOpacity={0.75}
              onPress={() => router.push(`/settings/stats/${v.id}`)}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: UI.bg,
                borderRadius: UI.radius, padding: 10, marginBottom: 10,
              }}
            >
              <VideoFrame uri={v.uri} width={54} height={72} radius={6} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={{ color: UI.text, fontSize: 15, fontWeight: '700' }}>
                  {v.description || `Видео ${i + 1}`}
                </Text>
                <Text style={{ color: UI.muted, fontSize: 13, marginTop: 4 }}>
                  {v.stats.counts.views} просмотров · {v.duration.toFixed(1)} с.
                </Text>
              </View>
              <TouchableOpacity onPress={() => askRemove(v.id)} hitSlop={10} style={{ padding: 6 }}>
                <Trash2 size={18} color={UI.muted} />
              </TouchableOpacity>
              <ChevronRight size={20} color={UI.muted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
