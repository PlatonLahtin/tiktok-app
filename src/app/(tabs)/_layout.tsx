import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { PlatformPressable } from 'expo-router/react-navigation';
import { IconHome, IconFriends, IconInbox, IconProfile, IconCreate } from '../../components/TabIcons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#ffffff',   // подписи всех разделов белые, как в приложении
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,        // серой черты над панелью в приложении нет
          // Высота и отступы сняты с эталона: снизу остаётся место
          // под системную полоску, поэтому значки не жмутся к краю.
          height: 83.3,
          paddingTop: -1,
          paddingBottom: 39.3,
        },
        tabBarAllowFontScaling: false,
        /* кнопки вкладок при нажатии не тускнеют — как в TikTok */
        tabBarButton: (props) => <PlatformPressable {...(props as any)} pressOpacity={1} />,   // подписи не зависят от «Размера текста» айфона
        tabBarLabelStyle: {
          fontSize: 10,        // размер снят с эталона
          fontWeight: '500',   // по эталону подписи средней толщины, не жирные
          /* в браузере подпись сжималась до полоски — не даём ей сжиматься, как на телефоне */
          ...(Platform.OS === 'web' ? { flexShrink: 0, overflow: 'visible' as const } : {}),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color, focused }) => <IconHome size={27} color={color as string} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Друзья',
          tabBarIcon: ({ color, focused }) => <IconFriends size={27} color={color as string} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => <IconCreate />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Входящие',
          tabBarIcon: ({ color, focused }) => <IconInbox size={27} color={color as string} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color, focused }) => <IconProfile size={27} color={color as string} active={focused} />,
        }}
      />
    </Tabs>
  );
}
