import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Child, useParent } from '../context/ParentContext';

// Returns initials from first+last name
function getInitials(child: Child): string {
  return `${child.first_name.charAt(0)}${child.last_name.charAt(0)}`.toUpperCase();
}

// Avatar color based on child id (rotates through a warm palette)
const AVATAR_COLORS = ['#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'];
function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const STATUS_COLORS: Record<string, string> = {
  WAITING: '#f59e0b',
  BOARDED: '#10b981',
  DROPPED_OFF: '#6366f1',
  ABSENT: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'En attente',
  BOARDED: 'À bord',
  DROPPED_OFF: 'Déposé',
  ABSENT: 'Absent',
};

interface ChildSwitcherProps {
  /** Compact mode — smaller cards, used inside screens */
  compact?: boolean;
}

export default function ChildSwitcher(props: Readonly<ChildSwitcherProps>) {
  const { compact = false } = props;
  const { children, selectedChild, selectChild } = useParent();

  if (!children.length) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {children.map((child) => {
          const isSelected = selectedChild?.id === child.id;
          const color = avatarColor(child.id);
          return (
            <TouchableOpacity
              key={child.id}
              activeOpacity={0.8}
              onPress={() => selectChild(child)}
              style={[
                styles.card,
                compact && styles.cardCompact,
                isSelected && { borderColor: color, borderWidth: 2.5 },
              ]}
            >
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: color }, compact && styles.avatarCompact]}>
                <Text style={[styles.avatarText, compact && styles.avatarTextCompact]}>
                  {getInitials(child)}
                </Text>
              </View>

              {/* Name */}
              <Text
                style={[styles.name, compact && styles.nameCompact, isSelected && { color }]}
                numberOfLines={1}
              >
                {child.first_name}
              </Text>

              {/* Status dot */}
              {!compact && (
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[child.status] || '#9ca3af' }]} />
              )}

              {/* Status label — only on full card */}
              {!compact && (
                <Text style={[styles.statusLabel, { color: STATUS_COLORS[child.status] || '#9ca3af' }]}>
                  {STATUS_LABELS[child.status] || child.status}
                </Text>
              )}

              {/* Active indicator */}
              {isSelected && <View style={[styles.activeBar, { backgroundColor: color }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 2,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  cardCompact: {
    padding: 10,
    minWidth: 70,
    borderRadius: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 6,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  avatarTextCompact: {
    fontSize: 14,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 6,
  },
  nameCompact: {
    fontSize: 12,
    marginBottom: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
});
