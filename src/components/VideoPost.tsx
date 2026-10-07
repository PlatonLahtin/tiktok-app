import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Dimensions, Pressable, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from './Touchable';
import { Text, TextInput } from './FixedText';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Heart, MessageCircle, Share2, Plus, Music, Send, X, Bookmark, EyeOff, AlertTriangle, Download, Columns, Camera } from 'lucide-react-native';
import AppIcon from './AppIcon';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing, cancelAnimation, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useVideoStore, VideoPost as VideoPostType } from '../store/useVideoStore';
import CreatorProfileOverlay from './CreatorProfileOverlay';
import SoundDetailOverlay from './SoundDetailOverlay';

import { TAB_BAR_H } from '../constants/layout';

const { height, width } = Dimensions.get('window');

const VIEW_HEIGHT = height - TAB_BAR_H;

interface VideoPostItemProps {
  video: VideoPostType;
  isActive: boolean;
}

/* числа как в приложении: 345 -> «345», 1200 -> «1,2 тыс.», 2500000 -> «2,5 млн» */
/* Размеры и отступы ленты сняты с эталона, в точках экрана.
   По вертикали всё считается от низа экрана. */
const FEED = {
  textLeft: 12.3, textBottom: 12.7, textW: 285,
  nameFont: 16, nameLine: 19, nameGap: 8,
  descFont: 14, descLine: 17, descColor: '#bfbfbf',
};

/* Правая колонка. Каждый элемент стоит на своём расстоянии от низа —
   так ошибка не копится снизу вверх, как было бы при стопке отступов. */
/* Полоса длины видео: тонкий тёмный трек, сыгранная часть светлее,
   на её конце маленький кружок. Числа сняты с эталона. */
const BAR = {
  side: 12.0, bottom: 0.8, h: 2.0, knob: 4.2,
  track: '#201f20', fill: '#818081',
};

const SIDE = {
  colW: 61,        // колонка шириной 61 -> её центр в 30.5 от правого края
  ava: 46, ring: 1.3, ringColor: 'rgba(235,235,235,0.55)',
  badge: 22.1, avaBottom: 352.7,
  disc: 38.5, discBottom: 14.6,
  font: 11.1, line: 13,
  items: [
    { key: 'like',    src: require('../../assets/icons/feed-like.png'),    h: 26.3, ratio: 1.104, iconB: 291.8, textB: 273.4 },
    { key: 'comment', src: require('../../assets/icons/feed-comment.png'), h: 27.3, ratio: 1.029, iconB: 225.4, textB: 207.8 },
    { key: 'save',    src: require('../../assets/icons/feed-save.png'),    h: 23.4, ratio: 0.876, iconB: 162.0, textB: 141.4 },
    { key: 'share',   src: require('../../assets/icons/feed-share.png'),   h: 26.4, ratio: 1.0,   iconB: 93.9,  textB: 75.8 },
  ],
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' млн';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + ' тыс.';
  return String(n);
}

