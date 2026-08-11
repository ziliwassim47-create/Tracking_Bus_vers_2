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

export default function App() {
  return (
    <View style={styles.appShell}>
      <View style={styles.appViewport}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="List" component={ListStudent} />
            <Stack.Screen name="Tracking" component={TrackingScreen} />
          </Stack.Navigator>
        </NavigationContainer>
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
