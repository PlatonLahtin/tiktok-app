import React, { useState, useEffect } from 'react';
import { View, Image, Dimensions, ScrollView } from 'react-native';
import { TouchableOpacity } from './Touchable';
import { Text } from './FixedText';
import { ChevronLeft, Play, Disc, Music } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useVideoStore } from '../store/useVideoStore';

const { width, height } = Dimensions.get('window');

interface SoundDetailOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  musicTitle: string;
}

export default function SoundDetailOverlay({ isVisible, onClose, musicTitle }: SoundDetailOverlayProps) {
  const router = useRouter();
  const { videos } = useVideoStore();
  const translateX = useSharedValue(width);

  useEffect(() => {
    if (isVisible) {
      translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
    } else {
      translateX.value = withSpring(width, { damping: 20, stiffness: 90 });
    }
  }, [isVisible]);

  const handleClose = () => {
    translateX.value = withSpring(width, { damping: 20, stiffness: 90 }, () => {
      runOnJS(onClose)();
    });
  };

  // Pan gesture to close (swipe left-to-right)
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

  // Filter videos using this exact sound
  const matchingVideos = videos.filter((vid) => vid.music === musicTitle);

  const handleUseSound = () => {
    handleClose();
    // Navigate to camera with query param sound
    router.push({
      pathname: '/camera',
      params: { sound: musicTitle }
    });
  };

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
            zIndex: 110,
          },
          animatedStyle,
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-12">
          {/* Header */}
          <View className="flex-row items-center px-4 mb-6">
            <TouchableOpacity onPress={handleClose} className="bg-zinc-900 p-2.5 rounded-full mr-4">
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-base" numberOfLines={1}>О звуке</Text>
          </View>

          {/* Sound Card Details */}
          <View className="flex-row px-4 mb-6 items-center">
            {/* Vinyl Record cover representation */}
            <View className="relative w-24 h-24 mr-5 items-center justify-center">
              <View className="w-24 h-24 rounded-full bg-zinc-950 border border-zinc-800 items-center justify-center shadow-lg">
                <Disc size={64} color="#18181b" strokeWidth={1} />
                <View className="absolute w-10 h-10 rounded-full bg-[#ff0050] items-center justify-center">
                  <Music size={16} color="#ffffff" />
                </View>
              </View>
            </View>

            <View className="flex-1 justify-center">
              <Text className="text-white font-extrabold text-lg" numberOfLines={2}>{musicTitle.split(' - ')[0]}</Text>
              <Text className="text-zinc-500 text-sm mt-1">{musicTitle.split(' - ')[1] || 'Original Track'}</Text>
              <Text className="text-zinc-650 text-xs mt-2 font-semibold">
                {matchingVideos.length * 12 + 4} videos created
              </Text>
            </View>
          </View>

          {/* "Use this sound" Camera Action Button */}
          <View className="px-4 mb-6">
            <TouchableOpacity
              onPress={handleUseSound}
              className="bg-[#ff0050] py-3.5 rounded-xl items-center justify-center flex-row gap-x-2"
            >
              <Music size={16} color="#ffffff" />
              <Text className="text-white font-extrabold text-sm">Взять этот звук</Text>
            </TouchableOpacity>
          </View>

          {/* matching videos heading */}
          <View className="px-4 mb-3 border-t border-zinc-900 pt-5">
            <Text className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Похожие ролики</Text>
          </View>

          {/* Matching videos grid */}
          <View className="flex-row flex-wrap gap-[1px] p-2 bg-black">
            {matchingVideos.length === 0 ? (
              <View className="w-full py-20 items-center justify-center">
                <Play size={36} color="#444444" />
                <Text className="text-zinc-500 text-xs mt-3">Будь первым, кто возьмёт этот звук!</Text>
              </View>
            ) : (
              matchingVideos.map((video) => (
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
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}
