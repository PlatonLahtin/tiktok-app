/* Формы редактора статистики. Нажал на блок в «Настройке статы» —
   выезжает форма с его цифрами и текстами. «Готово» сохраняет,
   «Отмена» — всё как было.

   У каждого поля — пример в том виде, как это пишет TikTok
   (взяты с нашей версии, вылизанной по эталонным скриншотам). */

import React, { useState } from 'react';
import { View, ScrollView, Modal, Switch, Image, Alert } from 'react-native';
import { TouchableOpacity } from '../Touchable';
import { Text, TextInput } from '../FixedText';
import * as ImagePicker from 'expo-image-picker';
import { useVideoStore, keepImageFile } from '../../store/useVideoStore';
import VideoFrame from '../VideoFrame';
import { Lock, Plus, Trash2 } from 'lucide-react-native';
import {
  VideoStats, StatRow, retentionLead, retentionNote, likesNote,
  autoRetention, autoLikesPeak, shortCount,
} from '../../lib/videoStats';
import type { VideoDisplay } from '../../store/useVideoStore';
import { UI } from '../settings/ui';

export type Section =
  | 'header' | 'metrics' | 'retention' | 'traffic' | 'queries'
  | 'viewersTotal' | 'viewerTypes' | 'gender' | 'ages' | 'places' | 'words' | 'likes' | 'moreData';

const TITLES: Record<Section, string> = {
  header: 'Цифры видео', metrics: 'Основные метрики', retention: 'Коэффициент удержания',
  traffic: 'Источники трафика', queries: 'Поисковые запросы', viewersTotal: 'Всего зрителей',
  viewerTypes: 'Типы зрителей', gender: 'Пол', ages: 'Возраст', places: 'Места',
  words: 'Самые частые слова', likes: 'Лайки', moreData: 'Другие публикации',
};

/* Примеры — ровно так, как это написано в TikTok */
const EX = {
  published: 'Опубликовано 21 сент 2026, 02:06',
  counts: { views: '1,004', likes: '30', comments: '0', shares: '1', saves: '5' },
  /* экран видео и плитка: до 1000 целиком, дальше — «тыс.» (как в ленте по эталону) */
  screen: { likes: '51,5 тыс.', comments: '141', saves: '20,5 тыс.', views: '696,7 тыс.' },
  tileViews: '696,7 тыс.',
  date: '2 д. назад',
  description: 'Тттт',
  metricsNote: 'Обновление в реальном времени.',
  tiles: { views: '1K', totalTime: '3 ч.:27 мин.:13 с.', avgTime: '11.8 с.', fullWatch: '10.33%', newFollowers: '1' },
  daily: [1, 0, 0, 0, 13, 1, 5],
  dayFrom: '13 сент', dayTo: '19 сент',
  retentionAvg: '35', retentionAt: '0:02', likesAt: '0:01',
  traffic: { label: 'Для вас', value: '98.0' },
  queries: { label: 'миллионер в 16', value: '3.4' },
  ages: { label: '18 - 24', value: '37' },
  places: { label: 'Польша', value: '14.3' },
  total: '935', delta: '+827',
  newShare: '85', followerShare: '0',
  gender: ['40', '58', '2'],
  word: { word: 'это просто', count: '1' },
};

/* «8,7» → 8.7; мусор → 0 */
const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const numText = (n: number) => String(n).replace('.', ',');
const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/* Кривая «по секундам»: точка на каждую целую секунду ролика.
   Старые кривые с другим числом точек переводим — значения берём
   с того же места графика, чтобы форма линии не поменялась. */
export function toPerSecond(curve: number[], duration: number) {
  const n = Math.floor(duration) + 1;
  if (curve.length === n) return [...curve];
  if (curve.length < 2) return Array(n).fill(curve[0] ?? 0);
  return Array.from({ length: n }, (_, sec) => {
    const pos = Math.min(sec / duration, 1) * (curve.length - 1);
    const i = Math.min(Math.floor(pos), curve.length - 2);
    return Math.round((curve[i] + (curve[i + 1] - curve[i]) * (pos - i)) * 10) / 10;
  });
}

/* ── мелкие поля ── */

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: UI.label, fontSize: 13, marginBottom: 6, marginLeft: 2 }}>{children}</Text>;
}

