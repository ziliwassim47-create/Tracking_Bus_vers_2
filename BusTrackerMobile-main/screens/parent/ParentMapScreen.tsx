import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useParent } from '../../context/ParentContext';
import ChildSwitcher from '../../components/ChildSwitcher';
import ParentBottomNav from '../../components/ParentBottomNav';
import { WebView } from 'react-native-webview';

type RootStackParamList = {
  ParentHome: undefined;
  ParentMap: undefined;
  ParentHistory: undefined;
  ParentNotifications: undefined;
  ParentClaim: undefined;
  ParentProfile: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'ParentMap'>;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export default function ParentMapScreen(props: Readonly<Props>) {
  const { navigation } = props;
  const { busPosition, selectedChild, currentTrip, refreshBusPosition } = useParent();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const webViewRef = useRef<WebView>(null);

  // Pulse animation for live dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshBusPosition();
    setIsRefreshing(false);
  }, [refreshBusPosition]);

  const busLat = busPosition?.latitude ?? 36.8126;
  const busLng = busPosition?.longitude ?? 10.1762;
  const busSpeed = busPosition?.speed_kmh ?? 0;

  const stopLat = selectedChild?.home_lat ?? 36.815;
  const stopLng = selectedChild?.home_lng ?? 10.169;
  const stopName = selectedChild
    ? `${selectedChild.first_name} ${selectedChild.last_name}`
    : 'Arrêt élève';

  const distance = getDistance(busLat, busLng, stopLat, stopLng);
  const eta = Math.max(1, Math.round(distance / 400)); // ~400m/min average

  // Build the Leaflet HTML for WebView
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { height: 100vh; width: 100vw; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map').setView([${busLat}, ${busLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Bus marker (blue circle)
    var busIcon = L.divIcon({
      className: '',
      html: '<div style="width:36px;height:36px;background:#14b8a6;border-radius:50%;border:4px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px">🚌</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Stop marker (purple)
    var stopIcon = L.divIcon({
      className: '',
      html: '<div style="width:32px;height:32px;background:#8b5cf6;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px">🏠</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    var busMarker = L.marker([${busLat}, ${busLng}], { icon: busIcon })
      .addTo(map)
      .bindPopup('<b>Bus en direct</b><br>Vitesse: ${Math.round(busSpeed)} km/h', { closeButton: false })
      .openPopup();

    var stopMarker = L.marker([${stopLat}, ${stopLng}], { icon: stopIcon })
      .addTo(map)
      .bindPopup('<b>Arrêt: ${stopName}</b>');

    // Draw line between bus and stop
    var line = L.polyline([[${busLat}, ${busLng}], [${stopLat}, ${stopLng}]], {
      color: '#14b8a6',
      weight: 3,
      dashArray: '8, 6',
      opacity: 0.7,
    }).addTo(map);

    map.fitBounds([[${busLat}, ${busLng}], [${stopLat}, ${stopLng}]], { padding: [50, 50] });
  </script>
</body>
</html>
`;

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carte en direct</Text>
        <Text style={styles.headerSubtitle}>
          {currentTrip ? `${currentTrip.route_name} · ${currentTrip.registration}` : 'Aucun trajet'}
        </Text>

        {/* Live dot */}
        <View style={styles.liveRow}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveLabel}>En direct</Text>
        </View>
      </View>

      {/* ─── Child Switcher ─── */}
      <View style={styles.switcherContainer}>
        <ChildSwitcher compact />
      </View>

      {/* ─── Map ─── */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          scrollEnabled={false}
          originWhitelist={['*']}
        />
      </View>

      {/* ─── Metrics Sheet ─── */}
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>
          {currentTrip ? `${currentTrip.route_name} · ${currentTrip.registration}` : 'Bus scolaire'}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Distance arrêt</Text>
            <Text style={styles.metricValue}>{formatDistance(distance)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ETA</Text>
            <Text style={styles.metricValue}>{eta} min</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Vitesse</Text>
            <Text style={styles.metricValue}>{Math.round(busSpeed)} km/h</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, isRefreshing && styles.refreshBtnActive]}
          onPress={handleRefresh}
          disabled={isRefreshing}
          activeOpacity={0.8}
        >
          <Text style={styles.refreshBtnText}>
            {isRefreshing ? '⟳ Actualisation...' : '↻ Actualiser la position'}
          </Text>
        </TouchableOpacity>
      </View>

      <ParentBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdfa' },
  header: {
    backgroundColor: '#14b8a6',
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    marginBottom: 6,
  },
  backBtnText: {
    color: '#e0fdf4',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#ccfbf1',
    fontWeight: '500',
    marginBottom: 10,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowRadius: 4,
    shadowOpacity: 0.9,
    elevation: 3,
  },
  liveLabel: {
    color: '#ccfbf1',
    fontSize: 12,
    fontWeight: '600',
  },
  switcherContainer: {
    paddingVertical: 8,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 14,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  map: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14b8a6',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  refreshBtn: {
    backgroundColor: '#14b8a6',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  refreshBtnActive: {
    backgroundColor: '#0d9488',
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
