import React, { useState, useRef } from 'react';
import { FlatList, View, StatusBar, Dimensions, ScrollView } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text } from '../../components/FixedText';
import { useVideoStore } from '../../store/useVideoStore';
import VideoPost from '../../components/VideoPost';
import LiveStreamModal from '../../components/LiveStreamModal';
import { Users, Sparkles, Tv, Search } from 'lucide-react-native';
import { useIsFocused } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { TAB_BAR_H } from '../../constants/layout';

/* Верхняя полоса ленты. Числа сняты с эталона. */
const TOP = {
  y: 70.2,         // от верха экрана до текста вкладок
  padLeft: 12,     // отступ содержимого полосы слева
  padRight: 17.5,  // от значка поиска до правого края
  gap: 17,         // между словами
  startX: 37.1,    // на сколько полоса прокручена вправо на старте
  fade: 30,        // ширина растворения у левого края
  font: 14.6,
  line: 20,
  off: '#bfbfbf',  // цвет неактивных вкладок
  lineW: 24, lineH: 1.7, lineGap: 4,
  search: 24,
};

const TABS = [
  { key: 'stem',      label: 'STEM' },
  { key: 'community', label: 'Сообщество' },
  { key: 'following', label: 'Подписки' },
  { key: 'foryou',    label: 'Рекомендации' },
];

export default function HomeFeed() {
  const { videos, hiddenVideoIds } = useVideoStore();
  const [feedType, setFeedType] = useState<'community' | 'following' | 'foryou'>('foryou');
  const [activeId, setActiveId] = useState<string>('');
  const [showLive, setShowLive] = useState<boolean>(false);

  // Лента открыта прямо сейчас? Ушли на другую вкладку или в
  // редактирование профиля — видео встаёт на паузу и звук замолкает.
  const isFocused = useIsFocused();
  const stripRef = useRef<ScrollView>(null);   // полоса вкладок, её двигаем на старте

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveId(viewableItems[0].item.id);
    }
  }).current;

  // Filter videos: exclude hidden videos, and optionally filter by follow state
  const visibleVideos = videos.filter((vid) => !hiddenVideoIds.includes(vid.id));
  
  const filteredVideos = visibleVideos.filter((vid) => {
    if (feedType === 'following') {
      return vid.isFollowing;
    }
    return true;
  });

  // Automatically select the first video if the active ID is not in the list
  React.useEffect(() => {
    if (filteredVideos.length > 0) {
      const ids = filteredVideos.map(v => v.id);
      if (!ids.includes(activeId)) {
        setActiveId(filteredVideos[0].id);
      }
    } else {
      setActiveId('');
    }
  }, [feedType, videos, hiddenVideoIds]);

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" translucent />

      {/* Верхняя панель: полоса вкладок листается влево до «STEM»,
          у левого края она плавно растворяется, а не обрывается. */}
      <View style={{
        position: 'absolute', top: TOP.y, left: 0, right: 0, zIndex: 20,
        flexDirection: 'row', alignItems: 'flex-start',
      }}>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={stripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={() => stripRef.current?.scrollTo({ x: TOP.startX, animated: false })}
            contentContainerStyle={{ paddingLeft: TOP.padLeft, paddingRight: 10 }}
          >
            {TABS.map(({ key, label }, i) => (
              <TouchableOpacity
                key={key}
                onPress={() => key !== 'stem' && setFeedType(key as typeof feedType)}
                style={{ marginLeft: i === 0 ? 0 : TOP.gap, alignItems: 'center' }}
              >
                <Text style={{
                  color: feedType === key ? '#ffffff' : TOP.off,
                  fontSize: TOP.font,
                  fontWeight: feedType === key ? '700' : '600',
                  lineHeight: TOP.line,
                }}>
                  {label}
                </Text>
                <View style={{
                  width: TOP.lineW, height: TOP.lineH, marginTop: TOP.lineGap,
                  backgroundColor: feedType === key ? '#ffffff' : 'transparent',
                }} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* растворение у левого края */}
          <Svg
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: TOP.fade }}
          >
            <Defs>
              <LinearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#000000" stopOpacity="1" />
                <Stop offset="0.42" stopColor="#000000" stopOpacity="0.97" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#fadeLeft)" />
          </Svg>
        </View>

        <TouchableOpacity style={{ paddingRight: TOP.padRight, paddingLeft: 6 }}>
          <Search size={TOP.search} color="#ffffff" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {filteredVideos.length === 0 ? (
        <View className="flex-1 justify-center items-center bg-black px-8">
          {feedType === 'following' ? (
            <View className="items-center">
              <View className="bg-zinc-900 p-5 rounded-full mb-4 border border-zinc-850">
                <Users size={36} color="#888888" />
              </View>
              <Text className="text-white text-base font-extrabold text-center mb-2">
                Подпишитесь, чтобы видеть их видео
              </Text>
              <Text className="text-zinc-500 text-xs text-center leading-5 mb-6">
                Здесь появятся видео авторов, на которых вы подписаны. Загляните в «Рекомендации», чтобы кого-нибудь найти.
              </Text>
              <TouchableOpacity
                onPress={() => setFeedType('foryou')}
                className="bg-[#ff0050] px-6 py-3 rounded-full"
              >
                <Text className="text-white font-extrabold text-sm">В рекомендации</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center">
              <View className="bg-zinc-900 p-5 rounded-full mb-4 border border-zinc-850">
                <Sparkles size={36} color="#888888" />
              </View>
              <Text className="text-white text-base font-extrabold text-center mb-2">
                Видео пока нет
              </Text>
              <Text className="text-zinc-500 text-xs text-center">
                Загляните позже или загрузите своё.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VideoPost video={item} isActive={isFocused && item.id === activeId} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          decelerationRate="fast"
          snapToInterval={Dimensions.get('window').height - TAB_BAR_H}
          snapToAlignment="start"
        />
      )}

      {/* Simulated LIVE Broadcast modal */}
      <LiveStreamModal isVisible={showLive} onClose={() => setShowLive(false)} />
    </View>
  );
}
