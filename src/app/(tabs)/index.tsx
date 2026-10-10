import React, { useState, useRef } from 'react';
import { FlatList, View, StatusBar, Dimensions, ScrollView } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text } from '../../components/FixedText';
import { useVideoStore } from '../../store/useVideoStore';
import VideoPost from '../../components/VideoPost';
import LiveStreamModal from '../../components/LiveStreamModal';
import { Users, Sparkles, Tv, Search } from 'lucide-react-native';
import { useIsFocused } from 'expo-router';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { TAB_BAR_H } from '../../constants/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* Верхняя полоса ленты. Числа сняты с эталона. */
const TOP = {
  y: 70.2,         // от верха экрана до текста вкладок
  padLeft: 12,     // отступ содержимого полосы слева
  padRight: 17.5,  // от значка поиска до правого края
  gap: 17,         // между словами
  startX: 34.5,    // на сколько полоса прокручена вправо на старте
  stemGhost: 0.18, // насколько видна «STEM» под значком LIVE
  font: 14.6,
  line: 20,
  off: '#bfbfbf',  // цвет неактивных вкладок
  lineW: 24, lineH: 1.7, lineGap: 4,
  search: 24,
  /* значок LIVE слева (с эталона): телевизор с антенной и надписью */
  live: { left: 16.7, top: -2.5, w: 23.3, h: 24 },
};

/* отступ перед каждым словом: на эталоне они разные */
const GAPS: Record<string, number> = { community: 17, following: 16.7, foryou: 14.7 };

/* Значок LIVE: верх и низ рамки телевизора, по бокам между ними —
   надпись LIVE, сверху антенна «уголком» */
function LiveIcon() {
  return (
    <Svg width={TOP.live.w} height={TOP.live.h} viewBox="0 0 70 72">
      <Path
        d="M24 3 L35 14 L46 3 M3 27 V22 Q3 16 9 16 H61 Q67 16 67 22 V27 M3 52 V61 Q3 67 9 67 H61 Q67 67 67 61 V52"
        fill="none" stroke="#ffffff" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <SvgText
        x="35" y="51.5" textAnchor="middle" fill="#ffffff"
        fontSize="31" fontWeight="900" textLength="66" lengthAdjust="spacingAndGlyphs"
      >
        LIVE
      </SvgText>
    </Svg>
  );
}

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
  /* верх снят с айфона, где сверху 47 точек; у моделей с «островом» больше */
  const topShift = useSafeAreaInsets().top - 47;

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
        position: 'absolute', top: topShift + TOP.y, left: 0, right: 0, zIndex: 20,
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
                style={{ marginLeft: i === 0 ? 0 : GAPS[key] ?? TOP.gap, alignItems: 'center' }}
              >
                <Text style={{
                  /* «STEM» под значком LIVE — лишь едва заметная тень, как на эталоне.
                     Раньше это делал чёрный градиент поверх полосы, но в браузере
                     он выглядел чёрным пятном на фоне видео */
                  opacity: key === 'stem' ? TOP.stemGhost : 1,
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

          {/* LIVE слева поверх полосы — открывает прямой эфир */}
          <TouchableOpacity
            onPress={() => setShowLive(true)}
            hitSlop={8}
            style={{ position: 'absolute', left: TOP.live.left, top: TOP.live.top }}
          >
            <LiveIcon />
          </TouchableOpacity>
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
