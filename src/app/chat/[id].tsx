import React, { useState, useEffect, useRef } from 'react';
import { AV1, AV2 } from '../../constants/mockAssets';
import { View, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text, TextInput } from '../../components/FixedText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send, Video, Info, Camera, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../../lib/goBack';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  time: string;
  type?: 'text' | 'video';
  videoThumbnail?: string;
  isLiked?: boolean;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hey, did you see that new dance challenge?', sender: 'other', time: '10:30 AM' },
    { id: '2', text: 'Yes! It looks so hard though 😅', sender: 'me', time: '10:32 AM' },
    { 
      id: '3', 
      text: 'Look at this one, they nailed it', 
      sender: 'other', 
      time: '10:35 AM',
      type: 'video',
      videoThumbnail: AV1
    },
    { id: '4', text: 'Let’s film a collab this weekend!', sender: 'other', time: '10:45 AM' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Simulate typing indicator
  useEffect(() => {
    if (messages.length > 4 && messages[messages.length - 1].sender === 'me') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: 'Haha, you bet! Let\'s do it.',
          sender: 'other',
          time: 'Just now'
        }]);
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 3000);
    }
  }, [messages]);

  const sendMessage = () => {
    if (inputMessage.trim() === '') return;
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'me',
      time: 'Just now'
    }]);
    setInputMessage('');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleLike = (id: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, isLiked: !msg.isLiked } : msg
    ));
  };

  const getAvatar = () => {
    if (id === 'm1') return AV2;
    if (id === 'm2') return AV1;
    return AV2;
  };

  const getName = () => {
    if (id === 'm1') return 'alex_cyber';
    if (id === 'm2') return 'dance_dancer';
    return 'sparkle_girl';
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#000000' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-zinc-900 border-b border-zinc-800">
        <View className="flex-row items-center justify-between px-4 pb-3 h-14">
          <TouchableOpacity onPress={() => goBack(router, '/inbox')} className="p-2 -ml-2">
            <ChevronLeft size={28} color="#ffffff" />
          </TouchableOpacity>
          
          <View className="items-center flex-1">
            <Text className="text-white font-extrabold text-base">{getName()}</Text>
            {isTyping ? (
              <Text className="text-zinc-500 text-xs mt-0.5">typing...</Text>
            ) : (
              <Text className="text-zinc-500 text-xs mt-0.5">В сети</Text>
            )}
          </View>

          <View className="flex-row items-center gap-x-4">
            <TouchableOpacity>
              <Video size={22} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Info size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="items-center mb-6">
          <Image source={{ uri: getAvatar() }} className="w-20 h-20 rounded-full mb-3 border-2 border-zinc-800" />
          <Text className="text-white font-bold text-lg">{getName()}</Text>
          <Text className="text-zinc-500 text-sm mt-1">3.2M Followers • 120 Following</Text>
        </View>

        {messages.map((msg) => (
          <View 
            key={msg.id} 
            className={`mb-4 flex-row ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'other' && (
              <Image source={{ uri: getAvatar() }} className="w-8 h-8 rounded-full mr-2 mt-1 self-end" />
            )}
            
            <View className={`relative max-w-[75%] rounded-2xl px-4 py-3 ${
              msg.sender === 'me' 
                ? 'bg-[#ff0050] rounded-tr-sm' 
                : 'bg-zinc-800 rounded-tl-sm'
            }`}>
              {msg.type === 'video' && msg.videoThumbnail && (
                <View className="mb-2 relative rounded-lg overflow-hidden">
                  <Image source={{ uri: msg.videoThumbnail }} className="w-full h-40 rounded-lg" resizeMode="cover" />
                  <View className="absolute inset-0 items-center justify-center bg-black/20">
                    <Video size={30} color="white" fill="white" />
                  </View>
                </View>
              )}
              <Text className="text-white text-[15px] leading-5">{msg.text}</Text>
              
              {/* Double tap simulation button (small heart below message) */}
              {msg.sender === 'other' && (
                <TouchableOpacity 
                  onPress={() => toggleLike(msg.id)}
                  className="absolute -bottom-2 -right-2 bg-zinc-900 rounded-full p-1 border border-zinc-800"
                >
                  <Heart size={12} color={msg.isLiked ? "#ff0050" : "#888"} fill={msg.isLiked ? "#ff0050" : "transparent"} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {isTyping && (
          <View className="flex-row items-center mb-4">
            <Image source={{ uri: getAvatar() }} className="w-8 h-8 rounded-full mr-2" />
            <View className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 w-16 items-center flex-row justify-center gap-x-1">
              <View className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <View className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <View className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={{ paddingBottom: insets.bottom || 16 }} className="px-4 py-3 border-t border-zinc-800 bg-black flex-row items-center gap-x-3">
        <TouchableOpacity className="bg-zinc-800 p-2.5 rounded-full">
          <Camera size={22} color="#ffffff" />
        </TouchableOpacity>
        
        <View className="flex-1 bg-zinc-800 rounded-full flex-row items-center px-4 py-1 h-11 border border-zinc-700">
          <TextInput
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Send a message..."
            placeholderTextColor="#888"
            className="flex-1 text-white text-[15px]"
            multiline
            maxLength={200}
            style={{ paddingTop: 0, paddingBottom: 0 }}
          />
        </View>

        {inputMessage.length > 0 ? (
          <TouchableOpacity onPress={sendMessage} className="bg-[#ff0050] p-2.5 rounded-full">
            <Send size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="p-2.5">
            <Heart size={24} color="#ff0050" fill="#ff0050" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
