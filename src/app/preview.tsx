import React, { useState } from 'react';
import { View, Image, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TouchableOpacity } from '../components/Touchable';
import { Text, TextInput } from '../components/FixedText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ChevronLeft, Type, Image as ImageIcon, Music, Send, Globe, Lock, Users } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoStore } from '../store/useVideoStore';
import { goBack } from '../lib/goBack';

const { width, height } = Dimensions.get('window');

export default function PreviewScreen() {
  const { uri, filter, sound } = useLocalSearchParams<{ uri: string; filter: string; sound: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addVideo } = useVideoStore();

  const [step, setStep] = useState<'preview' | 'post'>('preview');
  
  // Sticker state
  const [stickers, setStickers] = useState<{ id: string; text: string }[]>([]);
  const [isAddingText, setIsAddingText] = useState(false);
  const [tempText, setTempText] = useState('');

  // Post state
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'Everyone' | 'Friends' | 'Only Me'>('Everyone');
  const [showPrivacyOptions, setShowPrivacyOptions] = useState(false);

  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = false;
    playerInstance.play();
  });

  const handleAddText = () => {
    if (tempText.trim()) {
      setStickers([...stickers, { id: `sticker_${Date.now()}`, text: tempText }]);
    }
    setTempText('');
    setIsAddingText(false);
  };

  const handlePost = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Add to feed store
    addVideo({
      videoUrl: uri,
      description: description || `My new video using ${filter || 'Normal'} filter! 🎥✨`,
      music: sound || 'Original Audio - you_clone',
    });

    Alert.alert(
      'Video Uploaded',
      'Your video has been published successfully.',
      [{ text: 'View Feed', onPress: () => router.replace('/') }]
    );
  };

  if (step === 'post') {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-4 border-b border-zinc-800">
          <TouchableOpacity onPress={() => setStep('preview')} className="p-2 -ml-2">
            <ChevronLeft size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">Опубликовать</Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 p-4">
          {/* Caption Input Area */}
          <View className="flex-row mb-6">
            <TextInput
              className="flex-1 text-white text-base min-h-[100px] bg-zinc-900 rounded-xl p-4 mr-4"
              placeholder="Describe your post, add hashtags, or mention creators..."
              placeholderTextColor="#888"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
            <View className="w-24 h-32 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
              <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                nativeControls={false}
                allowsVideoFrameAnalysis={false}
              />
            </View>
          </View>

          {/* Privacy Settings */}
          <View className="bg-zinc-900 rounded-xl overflow-hidden">
            <TouchableOpacity 
              onPress={() => setShowPrivacyOptions(!showPrivacyOptions)}
              className="flex-row items-center justify-between p-4 border-b border-zinc-800/50"
            >
              <View className="flex-row items-center">
                <Lock size={20} color="#ffffff" className="mr-3" />
                <Text className="text-white font-semibold text-base">Кто увидит это видео</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-zinc-400 text-sm mr-2">{privacy}</Text>
                <ChevronLeft size={16} color="#888" style={{ transform: [{ rotate: showPrivacyOptions ? '90deg' : '-90deg' }] }} />
              </View>
            </TouchableOpacity>

            {showPrivacyOptions && (
              <View className="bg-zinc-800/50 p-2">
                {(['Everyone', 'Friends', 'Only Me'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setPrivacy(option);
                      setShowPrivacyOptions(false);
                    }}
                    className="flex-row items-center p-3 rounded-lg"
                  >
                    {option === 'Everyone' && <Globe size={18} color="#aaa" className="mr-3" />}
                    {option === 'Friends' && <Users size={18} color="#aaa" className="mr-3" />}
                    {option === 'Only Me' && <Lock size={18} color="#aaa" className="mr-3" />}
                    <Text className={`font-medium ${privacy === option ? 'text-[#ff0050]' : 'text-zinc-300'}`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="mt-auto pb-4 gap-y-3">
            <TouchableOpacity className="bg-zinc-800 py-4 rounded-xl items-center flex-row justify-center">
              <ImageIcon size={18} color="#ffffff" className="mr-2 opacity-50" />
              <Text className="text-white font-bold text-[15px]">Черновики</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handlePost} className="bg-[#ff0050] py-4 rounded-xl items-center flex-row justify-center">
              <Send size={18} color="#ffffff" className="mr-2" />
              <Text className="text-white font-bold text-[15px]">Опубликовать</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="cover"
        nativeControls={false}
        allowsVideoFrameAnalysis={false}
      />

      {/* Render Draggable Stickers */}
      {stickers.map((sticker) => (
        <DraggableSticker key={sticker.id} text={sticker.text} />
      ))}

      {/* UI Overlay */}
      {!isAddingText && (
        <View className="absolute inset-0 justify-between pointer-events-box-none">
          <View style={{ paddingTop: insets.top }} className="px-4 flex-row justify-between items-start pointer-events-box-none">
            <TouchableOpacity onPress={() => goBack(router, '/')} className="p-2 bg-black/40 rounded-full mt-2">
              <ChevronLeft size={24} color="#ffffff" />
            </TouchableOpacity>

            <View className="items-end gap-y-4 mt-2">
              <TouchableOpacity onPress={() => setIsAddingText(true)} className="items-center">
                <View className="w-10 h-10 bg-black/40 rounded-full items-center justify-center mb-1">
                  <Type size={20} color="#ffffff" />
                </View>
                <Text className="text-white text-[10px] font-bold shadow-sm">Текст</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert("Cover Selection", "Simulating cover selection scrubber...");
              }} className="items-center">
                <View className="w-10 h-10 bg-black/40 rounded-full items-center justify-center mb-1">
                  <ImageIcon size={20} color="#ffffff" />
                </View>
                <Text className="text-white text-[10px] font-bold shadow-sm">Обложка</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Actions */}
          <View className="p-4 mb-4 flex-row justify-between items-center bg-gradient-to-t from-black/80 to-transparent pt-10 pointer-events-box-none">
            <View className="flex-row items-center">
              <Music size={16} color="#ffffff" className="mr-2" />
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {sound || 'Original Sound'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setStep('post')}
              className="bg-[#ff0050] px-8 py-3 rounded-xl flex-row items-center"
            >
              <Text className="text-white font-bold text-[15px] mr-1">Далее</Text>
              <ChevronLeft size={18} color="#ffffff" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Text Input Overlay */}
      {isAddingText && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="absolute inset-0 bg-black/60 z-50 justify-center items-center"
        >
          <TextInput
            autoFocus
            value={tempText}
            onChangeText={setTempText}
            placeholder="Type something..."
            placeholderTextColor="#888"
            className="text-white text-3xl font-bold text-center px-6 w-full"
            onSubmitEditing={handleAddText}
            returnKeyType="done"
          />
          <TouchableOpacity 
            onPress={handleAddText} 
            className="absolute top-14 right-4 bg-white/20 px-4 py-2 rounded-full"
          >
            <Text className="text-white font-bold">Готово</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// Draggable Sticker Component using Reanimated
function DraggableSticker({ text }: { text: string }) {
  const translateX = useSharedValue(width / 2 - 50);
  const translateY = useSharedValue(height / 2 - 20);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX + event.x - 50;
      translateY.value = event.translationY + event.y - 20;
    })
    .onBegin(() => {
      scale.value = withSpring(1.1);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View className="absolute z-40 bg-[#ff0050] px-4 py-2 rounded-xl" style={animatedStyle}>
        <Text className="text-white font-extrabold text-lg">{text}</Text>
      </Animated.View>
    </GestureDetector>
  );
}
