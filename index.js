/* Точка входа приложения. То же самое, что стандартный 'expo-router/entry',
   плюс «ловушка» для ошибок: если при запуске что-то падает, на экране
   появляется текст ошибки, а не чёрный экран (в собранном .ipa других
   способов увидеть ошибку нет). */

// @expo/metro-runtime должен импортироваться первым (как в expo-router/entry)
import '@expo/metro-runtime';
import React from 'react';
import { ScrollView, Text, View, Dimensions, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

const h = React.createElement;

let listener = null;
let pending = null;

function report(title, e) {
  const msg = `${title}\n\n${(e && e.message) || String(e)}\n\n${(e && e.stack) || ''}`;
  if (!pending) pending = msg;
  if (listener) listener(pending);
  SplashScreen.hideAsync().catch(() => {});
}

if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
  global.ErrorUtils.setGlobalHandler((e, isFatal) => report(isFatal ? 'Ошибка (fatal)' : 'Ошибка', e));
}

/* В браузере можно выбрать айфон (раздел «+» → «Устройство»): тогда
   приложение рисуется ровно размером его экрана посередине окна.
   Размер подменяем до загрузки экранов — они читают его при запуске. */
let webFrame = null;
if (Platform.OS === 'web') {
  try {
    const { findDevice, getDeviceId } = require('./src/lib/device');
    const d = findDevice(getDeviceId());
    if (d) {
      webFrame = { width: d.w, height: d.h };
      const orig = Dimensions.get.bind(Dimensions);
      Dimensions.get = (dim) => ({ ...orig(dim), width: d.w, height: d.h });
    }
  } catch (e) { /* не вышло — работаем по размеру окна */ }
}

let RealApp = null;
try {
  RealApp = require('expo-router/build/qualified-entry').App;
} catch (e) {
  report('Ошибка при загрузке кода', e);
}

class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { report('Ошибка при отрисовке', e); }
  render() { return this.state.failed ? null : this.props.children; }
}

function CrashScreen({ msg }) {
  return h(ScrollView, {
    style: { flex: 1, backgroundColor: '#3a0000' },
    contentContainerStyle: { padding: 20, paddingTop: 70, paddingBottom: 60 },
  },
    h(Text, { style: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 12 } },
      'Приложение упало при запуске. Сделай скриншот и пришли Claude:'),
    h(Text, { selectable: true, style: { color: '#ffd6d6', fontSize: 12, lineHeight: 17 } }, msg),
  );
}

function Root() {
  const [msg, setMsg] = React.useState(pending);
  React.useEffect(() => {
    listener = setMsg;
    if (pending) setMsg(pending);
    // если за 6 секунд заставка не ушла сама — убираем её, чтобы было видно, что под ней
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 6000);
    return () => { listener = null; clearTimeout(t); };
  }, []);
  if (msg) return h(CrashScreen, { msg });
  const app = RealApp ? h(Boundary, null, h(RealApp)) : h(View, { style: { flex: 1, backgroundColor: '#000' } });
  if (!webFrame) return app;
  /* браузер: «экран» выбранного айфона посередине окна */
  return h(View, { style: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' } },
    h(View, { style: { width: webFrame.width, height: webFrame.height, overflow: 'hidden', backgroundColor: '#000' } }, app));
}

renderRootComponent(Root);
