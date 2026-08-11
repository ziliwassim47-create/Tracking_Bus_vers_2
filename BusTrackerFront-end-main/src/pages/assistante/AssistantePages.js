import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { apiFetch, formatDateTime } from '../../utils';
import { useToast } from '../../components/Shared';

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD ASSISTANTE
// ══════════════════════════════════════════════════════════════════════════════
export function AssistanteDashboard() {
  const { session } = useAuth();
  const busId = session?.profile?.id_bus;
  const assistanteId = session?.ref_id;
  const name = session?.profile?.nom || 'Assistante';

  const [eleves, setEleves] = useState([]);
  const [trajetEnCours, setTrajetEnCours] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!busId) return;
    Promise.all([
      apiFetch(`/assistante/bus/${busId}/eleves`),
      apiFetch(`/assistante/trajet/en_cours/${busId}`),
    ])
      .then(([e, t]) => { setEleves(e); setTrajetEnCours(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [busId]);

  const presents = eleves.filter(e => e.presence).length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">👋 Bonjour, {name}</h1>
          <p className="page-subtitle">Tableau de bord de l'assistante</p>
        </div>
        <div className={`badge ${trajetEnCours ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: 13 }}>
          {trajetEnCours ? '🔄 Trajet en cours' : '⏸️ En attente'}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card teal">
              <div className="kpi-icon">👦</div>
              <div className="kpi-value">{eleves.length}</div>
              <div className="kpi-label">Élèves sur mon bus</div>
            </div>
            <div className="kpi-card emerald">
              <div className="kpi-icon">✅</div>
              <div className="kpi-value">{presents}</div>
              <div className="kpi-label">Présents aujourd'hui</div>
            </div>
            <div className="kpi-card amber">
              <div className="kpi-icon">❌</div>
              <div className="kpi-value">{eleves.length - presents}</div>
              <div className="kpi-label">Absents</div>
            </div>
          </div>

          {trajetEnCours && (
            <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--amber-500)' }}>
              <div className="card-body">
                <h3 style={{ marginBottom: 8, color: 'var(--amber-600)' }}>🔄 Trajet en cours</h3>
                <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                  Démarré à {formatDateTime(trajetEnCours.date_debut)} — {trajetEnCours.nb_eleves_presents} élèves à bord
                </p>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title">👦 Mes élèves ({eleves.length})</div>
            </div>
            {eleves.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🚌</div><div className="empty-title">Aucun bus assigné</div></div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Nom</th><th>Classe</th><th>Niveau</th><th>Présence</th></tr></thead>
                  <tbody>
                    {eleves.map(e => (
                      <tr key={e.ID}>
                        <td><strong>{e.NOM}</strong></td>
                        <td><span className="badge badge-violet">{e.CLASSE || '—'}</span></td>
                        <td>{e.NIVEAU || '—'}</td>
                        <td>{e.presence ? <span className="badge badge-success">✅ Présent</span> : <span className="badge badge-neutral">Absent</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRÉSENCE
// ══════════════════════════════════════════════════════════════════════════════
export function AssistantePresence() {
  const { session } = useAuth();
  const busId = session?.profile?.id_bus;
  const { addToast } = useToast();

  const [eleves, setEleves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!busId) return;
    setLoading(true);
    apiFetch(`/assistante/bus/${busId}/eleves`)
      .then(data => setEleves(data.map(e => ({ ...e, _present: !!e.presence }))))
      .catch(() => setEleves([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [busId]);

  function toggle(id) {
    setEleves(prev => prev.map(e => e.ID === id ? { ...e, _present: !e._present } : e));
  }

  async function savePresences() {
    setSaving(true);
    try {
      await apiFetch('/assistante/presences', {
        method: 'PUT',
        body: JSON.stringify(eleves.map(e => ({ id: e.ID, present: e._present }))),
      });
      addToast('Présences enregistrées ✅');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const presents = eleves.filter(e => e._present).length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">✅ Présence des Élèves</h1>
          <p className="page-subtitle">{presents} / {eleves.length} présents</p>
        </div>
        <button className="btn btn-primary" onClick={savePresences} disabled={saving || loading}>
          {saving ? 'Sauvegarde...' : '💾 Enregistrer'}
        </button>
      </div>

      {!busId ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🚌</div><div className="empty-title">Aucun bus assigné à votre compte</div></div></div>
      ) : loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div className="card-title">👦 Liste des élèves</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEleves(p => p.map(e => ({ ...e, _present: true })))}>Tout cocher</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEleves(p => p.map(e => ({ ...e, _present: false })))}>Tout décocher</button>
            </div>
          </div>
          {eleves.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">👦</div><div className="empty-title">Aucun élève</div></div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Nom</th><th>Classe</th><th>Niveau</th><th>Présent ?</th></tr>
                </thead>
                <tbody>
                  {eleves.map(e => (
                    <tr key={e.ID} onClick={() => toggle(e.ID)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 24, height: 24, borderRadius: 6,
                              border: `2px solid ${e._present ? 'var(--teal-500)' : 'var(--gray-300)'}`,
                              background: e._present ? 'var(--teal-500)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, color: '#fff', transition: 'all 0.2s', flexShrink: 0,
                            }}
                          >
                            {e._present && '✓'}
                          </div>
                          <strong style={{ color: e._present ? 'var(--gray-800)' : 'var(--gray-400)' }}>{e.NOM}</strong>
                        </div>
                      </td>
                      <td>{e.CLASSE ? <span className="badge badge-violet">{e.CLASSE}</span> : '—'}</td>
                      <td>{e.NIVEAU || '—'}</td>
                      <td>
                        {e._present
                          ? <span className="badge badge-success">✅ Présent</span>
                          : <span className="badge badge-neutral">Absent</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRAJET (Carte + démarrage/arrêt)
// ══════════════════════════════════════════════════════════════════════════════
export function AssistanteTrajet() {
  const { session } = useAuth();
  const busId = session?.profile?.id_bus;
  const assistanteId = session?.ref_id;
  const { addToast } = useToast();

  const [trajetEnCours, setTrajetEnCours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | tracking | error
  const [position, setPosition] = useState(null);

  const load = () => {
    if (!busId) return;
    apiFetch(`/assistante/trajet/en_cours/${busId}`)
      .then(setTrajetEnCours)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [busId]);

  async function startTrajet() {
    setActionLoading(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      setPosition({ latitude, longitude });

      const result = await apiFetch('/assistante/trajet/start', {
        method: 'POST',
        body: JSON.stringify({ id_assistante: assistanteId, id_bus: busId, latitude, longitude }),
      });

      addToast(`✅ Trajet démarré — ${result.nb_eleves} élèves à bord`);
      setGpsStatus('tracking');
      load();
    } catch (e) {
      addToast(e.message || 'Impossible de récupérer la position GPS', 'error');
      setGpsStatus('error');
    } finally {
      setActionLoading(false);
    }
  }

  async function stopTrajet() {
    if (!trajetEnCours) return;
    setActionLoading(true);
    try {
      await apiFetch(`/assistante/trajet/${trajetEnCours.id}/stop`, {
        method: 'PUT',
        body: JSON.stringify({ id_bus: busId }),
      });
      addToast('⏹️ Trajet terminé');
      setGpsStatus('idle');
      setTrajetEnCours(null);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">🗺️ Mon Trajet</h1>
          <p className="page-subtitle">Démarrez et gérez votre trajet du jour</p>
        </div>
      </div>

      {!busId ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🚌</div><div className="empty-title">Aucun bus assigné</div></div></div>
      ) : loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Status Card */}
          <div className="card" style={{ borderLeft: `4px solid ${trajetEnCours ? 'var(--amber-500)' : 'var(--gray-300)'}` }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                    {trajetEnCours ? '🔄 Trajet en cours' : '⏸️ Prêt à démarrer'}
                  </h3>
                  {trajetEnCours ? (
                    <p style={{ color: 'var(--gray-600)', fontSize: 14 }}>
                      Démarré à {formatDateTime(trajetEnCours.date_debut)} — {trajetEnCours.nb_eleves_presents} élèves à bord
                    </p>
                  ) : (
                    <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
                      Appuyez sur "Démarrer" pour lancer le trajet. Votre position GPS sera partagée en temps réel.
                    </p>
                  )}
                </div>

                {trajetEnCours ? (
                  <button
                    className="btn btn-danger btn-lg"
                    onClick={stopTrajet}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Arrêt...' : '⏹️ Terminer le trajet'}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={startTrajet}
                    disabled={actionLoading}
                    style={{ background: 'linear-gradient(135deg, var(--teal-500), var(--teal-600))' }}
                  >
                    {actionLoading ? '📡 Localisation...' : '▶️ Démarrer le trajet'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* GPS Status */}
          {position && (
            <div className="card">
              <div className="card-body">
                <h4 style={{ marginBottom: 12 }}>📍 Position de départ</h4>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 2 }}>Latitude</div>
                    <code style={{ fontSize: 15, color: 'var(--teal-600)' }}>{position.latitude.toFixed(6)}</code>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 2 }}>Longitude</div>
                    <code style={{ fontSize: 15, color: 'var(--teal-600)' }}>{position.longitude.toFixed(6)}</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map placeholder */}
          <div className="card">
            <div className="card-header"><div className="card-title">🗺️ Carte en temps réel</div></div>
            <div style={{
              height: 300, background: 'linear-gradient(135deg,var(--teal-50),var(--gray-100))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12, color: 'var(--gray-500)',
            }}>
              <span style={{ fontSize: 48 }}>🗺️</span>
              <p style={{ fontSize: 14 }}>La carte s'affiche sur l'application web principale (port 3000)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS ASSISTANTE
// ══════════════════════════════════════════════════════════════════════════════
export function AssistanteNotifications() {
  const { session } = useAuth();
  const assistanteId = session?.ref_id;
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [problemes, setProblemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('notifs'); // 'notifs' | 'declarer'
  const [form, setForm] = useState({ categorie: 'autre', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const ICONS = { alerte: '⚠️', incident: '🚨', arrivee: '✅', depart: '🚌', probleme: '🔧', info: 'ℹ️' };
  const COLORS = { alerte: '#fffbeb', incident: '#fee2e2', arrivee: '#dcfce7', depart: '#f0fdfa', probleme: '#ede9fe', info: '#f0f9ff' };

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch(`/assistante/notifications/${assistanteId}`),
      apiFetch(`/assistante/problemes/${assistanteId}`),
    ])
      .then(([n, p]) => { setNotifications(n); setProblemes(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [assistanteId]);

  async function submitProbleme() {
    if (!form.description.trim()) { addToast('Veuillez décrire le problème', 'warning'); return; }
    setSubmitting(true);
    try {
      await apiFetch('/assistante/probleme', {
        method: 'POST',
        body: JSON.stringify({ id_declarant: assistanteId, ...form }),
      });
      addToast('Problème déclaré avec succès ✅');
      setForm({ categorie: 'autre', description: '' });
      setTab('notifs');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function markRead(id) {
    await apiFetch(`/assistante/notifications/${id}/lu`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: 1 } : n));
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔔 Notifications</h1>
          <p className="page-subtitle">{notifications.filter(n => !n.lu).length} non lues</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${tab === 'notifs' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setTab('notifs')}>🔔 Notifications</button>
          <button className={`btn ${tab === 'declarer' ? 'btn-secondary' : 'btn-ghost'} btn-sm`} onClick={() => setTab('declarer')}>⚠️ Déclarer un problème</button>
        </div>
      </div>

      {tab === 'notifs' ? (
        loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔔</div><div className="empty-title">Aucune notification</div></div>
        ) : (
          <div>
            {notifications.map(n => (
              <div key={n.id} className={`notif-item ${!n.lu ? 'unread' : ''}`} onClick={() => !n.lu && markRead(n.id)}>
                <div className="notif-icon" style={{ background: COLORS[n.type] || '#f8fafc' }}>{ICONS[n.type] || 'ℹ️'}</div>
                <div style={{ flex: 1 }}>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{new Date(n.created_at).toLocaleString('fr-TN')}</div>
                </div>
                {!n.lu && <div className="notif-dot" />}
              </div>
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Declare form */}
          <div className="card">
            <div className="card-header"><div className="card-title">⚠️ Déclarer un problème</div></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-control" value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}>
                  <option value="retard">⏰ Retard</option>
                  <option value="comportement">😤 Comportement</option>
                  <option value="vehicule">🚌 Véhicule</option>
                  <option value="securite">🔒 Sécurité</option>
                  <option value="autre">📝 Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  placeholder="Décrivez le problème en détail..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  style={{ minHeight: 120 }}
                />
              </div>
              <button className="btn btn-secondary" onClick={submitProbleme} disabled={submitting}>
                {submitting ? 'Envoi...' : '📤 Envoyer le signalement'}
              </button>
            </div>
          </div>

          {/* Past reports */}
          <div className="card">
            <div className="card-header"><div className="card-title">📋 Mes signalements</div></div>
            <div className="table-wrapper">
              {problemes.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">Aucun signalement</div></div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Catégorie</th><th>Description</th><th>Date</th><th>Statut</th></tr></thead>
                  <tbody>
                    {problemes.map(p => (
                      <tr key={p.id}>
                        <td><span className="badge badge-warning">{p.categorie}</span></td>
                        <td style={{ maxWidth: 300 }}><span style={{ fontSize: 13 }}>{p.description}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(p.created_at).toLocaleDateString('fr-TN')}</td>
                        <td>
                          {p.statut === 'nouveau' && <span className="badge badge-danger">🆕 Nouveau</span>}
                          {p.statut === 'en_traitement' && <span className="badge badge-warning">🔄 En traitement</span>}
                          {p.statut === 'resolu' && <span className="badge badge-success">✅ Résolu</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORIQUE
// ══════════════════════════════════════════════════════════════════════════════
export function AssistanteHistorique() {
  const { session } = useAuth();
  const assistanteId = session?.ref_id;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/assistante/historique/${assistanteId}`)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [assistanteId]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Historique des Trajets</h1>
          <p className="page-subtitle">{data.length} trajet(s) effectué(s)</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : data.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <div className="empty-title">Aucun trajet effectué</div>
            <div className="empty-desc">Vos trajets apparaîtront ici après leur réalisation</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.map((t, i) => (
            <div key={t.id} className="card" style={{ borderLeft: `4px solid ${t.statut === 'en_cours' ? 'var(--amber-500)' : 'var(--teal-500)'}` }}>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>🚌</span>
                    <strong style={{ fontSize: 16 }}>{t.bus_matricule || `Bus #${t.id_bus}`}</strong>
                    {t.statut === 'en_cours' && <span className="badge badge-warning">🔄 En cours</span>}
                    {t.statut === 'termine' && <span className="badge badge-success">✅ Terminé</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--gray-600)' }}>
                    <span>🕐 {formatDateTime(t.date_debut)}</span>
                    {t.date_fin && <span>→ {formatDateTime(t.date_fin)}</span>}
                    {t.duree_minutes && <span>⏱️ {t.duree_minutes} min</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal-600)' }}>{t.nb_eleves_presents}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Élèves</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