/* серая подсказка под полем: как это выглядит в TikTok */
function Example({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: UI.muted, fontSize: 12, marginTop: 5, marginLeft: 2 }}>
      Пример: <Text style={{ color: '#a0a0a0' }}>{children}</Text>
    </Text>
  );
}

function Group({ title, note }: { title: string; note?: string }) {
  return (
    <View style={{ marginTop: 6, marginBottom: 12 }}>
      <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>{title}</Text>
      {note ? <Text style={{ color: UI.muted, fontSize: 12, marginTop: 3 }}>{note}</Text> : null}
    </View>
  );
}

function Input({
  value, onChange, numeric, multiline, placeholder, flex,
}: {
  value: string; onChange: (t: string) => void; numeric?: boolean;
  multiline?: boolean; placeholder?: string; flex?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#555555"
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      multiline={multiline}
      style={{
        flex, backgroundColor: UI.bg, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 10, minHeight: multiline ? 70 : undefined,
        color: UI.text, fontSize: 15, fontWeight: '600',
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );
}

function TextField({ label, value, onChange, multiline, example, numeric, auto }: {
  label: string; value: string; onChange: (t: string) => void;
  multiline?: boolean; example: string; numeric?: boolean;
  auto?: string;   // что покажется, если поле оставить пустым
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <Input value={value} onChange={onChange} multiline={multiline}
             placeholder={auto ?? example} numeric={numeric} />
      {auto !== undefined && (
        <Text style={{ color: '#7fb3ff', fontSize: 12, marginTop: 5, marginLeft: 2 }}>
          {value.trim() ? 'Своё значение. Сотри — будет автоматически: ' : 'Пусто — покажется автоматически: '}
          <Text style={{ fontWeight: '700' }}>{auto}</Text>
        </Text>
      )}
      <Example>{example}</Example>
    </View>
  );
}

/* число, которое вписывают строкой (чтобы можно было стереть и набрать заново) */
function NumField({ label, value, onChange, suffix, example }: {
  label: string; value: number; onChange: (n: number) => void; suffix?: string; example: string;
}) {
  const [raw, setRaw] = useState(numText(value));
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Input value={raw} numeric flex={1} placeholder={example}
               onChange={(t) => { setRaw(t); onChange(num(t)); }} />
        {suffix ? <Text style={{ color: UI.muted, fontSize: 15, marginLeft: 10 }}>{suffix}</Text> : null}
      </View>
      <Example>{example}{suffix ?? ''}</Example>
    </View>
  );
}

/* цифра внутри фразы: вписываешь только её, ниже — вся фраза целиком */
function PhraseField({ label, value, onChange, example, build, auto }: {
  label: string; value: string; onChange: (t: string) => void; example: string;
  build: (v: string) => string;
  auto: string;   // посчитано по графику — если поле пустое
}) {
  const preview = build(value.trim() || auto);
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <Input value={value} onChange={onChange} placeholder={auto || example} />
      <Text style={{ color: '#7fb3ff', fontSize: 12, marginTop: 5, marginLeft: 2 }}>
        {auto
          ? <>{value.trim() ? 'Своя цифра. Сотри — посчитается по графику: ' : 'Пусто — посчитано по графику: '}<Text style={{ fontWeight: '700' }}>{auto}</Text></>
          : 'На графике пока нули — впиши цифру сам'}
      </Text>
      <Example>{example}</Example>
      <View style={{ backgroundColor: '#141414', borderRadius: 8, padding: 10, marginTop: 8 }}>
        <Text style={{ color: UI.muted, fontSize: 11, marginBottom: 4 }}>ТАК БУДЕТ НАПИСАНО</Text>
        <Text style={{ color: UI.label, fontSize: 13, lineHeight: 18 }}>
          {preview ? preview.replace(/\n/g, ' ') : 'Пока нечего писать — фразы не будет'}
        </Text>
      </View>
    </View>
  );
}

/* список точек графика: «0:00 — [100] %» */
function PointsField({ label, values, labels, suffix, onChange, examples, note }: {
  label: string; values: number[]; labels: string[]; suffix: string;
  onChange: (v: number[]) => void; examples?: number[]; note?: string;
}) {
  const [raw, setRaw] = useState(values.map(numText));
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      {note ? <Text style={{ color: UI.muted, fontSize: 12, marginBottom: 8, marginLeft: 2 }}>{note}</Text> : null}
      {raw.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ color: UI.muted, fontSize: 14, width: 64 }}>{labels[i]}</Text>
          <Input
            value={r}
            numeric
            flex={1}
            placeholder={examples ? String(examples[i] ?? '') : '0'}
            onChange={(t) => {
              const nextRaw = [...raw]; nextRaw[i] = t; setRaw(nextRaw);
              onChange(nextRaw.map(num));
            }}
          />
          <Text style={{ color: UI.muted, fontSize: 14, marginLeft: 10, width: 22 }}>{suffix}</Text>
        </View>
      ))}
    </View>
  );
}

