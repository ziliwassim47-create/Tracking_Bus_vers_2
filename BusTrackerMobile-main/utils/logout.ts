import { Alert, Platform } from 'react-native';
import { logoutSession } from './session';

const LOGOUT_MESSAGE = 'Voulez-vous vraiment vous déconnecter ?';

export function confirmLogout(onConfirm: () => void | Promise<void>): void {
  const performLogout = async () => {
    await logoutSession();
    await onConfirm();
  };
  if (Platform.OS === 'web') {
    const browser = globalThis as typeof globalThis & {
      confirm?: (message?: string) => boolean;
    };
    if (browser.confirm?.(LOGOUT_MESSAGE) ?? true) void performLogout();
    return;
  }

  Alert.alert('Déconnexion', LOGOUT_MESSAGE, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Déconnecter', style: 'destructive', onPress: () => { void performLogout(); } },
  ]);
}
