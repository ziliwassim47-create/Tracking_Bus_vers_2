import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import TrackingScreen from './screens/TrackingScreen';
import ListStudent from './screens/ListStudent';

export type AssistantStackParamList = {
  Login: undefined;
  List: undefined;
  Tracking: { selectedBus: string; tripId: number; tripStatus: string };
};

const Stack = createNativeStackNavigator<AssistantStackParamList>();

type WebRoute =
  | { name: 'Login' }
  | { name: 'List' }
  | { name: 'Tracking'; params: AssistantStackParamList['Tracking'] };

function WebAssistantApp() {
  const [route, setRoute] = React.useState<WebRoute>({ name: 'Login' });
  const navigation = React.useMemo(() => {
    const open = (name: keyof AssistantStackParamList, params?: AssistantStackParamList['Tracking']) => {
      if (name === 'Tracking' && params) setRoute({ name, params });
      else if (name === 'List') setRoute({ name });
      else setRoute({ name: 'Login' });
    };
    return {
      navigate: open,
      reset: (state: { index?: number; routes: Array<{ name: keyof AssistantStackParamList; params?: AssistantStackParamList['Tracking'] }> }) => {
        const target = state.routes[state.index ?? state.routes.length - 1];
        open(target.name, target.params);
      },
    };
  }, []);

  if (route.name === 'Tracking') {
    return <TrackingScreen navigation={navigation as never} route={{ key: 'web-tracking', name: 'Tracking', params: route.params } as never} />;
  }
  if (route.name === 'List') {
    return <ListStudent navigation={navigation as never} route={{ key: 'web-list', name: 'List' } as never} />;
  }
  return <LoginScreen navigation={navigation as never} route={{ key: 'web-login', name: 'Login' } as never} />;
}

function NativeAssistantApp() {
  return <NavigationContainer>
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="List" component={ListStudent} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
    </Stack.Navigator>
  </NavigationContainer>;
}

export default function App() {
  return (
    <View style={styles.appShell}>
      <View style={styles.appViewport}>
        {Platform.OS === 'web' ? <WebAssistantApp /> : <NativeAssistantApp />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    width: '100%',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    backgroundColor: '#dff7f3',
  },
  appViewport: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
    backgroundColor: '#f0fdfa',
    overflow: 'hidden',
  },
});
