/* Редактор статистики одного видео: тот же экран «Анализ видео»,
   только блоки обведены и открывают формы с цифрами. */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StatsScreen } from '../../stats/[id]';

export default function StatsEditorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StatsScreen videoId={id} editable />;
}
