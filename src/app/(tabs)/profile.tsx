import React, { useCallback, useState } from 'react';
import { View, Image, ScrollView, Dimensions, Modal, StyleSheet } from 'react-native';
import { TouchableOpacity } from '../../components/Touchable';
import { Text, TextInput } from '../../components/FixedText';
import Animated from 'react-native-reanimated';
import { Grid, Lock, Heart, Edit2, Play, Check, User,
         ChevronDown, Plus, ShoppingBag, Bookmark } from 'lucide-react-native';
import { useVideoStore, MY_VIDEO_SRC, shownCount } from '../../store/useVideoStore';
import { Image as ExpoImage } from 'expo-image';
import VideoFrame, { useVideoThumb } from '../../components/VideoFrame';
import AccountSheet from '../../components/AccountSheet';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { roundedTriangle } from '../../lib/shapes';
import { IconPencil, IconAddFriend, IconMenu, AvatarCount } from '../../components/HeaderIcons';
import { NoteBubble, NotePicker, NOTE_DEFAULT } from '../../components/ProfileNote';
import { randomAvatar } from '../../lib/avatars';


/* Обложка плитки: первый кадр ролика, плеер на паузе.
   Кадр шире плитки по пропорции, поэтому растягиваем его по высоте
   и обрезаем по бокам — «обрезка по кругу» у плеера не срабатывает. */
const MY_VIDEO_RATIO = 0.926;   // ширина к высоте у ролика

function MyVideoThumb({ uri, width, height }: { uri: string | null; width: number; height: number }) {
  /* свой ролик из галереи — просто кадр по рамке */
  if (uri) return <VideoFrame uri={uri} width={width} height={height} />;
  return <DefaultThumb width={width} height={height} />;
}

/* ролик-заглушка — как было, по эталону; кадр картинкой, а не плеером */
function DefaultThumb({ width, height }: { width: number; height: number }) {
  const thumb = useVideoThumb(MY_VIDEO_SRC);
  const w = height * MY_VIDEO_RATIO;
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      {thumb && (
        <ExpoImage
          source={thumb}
          style={{ width: w, height, marginLeft: (width - w) / 2 }}
          contentFit="cover"
        />
      )}
    </View>
  );
}


const AVA = 96;   // диаметр аватарки в профиле, снят с эталона

/* Треугольник у имени и красная точка при нём (точки экрана, с эталона) */
const TRI = { w: 10.7, h: 6.7, gap: 6.5, dot: 8, dotLeft: 9.3, dotTop: -9.7 };

/* Облако над аватаркой (точки экрана, с эталона) */
/* где стоит правый верхний угол облачка с фразой (относительно аватарки) */
const BUB = { right: 3.3, top: -13.7 };

/* Просмотры на плитке видео — размеры сняты с эталона */
const PLAY = { left: 6.7, bottom: 3.5, w: 11.8, h: 13.6, line: 1.3, gap: 6.8, font: 12.9, round: 1.8 };

/* Лёгкое осветление у нижнего края плитки: белое, плавно от нуля
   до 14,5% — с эталона. Под ним и лежат просмотры. */
const GLOW = { h: 40, alpha: 0.145 };


/* Ряд вкладок профиля. Высоты и пропорции сняты с эталона —
   у каждого значка своя форма, одной коробкой их не задать. */
const TAB = {
  side: 16.5, top: 6.6, box: 19.7, off: '#999999', rule: '#303030',
  lineW: 48, lineH: 2, lineGap: 8.35,
  showLine: false,   // по эталону белой черты под выбранной вкладкой нет
  items: [
    { key: 'public',  src: require('../../../assets/icons/tab-videos.png'),  h: 18.0, ratio: 1.579 },
    { key: 'private', src: require('../../../assets/icons/tab-private.png'), h: 19.7, ratio: 0.850 },
    /* «Репосты»: две стрелки по кругу, рисуем сами (картинки нет) */
    { key: 'reposts', src: null,                                              h: 17.7, ratio: 1.2 },
    { key: 'saved',   src: require('../../../assets/icons/tab-saved.png'),   h: 18.3, ratio: 0.810 },
    { key: 'liked',   src: require('../../../assets/icons/tab-liked.png'),   h: 18.3, ratio: 1.109 },
  ],
};

