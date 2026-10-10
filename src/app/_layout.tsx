import '../global.css';
import React, { useEffect } from 'react';
import { Dimensions, Platform, AppState } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeviceId, findDevice, detectDevice } from '../lib/device';
import { Stack, ThemeProvider, DarkTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthModal from '../components/AuthModal';
import { useVideoStore } from '../store/useVideoStore';

/* тёмная тема с чистым чёрным: иначе под экранами светлая подложка,
   и при переходах по краям видны серые/белые скругления */
const BLACK_THEME = { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#000000', card: '#000000' } };

/* Отступы сверху и снизу (часы/«остров» и полоска «домой») — по выбранному
   айфону. На телефоне в режиме «Автоматически» — настоящие, от самого
   телефона. В браузере отступов нет вовсе, поэтому там всегда берутся
   отступы айфона: выбранного или того, что подходит по размеру окна. */
function DeviceInsets({ children }: { children: React.ReactNode }) {
  const real = useSafeAreaInsets();
  const id = useDeviceId();
  let insets = real;
  const pick = id === 'auto'
    ? (Platform.OS === 'web' ? detectDevice(Dimensions.get('window').width, Dimensions.get('window').height) : undefined)
    : findDevice(id);
  if (pick) insets = { top: pick.top, bottom: pick.bottom, left: 0, right: 0 };
  return <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>;
}

export default function RootLayout() {
  const hydrateAll = useVideoStore((s) => s.hydrateAll);

  // при запуске: какой аккаунт открыт, и его профиль, видео, лента
  useEffect(() => {
    hydrateAll();
  }, [hydrateAll]);

  /* вернулись в приложение из фона — тоже новые числа (если включено «Автоматическое изменение») */
  useEffect(() => {
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && last !== 'active') useVideoStore.getState().rerollCounts();
      last = st;
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <DeviceInsets>
      <ThemeProvider value={BLACK_THEME}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="camera" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" />
          {/* системный свайп «назад» от левого края мешал тянуть полосу
             перемотки — на экране видео свой свайп вправо */}
          <Stack.Screen name="video/[id]" options={{ gestureEnabled: false }} />
          {/* статистика въезжает справа и очень быстро */}
          <Stack.Screen
            name="stats/[id]"
            options={{ animation: 'slide_from_right', animationDuration: 170 }}
          />
        </Stack>
        <AuthModal />
      </ThemeProvider>
      </DeviceInsets>
    </GestureHandlerRootView>
  );
}
