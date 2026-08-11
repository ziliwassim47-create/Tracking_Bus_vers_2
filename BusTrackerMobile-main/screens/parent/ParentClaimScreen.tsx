import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useParent } from '../../context/ParentContext';
import ParentBottomNav from '../../components/ParentBottomNav';
import { API_BASE_URL } from '../../config';

type RootStackParamList = {
  ParentHome: undefined;
  ParentMap: undefined;
  ParentHistory: undefined;
  ParentNotifications: undefined;
  ParentClaim: undefined;
  ParentProfile: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ParentClaim'>;

const CATEGORIES = [
  { value: 'DELAY', label: '⏰ Retard', color: '#f59e0b' },
  { value: 'BEHAVIOUR', label: '😤 Comportement', color: '#ef4444' },
  { value: 'VEHICLE', label: '🚌 Véhicule', color: '#3b82f6' },
  { value: 'ROUTE', label: '🛣️ Itinéraire', color: '#8b5cf6' },
  { value: 'SAFETY', label: '🛡️ Sécurité', color: '#14b8a6' },
  { value: 'OTHER', label: '📋 Autre', color: '#6b7280' },
];

export default function ParentClaimScreen(props: Readonly<Props>) {
  const { navigation } = props;
  const { currentTrip, useMockData } = useParent();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid = selectedCategory !== '' && description.trim().length > 10;

  async function handleSubmit() {
    if (!isValid) {
      Alert.alert('Champs incomplets', 'Veuillez choisir une catégorie et décrire le problème (minimum 10 caractères).');
      return;
    }

    setLoading(true);
    try {
      if (useMockData) {
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        await fetch(`${API_BASE_URL}/incidents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: selectedCategory,
            description: description.trim(),
            trip_id: currentTrip?.id ?? null,
          }),
        });
      }
      setSubmitted(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', `Impossible d'envoyer la réclamation. ${message}`);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Réclamation</Text>
        </View>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Réclamation envoyée !</Text>
          <Text style={styles.successMessage}>
            Votre réclamation a bien été transmise à l'administration. Vous recevrez une réponse dans les plus brefs délais.
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => {
              setSubmitted(false);
              setSelectedCategory('');
              setDescription('');
            }}
          >
            <Text style={styles.successBtnText}>Nouvelle réclamation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.successBtnSecondary}
            onPress={() => navigation.navigate('ParentHome')}
          >
            <Text style={styles.successBtnSecondaryText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
        <ParentBottomNav />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réclamation</Text>
        <Text style={styles.headerSubtitle}>Décrivez précisément le problème rencontré</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Trip info */}
        {currentTrip && (
          <View style={styles.tripInfoCard}>
            <Text style={styles.tripInfoLabel}>Trajet concerné</Text>
            <Text style={styles.tripInfoValue}>
              🚌 {currentTrip.route_name} · {currentTrip.registration}
            </Text>
          </View>
        )}

        {/* Category selector */}
        <Text style={styles.fieldLabel}>Catégorie *</Text>
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryItem,
                  isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                ]}
                onPress={() => setSelectedCategory(cat.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                {isSelected && (
                  <View style={[styles.selectedCheck, { backgroundColor: cat.color }]}>
                    <Text style={styles.selectedCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.fieldLabel}>Description *</Text>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={6}
          placeholder="Décrivez le problème en détail... (min. 10 caractères)"
          placeholderTextColor="#9ca3af"
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.trim().length} caractère(s)</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>📨 Envoyer la réclamation</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      <ParentBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdfa' },
  header: {
    backgroundColor: '#14b8a6',
    paddingTop: 54,
    paddingBottom: 22,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  backBtn: { color: '#e0fdf4', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#ccfbf1', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  tripInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tripInfoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  tripInfoValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: '#374151', marginBottom: 10 },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  categoryItem: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  selectedCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheckText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  textarea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 14,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 130,
    marginBottom: 6,
  },
  charCount: { fontSize: 11, color: '#9ca3af', fontWeight: '500', textAlign: 'right', marginBottom: 20 },
  submitBtn: {
    backgroundColor: '#14b8a6',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  successMessage: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  successBtn: {
    backgroundColor: '#14b8a6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  successBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  successBtnSecondary: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  successBtnSecondaryText: { color: '#374151', fontWeight: '700', fontSize: 14 },
});
