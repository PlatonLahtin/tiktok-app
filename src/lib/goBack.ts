/* «Назад», который не ломается. Если страницу обновили в браузере
   (или открыли по прямой ссылке), истории переходов нет — обычный
   router.back() тогда некуда вести, и Expo ругается «GO_BACK was not
   handled». В этом случае просто открываем экран, откуда сюда
   обычно приходят. */

import type { useRouter, Href } from 'expo-router';

export function goBack(router: ReturnType<typeof useRouter>, fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
