import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [36.8065, 10.1815];

function emojiIcon(emoji, className) {
  return L.divIcon({
    className: `parent-map-icon ${className}`,
    html: `<span>${emoji}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function MapViewport({ busPosition, routePoints }) {
  const map = useMap();
  useEffect(() => {
    if (busPosition) {
      map.setView([busPosition.latitude, busPosition.longitude], Math.max(map.getZoom(), 14), { animate: true });
    } else if (routePoints.length > 1) {
      map.fitBounds(routePoints, { padding: [30, 30] });
    } else if (routePoints.length === 1) {
      map.setView(routePoints[0], 14);
    }
  }, [busPosition, map, routePoints]);
  return null;
}

export default function ParentTrackingMap({ busPosition, stops = [], assignedStop, child }) {
  const routePoints = useMemo(() => stops
    .filter(stop => Number.isFinite(Number(stop.latitude)) && Number.isFinite(Number(stop.longitude)))
    .map(stop => [Number(stop.latitude), Number(stop.longitude)]), [stops]);
  const center = busPosition
    ? [Number(busPosition.latitude), Number(busPosition.longitude)]
    : routePoints[0] || (child?.home_lat && child?.home_lng ? [Number(child.home_lat), Number(child.home_lng)] : DEFAULT_CENTER);
  const busIcon = useMemo(() => emojiIcon('🚌', 'bus'), []);
  const stopIcon = useMemo(() => emojiIcon('📍', 'stop'), []);
  const selectedStopIcon = useMemo(() => emojiIcon('🎒', 'selected-stop'), []);
  const homeIcon = useMemo(() => emojiIcon('🏠', 'home'), []);

  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom className="parent-live-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport busPosition={busPosition} routePoints={routePoints} />
      {routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{ color: '#0d9488', weight: 5, opacity: 0.75 }} />}
      {stops.map(stop => {
        const isAssigned = Number(stop.id) === Number(assignedStop?.id);
        return <Marker key={stop.id} position={[Number(stop.latitude), Number(stop.longitude)]} icon={isAssigned ? selectedStopIcon : stopIcon}>
          <Popup><strong>{stop.name}</strong><br />{stop.address}{isAssigned && <><br /><b>Arrêt de votre enfant</b></>}</Popup>
        </Marker>;
      })}
      {child?.home_lat && child?.home_lng && <Marker position={[Number(child.home_lat), Number(child.home_lng)]} icon={homeIcon}>
        <Popup>Domicile de {child.first_name}</Popup>
      </Marker>}
      {busPosition && <Marker position={[Number(busPosition.latitude), Number(busPosition.longitude)]} icon={busIcon}>
        <Popup><strong>Bus en temps réel</strong><br />Vitesse : {Math.round(Number(busPosition.speed_kmh) || 0)} km/h</Popup>
      </Marker>}
    </MapContainer>
  );
}
