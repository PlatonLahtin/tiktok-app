import '../global.css';
import { useEffect } from 'react';
import { Stack, ThemeProvider, DarkTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthModal from '../components/AuthModal';
import { useVideoStore } from '../store/useVideoStore';

/* тёмная тема с чистым чёрным: иначе под экранами светлая подложка,
   и при переходах по краям видны серые/белые скругления */
const BLACK_THEME = { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#000000', card: '#000000' } };

export default function RootLayout() {
  const hydrateAll = useVideoStore((s) => s.hydrateAll);

  // при запуске: какой аккаунт открыт, и его профиль, видео, лента
  useEffect(() => {
    hydrateAll();
  }, [hydrateAll]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <ThemeProvider value={BLACK_THEME}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="camera" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" />
          {/* статистика въезжает справа и очень быстро */}
          <Stack.Screen
            name="stats/[id]"
            options={{ animation: 'slide_from_right', animationDuration: 170 }}
          />
        </Stack>
        <AuthModal />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
