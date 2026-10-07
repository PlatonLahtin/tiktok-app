import React, { useState, useEffect, useRef } from 'react';
import { AV1, AV2 } from '../constants/mockAssets';
import { View, Image, Modal, ScrollView, Dimensions } from 'react-native';
import { TouchableOpacity } from './Touchable';
import { Text, TextInput } from './FixedText';
import { X, Send, Heart, Gift, Users, Eye } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width, height } = Dimensions.get('window');

interface LiveStreamModalProps {
  isVisible: boolean;
  onClose: () => void;
}

// Subcomponent to animate floating gift item
function FloatingGift({ emoji, x, y, onComplete }: { emoji: string; x: number; y: number; onComplete: () => void }) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1.5);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(-200, { duration: 1000, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(0.8, { duration: 1000 });
    opacity.value = withTiming(0, { duration: 1000 }, () => {
      runOnJS(onComplete)();
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: x - 25 },
        { translateY: y - 25 + translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          zIndex: 60,
          pointerEvents: 'none',
        },
        animatedStyle,
      ]}
    >
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
    </Animated.View>
  );
}

export default function LiveStreamModal({ isVisible, onClose }: LiveStreamModalProps) {
  const [comments, setComments] = useState<Array<{ id: string; user: string; text: string }>>([
    { id: '1', user: 'jack_12', text: 'Wow, hello from Paris! 🗼' },
    { id: '2', user: 'lisa_m', text: 'You look amazing today!' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; emoji: string; x: number; y: number }>>([]);
  const [giftAlert, setGiftAlert] = useState<string | null>(null);

  const commentsScrollViewRef = useRef<ScrollView>(null);

  const player = useVideoPlayer(require('../../assets/sample.mp4'), (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    if (isVisible) {
      playerInstance.play();
    }
  });

  useEffect(() => {
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);

  const mockUsers = ['sarah_k', 'bob_builder', 'dan_tech', 'gamer_boy', 'skater_lisa', 'neon_rider'];
  const mockTexts = [
    'Super cool broadcast! 🔥',
    'Play some music! 🎶',
    'Where are you live from?',
    'Sending good vibes! ✨',
    'This is awesome 🙌',
    'Wow, count me in!',
  ];

  // Auto-scrolling drift comments interval
  useEffect(() => {
    let commentTimer: any;
    if (isVisible) {
      commentTimer = setInterval(() => {
        const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
        const newComment = {
          id: `comment_${Date.now()}_${Math.random()}`,
          user: randomUser,
          text: randomText,
        };
        setComments((prev) => [...prev, newComment]);
        
        // Scroll to end
        setTimeout(() => {
          commentsScrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 2000);
    }
    return () => clearInterval(commentTimer);
  }, [isVisible]);

  const handleSendChat = () => {
    if (chatInput.trim() === '') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newComment = {
      id: `comment_user_${Date.now()}`,
      user: 'you_clone',
      text: chatInput,
    };
    setComments((prev) => [...prev, newComment]);
    setChatInput('');
    
    setTimeout(() => {
      commentsScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendGift = (emoji: string, name: string) => {
    setShowGiftDrawer(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setGiftAlert(`You sent a ${name} ${emoji}!`);
    setTimeout(() => setGiftAlert(null), 2000);

    // Spawn 3 floating gift emojis from the gift button location
    const startX = width - 70;
    const startY = height - 100;
    const newGifts = [
      { id: `g1_${Date.now()}`, emoji, x: startX, y: startY },
      { id: `g2_${Date.now()}`, emoji, x: startX - 20, y: startY - 30 },
      { id: `g3_${Date.now()}`, emoji, x: startX + 20, y: startY - 15 },
    ];
    setFloatingGifts((prev) => [...prev, ...newGifts]);
  };

  const spawnRandomHearts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const startX = width - 40;
    const startY = height - 150;
    const newGifts = [
      { id: `h1_${Date.now()}`, emoji: '❤️', x: startX, y: startY },
      { id: `h2_${Date.now()}`, emoji: '💖', x: startX - 10, y: startY - 20 },
    ];
    setFloatingGifts((prev) => [...prev, ...newGifts]);
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black justify-end relative">
        {/* Background Simulated Live Video Feed (Beautiful Dark Gradient & Profile mock) */}
        <View className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-950 items-center justify-center">
          <View style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.65 }}>
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} allowsVideoFrameAnalysis={false} />
          </View>
          <View className="absolute top-48 items-center">
            <Image
              source={{ uri: AV1 }}
              className="w-20 h-20 rounded-full border-2 border-[#ff0050] mb-3"
            />
            <Text className="text-white font-extrabold text-lg">@neongirl_99</Text>
            <Text className="text-[#ff0050] text-xs font-bold uppercase tracking-widest mt-1">Прямой эфир</Text>
          </View>
        </View>

        {/* Floating elements layer */}
        {floatingGifts.map((gift) => (
          <FloatingGift
            key={gift.id}
            emoji={gift.emoji}
            x={gift.x}
            y={gift.y}
            onComplete={() => {
              setFloatingGifts((prev) => prev.filter((g) => g.id !== gift.id));
            }}
          />
        ))}

        {/* Top Overlay HUD */}
        <View className="absolute top-14 left-4 right-4 flex-row justify-between items-center z-10">
          <View className="flex-row items-center bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
            <View className="w-2 h-2 rounded-full bg-[#ff0050] animate-pulse mr-2" />
            <Text className="text-white font-extrabold text-xs mr-2">LIVE</Text>
            <Eye size={12} color="#ffffff" className="mr-1" />
            <Text className="text-white text-[10px] font-bold">12.4K</Text>
          </View>

          <TouchableOpacity onPress={onClose} className="bg-black/40 p-2 rounded-full">
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Central Gift Alert Toast */}
        {giftAlert && (
          <View className="absolute top-1/3 left-10 right-10 z-35 bg-[#ff0050]/90 border border-white/20 p-4 rounded-2xl items-center shadow-lg">
            <Text className="text-white font-extrabold text-base text-center">{giftAlert}</Text>
          </View>
        )}

        {/* Bottom Left Scrolling Chats Container */}
        <View className="h-40 px-4 w-[75%] mb-4 z-10">
          <ScrollView
            ref={commentsScrollViewRef}
            showsVerticalScrollIndicator={false}
            className="flex-1"
          >
            {comments.map((item) => (
              <View key={item.id} className="bg-black/30 p-2.5 rounded-xl mb-2 flex-row flex-wrap border border-white/5">
                <Text className="text-cyan-400 font-bold text-xs mr-1.5">@{item.user}:</Text>
                <Text className="text-white text-xs">{item.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Bottom Interactive Panel */}
        <View className="flex-row items-center px-4 pb-8 z-10 gap-x-3 bg-gradient-to-t from-black/80 to-transparent pt-4">
          <View className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-full px-4 py-2.5 flex-row items-center">
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Say something nice..."
              placeholderTextColor="#888888"
              className="flex-1 text-white text-xs h-6"
              onSubmitEditing={handleSendChat}
            />
            <TouchableOpacity onPress={handleSendChat}>
              <Send size={16} color={chatInput.trim() ? '#ff0050' : '#888888'} />
            </TouchableOpacity>
          </View>

          {/* Gift trigger button */}
          <TouchableOpacity
            onPress={() => setShowGiftDrawer(true)}
            className="bg-yellow-500 p-3 rounded-full border border-yellow-400 shadow-md"
          >
            <Gift size={20} color="#000000" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Double hearts generator shortcut */}
          <TouchableOpacity
            onPress={spawnRandomHearts}
            className="bg-[#ff0050] p-3 rounded-full border border-pink-400 shadow-md"
          >
            <Heart size={20} color="#ffffff" fill="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Gift Selection Panel (Drawer Modal) */}
        <Modal visible={showGiftDrawer} animationType="slide" transparent>
          <View className="flex-1 bg-black/60 justify-end">
            <TouchableOpacity className="flex-1" onPress={() => setShowGiftDrawer(false)} />
            <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 pb-10">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-white font-extrabold text-base">Отправить подарок</Text>
                <TouchableOpacity onPress={() => setShowGiftDrawer(false)}>
                  <X size={20} color="#888888" />
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-around flex-wrap gap-y-4">
                <TouchableOpacity
                  onPress={() => handleSendGift('🌹', 'Rose')}
                  className="items-center bg-zinc-850 p-4 rounded-2xl w-[22%]"
                >
                  <Text style={{ fontSize: 32 }}>🌹</Text>
                  <Text className="text-white text-[10px] font-bold mt-2">Роза</Text>
                  <Text className="text-yellow-500 text-[8px] mt-0.5">1 Coin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSendGift('😎', 'Sunnies')}
                  className="items-center bg-zinc-850 p-4 rounded-2xl w-[22%]"
                >
                  <Text style={{ fontSize: 32 }}>😎</Text>
                  <Text className="text-white text-[10px] font-bold mt-2">Очки</Text>
                  <Text className="text-yellow-500 text-[8px] mt-0.5">10 Coins</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSendGift('💎', 'Diamond')}
                  className="items-center bg-zinc-850 p-4 rounded-2xl w-[22%]"
                >
                  <Text style={{ fontSize: 32 }}>💎</Text>
                  <Text className="text-white text-[10px] font-bold mt-2">Алмаз</Text>
                  <Text className="text-yellow-500 text-[8px] mt-0.5">50 Coins</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSendGift('🏎️', 'Supercar')}
                  className="items-center bg-zinc-850 p-4 rounded-2xl w-[22%]"
                >
                  <Text style={{ fontSize: 32 }}>🏎️</Text>
                  <Text className="text-white text-[10px] font-bold mt-2">Машина</Text>
                  <Text className="text-yellow-500 text-[8px] mt-0.5">500 Coins</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
