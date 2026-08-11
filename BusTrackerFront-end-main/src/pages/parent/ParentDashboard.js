import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { apiFetch } from '../../utils';

export default function ParentDashboard() {
  const { session, logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/bootstrap').then(setData).catch(err => setError(err.message));
  }, []);

  return <main style={{ minHeight: '100vh', background: '#f0fdfa', padding: '32px' }}>
    <header style={{ maxWidth: 960, margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div><h1 style={{ margin: 0, color: '#0f766e' }}>🚌 Espace Parent</h1><p style={{ margin: '6px 0 0' }}>Bonjour {session.profile?.nom}</p></div>
      <button onClick={logout} style={{ border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Déconnexion</button>
    </header>
    <section style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 16 }}>
      {error && <p style={{ color: '#b91c1c', background: '#fee2e2', padding: 14, borderRadius: 8 }}>{error}</p>}
      {!data && !error && <p>Chargement de vos informations…</p>}
      {data?.students?.map(child => <article key={child.id} style={{ background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 2px 10px #134e4a1a' }}>
        <h2 style={{ marginTop: 0 }}>{child.first_name} {child.last_name}</h2>
        <p><strong>Classe :</strong> {child.school_class || 'Non renseignée'}</p>
        <p><strong>Adresse :</strong> {child.home_address || 'Non renseignée'}</p>
        <p><strong>Rayon d’alerte :</strong> {child.alert_radius_m || 0} m</p>
      </article>)}
      {data && !data.students?.length && <article style={{ background: '#fff', borderRadius: 14, padding: 22 }}>Aucun enfant n’est encore associé à votre compte.</article>}
    </section>
  </main>;
}
