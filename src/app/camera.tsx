import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Modal, ScrollView, Alert } from 'react-native';
import { TouchableOpacity } from '../components/Touchable';
import { Text } from '../components/FixedText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { X, FlipHorizontal, Flashlight, Music, Image as ImageIcon, Timer, AlertCircle, Play, Pause, Check, Plus } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useVideoStore } from '../store/useVideoStore';
import { goBack } from '../lib/goBack';

const filterNames = ['Normal', 'Cyberpunk', 'Noir', 'Sepia', 'Beauty'];

const filterColors = [
  'transparent',
  'rgba(219, 39, 119, 0.15)', // Cyberpunk pink tint
  'rgba(0, 0, 0, 0.35)',      // Noir black/white dark tint
  'rgba(180, 83, 9, 0.15)',    // Sepia brown tint
  'rgba(253, 224, 71, 0.08)',  // Beauty warm glow tint
];

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addVideo } = useVideoStore();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSounds, setShowSounds] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [showSoundModal, setShowSoundModal] = useState(false);
  const trendingSounds = [
    'Original Audio - you_clone',
    'Neon Groove - Dance Classics',
    'Skater Punk - The Rockers',
    'Chill Ambient - Cloud Nine',
    'Viral Beat 2026 - DJ XYZ',
  ];

  // Timer states
  const [timerDuration, setTimerDuration] = useState<number>(0);
  const [countdownValue, setCountdownValue] = useState<number>(0);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);

  // Filter Swiping states
  const [filterIndex, setFilterIndex] = useState(0);
  const [showFilterToast, setShowFilterToast] = useState(false);
  const toastOpacity = useSharedValue(0);

  // Preview Audio state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);

  // Preview audio player
  const previewPlayer = useVideoPlayer(previewUrl || '', (player) => {
    player.loop = true;
  });

  useEffect(() => {
    if (previewUrl && previewPlayer) {
      previewPlayer.play();
    } else if (previewPlayer) {
      previewPlayer.pause();
    }
  }, [previewUrl, previewPlayer]);

  // Pre-load sound if parameter was passed
  useEffect(() => {
    if (params.sound) {
      setSelectedSound(params.sound as string);
    }
  }, [params.sound]);

  const progressInterval = useRef<any>(null);
  const countdownInterval = useRef<any>(null);

  const soundsList = [
    { id: 's1', title: 'Звук — заглушка 1', url: '' },
    { id: 's2', title: 'Звук — заглушка 2', url: '' },
    { id: 's3', title: 'Звук — заглушка 3', url: '' },
    { id: 's4', title: 'Звук — заглушка 4', url: '' },
  ];

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
    return () => {
      clearInterval(progressInterval.current);
      clearInterval(countdownInterval.current);
    };
  }, [permission]);

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need media library permissions to pick a video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedVideo = result.assets[0];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      router.push({
        pathname: '/preview',
        params: { uri: selectedVideo.uri, filter: 'Normal', sound: selectedSound }
      });
    }
  };

  const startRecordingFlow = async () => {
    setIsRecording(true);
    setRecordingProgress(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Show a fake progress bar just for visual feedback during recording
    progressInterval.current = setInterval(() => {
      setRecordingProgress((p) => Math.min(p + 1, 100));
    }, timerDuration > 0 ? (timerDuration * 10) : 150);

    try {
      const videoRecordPromise = cameraRef.current?.recordAsync({
        maxDuration: timerDuration > 0 ? timerDuration : undefined,
      });
      
      const video = await videoRecordPromise;
      
      if (video) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
          pathname: '/preview',
          params: { uri: video.uri, filter: filterNames[filterIndex], sound: selectedSound }
        });
      }
    } catch (e) {
      console.error('Recording failed: ', e);
    } finally {
      clearInterval(progressInterval.current);
      setIsRecording(false);
      setRecordingProgress(0);
    }
  };

  const stopRecordingFlow = () => {
    cameraRef.current?.stopRecording();
  };

  const handleRecordingPress = () => {
    if (isRecording) {
      stopRecordingFlow();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (timerDuration > 0) {
        setIsCountingDown(true);
        setCountdownValue(timerDuration);
        
        countdownInterval.current = setInterval(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCountdownValue((val) => {
            if (val <= 1) {
              clearInterval(countdownInterval.current);
              setIsCountingDown(false);
              startRecordingFlow();
              return 0;
            }
            return val - 1;
          });
        }, 1000);
      } else {
        startRecordingFlow();
      }
    }
  };

  const cycleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timerDuration === 0) setTimerDuration(3);
    else if (timerDuration === 3) setTimerDuration(10);
    else setTimerDuration(0);
  };

  const handlePreviewToggle = (soundId: string, url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playingSoundId === soundId) {
      setPlayingSoundId(null);
      setPreviewUrl(null);
    } else {
      setPlayingSoundId(soundId);
      setPreviewUrl(url);
    }
  };

  const selectSoundAndClose = (title: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedSound(title);
    setPlayingSoundId(null);
    setPreviewUrl(null);
    setShowSounds(false);
  };

  // Swipable camera filter changes
  const triggerFilterChange = (nextIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterIndex(nextIndex);
    
    // Animate temporary name toast overlay
    setShowFilterToast(true);
    toastOpacity.value = 1;
    toastOpacity.value = withTiming(0, { duration: 1000 }, () => {
      runOnJS(setShowFilterToast)(false);
    });
  };

  const swipeFilterGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.translationX < -50) {
        // Swipe left (next filter)
        const nextIdx = (filterIndex + 1) % filterNames.length;
        runOnJS(triggerFilterChange)(nextIdx);
      } else if (event.translationX > 50) {
        // Swipe right (prev filter)
        const prevIdx = (filterIndex - 1 + filterNames.length) % filterNames.length;
        runOnJS(triggerFilterChange)(prevIdx);
      }
    });

  const animatedToastStyle = useAnimatedStyle(() => {
    return {
      opacity: toastOpacity.value,
    };
  });

  if (!permission) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-zinc-500 text-sm">Запрашиваю доступ к камере...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black justify-center items-center p-6">
        <Text className="text-white text-base text-center mb-6">Нужен доступ к камере</Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-[#ff0050] px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Разрешить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <GestureDetector gesture={swipeFilterGesture}>
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            ref={cameraRef}
            mode="video"
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={flash}
          />
          
          {/* Transparent color overlay filter layer */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: filterColors[filterIndex], pointerEvents: 'none' }
            ]}
          />
        </View>
      </GestureDetector>

      {/* Recording progress bar */}
      {isRecording && (
        <View className="absolute top-12 left-4 right-4 h-1.5 bg-white/20 rounded-full z-25 overflow-hidden">
          <View className="h-full bg-red-500" style={{ width: `${recordingProgress}%` }} />
        </View>
      )}

      {/* Floating Filter Toast Notification */}
      {showFilterToast && (
        <Animated.View
          style={[{ position: 'absolute', top: '25%', left: 0, right: 0, alignItems: 'center', zIndex: 30 }, animatedToastStyle]}
          pointerEvents="none"
        >
          <View className="bg-black/60 px-5 py-2.5 rounded-full border border-white/10">
            <Text className="text-white font-extrabold text-sm tracking-widest uppercase">
              Filter: {filterNames[filterIndex]}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Header HUD overlay */}
      {!isRecording && (
        <View className="absolute top-14 left-4 right-4 flex-row justify-between items-center z-20">
          <TouchableOpacity
            onPress={() => goBack(router, '/')}
            className="bg-black/50 p-2.5 rounded-full"
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowSoundModal(true)}
            className="bg-black/50 px-4 py-2.5 rounded-full flex-row items-center gap-x-2 border border-zinc-800 max-w-[50%]"
          >
            <Music size={14} color="#ffffff" />
            <Text className="text-white font-bold text-xs" numberOfLines={1}>
              {selectedSound ? selectedSound.split(' - ')[0] : 'Add Sound'}
            </Text>
          </TouchableOpacity>

          <View className="w-10" />
        </View>
      )}

      {/* Right HUD Controls */}
      {!isRecording && (
        <View className="absolute right-4 top-36 gap-y-6 z-20">
          <TouchableOpacity
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            className="bg-black/50 p-3 rounded-full items-center justify-center border border-zinc-800"
          >
            <FlipHorizontal size={18} color="#ffffff" />
            <Text className="text-white text-[9px] font-bold mt-1">Повернуть</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFlash((f) => !f)}
            className="bg-black/50 p-3 rounded-full items-center justify-center border border-zinc-800"
          >
            <Flashlight size={18} color={flash ? '#ff0050' : '#ffffff'} />
            <Text className="text-white text-[9px] font-bold mt-1">Вспышка</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={cycleTimer}
            className="bg-black/50 p-3 rounded-full items-center justify-center border border-zinc-800"
          >
            <Timer size={18} color={timerDuration > 0 ? '#eab308' : '#ffffff'} />
            <Text className="text-white text-[9px] font-bold mt-1">
              {timerDuration > 0 ? `${timerDuration}s` : 'Timer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom HUD Controls */}
      <View className="absolute bottom-12 left-0 right-0 flex-row justify-around items-center px-8 z-20">
        {/* Upload from Gallery */}
        {!isRecording && (
          <TouchableOpacity
            onPress={handlePickFromGallery}
            className="items-center bg-black/45 p-3.5 rounded-full border border-zinc-855"
          >
            <ImageIcon size={22} color="#ffffff" />
            <Text className="text-white text-[9px] font-bold mt-1">Загрузить</Text>
          </TouchableOpacity>
        )}

        {/* Record Trigger Button */}
        <TouchableOpacity
          onPress={handleRecordingPress}
          className="bg-white/20 p-2 rounded-full items-center justify-center"
        >
          <View
            className={`rounded-full items-center justify-center ${
              isRecording ? 'bg-red-500 w-16 h-16' : 'bg-red-650 w-20 h-20'
            }`}
          >
            {isRecording && <View className="w-6 h-6 bg-white rounded-md" />}
          </View>
        </TouchableOpacity>

        {!isRecording && <View className="w-16 h-16" />}
      </View>

      {/* Countdown overlay screen */}
      {isCountingDown && (
        <View className="absolute inset-0 bg-black/75 z-45 items-center justify-center">
          <View className="items-center bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl">
            <AlertCircle size={44} color="#eab308" />
            <Text className="text-white font-extrabold text-7xl my-6">{countdownValue}</Text>
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Запись вот-вот начнётся...</Text>
          </View>
        </View>
      )}

      {/* Sounds Selector Drawer */}
      <Modal
        visible={showSounds}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setPreviewUrl(null);
          setPlayingSoundId(null);
          setShowSounds(false);
        }}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity
            className="flex-1"
            onPress={() => {
              setPreviewUrl(null);
              setPlayingSoundId(null);
              setShowSounds(false);
            }}
          />
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-white font-extrabold text-base">Выбрать звук</Text>
              <TouchableOpacity
                onPress={() => {
                  setPreviewUrl(null);
                  setPlayingSoundId(null);
                  setShowSounds(false);
                }}
              >
                <X size={20} color="#888888" />
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-60 mb-4">
              {soundsList.map((sound) => (
                <View
                  key={sound.id}
                  className={`p-3 rounded-xl border mb-3 flex-row items-center justify-between bg-zinc-900 ${
                    selectedSound === sound.title ? 'border-[#ff0050]' : 'border-zinc-800'
                  }`}
                >
                  <View className="flex-1 mr-2">
                    <Text className="text-white text-sm font-semibold">{sound.title}</Text>
                  </View>

                  <View className="flex-row items-center gap-x-3">
                    <TouchableOpacity
                      onPress={() => handlePreviewToggle(sound.id, sound.url)}
                      className="bg-zinc-800 p-2 rounded-full border border-zinc-750"
                    >
                      {playingSoundId === sound.id ? (
                        <Pause size={14} color="#ff0050" fill="#ff0050" />
                      ) : (
                        <Play size={14} color="#ffffff" fill="#ffffff" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => selectSoundAndClose(sound.title)}
                      className="bg-zinc-800 p-2 rounded-full border border-zinc-750"
                    >
                      {selectedSound === sound.title ? (
                        <Check size={14} color="#22c55e" strokeWidth={3} />
                      ) : (
                        <Plus size={14} color="#ffffff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sound Selection Modal */}
      <Modal visible={showSoundModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-zinc-900 rounded-t-3xl p-6 h-[50%] border-t border-zinc-800">
            <Text className="text-white font-bold text-lg mb-4 text-center">Звуки</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {trendingSounds.map((sound, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedSound(sound);
                    setShowSoundModal(false);
                  }}
                  className="flex-row items-center justify-between py-4 border-b border-zinc-800/50"
                >
                  <View className="flex-row items-center">
                    <Music size={18} color="#888888" className="mr-3" />
                    <Text className="text-white font-semibold text-sm">{sound}</Text>
                  </View>
                  {selectedSound === sound && <Check size={18} color="#ff0050" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              onPress={() => setShowSoundModal(false)} 
              className="mt-6 py-3.5 bg-zinc-800 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
