import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useParent } from '../context/ParentContext';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', icon: '🏠', route: 'ParentHome' },
  { label: 'Carte', icon: '🗺️', route: 'ParentMap' },
  { label: 'Trajet', icon: '🛣️', route: 'ParentHistory' },
  { label: 'Alertes', icon: '🔔', route: 'ParentNotifications' },
  { label: 'Profil', icon: '👤', route: 'ParentProfile' },
];

export default function ParentBottomNav() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { unreadCount } = useParent();

  const currentRoute = route.name;

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = currentRoute === item.route;
        const showBadge = item.route === 'ParentNotifications' && unreadCount > 0;

        return (
          <TouchableOpacity
            key={item.route}
            style={styles.navItem}
            onPress={() => {
              if (!isActive) navigation.navigate(item.route);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              {/* Icon emoji */}
              <Text style={[styles.icon, isActive && styles.iconActive]}>
                {item.icon}
              </Text>
              {/* Unread badge */}
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
            {/* Active indicator pill */}
            {isActive && <View style={styles.activePill} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 2,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  icon: {
    fontSize: 24,
    opacity: 0.45,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#14b8a6',
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  activePill: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 3,
    backgroundColor: '#14b8a6',
    borderRadius: 2,
  },
});
