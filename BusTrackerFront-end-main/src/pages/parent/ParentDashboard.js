import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../AuthContext';
import ParentTrackingMap from '../../components/ParentTrackingMap';
import { apiFetch, formatDateTime, SOCKET_URL } from '../../utils';
import './ParentDashboard.css';

const TRIP_STATUS = {
  PLANNED: 'Prévu', IN_PROGRESS: 'En cours', COMPLETED: 'Terminé', CANCELLED: 'Annulé'
};

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'P';
}

function MetricCard({ icon, label, value, detail }) {
  return <article className="parent-metric">
    <span className="parent-metric-icon">{icon}</span>
    <div><span className="parent-metric-label">{label}</span><strong>{value || '—'}</strong>{detail && <small>{detail}</small>}</div>
  </article>;
}

export default function ParentDashboard() {
  const { session, logout } = useAuth();
  const [data, setData] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/bootstrap').then(payload => {
      setData(payload);
      setSelectedChildId(current => current || payload.students?.[0]?.id || null);
    }).catch(err => setError(err.message));
  }, []);

  const loadTracking = useCallback(async (showLoader = false) => {
    if (!selectedChildId) return;
    if (showLoader) setLoadingTracking(true);
    try {
      setTracking(await apiFetch(`/parent/children/${selectedChildId}/tracking`));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoader) setLoadingTracking(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (!selectedChildId) return undefined;
    void loadTracking(true);
    const timer = setInterval(() => { void loadTracking(false); }, 10000);
    return () => clearInterval(timer);
  }, [loadTracking, selectedChildId]);

  const busId = tracking?.assignment?.bus_id;
  useEffect(() => {
    if (!busId) return undefined;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    const updatePosition = position => {
      if (Number(position?.bus_id) !== Number(busId)) return;
      setTracking(previous => previous ? { ...previous, latest_position: position } : previous);
    };
    socket.on('busLocationUpdate', updatePosition);
    return () => { socket.off('busLocationUpdate', updatePosition); socket.disconnect(); };
  }, [busId]);

  const selectedChild = useMemo(() => data?.students?.find(child => Number(child.id) === Number(selectedChildId)) || null,
    [data, selectedChildId]);
  const assignment = tracking?.assignment;
  const trip = tracking?.trip;
  const position = tracking?.latest_position;
  const metrics = tracking?.metrics;
  const assignedStop = assignment ? {
    id: assignment.stop_id,
    name: assignment.stop_name,
    latitude: assignment.stop_latitude,
    longitude: assignment.stop_longitude,
  } : null;
  const positionAge = position?.recorded_at ? Date.now() - Date.parse(position.recorded_at) : Infinity;
  const isLive = positionAge < 60000;
  const parentName = session.profile?.nom || 'Parent';

  return <main className="parent-dashboard">
    <header className="parent-header">
      <div className="parent-header-row">
        <div><span className="parent-kicker">Bonjour 👋</span><h1>{parentName}</h1><p>Espace Parent · Suivi du transport scolaire</p></div>
        <div className="parent-header-actions"><span className="parent-profile-avatar" aria-hidden="true">{initials(parentName)}</span><button className="parent-logout" onClick={logout}>Déconnexion</button></div>
      </div>
      <div className="parent-header-info"><span className={`parent-live-dot ${isLive ? 'online' : ''}`} /><span>{selectedChild ? `Suivi de ${selectedChild.first_name}` : 'Sélectionnez un enfant'}</span><strong>{isLive ? 'Bus en direct' : 'Position en attente'}</strong></div>
    </header>

    <section className="parent-content">
      {error && <div className="parent-error">⚠️ {error}</div>}
      {!data && !error && <div className="loading-center"><div className="spinner" /></div>}

      {!!data?.students?.length && <>
        <section className="parent-child-section" id="parent-children">
          <div className="parent-section-heading"><div><h2>Mes enfants</h2><p>Cliquez sur un enfant pour afficher son bus et son trajet.</p></div></div>
          <div className="parent-child-list">
            {data.students.map(child => {
              const active = Number(child.id) === Number(selectedChildId);
              return <button key={child.id} className={`parent-child-card ${active ? 'active' : ''}`} aria-pressed={active} onClick={() => setSelectedChildId(child.id)}>
                <span className="parent-child-avatar">{child.first_name?.[0]}{child.last_name?.[0]}</span>
                <span><strong>{child.first_name} {child.last_name}</strong><small>{child.school_class || 'Classe non renseignée'}</small></span>
                <span className="parent-child-arrow">›</span>
              </button>;
            })}
          </div>
        </section>

        {loadingTracking ? <div className="loading-center"><div className="spinner" /></div> : tracking && <>
          {!assignment ? <section className="parent-empty"><span>🚌</span><h2>Aucun bus affecté</h2><p>{selectedChild?.first_name} doit être affecté à un bus et à un trajet par l’administration.</p></section> : <>
            <section className="parent-trip-summary" id="parent-tracking">
              <div className="parent-selection-title">
                <div><span className="parent-trip-icon">🚌</span><span><strong>{assignment.route_name}</strong><small>{assignment.bus_label} · {assignment.registration}</small></span></div>
                <span className={`parent-trip-status ${trip?.status === 'IN_PROGRESS' ? 'active' : ''}`}>{TRIP_STATUS[trip?.status] || 'Aucun trajet actif'}</span>
              </div>
              <div className="parent-route-line"><span /><i /><span /></div>
              <div className="parent-route-endpoints"><span>{assignment.origin}</span><span>{assignment.destination}</span></div>
            </section>

            <section className="parent-metrics-grid">
              <MetricCard icon="🚌" label="Bus" value={assignment.bus_label} detail={assignment.registration} />
              <MetricCard icon="👩‍💼" label="Assistante" value={assignment.assistant_name} detail={assignment.assistant_phone} />
              <MetricCard icon="⏱️" label="Durée" value={`${metrics?.elapsed_minutes || 0} min`} detail={`Estimation : ${metrics?.estimated_duration_min || 0} min`} />
              <MetricCard icon="🛣️" label="Kilométrage" value={`${Number(metrics?.distance_km || 0).toFixed(2)} km`} detail={metrics?.remaining_to_stop_km == null ? null : `${metrics.remaining_to_stop_km} km jusqu’à l’arrêt`} />
              <MetricCard icon="📍" label="Coordonnées GPS" value={position ? `${Number(position.latitude).toFixed(5)}, ${Number(position.longitude).toFixed(5)}` : 'Position indisponible'} detail={position ? `${Math.round(Number(position.speed_kmh) || 0)} km/h` : null} />
              <MetricCard icon={isLive ? '🟢' : '⚪'} label="Dernière position" value={isLive ? 'En direct' : 'Hors ligne'} detail={position?.recorded_at ? formatDateTime(position.recorded_at) : 'Aucune position reçue'} />
            </section>

            <section className="parent-map-card" id="parent-map">
              <div className="parent-map-header">
                <div><h2>Suivi en temps réel</h2><p>Position du bus accompagné par {assignment.assistant_name}</p></div>
                <button onClick={() => loadTracking(true)}>↻ Actualiser</button>
              </div>
              <ParentTrackingMap busPosition={position} stops={tracking.stops} assignedStop={assignedStop} child={selectedChild} />
            </section>

            <section className="parent-route-grid" id="parent-route">
              <article><span>Départ</span><strong>{assignment.origin}</strong></article>
              <article><span>Arrêt de {selectedChild?.first_name}</span><strong>{assignment.stop_name}</strong><small>{assignment.stop_address}</small></article>
              <article><span>Destination</span><strong>{assignment.destination}</strong></article>
              <article><span>Trajet</span><strong>{assignment.route_code} — {assignment.route_name}</strong><small>{trip?.direction === 'AFTERNOON' ? 'Retour' : 'Aller'}</small></article>
            </section>
          </>}
        </>}
      </>}

      {data && !data.students?.length && <section className="parent-empty"><span>👦</span><h2>Aucun enfant</h2><p>Aucun enfant n’est encore associé à votre compte.</p></section>}
    </section>
    <nav className="parent-mobile-nav" aria-label="Navigation Parent">
      <a href="#parent-children"><span>🏠</span>Accueil</a>
      <a href="#parent-tracking"><span>🚌</span>Suivi</a>
      <a href="#parent-map"><span>🗺️</span>Carte</a>
      <a href="#parent-route"><span>🛣️</span>Trajet</a>
    </nav>
  </main>;
}