/* сколько дней на графике: от 2 до 7 */
const DAYS_MIN = 2, DAYS_MAX = 7;
function DaysField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn = (label: string, next: number, off: boolean) => (
    <TouchableOpacity
      disabled={off}
      onPress={() => onChange(next)}
      style={{
        width: 44, height: 40, borderRadius: UI.radius, backgroundColor: UI.bg,
        alignItems: 'center', justifyContent: 'center', opacity: off ? 0.35 : 1,
      }}
    >
      <Text style={{ color: UI.text, fontSize: 22, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>Сколько дней на графике</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {btn('−', value - 1, value <= DAYS_MIN)}
        <Text style={{ color: UI.text, fontSize: 17, fontWeight: '700', width: 64, textAlign: 'center' }}>
          {value}
        </Text>
        {btn('+', value + 1, value >= DAYS_MAX)}
        <Text style={{ color: UI.muted, fontSize: 12, marginLeft: 12, flex: 1 }}>
          столько же точек на графике (от {DAYS_MIN} до {DAYS_MAX})
        </Text>
      </View>
    </View>
  );
}

/* строки «подпись — процент»: правка, добавление, удаление */
function RowsField({ label, rows, onChange, textFromValue, example }: {
  label: string; rows: StatRow[]; onChange: (r: StatRow[]) => void; textFromValue?: boolean;
  example: { label: string; value: string };
}) {
  const [raw, setRaw] = useState(rows.map((r) => ({ ...r, rawValue: numText(r.value) })));
  const push = (next: typeof raw) => {
    setRaw(next);
    onChange(next.map(({ rawValue, ...r }) => ({
      ...r,
      value: num(rawValue),
      ...(textFromValue ? { text: `${Math.round(num(rawValue))}%` } : {}),
    })));
  };
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <Text style={{ color: UI.muted, fontSize: 12, marginBottom: 10, marginLeft: 2 }}>
        Пример строки: <Text style={{ color: '#a0a0a0' }}>{example.label} — {example.value}%</Text>
        {textFromValue ? '  (проценты — целым числом)' : '  (проценты — с одним знаком после запятой)'}
      </Text>
      {raw.map((r, i) => (
        <View key={i} style={{ backgroundColor: '#141414', borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Input
              value={r.label} flex={1} placeholder={example.label}
              onChange={(t) => { const n = [...raw]; n[i] = { ...n[i], label: t }; push(n); }}
            />
            <View style={{ width: 8 }} />
            <View style={{ width: 86, flexDirection: 'row', alignItems: 'center' }}>
              <Input
                value={r.rawValue} numeric flex={1} placeholder={example.value}
                onChange={(t) => { const n = [...raw]; n[i] = { ...n[i], rawValue: t }; push(n); }}
              />
              <Text style={{ color: UI.muted, marginLeft: 4 }}>%</Text>
            </View>
            <TouchableOpacity onPress={() => push(raw.filter((_, j) => j !== i))} hitSlop={8} style={{ marginLeft: 10 }}>
              <Trash2 size={18} color={UI.muted} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: UI.muted, fontSize: 13, flex: 1 }}>Стрелка справа</Text>
            <Switch
              value={!!r.chevron}
              onValueChange={(v) => { const n = [...raw]; n[i] = { ...n[i], chevron: v }; push(n); }}
            />
          </View>
        </View>
      ))}
      <AddButton onPress={() => push([...raw, { label: '', value: 0, rawValue: '' }])} />
    </View>
  );
}

