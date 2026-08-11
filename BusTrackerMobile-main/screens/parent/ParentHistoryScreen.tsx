import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useParent, Trip } from '../../context/ParentContext';
import ChildSwitcher from '../../components/ChildSwitcher';
import ParentBottomNav from '../../components/ParentBottomNav';

type RootStackParamList = {
  ParentHome: undefined;
  ParentMap: undefined;
  ParentHistory: undefined;
  ParentNotifications: undefined;
  ParentClaim: undefined;
  ParentProfile: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ParentHistory'>;

function formatDateLong(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function TripCard(props: Readonly<{ trip: Trip }>) {
  const { trip } = props;
  const isMorning = trip.direction === 'MORNING';
  const isDelayed = trip.delay_minutes > 0;
  const duration = trip.actual_end_at && trip.actual_start_at
    ? Math.round((new Date(trip.actual_end_at).getTime() - new Date(trip.actual_start_at).getTime()) / 60000)
    : null;

  return (
    <View style={styles.tripCard}>
      <View style={styles.tripCardLeft}>
        <View style={[styles.directionIcon, { backgroundColor: isMorning ? '#fef3c7' : '#ede9fe' }]}>
          <Text style={styles.directionEmoji}>{isMorning ? '🌅' : '🌆'}</Text>
        </View>
        {/* Vertical timeline line */}
        <View style={styles.timelineLine} />
      </View>

      <View style={styles.tripCardRight}>
        <Text style={styles.tripDate}>{formatDateLong(trip.scheduled_start_at)}</Text>
        <Text style={styles.tripDirection}>{isMorning ? 'Matin' : 'Après-midi'}</Text>

        <View style={styles.tripTimesRow}>
          <View style={styles.tripTimeItem}>
            <Text style={styles.tripTimeLabel}>Départ</Text>
            <Text style={styles.tripTimeValue}>{formatTime(trip.actual_start_at)}</Text>
          </View>
          <Text style={styles.tripTimeSep}>→</Text>
          <View style={styles.tripTimeItem}>
            <Text style={styles.tripTimeLabel}>Arrivée</Text>
            <Text style={styles.tripTimeValue}>{formatTime(trip.actual_end_at)}</Text>
          </View>
          {duration !== null && (
            <>
              <Text style={styles.tripTimeSep}>·</Text>
              <View style={styles.tripTimeItem}>
                <Text style={styles.tripTimeLabel}>Durée</Text>
                <Text style={styles.tripTimeValue}>{duration} min</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.tripFooter}>
          <Text style={styles.tripRoute}>{trip.route_name}</Text>
          <View
            style={[
              styles.tripBadge,
              { backgroundColor: isDelayed ? '#fef3c7' : '#d1fae5' },
            ]}
          >
            <Text
              style={[
                styles.tripBadgeText,
                { color: isDelayed ? '#92400e' : '#065f46' },
              ]}
            >
              {isDelayed ? `+${trip.delay_minutes} min` : 'À l\'heure'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ParentHistoryScreen(props: Readonly<Props>) {
  const { navigation } = props;
  const { completedTrips, selectedChild } = useParent();

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique des trajets</Text>
        <Text style={styles.headerSubtitle}>
          {selectedChild
            ? `Suivi de ${selectedChild.first_name} · ${completedTrips.length} trajet(s)`
            : `${completedTrips.length} trajet(s) terminé(s)`}
        </Text>
      </View>

      {/* ─── Child Switcher ─── */}
      <View style={styles.switcherWrap}>
        <ChildSwitcher compact />
      </View>

      {/* ─── Trip List ─── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {completedTrips.length > 0 ? (
          completedTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Aucun trajet terminé</Text>
            <Text style={styles.emptySubtitle}>Les trajets apparaîtront ici une fois complétés.</Text>
          </View>
        )}
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
  backBtn: {
    color: '#e0fdf4',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#ccfbf1',
    fontWeight: '500',
  },
  switcherWrap: {
    paddingVertical: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  tripCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  tripCardLeft: {
    width: 60,
    alignItems: 'center',
    paddingTop: 18,
    backgroundColor: '#fafafa',
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
  },
  directionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionEmoji: {
    fontSize: 20,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e5e7eb',
    marginTop: 8,
    marginBottom: 0,
    borderRadius: 1,
  },
  tripCardRight: {
    flex: 1,
    padding: 16,
  },
  tripDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  tripDirection: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  tripTimeItem: {
    alignItems: 'center',
  },
  tripTimeLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 2,
  },
  tripTimeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  tripTimeSep: {
    fontSize: 14,
    color: '#d1d5db',
    fontWeight: '700',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripRoute: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  tripBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tripBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
});
