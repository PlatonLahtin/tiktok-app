/* Кнопка без затемнения. Обычный TouchableOpacity при нажатии
   делает кнопку полупрозрачной — в TikTok такого нет, поэтому
   прозрачность при нажатии всегда 1, что бы ни передали. */

import React from 'react';
import { TouchableOpacity as RNTouchableOpacity, View } from 'react-native';

export const TouchableOpacity = React.forwardRef<View, React.ComponentProps<typeof RNTouchableOpacity>>(
  (props, ref) => <RNTouchableOpacity {...props} activeOpacity={1} ref={ref as any} />,
);
TouchableOpacity.displayName = 'TouchableOpacity';
