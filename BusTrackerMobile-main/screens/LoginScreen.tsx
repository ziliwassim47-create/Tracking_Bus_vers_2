import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { platformShadow, platformTextShadow } from '../styles/platformStyles';
import { API_BASE_URL } from '../config';
import { AuthSession, saveSession } from '../utils/session';
import type { AssistantStackParamList } from '../App';

type LoginScreenProps = NativeStackScreenProps<AssistantStackParamList, 'Login'>;

export default function LoginScreen(props: Readonly<LoginScreenProps>) {
  const { navigation } = props;
  const [phone, setPhone] = useState('20400400');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation for container translateY + opacity (like fade-in + slide)
  const animTranslateY = React.useRef(new Animated.Value(20)).current;
  const animOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(animTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!phone || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Connexion impossible');
      const session = result as AuthSession;
      if (session.user.role !== 'ASSISTANT') {
        throw new Error("Cet espace est réservé aux assistantes.");
      }
      await saveSession(session);
      navigation.reset({ index: 0, routes: [{ name: 'List' }] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Connexion impossible';
      Alert.alert('Erreur de connexion', message);
    } finally {
      setLoading(false);
    }
  }

  const loginButtonLabel = loading ? 'Connexion...' : '🔐 Se connecter';

  return (
    <KeyboardAvoidingView
      style={styles.body}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
        style={[
          styles.loginContainer,
          {
            transform: [{ translateY: animTranslateY }],
            opacity: animOpacity,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Espace Assistante</Text>
          <Text style={styles.subtitle}>Présences et démarrage du trajet</Text>
        </View>

        {/* ─── Phone ─── */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Entrez votre numéro"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* ─── Password ─── */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={styles.inputFieldPassword}
              placeholder="Entrez votre mot de passe"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
              activeOpacity={0.7}
            >
              <Icon
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={24}
                color="#14b8a6"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Submit ─── */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && { opacity: 0.7 },
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>{loginButtonLabel}</Text>
        </TouchableOpacity>

        <Text style={styles.accountHint}>Compte test : 20400400 / demo1234</Text>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: '#f0fdfa',
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  loginContainer: {
    width: '100%',
    maxWidth: 420,
    ...Platform.select({ web: { boxSizing: 'border-box' as const } }),
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 32,
    ...platformShadow('#000', 4, 0.12, 12, 6),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  headerContainer: {
    backgroundColor: '#14b8a6',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 24,
    ...platformShadow('#14b8a6', 4, 0.3, 8, 6),
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.8,
    ...platformTextShadow('rgba(0,0,0,0.1)', 2, 4),
  },
  headerSubtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#ccfbf1',
    fontWeight: '500',
    opacity: 0.95,
  },
  logo: {
    width: 180,
    height: 60,
    alignSelf: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    paddingLeft: 2,
  },
  inputField: {
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: '#1e293b',
    ...platformShadow('#000', 1, 0.05, 3, 2),
    width: '100%',
  },
  inputFieldPassword: {
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: '#1e293b',
    ...platformShadow('#000', 1, 0.05, 3, 2),
    width: '100%',
  },
  passwordField: {
    position: 'relative',
    width: '100%',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 22,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#14b8a6',
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  rememberMeText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  forgotPassword: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
  },
  loginButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    ...platformShadow('#14b8a6', 6, 0.4, 12, 8),
    borderWidth: 2,
    borderColor: '#2dd4bf',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.8,
    ...platformTextShadow('rgba(0,0,0,0.1)', 1, 2),
  },
  accountHint: {
    marginTop: 18,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerLink: {
    color: '#14b8a6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
