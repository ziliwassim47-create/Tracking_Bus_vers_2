import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useParent, Notification } from '../../context/ParentContext';
import ParentBottomNav from '../../components/ParentBottomNav';
import { platformShadow } from '../../styles/platformStyles';

type RootStackParamList = {
  ParentHome: undefined;
  ParentMap: undefined;
  ParentHistory: undefined;
  ParentNotifications: undefined;
  ParentClaim: undefined;
  ParentProfile: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ParentNotifications'>;

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  DELAY: { icon: '⏰', color: '#92400e', bg: '#fef3c7' },
  INCIDENT: { icon: '⚠️', color: '#991b1b', bg: '#fee2e2' },
  BOARDED: { icon: '✅', color: '#065f46', bg: '#d1fae5' },
  DROPPED_OFF: { icon: '🏠', color: '#1e40af', bg: '#dbeafe' },
  GENERAL: { icon: '🔔', color: '#4338ca', bg: '#ede9fe' },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
}

function NotificationCard(props: Readonly<{
  notif: Notification;
  onPress: () => void;
}>) {
  const { notif, onPress } = props;
  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.GENERAL;
  const isUnread = !notif.read_at;

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Unread indicator */}
      {isUnread && <View style={styles.unreadDot} />}

      <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
        <Text style={styles.iconEmoji}>{config.icon}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]} numberOfLines={1}>
            {notif.title}
          </Text>
          {isUnread && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>Nouveau</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardMessage} numberOfLines={2}>
          {notif.message}
        </Text>
        <Text style={styles.cardTime}>{formatRelative(notif.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ParentNotificationsScreen(props: Readonly<Props>) {
  const { navigation } = props;
  const { notifications, unreadCount, markNotificationRead } = useParent();

  const unread = notifications.filter((n) => !n.read_at);
  const read = notifications.filter((n) => n.read_at);

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          {unreadCount > 0
            ? `${unreadCount} notification(s) non lue(s)`
            : 'Tout est à jour ✓'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Unread section ─── */}
        {unread.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>🔔 Non lues</Text>
            {unread.map((n) => (
              <NotificationCard
                key={n.id}
                notif={n}
                onPress={() => markNotificationRead(n.id)}
              />
            ))}
          </>
        )}

        {/* ─── Read section ─── */}
        {read.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
              ✓ Lues
            </Text>
            {read.map((n) => (
              <NotificationCard key={n.id} notif={n} onPress={() => {}} />
            ))}
          </>
        )}

        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptySubtitle}>Vous serez alerté dès qu'un événement se produit.</Text>
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
    ...platformShadow('#14b8a6', 6, 0.3, 14, 10),
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
    ...platformShadow('#000', 2, 0.06, 8, 3),
    borderWidth: 1,
    borderColor: '#f3f4f6',
    position: 'relative',
  },
  cardUnread: {
    borderColor: '#a7f3d0',
    borderWidth: 1.5,
    backgroundColor: '#f0fdf8',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    left: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14b8a6',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 20,
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  cardTitleUnread: {
    fontWeight: '800',
    color: '#1e293b',
  },
  newBadge: {
    backgroundColor: '#14b8a6',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  cardMessage: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  cardTime: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
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
