import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useParent } from '../../context/ParentContext';
import ChildSwitcher from '../../components/ChildSwitcher';
import ParentBottomNav from '../../components/ParentBottomNav';
import { platformShadow, supportsNativeAnimations } from '../../styles/platformStyles';

type RootStackParamList = {
  ParentHome: undefined;
  ParentMap: undefined;
  ParentHistory: undefined;
  ParentNotifications: undefined;
  ParentClaim: undefined;
  ParentProfile: undefined;
  Login: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ParentHome'>;

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  const date = new Date(iso);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#f59e0b',
  IN_PROGRESS: '#10b981',
  COMPLETED: '#6366f1',
  CANCELLED: '#ef4444',
};

interface ActionTileProps {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
  color?: string;
  width: number;
}

function ActionTile(props: Readonly<ActionTileProps>) {
  const { icon, label, onPress, primary, color = '#14b8a6', width } = props;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: supportsNativeAnimations }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: supportsNativeAnimations }).start();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ width }}
    >
      <Animated.View
        style={[
          styles.actionTile,
          primary && [styles.actionTilePrimary, { backgroundColor: color }],
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.actionTileIcon, primary && styles.actionTileIconPrimary]}>
          {icon}
        </Text>
        <Text style={[styles.actionTileLabel, primary && styles.actionTileLabelPrimary]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function ParentHomeScreen(props: Readonly<Props>) {
  const { navigation } = props;
  const { user, selectedChild, currentTrip, busPosition, unreadCount } = useParent();
  const { width: viewportWidth } = useWindowDimensions();
  const contentWidth = Math.min(viewportWidth, 600);
  const actionColumns = contentWidth < 520 ? 2 : 3;
  const actionTileWidth = (contentWidth - 24 - (actionColumns - 1) * 10) / actionColumns;
  const isNarrowPhone = viewportWidth <= 380;

  const positionAge = busPosition
    ? new Date(busPosition.recorded_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'indisponible';

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Bonjour 👋</Text>
            <Text style={styles.headerName}>
              {user.first_name} {user.last_name}
            </Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user.first_name, user.last_name)}</Text>
          </View>
        </View>

        {/* Bus position info */}
        <View style={[styles.busInfoRow, isNarrowPhone && styles.busInfoRowNarrow]}>
          <Text style={styles.busInfoDot}>🟢</Text>
          <Text style={styles.busInfoText}>
            Dernière position du bus : {positionAge}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} alerte{unreadCount > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ─── Child Switcher ─── */}
        <Text style={styles.sectionTitle}>
          {selectedChild ? `Suivi de ${selectedChild.first_name}` : 'Mes enfants'}
        </Text>
        <ChildSwitcher />

        {/* ─── Current Trip Card ─── */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Trajet en cours</Text>
        {currentTrip ? (
          <View style={styles.tripCard}>
            <View style={[styles.tripCardRow, isNarrowPhone && styles.tripCardRowNarrow]}>
              <Text style={styles.tripIcon}>🚌</Text>
              <View style={styles.tripCardBody}>
                <Text style={styles.tripTitle}>
                  {currentTrip.route_name} · {currentTrip.registration}
                </Text>
                <Text style={styles.tripMeta}>
                  {currentTrip.driver_name} · Départ {formatTime(currentTrip.scheduled_start_at)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isNarrowPhone && styles.statusBadgeNarrow,
                  { backgroundColor: `${STATUS_COLORS[currentTrip.status]}20` },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[currentTrip.status] }]}>
                  {STATUS_LABELS[currentTrip.status]}
                </Text>
              </View>
            </View>

            {/* Route line */}
            <View style={styles.routeLine}>
              <View style={styles.routeDot} />
              <View style={styles.routeBar} />
              <View style={[styles.routeDot, styles.routeDotEnd]} />
            </View>
            <View style={styles.routeEndpoints}>
              <Text style={styles.routeEndpointText}>{currentTrip.origin}</Text>
              <Text style={styles.routeEndpointText}>{currentTrip.destination}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Aucun trajet planifié</Text>
          </View>
        )}

        {/* ─── Actions Grid ─── */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Actions rapides</Text>
        <View style={styles.actionsGrid}>
          <ActionTile width={actionTileWidth} icon="🗺️" label="Carte en direct" primary onPress={() => navigation.navigate('ParentMap')} />
          <ActionTile width={actionTileWidth} icon="🛣️" label="Historique" onPress={() => navigation.navigate('ParentHistory')} />
          <ActionTile width={actionTileWidth} icon="🔔" label="Notifications" onPress={() => navigation.navigate('ParentNotifications')} />
          <ActionTile width={actionTileWidth} icon="⚠️" label="Réclamation" onPress={() => navigation.navigate('ParentClaim')} />
          <ActionTile width={actionTileWidth} icon="👤" label="Mon profil" onPress={() => navigation.navigate('ParentProfile')} />
          <ActionTile width={actionTileWidth} icon="ℹ️" label="Informations" onPress={() => {}} />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ─── Bottom Navigation ─── */}
      <ParentBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdfa',
  },
  header: {
    backgroundColor: '#14b8a6',
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...platformShadow('#14b8a6', 8, 0.35, 16, 12),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  kicker: {
    fontSize: 14,
    color: '#ccfbf1',
    fontWeight: '600',
    marginBottom: 4,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  busInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  busInfoRowNarrow: {
    flexWrap: 'wrap',
  },
  busInfoDot: {
    fontSize: 10,
  },
  busInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#e0fdf4',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 10,
    paddingHorizontal: 20,
    letterSpacing: 0.2,
  },
  tripCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    ...platformShadow('#000', 4, 0.1, 12, 5),
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  tripCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  tripCardRowNarrow: {
    flexWrap: 'wrap',
  },
  tripIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  tripCardBody: {
    flex: 1,
    minWidth: 0,
  },
  tripTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  tripMeta: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeNarrow: {
    marginLeft: 38,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#14b8a6',
  },
  routeDotEnd: {
    backgroundColor: '#8b5cf6',
  },
  routeBar: {
    flex: 1,
    height: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
    borderRadius: 2,
  },
  routeEndpoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeEndpointText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    gap: 10,
  },
  actionTile: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    ...platformShadow('#000', 2, 0.07, 8, 3),
    borderWidth: 1.5,
    borderColor: '#f3f4f6',
  },
  actionTilePrimary: {
    ...platformShadow('#000', 2, 0.25, 8, 6),
    borderWidth: 0,
  },
  actionTileIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  actionTileIconPrimary: {
    fontSize: 28,
  },
  actionTileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  actionTileLabelPrimary: {
    color: '#fff',
    fontWeight: '800',
  },
});
