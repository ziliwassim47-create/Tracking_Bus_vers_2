import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useParent, Child } from '../../context/ParentContext';
import ParentBottomNav from '../../components/ParentBottomNav';
import { platformShadow } from '../../styles/platformStyles';
import { confirmLogout } from '../../utils/logout';

type RootStackParamList = {
  ParentHome: undefined;
  ParentMap: undefined;
  ParentHistory: undefined;
  ParentNotifications: undefined;
  ParentClaim: undefined;
  ParentProfile: undefined;
  Login: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ParentProfile'>;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const AVATAR_COLORS = ['#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'];

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'En attente',
  BOARDED: 'À bord du bus',
  DROPPED_OFF: 'Déposé à l\'école',
  ABSENT: 'Absent',
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: '#f59e0b',
  BOARDED: '#10b981',
  DROPPED_OFF: '#6366f1',
  ABSENT: '#ef4444',
};

function InfoRow(props: Readonly<{ icon: string; label: string; value: string }>) {
  const { icon, label, value } = props;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ChildCard(props: Readonly<{ child: Child }>) {
  const { child } = props;
  const color = AVATAR_COLORS[child.id % AVATAR_COLORS.length];
  return (
    <View style={[styles.childCard, { borderLeftColor: color }]}>
      <View style={[styles.childAvatar, { backgroundColor: color }]}>
        <Text style={styles.childAvatarText}>
          {getInitials(child.first_name, child.last_name)}
        </Text>
      </View>
      <View style={styles.childInfo}>
        <Text style={styles.childName}>
          {child.first_name} {child.last_name}
        </Text>
        <Text style={styles.childClass}>{child.school_class}</Text>
        <Text style={styles.childAddress} numberOfLines={1}>{child.home_address}</Text>
      </View>
      <View style={[styles.childStatusBadge, { backgroundColor: `${STATUS_COLORS[child.status]}18` }]}>
        <Text style={[styles.childStatusText, { color: STATUS_COLORS[child.status] }]}>
          {STATUS_LABELS[child.status] || child.status}
        </Text>
      </View>
    </View>
  );
}

export default function ParentProfileScreen(props: Readonly<Props>) {
  const { navigation } = props;
  const { user, children } = useParent();

  function handleLogout() {
    confirmLogout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    });
  }

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon profil</Text>

        {/* Avatar + name in header */}
        <View style={styles.headerProfile}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {getInitials(user.first_name, user.last_name)}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={styles.headerRole}>Parent · {children.length} enfant(s)</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Contact Info ─── */}
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="✉️" label="Email" value={user.email} />
          <View style={styles.infoSep} />
          <InfoRow icon="📞" label="Téléphone" value={user.phone} />
          <View style={styles.infoSep} />
          <InfoRow icon="👨‍👩‍👦" label="Enfants inscrits" value={`${children.length} enfant(s)`} />
        </View>

        {/* ─── Children List ─── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Mes enfants</Text>
        {children.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}

        {/* ─── Alert Radius Info ─── */}
        <View style={styles.alertInfoCard}>
          <Text style={styles.alertInfoIcon}>📍</Text>
          <View style={styles.alertInfoBody}>
            <Text style={styles.alertInfoTitle}>Zone d'alerte de proximité</Text>
            <Text style={styles.alertInfoText}>
              Vous êtes notifié lorsque le bus entre dans un rayon de {children[0]?.alert_radius_m ?? 300} m de l'arrêt de votre enfant.
            </Text>
          </View>
        </View>

        {/* ─── Logout ─── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutBtnText}>🚪 Se déconnecter</Text>
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
    paddingBottom: 24,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...platformShadow('#14b8a6', 8, 0.35, 16, 12),
  },
  backBtn: { color: '#e0fdf4', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#ccfbf1', marginBottom: 16 },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  headerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerRole: {
    fontSize: 13,
    color: '#ccfbf1',
    fontWeight: '500',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 4,
    ...platformShadow('#000', 3, 0.08, 10, 4),
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0fdf8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: { fontSize: 18 },
  infoBody: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  infoSep: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },
  childCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderLeftWidth: 4,
    ...platformShadow('#000', 2, 0.07, 8, 3),
    gap: 12,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  childAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  childInfo: { flex: 1 },
  childName: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  childClass: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 2 },
  childAddress: { fontSize: 11, color: '#9ca3af' },
  childStatusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  childStatusText: { fontSize: 11, fontWeight: '800' },
  alertInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf8',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 12,
  },
  alertInfoIcon: { fontSize: 24 },
  alertInfoBody: { flex: 1 },
  alertInfoTitle: { fontSize: 13, fontWeight: '800', color: '#065f46', marginBottom: 4 },
  alertInfoText: { fontSize: 12, color: '#047857', lineHeight: 18 },
  logoutBtn: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fee2e2',
  },
  logoutBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 16 },
});
