import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trajets, setTrajets] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/stats'),
      apiFetch('/admin/trajets'),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTrajets(t.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpis = stats ? [
    { label: 'Total Élèves', value: stats.totalEnfants, icon: '👦', color: 'teal' },
    { label: 'Bus Actifs', value: stats.busActifs, icon: '🚌', color: 'emerald' },
    { label: 'Trajets Aujourd\'hui', value: stats.trajetsJour, icon: '🗺️', color: 'violet' },
    { label: 'Incidents Ouverts', value: stats.incidents, icon: '⚠️', color: 'rose' },
    { label: 'Parents', value: stats.totalParents, icon: '👨‍👩‍👦', color: 'amber' },
    { label: 'Assistantes', value: stats.totalAssistantes, icon: '👩‍💼', color: 'teal' },
  ] : [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord 📊</h1>
          <p className="page-subtitle">Vue globale du système BusTracker</p>
        </div>
        <div className="badge badge-success" style={{ fontSize: 13 }}>🟢 Système opérationnel</div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="kpi-grid">
            {kpis.map(k => (
              <div key={k.label} className={`kpi-card ${k.color}`}>
                <div className="kpi-icon">{k.icon}</div>
                <div className="kpi-value">{k.value ?? '—'}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Recent Trips */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🗺️ Trajets récents</div>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bus</th>
                    <th>Assistante</th>
                    <th>Départ</th>
                    <th>Fin</th>
                    <th>Élèves</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {trajets.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>Aucun trajet</td></tr>
                  ) : trajets.map(t => (
                    <tr key={t.id}>
                      <td><span className="badge badge-info">🚌 {t.bus_matricule || `Bus ${t.id_bus}`}</span></td>
                      <td>{t.assistante_nom || '—'}</td>
                      <td>{t.date_debut ? new Date(t.date_debut).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{t.date_fin ? new Date(t.date_fin).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td><strong>{t.nb_eleves_presents}</strong></td>
                      <td>
                        {t.statut === 'en_cours' && <span className="badge badge-warning">🔄 En cours</span>}
                        {t.statut === 'termine'  && <span className="badge badge-success">✅ Terminé</span>}
                        {t.statut === 'annule'   && <span className="badge badge-danger">❌ Annulé</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
