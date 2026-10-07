/* Шторка «Отправить» — выезжает по нажатию на три точки.
   Числа сняты с эталонного скриншота и переведены в точки экрана,
   поэтому собраны в одном месте. Логики отправки нет: это макет. */

import React from 'react';
import { View, Image, ScrollView, Modal, Pressable } from 'react-native';
import { TouchableOpacity } from './Touchable';
import { Text } from './FixedText';
import { Search, X } from 'lucide-react-native';

const S = {
  height: 376,           // высота шторки: под вторым рядом подписей ~45 точек, как на эталоне
  radius: 15,
  bg: '#2c2c2c',
  rule: '#505050',       // цвет разделителя

  headIcon: 20,
  headIconLeft: 17.0,
  headIconTop: 16.2,     // от верха шторки
  titleTop: 19.1,
  titleFont: 17.8,
  closeRight: 25.1,
  closeTop: 20.4,
  closeSize: 15,

  cell: 67.7,            // шаг между кружками
  circle: 49.4,
  padLeft: 7.45,         // чтобы первый кружок встал на 16.6
  labelW: 62.5,          // подпись уже ячейки — переносы совпадают с эталоном
  labelSpill: 12,        // строке с ручным переносом можно чуть вылезти за рамку
  labelFont: 11,
  inviteFont: 10,        // «Пригласите» целиком влезает только чуть мельче
  tightTrack: -0.3,      // длинные слова чуть плотнее, чтобы не слипались с соседями
  labelLine: 11.6,
  text: '#f6f6f6',

  contactsTop: 49.8,
  contactsLabelTop: 105.3,
  ruleTop: 146.4,
  row1Top: 157.9,
  row1LabelTop: 214.2,
  row2Top: 252.5,
  row2LabelTop: 308.0,

  dot: 14.1,             // зелёный кружок «в сети»
  dotColor: '#1ad765',
};

const ICONS = {
  link:       require('../../assets/icons/share/link.png'),
  whatsapp:   require('../../assets/icons/share/whatsapp.png'),
  wabusiness: require('../../assets/icons/share/wabusiness.png'),
  telegram:   require('../../assets/icons/share/telegram.png'),
  status:     require('../../assets/icons/share/status.png'),
  sms:        require('../../assets/icons/share/sms.png'),
  stats:      require('../../assets/icons/share/stats.png'),
  download:   require('../../assets/icons/share/download.png'),
  boost:      require('../../assets/icons/share/boost.png'),
  cast:       require('../../assets/icons/share/cast.png'),
  pin:        require('../../assets/icons/share/pin.png'),
  group:      require('../../assets/icons/share/group.png'),
  invite:     require('../../assets/icons/share/invite.png'),
};

const ROW1 = [
  { key: 'link',       icon: ICONS.link,       label: 'Скопироват\nь ссылку', tight: true },
  { key: 'whatsapp',   icon: ICONS.whatsapp,   label: 'WhatsApp' },
  { key: 'wabusiness', icon: ICONS.wabusiness, label: 'WA Business' },
  { key: 'telegram',   icon: ICONS.telegram,   label: 'Telegram' },
  { key: 'status',     icon: ICONS.status,     label: 'Status' },
  { key: 'sms',        icon: ICONS.sms,        label: 'SMS' },
];

const ROW2 = [
  { key: 'stats',    icon: ICONS.stats,    label: 'Статистика' },
  { key: 'download', icon: ICONS.download, label: 'Скачать' },
  { key: 'boost',    icon: ICONS.boost,    label: 'Увеличение\nпросмотров', tight: true },
  { key: 'cast',     icon: ICONS.cast,     label: 'Транслиров\nать', tight: true },
  { key: 'pin',      icon: ICONS.pin,      label: 'Закрепить' },
  { key: 'group',    icon: ICONS.group,    label: 'Создать группу' },
];