/* слова: «слово — сколько раз» */
function WordsField({ words, onChange }: {
  words: VideoStats['words']; onChange: (w: VideoStats['words']) => void;
}) {
  const [raw, setRaw] = useState(words.map((w) => ({ word: w.word, count: String(w.count) })));
  const push = (next: typeof raw) => {
    setRaw(next);
    onChange(next.map((w) => ({ word: w.word, count: Math.max(0, Math.round(num(w.count))) })));
  };
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>Слова и сколько раз встречаются</Label>
      <Text style={{ color: UI.muted, fontSize: 12, marginBottom: 10, marginLeft: 2 }}>
        Пример строки: <Text style={{ color: '#a0a0a0' }}>{EX.word.word} — {EX.word.count}</Text>
        {'  (слова с маленькой буквы, как в TikTok)'}
      </Text>
      {raw.map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Input value={w.word} flex={1} placeholder={EX.word.word}
                 onChange={(t) => { const n = [...raw]; n[i] = { ...n[i], word: t }; push(n); }} />
          <View style={{ width: 8 }} />
          <View style={{ width: 70 }}>
            <Input value={w.count} numeric placeholder={EX.word.count}
                   onChange={(t) => { const n = [...raw]; n[i] = { ...n[i], count: t }; push(n); }} />
          </View>
          <TouchableOpacity onPress={() => push(raw.filter((_, j) => j !== i))} hitSlop={8} style={{ marginLeft: 10 }}>
            <Trash2 size={18} color={UI.muted} />
          </TouchableOpacity>
        </View>
      ))}
      <AddButton onPress={() => push([...raw, { word: '', count: '' }])} />
      <Text style={{ color: UI.muted, fontSize: 12, marginTop: 6 }}>
        Нет ни одного слова — покажется «данные пока не готовы».
      </Text>
    </View>
  );
}

/* три картинки «других публикаций»: своя из галереи или автоматическая */
function CoversField({ covers, onChange }: {
  covers: (string | null)[]; onChange: (c: (string | null)[]) => void;
}) {
  const myVideos = useVideoStore((s) => s.myVideos);
  const [busy, setBusy] = useState<number | null>(null);
  const slots = [0, 1, 2].map((i) => covers[i] ?? null);

  const pick = async (i: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа к галерее', 'Разреши доступ к фото в настройках телефона.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [11, 12], quality: 0.9,
    });
    if (res.canceled || !res.assets?.length) return;
    setBusy(i);
    try {
      const uri = await keepImageFile(res.assets[0].uri);
      const next = [...slots]; next[i] = uri; onChange(next);
    } catch {
      Alert.alert('Не получилось', 'Не удалось сохранить картинку. Попробуй другую.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <Text style={{ color: UI.muted, fontSize: 12, marginBottom: 14, marginLeft: 2 }}>
        Три маленькие обложки справа в строке «Посмотреть данные других публикаций».
        По умолчанию это обложки роликов из твоего профиля. Можно поставить любую картинку из галереи —
        она обрежется до почти квадрата, как в TikTok.
      </Text>
      {slots.map((c, i) => {
        const auto = myVideos.length ? myVideos[i % myVideos.length] : null;
        return (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414',
            borderRadius: 10, padding: 10, marginBottom: 10,
          }}>
            <View style={{ width: 52, height: 57, borderRadius: 6, overflow: 'hidden', backgroundColor: '#222' }}>
              {c
                ? <Image source={{ uri: c }} style={{ width: 52, height: 57 }} resizeMode="cover" />
                : auto ? <VideoFrame uri={auto.uri} width={52} height={57} radius={6} /> : null}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: UI.text, fontSize: 15, fontWeight: '700' }}>Картинка {i + 1}</Text>
              <Text style={{ color: c ? '#7fb3ff' : UI.muted, fontSize: 12, marginTop: 3 }}>
                {busy === i ? 'Сохраняю…' : c ? 'Своя картинка' : 'Автоматически: обложка ролика из профиля'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={() => pick(i)} hitSlop={6}>
                <Text style={{ color: UI.accent, fontSize: 14, fontWeight: '700' }}>Выбрать фото</Text>
              </TouchableOpacity>
              {c && (
                <TouchableOpacity onPress={() => { const next = [...slots]; next[i] = null; onChange(next); }}
                                  hitSlop={6} style={{ marginTop: 8 }}>
                  <Text style={{ color: UI.muted, fontSize: 13 }}>Сбросить</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 10,
      }}
    >
      <Plus size={16} color={UI.label} />
      <Text style={{ color: UI.label, fontSize: 14, marginLeft: 6 }}>Добавить строку</Text>
    </TouchableOpacity>
  );
}

/* ── форма целиком ── */

/* то, что показывают экран видео и плитка в профиле, — живёт не в статистике */
export type VideoExtra = { description: string; date: string; display: VideoDisplay };

export default function StatsEditSheet({
  section, stats, duration, extra, onSave, onClose,
}: {
  section: Section | null;
  stats: VideoStats;
  duration: number;
  extra: VideoExtra;
  onSave: (patch: Partial<VideoStats>, extra?: VideoExtra) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!section} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {section && (
        <SheetBody
          key={section}
          section={section} stats={stats} duration={duration} extra={extra} onSave={onSave} onClose={onClose}
        />
      )}
    </Modal>
  );
}

