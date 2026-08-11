import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../config';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Child {
  id: number;
  first_name: string;
  last_name: string;
  school_class: string;
  home_address: string;
  home_lat: number;
  home_lng: number;
  alert_radius_m: number;
  status: 'WAITING' | 'BOARDED' | 'DROPPED_OFF' | 'ABSENT';
}

export interface BusPosition {
  latitude: number;
  longitude: number;
  speed_kmh: number;
  recorded_at: string;
}

export interface Trip {
  id: number;
  route_name: string;
  registration: string;
  driver_name: string;
  assistant_name: string;
  direction: 'MORNING' | 'AFTERNOON';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduled_start_at: string;
  actual_start_at: string | null;
  actual_end_at: string | null;
  delay_minutes: number;
  origin: string;
  destination: string;
  bus_label: string;
}

export interface Notification {
  id: number;
  type: 'DELAY' | 'INCIDENT' | 'BOARDED' | 'DROPPED_OFF' | 'GENERAL';
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export interface ParentUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'PARENT';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_USER: ParentUser = {
  id: 1,
  first_name: 'Sana',
  last_name: 'Ben Ali',
  email: 'parent@demo.tn',
  phone: '+216 24 444 777',
  role: 'PARENT',
};

const MOCK_CHILDREN: Child[] = [
  {
    id: 1,
    first_name: 'Adam',
    last_name: 'Ben Ali',
    school_class: '3ème B',
    home_address: '12 Rue de la Liberté, Tunis',
    home_lat: 36.8150,
    home_lng: 10.1690,
    alert_radius_m: 300,
    status: 'BOARDED',
  },
  {
    id: 2,
    first_name: 'Lina',
    last_name: 'Ben Ali',
    school_class: '5ème A',
    home_address: '12 Rue de la Liberté, Tunis',
    home_lat: 36.8155,
    home_lng: 10.1695,
    alert_radius_m: 300,
    status: 'WAITING',
  },
];

const MOCK_TRIP: Trip = {
  id: 101,
  route_name: 'Ligne 3 — Centre Ville',
  registration: '153 TUN 2024',
  driver_name: 'Mohamed Salah',
  assistant_name: 'Amira Boughanmi',
  direction: 'MORNING',
  status: 'IN_PROGRESS',
  scheduled_start_at: new Date(Date.now() - 25 * 60000).toISOString(),
  actual_start_at: new Date(Date.now() - 23 * 60000).toISOString(),
  actual_end_at: null,
  delay_minutes: 2,
  origin: 'Cité El Ghazala',
  destination: 'École Primaire Ibn Khaldoun',
  bus_label: 'Bus 3',
};

const MOCK_COMPLETED_TRIPS: Trip[] = [
  {
    ...MOCK_TRIP,
    id: 99,
    status: 'COMPLETED',
    scheduled_start_at: new Date(Date.now() - 86400000).toISOString(),
    actual_start_at: new Date(Date.now() - 86400000 + 120000).toISOString(),
    actual_end_at: new Date(Date.now() - 86400000 + 3600000).toISOString(),
    delay_minutes: 0,
  },
  {
    ...MOCK_TRIP,
    id: 98,
    status: 'COMPLETED',
    direction: 'AFTERNOON',
    scheduled_start_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    actual_start_at: new Date(Date.now() - 2 * 86400000 + 300000).toISOString(),
    actual_end_at: new Date(Date.now() - 2 * 86400000 + 4200000).toISOString(),
    delay_minutes: 5,
  },
  {
    ...MOCK_TRIP,
    id: 97,
    status: 'COMPLETED',
    scheduled_start_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    actual_start_at: new Date(Date.now() - 3 * 86400000 + 60000).toISOString(),
    actual_end_at: new Date(Date.now() - 3 * 86400000 + 3480000).toISOString(),
    delay_minutes: 0,
  },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: 'BOARDED',
    title: 'Adam est monté dans le bus',
    message: 'Votre enfant Adam a embarqué à l\'arrêt Cité El Ghazala à 07:32.',
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    read_at: null,
  },
  {
    id: 2,
    type: 'DELAY',
    title: 'Retard de 5 minutes',
    message: 'Le bus Ligne 3 accuse un retard de 5 minutes dû au trafic.',
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    read_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 3,
    type: 'DROPPED_OFF',
    title: 'Adam est arrivé à l\'école',
    message: 'Votre enfant Adam a été déposé à l\'école à 08:15.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    read_at: new Date(Date.now() - 86000000).toISOString(),
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface ParentContextValue {
  user: ParentUser;
  children: Child[];
  selectedChild: Child | null;
  busPosition: BusPosition | null;
  currentTrip: Trip | null;
  completedTrips: Trip[];
  notifications: Notification[];
  unreadCount: number;
  useMockData: boolean;
  selectChild: (child: Child) => void;
  markNotificationRead: (id: number) => void;
  refreshBusPosition: () => Promise<void>;
}

const ParentContext = createContext<ParentContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ParentProvider(props: Readonly<{ children: React.ReactNode }>) {
  const { children: reactChildren } = props;
  const [user] = useState<ParentUser>(MOCK_USER);
  const [childrenList] = useState<Child[]>(MOCK_CHILDREN);
  const [selectedChild, setSelectedChild] = useState<Child | null>(MOCK_CHILDREN[0]);
  const [currentTrip] = useState<Trip | null>(MOCK_TRIP);
  const [completedTrips] = useState<Trip[]>(MOCK_COMPLETED_TRIPS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [useMockData] = useState(true);
  const [busPosition, setBusPosition] = useState<BusPosition>({
    latitude: 36.8126,
    longitude: 10.1762,
    speed_kmh: 28,
    recorded_at: new Date().toISOString(),
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  function getMockPositionUpdate(prev: BusPosition, maxDelta: number): BusPosition {
    const step = (Math.floor(Date.now() / 10000) % 5) - 2;
    const latitude = prev.latitude + step * maxDelta * 0.35;
    const longitude = prev.longitude + (step * 1.5 - 1) * maxDelta * 0.35;
    const speed_kmh = Math.max(0, Math.min(60, prev.speed_kmh + (step % 3 - 1) * 2));
    return {
      latitude,
      longitude,
      speed_kmh,
      recorded_at: new Date().toISOString(),
    };
  }

  // Simulate bus movement for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setBusPosition((prev) => getMockPositionUpdate(prev, 0.0008));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const selectChild = useCallback((child: Child) => {
    setSelectedChild(child);
  }, []);

  const markNotificationRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
  }, []);

  const refreshBusPosition = useCallback(async () => {
    if (useMockData) {
      setBusPosition((prev) => getMockPositionUpdate(prev, 0.001));
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/parent/bus-position`);
      const pos = await res.json();
      setBusPosition(pos);
    } catch {
      // Keep previous position on error
    }
  }, [useMockData]);

  const contextValue = useMemo(
    () => ({
      user,
      children: childrenList,
      selectedChild,
      busPosition,
      currentTrip,
      completedTrips,
      notifications,
      unreadCount,
      useMockData,
      selectChild,
      markNotificationRead,
      refreshBusPosition,
    }),
    [
      user,
      childrenList,
      selectedChild,
      busPosition,
      currentTrip,
      completedTrips,
      notifications,
      unreadCount,
      useMockData,
      selectChild,
      markNotificationRead,
      refreshBusPosition,
    ]
  );

  return (
    <ParentContext.Provider value={contextValue}>
      {reactChildren}
    </ParentContext.Provider>
  );
}

export function useParent(): ParentContextValue {
  const ctx = useContext(ParentContext);
  if (!ctx) throw new Error('useParent must be used within ParentProvider');
  return ctx;
}