/* один кружок с подписью под ним */
function Item({
  icon, label, onPress, badge,
}: { icon: any; label: string; onPress?: () => void; badge?: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{ width: S.cell, alignItems: 'center' }}
    >
      <View style={{ width: S.circle, height: S.circle }}>
        <Image
          source={icon}
          style={{ width: S.circle, height: S.circle, borderRadius: S.circle / 2 }}
        />
        {badge && (
          <View style={{
            position: 'absolute', right: 0, bottom: 0,
            width: S.dot, height: S.dot, borderRadius: S.dot / 2,
            backgroundColor: S.dotColor, borderWidth: 2, borderColor: S.bg,
          }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

/* Подпись. Если в ней есть «\n» — строки заданы вручную: каждая
   идёт целиком, без переносов по буквам и без троеточия. Одно слово
   («Статистика») — тоже одной строкой: на iOS 26 шрифт чуть шире,
   и в узкой рамке последняя буква уезжала на новую строку. */
function Label({ text, font = S.labelFont, tight }: { text: string; font?: number; tight?: boolean }) {
  const style = {
    color: S.text, fontSize: font, lineHeight: S.labelLine, textAlign: 'center' as const,
    letterSpacing: tight ? S.tightTrack : undefined,
  };
  if (!text.includes('\n') && text.includes(' ')) {
    return (
      <View style={{ width: S.cell, alignItems: 'center' }}>
        <View style={{ width: S.labelW }}>
          <Text numberOfLines={3} style={style}>{text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: S.cell, alignItems: 'center' }}>
      <View style={{ width: S.labelW + S.labelSpill * 2, marginHorizontal: -S.labelSpill }}>
        {text.split('\n').map((line, i) => (
          <Text key={i} numberOfLines={1} style={style}>{line}</Text>
        ))}
      </View>
    </View>
  );
}

/* горизонтальный ряд: кружки и подписи стоят двумя слоями,
   чтобы подписи не раздвигали кружки по вертикали */
function Row({
  items, top, labelTop, onPressItem,
}: {
  items: { key: string; icon: any; label: string; badge?: boolean; font?: number; tight?: boolean }[];
  top: number; labelTop: number;
  onPressItem?: (key: string) => void;
}) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: S.padLeft, paddingRight: 8 }}
        style={{ position: 'absolute', left: 0, right: 0, top }}
      >
        {items.map((it) => (
          <Item
            key={it.key}
            icon={it.icon}
            label={it.label}
            badge={it.badge}
            onPress={() => onPressItem?.(it.key)}
          />
        ))}
      </ScrollView>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: S.padLeft, right: 0, top: labelTop,
          flexDirection: 'row',
        }}
      >
        {items.map((it) => <Label key={it.key} text={it.label} font={it.font} tight={it.tight} />)}
      </View>
    </>
  );
}

export default function ShareSheet({
  visible, onClose, avatar, username, onOpenStats,
}: {
  visible: boolean;
  onClose: () => void;
  avatar: string;
  username: string;
  onOpenStats?: () => void;
}) {
  const contacts = [
    { key: 'me',     icon: { uri: avatar }, label: username, badge: true },
    { key: 'invite', icon: ICONS.invite,    label: 'Пригласите\nдрузей\nпообщаться', font: S.inviteFont },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: S.height,
        backgroundColor: S.bg,
        borderTopLeftRadius: S.radius, borderTopRightRadius: S.radius,
      }}>
        {/* шапка */}
        <TouchableOpacity style={{ position: 'absolute', left: S.headIconLeft, top: S.headIconTop }}>
          <Search size={S.headIcon} color="#ffffff" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={{
          position: 'absolute', left: 0, right: 0, top: S.titleTop,
          textAlign: 'center', color: S.text, fontSize: S.titleFont, fontWeight: '700',
        }}>
          Отправить
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={{ position: 'absolute', right: S.closeRight, top: S.closeTop }}
        >
          <X size={S.closeSize} color="#ffffff" strokeWidth={2.6} />
        </TouchableOpacity>

        {/* контакты */}
        <Row items={contacts} top={S.contactsTop} labelTop={S.contactsLabelTop} />

        {/* разделитель */}
        <View style={{
          position: 'absolute', left: 0, right: 0, top: S.ruleTop,
          height: 0.4, backgroundColor: S.rule,
        }} />

        {/* два ряда действий */}
        <Row items={ROW1} top={S.row1Top} labelTop={S.row1LabelTop} />
        <Row
          items={ROW2}
          top={S.row2Top}
          labelTop={S.row2LabelTop}
          onPressItem={(key) => { if (key === 'stats') onOpenStats?.(); }}
        />
      </View>
    </Modal>
  );
}
