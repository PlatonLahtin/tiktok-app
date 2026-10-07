/* «Добавить видео»: выбираешь, куда — в рекомендации или в профиль,
   потом видео из галереи. Ролик копируется в память приложения,
   чтобы не пропал после перезапуска.
   Ниже — список роликов ленты: ненужные можно убрать. */

import React, { useState } from 'react';
import { View, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text } from '../../components/FixedText';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Flame, UserRound, CircleCheck, Trash2 } from 'lucide-react-native';
import { useVideoStore, keepVideoFile } from '../../store/useVideoStore';
import { shortCount } from '../../lib/videoStats';
import VideoFrame from '../../components/VideoFrame';
import { ScreenHeader, MenuCard, UI } from '../../components/settings/ui';

type Target = 'feed' | 'profile';

export default function UploadVideo() {
  const router = useRouter();
  const addFeedVideo = useVideoStore((s) => s.addFeedVideo);
  const addMyVideo = useVideoStore((s) => s.addMyVideo);
  const [busy, setBusy] = useState<Target | null>(null);
  const [done, setDone] = useState<Target | null>(null);

  const feed = useVideoStore((s) => s.videos);
  const hidden = useVideoStore((s) => s.hiddenVideoIds);
  const removeFeedVideo = useVideoStore((s) => s.removeFeedVideo);
  const restoreBuiltInFeed = useVideoStore((s) => s.restoreBuiltInFeed);
  const inFeed = feed.filter((v) => !hidden.includes(v.id));
  const hiddenCount = feed.filter((v) => hidden.includes(v.id) && !v.id.startsWith('feed-')).length;

  const askRemove = (id: string) => {
    const mine = id.startsWith('feed-');
    Alert.alert(
      'Убрать видео из ленты?',
      mine ? 'Это твоё видео — оно удалится насовсем.' : 'Встроенное видео спрячется, его можно будет вернуть.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: mine ? 'Удалить' : 'Убрать', style: 'destructive', onPress: () => removeFeedVideo(id) },
      ],
    );
  };

  const pick = async (target: Target) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа к галерее', 'Разреши доступ к фото и видео в настройках телефона.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (res.canceled || !res.assets?.length) return;

    const asset = res.assets[0];
    setBusy(target);
    setDone(null);
    try {
      const uri = await keepVideoFile(asset.uri);
      /* галерея отдаёт длину в миллисекундах */
      const duration = asset.duration ? asset.duration / 1000 : 15;
      if (target === 'feed') addFeedVideo({ uri });
      else addMyVideo({ uri, duration });
      setDone(target);
    } catch {
      Alert.alert('Не получилось', 'Не удалось сохранить видео. Попробуй другое.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScreenHeader title="Добавить видео" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: UI.side, paddingTop: 4, paddingBottom: 60 }}>
        <Text style={{ color: UI.muted, fontSize: 13, margin: 4, marginBottom: 12 }}>
          Куда добавить видео из галереи?
        </Text>

        <MenuCard
          icon={<Flame size={20} color="#ffffff" />}
          title="В рекомендации"
          subtitle="Первым в ленте, цифры случайные, но правдоподобные"
          onPress={() => !busy && pick('feed')}
        />
        <MenuCard
          icon={<UserRound size={20} color="#ffffff" />}
          title="В профиль"
          subtitle="Новое видео в профиле, статистика по нулям"
          onPress={() => !busy && pick('profile')}
        />

        {busy && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
            <ActivityIndicator color="#ffffff" />
            <Text style={{ color: UI.label, fontSize: 14, marginLeft: 10 }}>Сохраняю видео…</Text>
          </View>
        )}

        {done && (
          <View style={{
            backgroundColor: UI.bg, borderRadius: UI.radius, padding: 16, marginTop: 8,
            alignItems: 'center',
          }}>
            <CircleCheck size={28} color="#25d366" />
            <Text style={{ color: UI.text, fontSize: 15, fontWeight: '700', marginTop: 8 }}>
              {done === 'feed' ? 'Видео добавлено в ленту' : 'Видео добавлено в профиль'}
            </Text>
            <TouchableOpacity
              onPress={() => router.navigate(done === 'feed' ? '/' : '/profile')}
              style={{
                marginTop: 14, backgroundColor: UI.accent, borderRadius: 8,
                paddingHorizontal: 20, paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                {done === 'feed' ? 'Открыть ленту' : 'Открыть профиль'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ролики ленты: ненужные можно убрать */}
        <Text style={{ color: UI.muted, fontSize: 13, fontWeight: '600', margin: 4, marginTop: 26, marginBottom: 10 }}>
          ВИДЕО В ЛЕНТЕ · {inFeed.length}
        </Text>
        {inFeed.map((v) => {
          const mine = v.id.startsWith('feed-');
          return (
            <View key={v.id} style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: UI.bg,
              borderRadius: UI.radius, padding: 10, marginBottom: 10,
            }}>
              <VideoFrame source={v.videoUrl} width={44} height={58} radius={6} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={{ color: UI.text, fontSize: 15, fontWeight: '700' }}>
                  {mine ? 'Твоё видео' : `@${v.username}`}
                </Text>
                <Text numberOfLines={1} style={{ color: UI.muted, fontSize: 13, marginTop: 4 }}>
                  {shortCount(String(v.likes))} лайков{v.description ? ` · ${v.description}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => askRemove(v.id)} hitSlop={10} style={{ padding: 8 }}>
                <Trash2 size={18} color={UI.muted} />
              </TouchableOpacity>
            </View>
          );
        })}
        {hiddenCount > 0 && (
          <TouchableOpacity onPress={restoreBuiltInFeed} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: UI.muted, fontSize: 13 }}>Вернуть убранные встроенные видео ({hiddenCount})</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
