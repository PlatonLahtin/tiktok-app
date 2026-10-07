/* Пресеты «Настройки статы». Пресет — снимок всей настройки видео:
   статистика целиком (все блоки «Анализа видео») плюс дата у ника,
   описание и цифры на экране видео и плитке профиля.
   Сохранил с одного видео — применил к любому. Длина ролика
   своя у каждого видео, её пресет не меняет.

   Подтверждения сделаны прямо в строке (второе нажатие), без
   системных окон: в браузере Alert с кнопками не работает. */

import React, { useState } from 'react';
import { View, ScrollView, Modal } from 'react-native';
import { TouchableOpacity } from '../Touchable';
import { Text, TextInput } from '../FixedText';
import { Trash2, Check, Save } from 'lucide-react-native';
import { useVideoStore } from '../../store/useVideoStore';
import { UI } from '../settings/ui';

const when = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function PresetsSheet({
  visible, videoId, onClose,
}: { visible: boolean; videoId: string; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Body videoId={videoId} onClose={onClose} />}
    </Modal>
  );
}

function Body({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const presets = useVideoStore((s) => s.presets);
  const savePreset = useVideoStore((s) => s.savePreset);
  const overwritePreset = useVideoStore((s) => s.overwritePreset);
  const applyPreset = useVideoStore((s) => s.applyPreset);
  const removePreset = useVideoStore((s) => s.removePreset);

  const [name, setName] = useState('');
  /* какая строка ждёт второго нажатия: «apply:id», «over:id», «del:id» */
  const [confirm, setConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2200);
  };
  const ask = (key: string, run: () => void) => {
    if (confirm === key) { run(); setConfirm(null); } else setConfirm(key);
  };

  const save = () => {
    savePreset(name, videoId);
    setName('');
    setConfirm(null);
    flash('Пресет сохранён');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#2a2a2a',
      }}>
        <View style={{ width: 60 }} />
        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Пресеты</Text>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={{ width: 60, alignItems: 'flex-end' }}>
          <Text style={{ color: UI.accent, fontSize: 16, fontWeight: '700' }}>Готово</Text>
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* сохранить текущую настройку */}
        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Сохранить это видео как пресет</Text>
        <Text style={{ color: UI.muted, fontSize: 12, marginTop: 3, marginBottom: 12 }}>
          Запомнится всё: цифры, графики, источники, зрители, слова, лайки, картинки, а также дата,
          описание и цифры на экране видео и в профиле.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={save}
            placeholder={`Пресет ${presets.length + 1}`}
            placeholderTextColor="#555555"
            maxLength={40}
            style={{
              flex: 1, backgroundColor: UI.bg, borderRadius: 8,
              paddingHorizontal: 12, paddingVertical: 10,
              color: UI.text, fontSize: 15, fontWeight: '600',
            }}
          />
          <TouchableOpacity
            onPress={save}
            style={{
              marginLeft: 10, backgroundColor: UI.accent, borderRadius: 8,
              paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center',
            }}
          >
            <Save size={15} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700', marginLeft: 6 }}>Сохранить</Text>
          </TouchableOpacity>
        </View>

        {/* список */}
        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
          Сохранённые {presets.length ? `(${presets.length})` : ''}
        </Text>
        {presets.length === 0 && (
          <Text style={{ color: UI.muted, fontSize: 13 }}>
            Пока пусто. Настрой стату, впиши название выше и нажми «Сохранить».
          </Text>
        )}
        {presets.map((p) => {
          const applyKey = `apply:${p.id}`, overKey = `over:${p.id}`, delKey = `del:${p.id}`;
          return (
            <View key={p.id} style={{ backgroundColor: '#141414', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: UI.text, fontSize: 15, fontWeight: '700' }}>{p.name}</Text>
                  <Text style={{ color: UI.muted, fontSize: 12, marginTop: 3 }}>
                    {p.stats.counts.views} просмотров · {p.stats.counts.likes} лайков · {when(p.savedAt)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => ask(delKey, () => { removePreset(p.id); flash('Пресет удалён'); })}
                                  hitSlop={8} style={{ padding: 4, marginLeft: 8 }}>
                  {confirm === delKey
                    ? <Text style={{ color: UI.accent, fontSize: 13, fontWeight: '700' }}>Удалить?</Text>
                    : <Trash2 size={18} color={UI.muted} />}
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => ask(applyKey, () => { applyPreset(p.id, videoId); flash(`Применён «${p.name}»`); })}
                  style={{
                    flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center',
                    backgroundColor: confirm === applyKey ? UI.accent : UI.bg,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                    {confirm === applyKey ? 'Точно? Заменит всю стату' : 'Применить к видео'}
                  </Text>
                </TouchableOpacity>
                <View style={{ width: 8 }} />
                <TouchableOpacity
                  onPress={() => ask(overKey, () => { overwritePreset(p.id, videoId); flash(`«${p.name}» обновлён`); })}
                  style={{
                    flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center',
                    backgroundColor: confirm === overKey ? UI.accent : UI.bg,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                    {confirm === overKey ? 'Точно? Перезапишет' : 'Обновить из видео'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {toast && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(40,40,40,0.97)',
            borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8,
          }}>
            <Check size={14} color="#1ad765" />
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>{toast}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