function FloatingHeart({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(Math.random() * 40 - 20);

  useEffect(() => {
    translateY.value = withTiming(-150, { duration: 800, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(0.4, { duration: 800 });
    opacity.value = withTiming(0, { duration: 800 }, () => {
      runOnJS(onComplete)();
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: x - 20 },
        { translateY: y - 20 + translateY.value },
        { scale: scale.value },
        { rotate: `${rotate.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          zIndex: 50,
          pointerEvents: 'none',
        },
        animatedStyle,
      ]}
    >
      <Heart size={35} color="#ff0050" fill="#ff0050" />
    </Animated.View>
  );
}

export default function VideoPost({ video, isActive }: VideoPostItemProps) {
  const { toggleLike, toggleFollow, addComment, hideVideo, toggleCommentLike, replyToComment, isLoggedIn, setShowAuthModal } = useVideoStore();
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isSoundVisible, setIsSoundVisible] = useState(false);
  const [isDuetActive, setIsDuetActive] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const rotateDisk = useSharedValue(0);

  // Duet pulsing reaction wave
  const waveScale = useSharedValue(1);

  const player = useVideoPlayer(video.videoUrl, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = false;
  });

  useEffect(() => {
    let timer: any;
    const shouldPlay = isActive && !showComments && !showOptions && !isDownloading;

    if (shouldPlay) {
      try {
        if (isActive && !isProfileVisible && !showComments && !showOptions && !isDownloading && !isDuetActive) {
          player.play();
        }
      } catch (e) {
        console.log('Playback prevented synchronously:', e);
      }
      rotateDisk.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );

      timer = setInterval(() => {
        if (player) {
          setCurrentTime(player.currentTime || 0);
          setDuration(player.duration || 0);
        }
      }, 250);

      // Start duet wave animation
      if (isDuetActive) {
        waveScale.value = withRepeat(
          withTiming(1.3, { duration: 1000, easing: Easing.ease }),
          -1,
          true
        );
      }
    } else {
      player.pause();
      cancelAnimation(rotateDisk);
      cancelAnimation(waveScale);
      
      if (!isActive) {
        rotateDisk.value = 0;
        setCurrentTime(0);
        waveScale.value = 1;
      }
    }
    return () => {
      clearInterval(timer);
    };
  }, [isActive, player, isDuetActive, showComments, showOptions, isDownloading]);

  const animatedDiskStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateDisk.value}deg` }],
    };
  });

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: waveScale.value }],
    };
  });

  const handleDoubleTap = (x: number, y: number) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    if (!video.isLiked) {
      toggleLike(video.id);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newHeart = {
      id: `heart_${Date.now()}_${Math.random()}`,
      x,
      y,
    };
    setFloatingHearts((prev) => [...prev, newHeart]);
  };

  const handlePress = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleLongPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowOptions(true);
  };

  const submitComment = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    if (commentInput.trim() === '') return;
    if (replyingTo) {
      replyToComment(video.id, replyingTo, commentInput);
      setReplyingTo(null);
    } else {
      addComment(video.id, commentInput);
    }
    setCommentInput('');
  };

  const handleSaveVideo = () => {
    setShowOptions(false);
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      Alert.alert('Success', 'Video saved successfully to your gallery!');
    }, 1500);
  };

  const handleFavoriteToggle = () => {
    setShowOptions(false);
    setIsFavorited(!isFavorited);
    Alert.alert('Favorites', isFavorited ? 'Removed from Favorites' : 'Added to Favorites');
  };

  const handleNotInterested = () => {
    setShowOptions(false);
    Alert.alert(
      'Hiding Video',
      'We will show you fewer videos like this in the future.',
      [
        { text: 'Undo', style: 'cancel' },
        { text: 'Confirm', onPress: () => hideVideo(video.id) },
      ]
    );
  };

  const handleDuetToggle = () => {
    setShowOptions(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsDuetActive(!isDuetActive);
    Alert.alert(
      'Duet Mode',
      isDuetActive ? 'Split screen duet closed.' : 'Duet mode activated! Reaction viewfinder initialized side-by-side.'
    );
  };

  const handleScrub = (event: any) => {
    const { locationX } = event.nativeEvent;
    // Adapt seekbar scrub width based on Duet split layout
    const seekbarWidth = isDuetActive ? (width / 2) - 24 : width - 32;
    const percentage = Math.min(Math.max(locationX / seekbarWidth, 0), 1);
    const newTime = percentage * duration;
    player.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 0])
    .onEnd((event) => {
      if (event.translationX < -50 || event.velocityX < -300) {
        runOnJS(setIsProfileVisible)(true);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      runOnJS(handleDoubleTap)(event.x, event.y);
    });

  const singleTapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(handlePress)();
    });

  const composedGesture = Gesture.Race(swipeGesture, doubleTapGesture, singleTapGesture);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={{ height: VIEW_HEIGHT, width }} className="relative justify-end bg-black">
      {/* Duet split layout or normal layout container */}
      <View className="flex-1 flex-row">
        
        {/* Left view (Original Video player) */}
        <View style={{ flex: 1 }} className="relative bg-black justify-center">
          <GestureDetector gesture={composedGesture}>
            <Pressable
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              {/* Background Video */}
              <Animated.View style={StyleSheet.absoluteFill}>
                <VideoView
                  player={player}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  nativeControls={false}
                  allowsVideoFrameAnalysis={false}
                />
              </Animated.View>
              {floatingHearts.map((heart) => (
                <FloatingHeart
                  key={heart.id}
                  x={heart.x}
                  y={heart.y}
                  onComplete={() => {
                    setFloatingHearts((prev) => prev.filter((h) => h.id !== heart.id));
                  }}
                />
              ))}
            </Pressable>
          </GestureDetector>
        </View>

        {/* Right view (Duet react camera mock view) */}
        {isDuetActive && (
          <View style={{ width: width / 2 }} className="bg-zinc-900 border-l border-zinc-850 items-center justify-center relative">
            {/* Duet React overlay */}
            <View className="absolute top-14 left-3 bg-[#ff0050] px-2 py-0.5 rounded">
              <Text className="text-white text-[8px] font-extrabold uppercase tracking-widest">Ответить в эфире</Text>
            </View>

            {/* Drifting reaction wavelengths */}
            <Animated.View style={animatedWaveStyle} className="w-20 h-20 rounded-full border border-pink-500/20 items-center justify-center mb-4">
              <View className="w-16 h-16 rounded-full bg-zinc-950 items-center justify-center border border-zinc-800">
                <Camera size={26} color="#db2777" />
              </View>
            </Animated.View>

            <Text className="text-white font-extrabold text-[11px] text-center px-4">Ваши ответы</Text>
            <Text className="text-zinc-500 text-[9px] text-center mt-1">Реакция записывается...</Text>
          </View>
        )}
      </View>

      {/* Downloading indicator overlay */}
      {isDownloading && (
        <View className="absolute inset-0 bg-black/60 z-40 items-center justify-center">
          <View className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl items-center">
            <ActivityIndicator size="large" color="#ff0050" />
            <Text className="text-white text-sm font-bold mt-4">Скачиваю видео...</Text>
          </View>
        </View>
      )}

      {/* Dark Gradient Overlay */}
      <View className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Ник и описание. Собаки перед ником нет, строки про звук тоже. */}
      <View style={{ position: 'absolute', left: FEED.textLeft, bottom: FEED.textBottom, width: FEED.textW, zIndex: 10 }}>
        <TouchableOpacity onPress={() => setIsProfileVisible(true)}>
          <Text style={{ color: '#ffffff', fontSize: FEED.nameFont, fontWeight: '700', lineHeight: FEED.nameLine }}>
            {video.username}
          </Text>
        </TouchableOpacity>
        <Text
          numberOfLines={2}
          style={{ color: FEED.descColor, fontSize: FEED.descFont, lineHeight: FEED.descLine, marginTop: FEED.nameGap }}
        >
          {video.description}
        </Text>
      </View>

      {/* Правая колонка: отступы каждого элемента считаются от низа. */}
      <View style={{ position: 'absolute', right: 0, bottom: 0, top: 0, width: SIDE.colW, zIndex: 10 }} pointerEvents="box-none">
        {/* аватарка в тонкой полупрозрачной рамке, плюс по центру снизу */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: SIDE.avaBottom, alignItems: 'center' }}>
          <View style={{ width: SIDE.ava, height: SIDE.ava }}>
            <TouchableOpacity onPress={() => setIsProfileVisible(true)}>
              <Image
                source={{ uri: video.userAvatar }}
                style={{
                  width: SIDE.ava, height: SIDE.ava, borderRadius: SIDE.ava / 2,
                  borderWidth: SIDE.ring, borderColor: SIDE.ringColor,
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { if (!isLoggedIn) setShowAuthModal(true); else toggleFollow(video.id); }}
              style={{
                position: 'absolute', left: (SIDE.ava - SIDE.badge) / 2, top: SIDE.ava - SIDE.badge / 2,
                width: SIDE.badge, height: SIDE.badge, borderRadius: SIDE.badge / 2,
                backgroundColor: '#fe2c55', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Plus size={SIDE.badge * 0.62} color="#ffffff" strokeWidth={3.4} />
            </TouchableOpacity>
          </View>
        </View>

        {SIDE.items.map((it) => (
          <React.Fragment key={it.key}>
            <TouchableOpacity
              onPress={() => {
                if (it.key === 'like') { if (!isLoggedIn) setShowAuthModal(true); else toggleLike(video.id); }
                else if (it.key === 'comment') setShowComments(true);
                else setShowOptions(true);
              }}
              style={{ position: 'absolute', left: 0, right: 0, bottom: it.iconB, alignItems: 'center' }}
            >
              <Image source={it.src} style={{ height: it.h, width: it.h * it.ratio }} resizeMode="contain" />
            </TouchableOpacity>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{
              /* длинное («169,4 тыс.») чуть ужимается, чтобы не переносилось и не лезло за край */
              position: 'absolute', left: 0, right: 0, bottom: it.textB, textAlign: 'center',
              color: '#ffffff', fontSize: SIDE.font, fontWeight: '700', lineHeight: SIDE.line,
            }}>
              {it.key === 'like' ? formatCount(video.likes)
                : it.key === 'comment' ? formatCount(video.commentsCount)
                : it.key === 'save' ? formatCount(video.saves)
                : formatCount(video.shares)}
            </Text>
          </React.Fragment>
        ))}

        {/* звук — та же аватарка без рамки, чуть меньше, неподвижная */}
        <TouchableOpacity
          onPress={() => setIsSoundVisible(true)}
          style={{ position: 'absolute', left: 0, right: 0, bottom: SIDE.discBottom, alignItems: 'center' }}
        >
          <Image
            source={{ uri: video.userAvatar }}
            style={{ width: SIDE.disc, height: SIDE.disc, borderRadius: SIDE.disc / 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* Полоса длины видео. Таймера нет, только трек и кружок.
          Кружок вынесен из трека: скругление трека его обрезало. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: BAR.side, right: BAR.side, bottom: BAR.bottom,
          height: BAR.knob, justifyContent: 'center', zIndex: 20,
        }}
      >
        <View style={{ height: BAR.h, borderRadius: BAR.h / 2, backgroundColor: BAR.track }}>
          <View style={{
            height: '100%', borderRadius: BAR.h / 2, backgroundColor: BAR.fill,
            width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
          }} />
        </View>
        <View style={{
          position: 'absolute', marginLeft: -BAR.knob / 2,
          left: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%`,
          width: BAR.knob, height: BAR.knob, borderRadius: BAR.knob / 2,
          backgroundColor: BAR.fill,
        }} />
      </View>

      {/* Swipe Profile Overlay */}
      <CreatorProfileOverlay
        isVisible={isProfileVisible}
        onClose={() => setIsProfileVisible(false)}
        username={video.username}
        avatar={video.userAvatar}
        isFollowing={video.isFollowing}
        onToggleFollow={() => toggleFollow(video.id)}
      />

      {/* Sound Details Overlay */}
      <SoundDetailOverlay
        isVisible={isSoundVisible}
        onClose={() => setIsSoundVisible(false)}
        musicTitle={video.music}
      />

      {/* Long Press Video Options Modal */}
      <Modal visible={showOptions} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable className="flex-1" onPress={() => setShowOptions(false)} />
          <View className="bg-zinc-900 rounded-t-3xl border-t border-zinc-800 p-6 pb-10">
            <View className="items-center mb-5">
              <View className="w-10 h-1 bg-zinc-700 rounded-full mb-3" />
              <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Действия с видео</Text>
            </View>

            <View className="gap-y-4">
              <TouchableOpacity
                onPress={handleSaveVideo}
                className="bg-zinc-800 p-4 rounded-2xl flex-row items-center"
              >
                <Download size={20} color="#ffffff" className="mr-4" />
                <Text className="text-white text-sm font-bold">Сохранить видео</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFavoriteToggle}
                className="bg-zinc-800 p-4 rounded-2xl flex-row items-center"
              >
                <Bookmark size={20} color={isFavorited ? '#eab308' : '#ffffff'} fill={isFavorited ? '#eab308' : 'transparent'} className="mr-4" />
                <Text className="text-white text-sm font-bold">
                  {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDuetToggle}
                className="bg-zinc-800 p-4 rounded-2xl flex-row items-center"
              >
                <Columns size={20} color={isDuetActive ? '#ff0050' : '#ffffff'} className="mr-4" />
                <Text className="text-white text-sm font-bold">
                  {isDuetActive ? 'Close Duet split' : 'Duet split screen'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNotInterested}
                className="bg-zinc-800 p-4 rounded-2xl flex-row items-center"
              >
                <EyeOff size={20} color="#f87171" className="mr-4" />
                <Text className="text-red-400 text-sm font-bold">Не интересно</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowOptions(false);
                  Alert.alert('Reported', 'Thank you. We will review this video shortly.');
                }}
                className="bg-zinc-800 p-4 rounded-2xl flex-row items-center"
              >
                <AlertTriangle size={20} color="#eab308" className="mr-4" />
                <Text className="text-yellow-400 text-sm font-bold">Пожаловаться</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowOptions(false)}
              className="mt-6 py-4 rounded-2xl border border-zinc-800 bg-zinc-950 items-center"
            >
              <Text className="text-white font-extrabold text-sm">Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet Comments Drawer */}
      <Modal visible={showComments} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable className="flex-1" onPress={() => setShowComments(false)} />
          
          <View className="bg-zinc-900 rounded-t-3xl h-[65%] border-t border-zinc-800">
            <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-zinc-800">
              <Text className="font-bold text-white text-base">
                Comments ({video.comments.length})
              </Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <X size={22} color="#888888" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
              {video.comments.length === 0 ? (
                <View className="py-20 items-center justify-center">
                  <MessageCircle size={48} color="#555555" />
                  <Text className="text-gray-500 text-sm mt-3">Комментариев пока нет.</Text>
                </View>
              ) : (
                video.comments.map((comment) => (
                  <View key={comment.id} className="flex-row mb-5">
                    <Image
                      source={{ uri: comment.avatar }}
                      className="w-8 h-8 rounded-full mr-3 border border-zinc-700"
                    />
                    <View className="flex-1 border-b border-zinc-800/50 pb-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-zinc-400 text-xs font-bold">{comment.username}</Text>
                        <View className="flex-row items-center">
                          <Text className="text-zinc-500 text-[10px] mr-2">{comment.timestamp}</Text>
                          <TouchableOpacity onPress={() => {
                            if (!isLoggedIn) setShowAuthModal(true);
                            else toggleCommentLike(video.id, comment.id);
                          }}>
                            <Heart size={14} color={comment.isLiked ? '#ff0050' : '#888888'} fill={comment.isLiked ? '#ff0050' : 'transparent'} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text className="text-white text-sm mt-1">{comment.text}</Text>
                      <TouchableOpacity className="mt-1" onPress={() => setReplyingTo(comment.id)}>
                        <Text className="text-zinc-500 text-xs font-bold">Ответить</Text>
                      </TouchableOpacity>

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.map(reply => (
                        <View key={reply.id} className="flex-row mt-3">
                          <Image source={{ uri: reply.avatar }} className="w-6 h-6 rounded-full mr-2" />
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-zinc-400 text-[10px] font-bold">{reply.username}</Text>
                              <Text className="text-zinc-500 text-[9px]">{reply.timestamp}</Text>
                            </View>
                            <Text className="text-white text-xs mt-0.5">{reply.text}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View className="p-4 border-t border-zinc-800 bg-zinc-900 pb-8">
              {/* Emoji quick reactions */}
              <View className="flex-row items-center justify-between px-2 mb-3">
                {['😂', '🥰', '🥺', '🔥', '👏', '✨', '💀', '💯'].map(emoji => (
                  <TouchableOpacity key={emoji} onPress={() => setCommentInput(prev => prev + emoji)}>
                    <Text className="text-2xl">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {replyingTo && (
                <View className="flex-row justify-between mb-2 px-1">
                  <Text className="text-zinc-400 text-xs">Отвечаю на комментарий...</Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <Text className="text-zinc-500 text-xs">Отмена</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View className="flex-row items-center">
                <View className="flex-1 bg-zinc-800 rounded-full px-4 py-2.5 flex-row items-center">
                  <TextInput
                    className="flex-1 text-white text-sm h-6"
                    placeholder={replyingTo ? "Add a reply..." : "Add a comment..."}
                    placeholderTextColor="#888888"
                    value={commentInput}
                    onChangeText={setCommentInput}
                    onSubmitEditing={submitComment}
                  />
                  <TouchableOpacity onPress={submitComment}>
                    <Send size={18} color={commentInput.trim() ? '#ff0050' : '#888888'} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
