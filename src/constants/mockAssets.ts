// Наши локальные заглушки. Приложение не ходит в интернет за картинками.
// Asset.fromModule работает и на телефоне, и в браузере — в отличие от
// Image.resolveAssetSource, которого в веб-версии просто нет.
import { Asset } from 'expo-asset';

const localUri = (mod: any): string => Asset.fromModule(mod).uri;

export const AV1 = localUri(require('../../assets/mock/avatar1.jpg'));
export const AV2 = localUri(require('../../assets/mock/avatar2.jpg'));
export const ME = localUri(require('../../assets/mock/profile-avatar.png'));
