import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// ─── Existing screens (Driver / Assistant) ────────────────────────────────────
import LoginScreen from "./screens/LoginScreen";
import TrackingScreen from "./screens/TrackingScreen";
import ListStudent from "./screens/ListStudent";

// ─── Parent screens ───────────────────────────────────────────────────────────
import ParentHomeScreen from "./screens/parent/ParentHomeScreen";
import ParentMapScreen from "./screens/parent/ParentMapScreen";
import ParentHistoryScreen from "./screens/parent/ParentHistoryScreen";
import ParentNotificationsScreen from "./screens/parent/ParentNotificationsScreen";
import ParentClaimScreen from "./screens/parent/ParentClaimScreen";
import ParentProfileScreen from "./screens/parent/ParentProfileScreen";

// ─── Parent Context Provider ──────────────────────────────────────────────────
import { ParentProvider } from "./context/ParentContext";

// ─── Navigation types ─────────────────────────────────────────────────────────
type RootStackParamList = {
  // Auth
  Login: undefined;

  // Driver / Assistant
  TrackingScreenBus: any;
  Tracking: { selectedBus: string };
  List: undefined;
  Students: { selectedBus: string };

  // Parent
  ParentHome: undefined;
  ParentMap: undefined;
  ParentHistory: undefined;
  ParentNotifications: undefined;
  ParentClaim: undefined;
  ParentProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ParentProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          {/* ─── Auth ─── */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />

          {/* ─── Driver / Assistant screens ─── */}
          <Stack.Screen
            name="Tracking"
            component={TrackingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="List"
            component={ListStudent}
            options={{ headerShown: false }}
          />

          {/* ─── Parent screens ─── */}
          <Stack.Screen
            name="ParentHome"
            component={ParentHomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ParentMap"
            component={ParentMapScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ParentHistory"
            component={ParentHistoryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ParentNotifications"
            component={ParentNotificationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ParentClaim"
            component={ParentClaimScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ParentProfile"
            component={ParentProfileScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ParentProvider>
  );
}