function SheetBody({ section, stats, duration, extra, onSave, onClose }: {
  section: Section; stats: VideoStats; duration: number; extra: VideoExtra;
  onSave: (patch: Partial<VideoStats>, extra?: VideoExtra) => void; onClose: () => void;
}) {
  /* черновик: правим копию, в данные уходит только по «Готово» */
  const [d, setD] = useState<VideoStats>(() => {
    const copy: VideoStats = JSON.parse(JSON.stringify(stats));
    copy.retention.curve = toPerSecond(copy.retention.curve, duration);
    copy.likes.curve = toPerSecond(copy.likes.curve, duration);
    return copy;
  });
  const [x, setX] = useState<VideoExtra>(() => JSON.parse(JSON.stringify(extra)));
  const set = <K extends keyof VideoStats>(key: K, value: VideoStats[K]) => setD((p) => ({ ...p, [key]: value }));
  const setShow = (k: keyof VideoDisplay, v: string) => setX((p) => ({ ...p, display: { ...p.display, [k]: v } }));
  const secLabels = d.retention.curve.map((_, i) => mmss(i));

  /* в данные уходят только поля этого блока */
  const save = () => {
    const keysBySection: Record<Section, (keyof VideoStats)[]> = {
      header: ['counts', 'published'],
      metrics: ['metricsNote', 'tiles', 'daily'],
      retention: ['retention'],
      traffic: ['traffic'],
      queries: ['queries'],
      viewersTotal: ['viewers'], viewerTypes: ['viewers'], gender: ['viewers'],
      ages: ['viewers'], places: ['viewers'],
      words: ['words'],
      likes: ['likes'],
      moreData: ['otherCovers'],
    };
    const out: Partial<VideoStats> = {};
    keysBySection[section].forEach((k) => { (out as any)[k] = d[k]; });
    onSave(out, section === 'header' ? x : undefined);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#2a2a2a',
      }}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Text style={{ color: UI.label, fontSize: 16 }}>Отмена</Text>
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>{TITLES[section]}</Text>
        <TouchableOpacity onPress={save} hitSlop={10}>
          <Text style={{ color: UI.accent, fontSize: 16, fontWeight: '700' }}>Готово</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      >
        {section === 'header' && (
          <>
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414',
              borderRadius: 10, padding: 12, marginBottom: 16,
            }}>
              <Lock size={16} color={UI.muted} />
              <Text style={{ color: UI.muted, fontSize: 14, marginLeft: 8, flex: 1 }}>
                Длина видео: {duration.toFixed(2)} с. — берётся из ролика, поменять нельзя
              </Text>
            </View>

            <Group
              title="Статистика"
              note="Дата и ряд цифр под обложкой на экране «Анализ видео». Числа целиком, тысячи через запятую: 1,004 или 133,534"
            />
            <TextField label="Дата публикации" value={d.published} example={EX.published}
                       onChange={(t) => set('published', t)} />
            <TextField label="Просмотры" value={d.counts.views} example={EX.counts.views}
                       onChange={(t) => set('counts', { ...d.counts, views: t })} />
            <TextField label="Лайки" value={d.counts.likes} example={EX.counts.likes}
                       onChange={(t) => set('counts', { ...d.counts, likes: t })} />
            <TextField label="Комментарии" value={d.counts.comments} example={EX.counts.comments}
                       onChange={(t) => set('counts', { ...d.counts, comments: t })} />
            <TextField label="Репосты" value={d.counts.shares} example={EX.counts.shares}
                       onChange={(t) => set('counts', { ...d.counts, shares: t })} />
            <TextField label="Сохранения" value={d.counts.saves} example={EX.counts.saves}
                       onChange={(t) => set('counts', { ...d.counts, saves: t })} />

            <Group
              title="Экран видео"
              note="Когда открываешь видео из профиля. Цифры сами берутся из статистики и пишутся как в TikTok: до 1000 — целым (345), дальше с «тыс.» (1,2 тыс.), от миллиона — «млн» (2,5 млн). Впиши своё, только если нужно по-другому"
            />
            <TextField label="Лайки (справа)" value={x.display.screenLikes} auto={shortCount(d.counts.likes)} example={EX.screen.likes}
                       onChange={(t) => setShow('screenLikes', t)} />
            <TextField label="Комментарии (справа)" value={x.display.screenComments} auto={shortCount(d.counts.comments)} example={EX.screen.comments}
                       onChange={(t) => setShow('screenComments', t)} />
            <TextField label="Сохранения (справа)" value={x.display.screenSaves} auto={shortCount(d.counts.saves)} example={EX.screen.saves}
                       onChange={(t) => setShow('screenSaves', t)} />
            <TextField label="Просмотры (внизу, после «Просмотры:»)" value={x.display.screenViews} auto={shortCount(d.counts.views)} example={EX.screen.views}
                       onChange={(t) => setShow('screenViews', t)} />
            <TextField label="Дата у ника" value={x.date} example={EX.date}
                       onChange={(t) => setX({ ...x, date: t })} />
            <TextField label="Описание под ником" value={x.description} example={EX.description} multiline
                       onChange={(t) => setX({ ...x, description: t })} />

            <Group
              title="Профиль"
              note="Плитка видео в сетке профиля. Тоже сама берётся из просмотров в статистике: 133534 → 133,5 тыс."
            />
            <TextField label="Просмотры на плитке" value={x.display.tileViews} auto={shortCount(d.counts.views)} example={EX.tileViews}
                       onChange={(t) => setShow('tileViews', t)} />
          </>
        )}

        {section === 'metrics' && (
          <>
            <TextField label="Подпись под заголовком" value={d.metricsNote} example={EX.metricsNote}
                       onChange={(t) => set('metricsNote', t)} />
            <TextField label="Просмотры видео" value={d.tiles.views} example={EX.tiles.views}
                       onChange={(t) => set('tiles', { ...d.tiles, views: t })} />
            <TextField label="Общее время просмотра" value={d.tiles.totalTime} example={EX.tiles.totalTime}
                       onChange={(t) => set('tiles', { ...d.tiles, totalTime: t })} />
            <TextField label="Среднее время просмотра" value={d.tiles.avgTime} example={EX.tiles.avgTime}
                       onChange={(t) => set('tiles', { ...d.tiles, avgTime: t })} />
            <TextField label="Просмотрели видео целиком" value={d.tiles.fullWatch} example={EX.tiles.fullWatch}
                       onChange={(t) => set('tiles', { ...d.tiles, fullWatch: t })} />
            <TextField label="Новые подписчики" value={d.tiles.newFollowers} example={EX.tiles.newFollowers}
                       onChange={(t) => set('tiles', { ...d.tiles, newFollowers: t })} />
            <DaysField
              value={d.daily.points.length}
              onChange={(n) => set('daily', {
                ...d.daily,
                points: Array.from({ length: n }, (_, i) => d.daily.points[i] ?? 0),
              })}
            />
            <PointsField
              key={d.daily.points.length}   // число дней поменялось — поля заново
              label="График: просмотры по дням"
              note="Просто числа, без «тыс.» — шкала 15/10/5 или 3K/2K/1K подстроится сама"
              values={d.daily.points}
              labels={d.daily.points.map((_, i) => `День ${i + 1}`)}
              examples={EX.daily}
              suffix=""
              onChange={(v) => set('daily', { ...d.daily, points: v })}
            />
            <TextField label="Подпись под первым днём" value={d.daily.from} example={EX.dayFrom}
                       onChange={(t) => set('daily', { ...d.daily, from: t })} />
            <TextField label="Подпись под последним днём" value={d.daily.to} example={EX.dayTo}
                       onChange={(t) => set('daily', { ...d.daily, to: t })} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Label>Плашка под графиком</Label>
                <Text style={{ color: UI.muted, fontSize: 12, marginLeft: 2 }}>
                  «График показывает тренд данных за последние 7 дней…». Выключишь — плашка пропадёт, карточка станет короче
                </Text>
              </View>
              <Switch
                value={d.daily.trendNote}
                onValueChange={(v) => set('daily', { ...d.daily, trendNote: v })}
              />
            </View>
          </>
        )}

        {section === 'retention' && (
          <>
            <PhraseField
              label="В среднем смотрели, %" value={d.retention.avg} example={EX.retentionAvg}
              build={retentionLead} auto={autoRetention(d.retention.curve, duration).avg}
              onChange={(t) => set('retention', { ...d.retention, avg: t })}
            />
            <PhraseField
              label="Отметка, где чаще всего бросали смотреть" value={d.retention.dropAt} example={EX.retentionAt}
              build={retentionNote} auto={autoRetention(d.retention.curve, duration).dropAt}
              onChange={(t) => set('retention', { ...d.retention, dropAt: t })}
            />
            <PointsField
              label="Сколько зрителей осталось к каждой секунде"
              note="В процентах: на 00:00 обычно 100"
              values={d.retention.curve} labels={secLabels} suffix="%"
              onChange={(v) => set('retention', { ...d.retention, curve: v })}
            />
          </>
        )}

        {section === 'traffic' && (
          <RowsField label="Источники" rows={d.traffic} example={EX.traffic} onChange={(r) => set('traffic', r)} />
        )}
        {section === 'queries' && (
          <RowsField label="Запросы" rows={d.queries} example={EX.queries} onChange={(r) => set('queries', r)} />
        )}

        {section === 'viewersTotal' && (
          <>
            <TextField label="Всего зрителей" value={d.viewers.total} example={EX.total}
                       onChange={(t) => set('viewers', { ...d.viewers, total: t })} />
            <TextField label="Прирост за день" value={d.viewers.delta} example={EX.delta}
                       onChange={(t) => set('viewers', { ...d.viewers, delta: t })} />
          </>
        )}

        {section === 'viewerTypes' && (
          <>
            <NumField label="Новые зрители" suffix="%" example={EX.newShare}
                      value={Math.round(d.viewers.newShare * 1000) / 10}
                      onChange={(n) => set('viewers', { ...d.viewers, newShare: Math.min(Math.max(n, 0), 100) / 100 })} />
            <NumField label="Подписчики" suffix="%" example={EX.followerShare}
                      value={Math.round(d.viewers.followerShare * 1000) / 10}
                      onChange={(n) => set('viewers', { ...d.viewers, followerShare: Math.min(Math.max(n, 0), 100) / 100 })} />
            <Text style={{ color: UI.muted, fontSize: 12 }}>
              Вторая часть каждой полоски считается сама: «Вернувшиеся зрители» и «Не подписчики» — до 100%.
            </Text>
          </>
        )}

        {section === 'gender' && (
          <>
            {(['Мужской', 'Женский', 'Другое'] as const).map((g, i) => (
              <NumField
                key={g} label={g} suffix="%" value={d.viewers.gender[i]} example={EX.gender[i]}
                onChange={(n) => {
                  const next = [...d.viewers.gender] as [number, number, number];
                  next[i] = n;
                  set('viewers', { ...d.viewers, gender: next });
                }}
              />
            ))}
            <Text style={{ color: UI.muted, fontSize: 12 }}>Полукольцо рисуется по этим долям — в сумме должно быть 100%.</Text>
          </>
        )}

        {section === 'ages' && (
          <RowsField label="Возрастные группы" rows={d.viewers.ages} example={EX.ages} textFromValue
                     onChange={(r) => set('viewers', { ...d.viewers, ages: r })} />
        )}
        {section === 'places' && (
          <RowsField label="Страны" rows={d.viewers.places} example={EX.places}
                     onChange={(r) => set('viewers', { ...d.viewers, places: r })} />
        )}

        {section === 'words' && <WordsField words={d.words} onChange={(w) => set('words', w)} />}

        {section === 'moreData' && (
          <CoversField covers={d.otherCovers ?? []} onChange={(c) => set('otherCovers', c)} />
        )}

        {section === 'likes' && (
          <>
            <PhraseField
              label="Отметка, где чаще всего ставили лайк" value={d.likes.peakAt} example={EX.likesAt}
              build={likesNote} auto={autoLikesPeak(d.likes.curve, duration)}
              onChange={(t) => set('likes', { ...d.likes, peakAt: t })}
            />
            <PointsField
              label="Доля лайков на каждой секунде"
              note="В процентах: шкала графика — до 20%"
              values={d.likes.curve} labels={d.likes.curve.map((_, i) => mmss(i))} suffix="%"
              onChange={(v) => set('likes', { ...d.likes, curve: v })}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
