/* Надписи и поля ввода с фиксированным размером шрифта.

   Обычный Text умножает шрифт на «Размер текста» из настроек айфона.
   Все размеры у нас сняты с эталона при стандартной настройке, и если
   на телефоне стоит шрифт мельче или крупнее, макет расползается.
   Поэтому подстройку выключаем — как у экранов самого TikTok. */

import React from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

export const Text = React.forwardRef<RNText, React.ComponentProps<typeof RNText>>(
  (props, ref) => <RNText allowFontScaling={false} {...props} ref={ref} />,
);
Text.displayName = 'Text';

export const TextInput = React.forwardRef<RNTextInput, React.ComponentProps<typeof RNTextInput>>(
  (props, ref) => <RNTextInput allowFontScaling={false} {...props} ref={ref} />,
);
TextInput.displayName = 'TextInput';