/* значок «Репосты» по эталону: слева стрелка вверх, справа — вниз,
   соединены скруглёнными уголками */
function RepostIcon({ h, ratio, color }: { h: number; ratio: number; color: string }) {
  return (
    <Svg width={h * ratio} height={h} viewBox="0 0 24 20">
      <Path
        d="M2.6 5.6 L6.4 1.8 L10.2 5.6 M6.4 1.8 V14.6 Q6.4 18 9.8 18 H13.2
           M10.8 2 H14.2 Q17.6 2 17.6 5.4 V18.2 M13.8 14.4 L17.6 18.2 L21.4 14.4"
        fill="none" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 2) / 3;   // два зазора по пикселю, полей по краям нет

export default function ProfileScreen() {
  const { videos, currentUser, updateProfile, isLoggedIn, setShowAuthModal, myVideos } = useVideoStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();   // отступ сверху под «остров» айфона
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'reposts' | 'saved' | 'liked'>('public');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  /* «Недавно смотрели профиль»: лицо берём наугад и меняем
     каждый раз, когда возвращаемся на эту вкладку. */
  const [peekAvatar, setPeekAvatar] = useState(randomAvatar);
  useFocusEffect(useCallback(() => { setPeekAvatar(randomAvatar()); }, []));
  
  // Local state for modal inputs
  const [bio, setBio] = useState(currentUser.bio);
  const [name, setName] = useState(currentUser.name);

  /* Счётчики берём из профиля — их задают в разделе «+» */
  const userStats = {
    following: currentUser.following,
    followers: currentUser.followers,
    likes: currentUser.likes,
    avatar: currentUser.avatar,
  };

  // Group videos for tabs
  const publicVideos = videos; // For mockup, show all videos in public tab
  const privateVideos = videos.slice(2); // Show subset in private
  const likedVideos = videos.filter((vid) => vid.isLiked); // Filter by liked videos

  const getActiveTabVideos = () => {
    switch (activeTab) {
      case 'public': return publicVideos;
      case 'reposts': return [];
      case 'private': return privateVideos;
      case 'saved': return [];
      case 'liked': return likedVideos;
    }
  };

  if (!isLoggedIn) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-8 pt-10">
        <User size={64} color="#333333" className="mb-6" />
        <Text className="text-white text-xl font-extrabold mb-2 text-center">Создайте аккаунт</Text>
        <Text className="text-zinc-400 text-sm text-center mb-8">
          Заведите профиль, подписывайтесь на других и снимайте своё.
        </Text>
        <TouchableOpacity 
          onPress={() => setShowAuthModal(true)}
          className="bg-[#ff0050] w-full py-4 rounded-xl items-center"
        >
          <Text className="text-white font-bold text-[15px]">Регистрация</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 6 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Верхняя панель: карандаш слева, три значка справа.
            Отступы между значками сняты с эталона и потому разные. */}
        <View className="flex-row items-center justify-between mb-3"
              style={{ paddingLeft: 17.3, paddingRight: 18.7 }}>
          <TouchableOpacity onPress={() => router.push('/edit-profile')}>
            <IconPencil />
          </TouchableOpacity>
          <View className="flex-row items-center">
            <AvatarCount avatar={peekAvatar} count={currentUser.peekCount} />
            <TouchableOpacity style={{ marginLeft: 13.1 }}><IconAddFriend /></TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: 22.9 }}><IconMenu /></TouchableOpacity>
          </View>
        </View>

        {/* Шапка: слева данные, справа аватарка */}
        <View className="flex-row mb-4" style={{ paddingLeft: 17, paddingRight: 16.3, marginTop: 14.3 }}>
          <View className="flex-1 pr-3">
            {/* имя с треугольником — открывает шторку аккаунтов */}
            <TouchableOpacity className="flex-row items-center self-start" onPress={() => setShowAccounts(true)}>
              <Text className="text-white text-[30px] font-extrabold" numberOfLines={1}>
                {currentUser.name}
              </Text>
              {/* Залитый треугольник вниз, у его правого верхнего угла — красная точка.
                  Все размеры сняты с эталона. Треугольник рисуем рамками:
                  прозрачные бока + белый верх дают ровный клин. */}
              <View style={{ width: TRI.dotLeft + TRI.dot, height: TRI.h, marginLeft: TRI.gap, marginTop: 1 }}>
                <View style={{
                  width: 0, height: 0,
                  borderLeftWidth: TRI.w / 2, borderRightWidth: TRI.w / 2, borderTopWidth: TRI.h,
                  borderLeftColor: 'transparent', borderRightColor: 'transparent',
                  borderTopColor: '#ffffff',
                }} />
                <View style={{
                  position: 'absolute', left: TRI.dotLeft, top: TRI.dotTop,
                  width: TRI.dot, height: TRI.dot, borderRadius: TRI.dot / 2,
                  backgroundColor: '#fe2c55',
                }} />
              </View>
            </TouchableOpacity>

            <Text className="text-zinc-400 text-[13px]" style={{ marginTop: 2.7 }} numberOfLines={1}>
              @{currentUser.username}
            </Text>

            <View className="flex-row gap-x-5" style={{ marginTop: 19.3 }}>
              <View>
                <Text className="text-white font-bold text-[17px]">{userStats.following}</Text>
                <Text className="text-zinc-400 text-[12px]" style={{ marginTop: -2.6 }}>Подписки</Text>
              </View>
              <View>
                <Text className="text-white font-bold text-[17px]">{userStats.followers}</Text>
                <Text className="text-zinc-400 text-[12px]" style={{ marginTop: -2.6 }}>Подписчиков</Text>
              </View>
              <View>
                <Text className="text-white font-bold text-[17px]">{userStats.likes}</Text>
                <Text className="text-zinc-400 text-[12px]" style={{ marginTop: -2.6 }}>Лайки</Text>
              </View>
            </View>

            {/* пустое описание (новый аккаунт) — строки нет совсем, без дыры */}
            {currentUser.bio.trim() !== '' && (
              <Text className="text-white text-[13px] leading-5" style={{ marginTop: 16.7 }}>{currentUser.bio}</Text>
            )}
          </View>

          <View style={{ width: AVA, height: AVA, marginTop: 6 }}>
            <Image source={{ uri: currentUser.avatar }} style={{ width: AVA, height: AVA, borderRadius: AVA / 2 }} />

            {/* Облачко с фразой: вылезает над аватаркой, поэтому отступ сверху
                отрицательный. Нажатие — выбрать другую фразу или написать свою. */}
            <NoteBubble
              text={currentUser.note?.trim() || NOTE_DEFAULT}
              right={BUB.right} top={BUB.top}
              onPress={() => setShowNotes(true)}
            />
            {/* голубой кружок: сам он 24 точки, вокруг чёрное кольцо 3.7 —
                кольцо вылезает за край аватарки, поэтому отступы отрицательные */}
            <View style={{
              position: 'absolute', right: -3.7, bottom: -5.0,
              width: 31.4, height: 31.4, borderRadius: 15.7,
              borderWidth: 3.7, borderColor: '#000000',
              backgroundColor: '#20d5ec',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={18} color="#ffffff" strokeWidth={3.6} />
            </View>
          </View>
        </View>

        {/* Ряд вкладок: свои картинки, разделителя над ними нет.
            Полоска активного раздела короче ячейки — как в приложении. */}
        <View
          className="flex-row"
          style={{
            paddingHorizontal: TAB.side, paddingTop: TAB.top,
            borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: TAB.rule,
          }}
        >
          {TAB.items.map(({ key, src, h, ratio }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key as typeof activeTab)}
              className="flex-1 items-center"
            >
              <View style={{ height: TAB.box, justifyContent: 'center' }}>
                {src ? (
                  <Image
                    source={src}
                    style={{ height: h, width: h * ratio,
                             tintColor: activeTab === key ? '#ffffff' : TAB.off }}
                    resizeMode="contain"
                  />
                ) : (
                  <RepostIcon h={h} ratio={ratio} color={activeTab === key ? '#ffffff' : TAB.off} />
                )}
              </View>
              <View style={{
                width: TAB.lineW, height: TAB.lineH, marginTop: TAB.lineGap,
                backgroundColor: TAB.showLine && activeTab === key ? '#ffffff' : 'transparent',
              }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Сетка видео профиля. Показываем сам ролик, а не заглушку. */}
        <View className="flex-row flex-wrap gap-[1px] bg-black">
          {myVideos.length === 0 ? (
            <View className="w-full py-20 items-center justify-center">
              <Play size={36} color="#444444" />
              <Text className="text-zinc-500 text-xs mt-3">Видео нет</Text>
            </View>
          ) : (
            myVideos.map((video) => (
              <TouchableOpacity
                key={video.id}
                onPress={() => router.push(`/video/${video.id}` as any)}
                style={{ width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH * 1.4 }}
                className="relative bg-zinc-900"
              >
                <MyVideoThumb uri={video.uri} width={GRID_ITEM_WIDTH} height={GRID_ITEM_WIDTH * 1.4} />
                <Svg
                  width={GRID_ITEM_WIDTH} height={GLOW.h}
                  style={{ position: 'absolute', left: 0, bottom: 0 }}
                >
                  <Defs>
                    <LinearGradient id="tileGlow" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                      <Stop offset="1" stopColor="#ffffff" stopOpacity={GLOW.alpha} />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width={GRID_ITEM_WIDTH} height={GLOW.h} fill="url(#tileGlow)" />
                </Svg>
                {/* Просмотры: треугольник пустой внутри, не залитый. */}
                <View style={{
                  position: 'absolute', left: PLAY.left, bottom: PLAY.bottom,
                  flexDirection: 'row', alignItems: 'center',
                }}>
                  <Svg width={PLAY.w} height={PLAY.h}>
                    <Path
                      d={roundedTriangle([
                        [PLAY.line / 2, PLAY.line / 2],
                        [PLAY.w - PLAY.line / 2, PLAY.h / 2],
                        [PLAY.line / 2, PLAY.h - PLAY.line / 2],
                      ], PLAY.round)}
                      fill="none" stroke="#ffffff"
                      strokeWidth={PLAY.line} strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={{
                    color: '#ffffff', fontSize: PLAY.font,
                    fontWeight: '600', marginLeft: PLAY.gap,   // по эталону: полужирный, не жирный
                  }}>
                    {shownCount(video, 'tileViews')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* выбор фразы для облачка над аватаркой */}
      <NotePicker
        visible={showNotes}
        current={currentUser.note?.trim() || NOTE_DEFAULT}
        onPick={(t) => { updateProfile({ note: t }); setShowNotes(false); }}
        onClose={() => setShowNotes(false)}
      />

      <AccountSheet visible={showAccounts} onClose={() => setShowAccounts(false)} />

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white font-extrabold text-base">Изменить профиль</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                className="bg-zinc-800 p-1.5 rounded-full"
              >
                <Check size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View className="gap-y-4 mb-6">
              <View>
                <Text className="text-zinc-500 text-xs font-bold mb-2">ИМЯ</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm border border-zinc-750"
                  placeholder="Enter name"
                  placeholderTextColor="#666666"
                />
              </View>
              <View>
                <Text className="text-zinc-500 text-xs font-bold mb-2">ОПИСАНИЕ</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  className="bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm border border-zinc-750 h-20"
                  placeholder="Enter bio"
                  placeholderTextColor="#666666"
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                updateProfile({ name, bio });
                setShowEditModal(false);
              }}
              className="bg-[#ff0050] py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-extrabold text-sm">Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
