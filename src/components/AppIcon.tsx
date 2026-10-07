/* Значки интерфейса.
   На айфоне берём родной набор Apple (SF Symbols) — он плотный и выглядит
   как в нативных приложениях. В браузере его нет, поэтому откатываемся
   на lucide. Чужую фирменную графику не используем. */

import React from 'react';
import { Platform, type ColorValue } from 'react-native';
import { SymbolView } from 'expo-symbols';
import {
  Home, Users, MessageSquare, User, Heart, MessageCircle,
  Bookmark, Share2, Search, Plus, type LucideIcon,
} from 'lucide-react-native';

export type IconName =
  | 'home' | 'friends' | 'inbox' | 'profile'
  | 'heart' | 'comment' | 'bookmark' | 'share'
  | 'search' | 'plus';

/* имя в наборе Apple -> запасной значок lucide */
const MAP: Record<IconName, { sf: string; fallback: LucideIcon }> = {
  home:     { sf: 'house.fill',                    fallback: Home },
  friends:  { sf: 'person.2.fill',                 fallback: Users },
  inbox:    { sf: 'ellipsis.message.fill',         fallback: MessageSquare },
  profile:  { sf: 'person.fill',                   fallback: User },
  heart:    { sf: 'heart.fill',                    fallback: Heart },
  comment:  { sf: 'bubble.right.fill',             fallback: MessageCircle },
  bookmark: { sf: 'bookmark.fill',                 fallback: Bookmark },
  share:    { sf: 'arrowshape.turn.up.right.fill', fallback: Share2 },
  search:   { sf: 'magnifyingglass',               fallback: Search },
  plus:     { sf: 'plus',                          fallback: Plus },
};

export default function AppIcon({
  name, size = 24, color = '#ffffff',
}: { name: IconName; size?: number; color?: ColorValue }) {
  const { sf, fallback: Fallback } = MAP[name];

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={sf as any}
        size={size}
        tintColor={color as string}
        resizeMode="scaleAspectFit"
        fallback={<Fallback size={size} color={color as string} />}
      />
    );
  }
  return <Fallback size={size} color={color as string} />;
}
