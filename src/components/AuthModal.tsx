import React, { useState } from 'react';
import { View, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from './Touchable';
import { Text } from './FixedText';
import { X, User, Mail, Apple, Info } from 'lucide-react-native';
import { useVideoStore } from '../store/useVideoStore';

const { height } = Dimensions.get('window');

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login } = useVideoStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

  const handleAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      login(); // Sets isLoggedIn to true and showAuthModal to false
    }, 1000);
  };

  if (!showAuthModal) return null;

  return (
    <Modal visible={showAuthModal} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-zinc-900 rounded-t-3xl pt-5 pb-8 px-6" style={{ height: height * 0.75 }}>
          <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity onPress={() => setShowAuthModal(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Info size={24} color="#888888" />
            </TouchableOpacity>
          </View>

          <Text className="text-white text-2xl font-extrabold text-center mb-4">
            {isSignUp ? 'Sign up for TikTok' : 'Log in to TikTok'}
          </Text>

          <Text className="text-zinc-400 text-sm text-center mb-8 px-4 leading-5">
            Create a profile, follow other accounts, make your own videos, and more.
          </Text>

          <View className="gap-y-4">
            <TouchableOpacity
              onPress={handleAuth}
              className="flex-row items-center bg-zinc-800 p-4 rounded-xl border border-zinc-700 relative"
            >
              <View className="absolute left-4">
                <User size={20} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-center flex-1 text-[15px]">Телефон или почта</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAuth}
              className="flex-row items-center bg-zinc-800 p-4 rounded-xl border border-zinc-700 relative"
            >
              <View className="absolute left-4">
                {/* Mocking Google icon with Mail */}
                <Mail size={20} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-center flex-1 text-[15px]">Продолжить с Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAuth}
              className="flex-row items-center bg-zinc-800 p-4 rounded-xl border border-zinc-700 relative"
            >
              <View className="absolute left-4">
                <Apple size={20} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-center flex-1 text-[15px]">Продолжить с Apple</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View className="absolute inset-0 bg-black/60 justify-center items-center z-50 rounded-t-3xl">
              <ActivityIndicator size="large" color="#ff0050" />
            </View>
          )}

          <View className="mt-auto pt-6 border-t border-zinc-800 flex-row justify-center items-center">
            <Text className="text-zinc-400 mr-2">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text className="text-[#ff0050] font-bold">
                {isSignUp ? 'Log in' : 'Sign up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
