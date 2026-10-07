import React, { useState } from 'react';
import { AV1, AV2 } from '../../constants/mockAssets';
import { View, ScrollView, Image } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text } from '../../components/FixedText';
import { MessageSquare, Heart, UserPlus, Bell, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function InboxScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'messages'>('notifications');

  const notifications = [
    {
      id: 'n1',
      type: 'like',
      user: 'alex_cyber',
      avatar: AV1,
      message: 'liked your neon lights video.',
      time: '2m ago',
    },
    {
      id: 'n2',
      type: 'follow',
      user: 'jessica_d',
      avatar: AV2,
      message: 'started following you.',
      time: '1h ago',
    },
    {
      id: 'n3',
      type: 'comment',
      user: 'lisa_m',
      avatar: AV1,
      message: 'commented: "Vibe check passed 🎧🔥"',
      time: '4h ago',
    },
    {
      id: 'n4',
      type: 'mention',
      user: 'skater_pro',
      avatar: AV2,
      message: 'mentioned you in a challenge caption.',
      time: '1d ago',
    },
  ];

  const messages = [
    {
      id: 'm1',
      user: 'alex_cyber',
      avatar: AV1,
      lastMessage: 'Let’s film a collab this weekend!',
      time: '10:45 AM',
      unread: true,
    },
    {
      id: 'm2',
      user: 'dance_dancer',
      avatar: AV2,
      lastMessage: 'Loved the music you used.',
      time: 'Yesterday',
      unread: false,
    },
    {
      id: 'm3',
      user: 'sparkle_girl',
      avatar: AV1,
      lastMessage: 'Awesome sparkler capture!',
      time: 'Jun 8',
      unread: false,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return (
          <View className="bg-red-500/10 p-1.5 rounded-full border border-red-500/20">
            <Heart size={14} color="#ff0050" fill="#ff0050" />
          </View>
        );
      case 'follow':
        return (
          <View className="bg-blue-500/10 p-1.5 rounded-full border border-blue-500/20">
            <UserPlus size={14} color="#3b82f6" />
          </View>
        );
      case 'comment':
        return (
          <View className="bg-green-500/10 p-1.5 rounded-full border border-green-500/20">
            <MessageSquare size={14} color="#22c55e" />
          </View>
        );
      default:
        return (
          <View className="bg-purple-500/10 p-1.5 rounded-full border border-purple-500/20">
            <Bell size={14} color="#a855f7" />
          </View>
        );
    }
  };

  return (
    <View className="flex-1 bg-black pt-14 px-4">
      {/* Header Tabs */}
      <View className="flex-row justify-center bg-zinc-900/60 p-1 rounded-2xl mb-6 border border-zinc-850">
        <TouchableOpacity
          onPress={() => setActiveTab('notifications')}
          className={`flex-1 py-2 rounded-xl items-center ${activeTab === 'notifications' ? 'bg-zinc-800' : ''}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'notifications' ? 'text-white' : 'text-zinc-500'}`}>Вся активность</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('messages')}
          className={`flex-1 py-2 rounded-xl items-center ${activeTab === 'messages' ? 'bg-zinc-800' : ''}`}
        >
          <Text className={`font-bold text-sm ${activeTab === 'messages' ? 'text-white' : 'text-zinc-500'}`}>Сообщения</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {activeTab === 'notifications' ? (
          <View className="gap-y-4">
            {notifications.map((notif) => (
              <View
                key={notif.id}
                className="flex-row items-center justify-between bg-zinc-900/40 p-3 rounded-2xl border border-zinc-900"
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <Image source={{ uri: notif.avatar }} className="w-11 h-11 rounded-full mr-3 border border-zinc-800" />
                  <View className="flex-1">
                    <Text className="text-white text-xs font-bold">
                      {notif.user}{' '}
                      <Text className="text-zinc-400 font-normal">{notif.message}</Text>
                    </Text>
                    <Text className="text-zinc-650 text-[10px] mt-1">{notif.time}</Text>
                  </View>
                </View>
                {getIcon(notif.type)}
              </View>
            ))}
          </View>
        ) : (
          <View className="gap-y-4">
            {messages.map((msg) => (
              <TouchableOpacity
                key={msg.id}
                onPress={() => router.push(`/chat/${msg.id}`)}
                className="flex-row items-center bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-900"
              >
                <Image source={{ uri: msg.avatar }} className="w-12 h-12 rounded-full mr-3.5 border border-zinc-800" />
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-bold text-sm">{msg.user}</Text>
                    <Text className="text-zinc-600 text-[10px]">{msg.time}</Text>
                  </View>
                  <Text
                    className={`text-xs mt-1.5 ${msg.unread ? 'text-zinc-200 font-semibold' : 'text-zinc-500'}`}
                    numberOfLines={1}
                  >
                    {msg.lastMessage}
                  </Text>
                </View>
                {msg.unread ? (
                  <View className="bg-[#ff0050] w-2.5 h-2.5 rounded-full ml-2" />
                ) : (
                  <ChevronRight size={16} color="#444444" className="ml-1" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
