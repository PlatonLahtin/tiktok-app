import React from 'react';
import { View, Image, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from './Touchable';
import { Text } from './FixedText';
import { Grid, Lock, Heart, Play, ChevronLeft, Check, Plus } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useVideoStore } from '../store/useVideoStore';

const { width, height } = Dimensions.get('window');

interface CreatorProfileOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  username: string;
  avatar: string;
  isFollowing: boolean;
  onToggleFollow: () => void;
}

export default function CreatorProfileOverlay({
  isVisible,
  onClose,
  username,
  avatar,
  isFollowing,
  onToggleFollow,
}: CreatorProfileOverlayProps) {
  const insTop = useSafeAreaInsets().top;   // отступ сверху: часы, «чёлка» или «остров»
  const { videos } = useVideoStore();
  const [activeTab, setActiveTab] = useState<'public' | 'liked'>('public');

  // Shared value for horizontal translation
  const translateX = useSharedValue(width);

  React.useEffect(() => {
    if (isVisible) {
      translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
    } else {
      translateX.value = withSpring(width, { damping: 20, stiffness: 90 });
    }
  }, [isVisible]);

  // Handle closing via JS callback after animation completes
  const handleClose = () => {
    translateX.value = withSpring(width, { damping: 20, stiffness: 90 }, () => {
      runOnJS(onClose)();
    });
  };

  // Pan gesture to swipe profile closed from left to right
  const panGesture = Gesture.Pan()
    .activeOffsetX([0, 10])
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX > width * 0.3 || event.velocityX > 400) {
        translateX.value = withSpring(width, { damping: 15 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Filter creator's videos
  const creatorVideos = videos.filter((vid) => vid.username === username);
  const likedVideos = videos.filter((vid) => vid.isLiked);

  const stats = {
    following: '12',
    followers: isFollowing ? '3457' : '3456',
    likes: '78,9 тыс.',
    bio: 'Описание профиля — заглушка',
  };

  // Helper inside functional component to maintain state
  function useState<T>(initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [val, setVal] = React.useState(initialValue);
    return [val, setVal];
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: width,
            height: height,
            backgroundColor: '#000000',
            zIndex: 100,
          },
          animatedStyle,
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1" style={{ paddingTop: insTop + 1 }}>
          {/* Header */}
          <View className="flex-row items-center px-4 mb-5">
            <TouchableOpacity onPress={handleClose} className="bg-zinc-900 p-2.5 rounded-full mr-4">
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-base">@{username}</Text>
          </View>

          {/* User Info Header */}
          <View className="items-center px-4 mb-6">
            <Image
              source={{ uri: avatar }}
              className="w-24 h-24 rounded-full border-2 border-zinc-800 mb-3"
            />
            <Text className="text-white text-lg font-extrabold">@{username}</Text>
            <Text className="text-zinc-500 text-sm mt-0.5">Автор</Text>

            {/* Stats Bar */}
            <View className="flex-row justify-center items-center gap-x-8 mt-5">
              <View className="items-center">
                <Text className="text-white font-extrabold text-base">{stats.following}</Text>
                <Text className="text-zinc-500 text-xs mt-0.5">Подписки</Text>
              </View>
              <View className="items-center">
                <Text className="text-white font-extrabold text-base">{stats.followers}</Text>
                <Text className="text-zinc-500 text-xs mt-0.5">Подписчиков</Text>
              </View>
              <View className="items-center">
                <Text className="text-white font-extrabold text-base">{stats.likes}</Text>
                <Text className="text-zinc-500 text-xs mt-0.5">Лайки</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-x-3 mt-6 w-full px-4">
              <TouchableOpacity
                onPress={onToggleFollow}
                className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-x-2 ${
                  isFollowing ? 'bg-zinc-900 border border-zinc-800' : 'bg-[#ff0050]'
                }`}
              >
                {isFollowing ? (
                  <>
                    <Check size={14} color="#ffffff" />
                    <Text className="text-white font-bold text-xs">Подписки</Text>
                  </>
                ) : (
                  <>
                    <Plus size={14} color="#ffffff" />
                    <Text className="text-white font-bold text-xs">Подписаться</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Bio Description */}
            <Text className="text-zinc-350 text-xs mt-5 text-center leading-5 px-6">
              {stats.bio}
            </Text>
          </View>

          {/* Tab Selector */}
          <View className="flex-row border-t border-b border-zinc-900">
            <TouchableOpacity
              onPress={() => setActiveTab('public')}
              className="flex-1 items-center py-3 border-b-2"
              style={{ borderBottomColor: activeTab === 'public' ? '#ffffff' : 'transparent' }}
            >
              <Grid size={18} color={activeTab === 'public' ? '#ffffff' : '#555555'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('liked')}
              className="flex-1 items-center py-3 border-b-2"
              style={{ borderBottomColor: activeTab === 'liked' ? '#ffffff' : 'transparent' }}
            >
              <Heart size={18} color={activeTab === 'liked' ? '#ffffff' : '#555555'} />
            </TouchableOpacity>
          </View>

          {/* Video Thumbnail Grid */}
          <View className="flex-row flex-wrap gap-[1px] p-2 bg-black">
            {activeTab === 'public' ? (
              creatorVideos.length === 0 ? (
                <View className="w-full py-20 items-center justify-center">
                  <Play size={36} color="#444444" />
                  <Text className="text-zinc-500 text-xs mt-3">Видео пока нет</Text>
                </View>
              ) : (
                creatorVideos.map((video) => (
                  <View
                    key={video.id}
                    style={{ width: (width - 20) / 3, height: ((width - 20) / 3) * 1.4 }}
                    className="bg-zinc-900 m-[1px] relative"
                  >
                    <Image source={{ uri: video.userAvatar }} className="w-full h-full object-cover" />
                    <View className="absolute bottom-1.5 left-1.5 flex-row items-center">
                      <Play size={10} color="#ffffff" fill="#ffffff" className="mr-1" />
                      <Text className="text-white text-[9px] font-bold">{(video.likes / 10).toFixed(0)}</Text>
                    </View>
                  </View>
                ))
              )
            ) : (
              likedVideos.length === 0 ? (
                <View className="w-full py-20 items-center justify-center">
                  <Heart size={36} color="#444444" />
                  <Text className="text-zinc-500 text-xs mt-3">Нет понравившихся видео</Text>
                </View>
              ) : (
                likedVideos.map((video) => (
                  <View
                    key={video.id}
                    style={{ width: (width - 20) / 3, height: ((width - 20) / 3) * 1.4 }}
                    className="bg-zinc-900 m-[1px] relative"
                  >
                    <Image source={{ uri: video.userAvatar }} className="w-full h-full object-cover" />
                    <View className="absolute bottom-1.5 left-1.5 flex-row items-center">
                      <Play size={10} color="#ffffff" fill="#ffffff" className="mr-1" />
                      <Text className="text-white text-[9px] font-bold">{(video.likes / 10).toFixed(0)}</Text>
                    </View>
                  </View>
                ))
              )
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}
