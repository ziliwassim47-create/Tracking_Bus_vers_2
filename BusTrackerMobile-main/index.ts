import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// React Native Web 0.19 transmet encore pointerEvents depuis son AppContainer.
// L’avertissement est interne à cette version recommandée par Expo 52.
if (__DEV__ && Platform.OS === 'web') {
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (String(args[0] || '').includes('props.pointerEvents is deprecated')) return;
    originalWarn(...args);
  };
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
