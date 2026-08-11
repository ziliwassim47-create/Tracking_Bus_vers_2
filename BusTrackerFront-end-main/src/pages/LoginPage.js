import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../utils';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('20200200');
  const [password, setPassword] = useState('demo1234');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!phone.trim() || !password) { setError('Veuillez remplir tous les champs'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      if (data.user?.role !== 'PARENT') {
        throw new Error('Cet espace est réservé aux parents.');
      }
      login({
        token: data.token,
        refresh_token: data.refresh_token,
        role: 'parent',
        ref_id: data.user.id,
        profile: {
          nom: `${data.user.first_name} ${data.user.last_name}`,
          email: data.user.email,
          tlf: data.user.phone,
        },
      });
      navigate('/parent', { replace: true });
    } catch (err) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      {/* Background decoration */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-wrapper">
        {/* Left panel */}
        <div className="login-hero">
          <div className="login-hero-icon">🚌</div>
          <h1 className="login-hero-title">BusTracker School</h1>
          <p className="login-hero-sub">Espace Parent — suivi des transports scolaires</p>
          <div className="login-features">
            {[
              { icon: '📍', label: 'Suivi GPS temps réel' },
              { icon: '👥', label: 'Gestion des élèves' },
              { icon: '🔔', label: 'Notifications instantanées' },
              { icon: '📊', label: 'Tableau de bord complet' },
            ].map(f => (
              <div className="login-feature-item" key={f.label}>
                <span className="login-feature-icon">{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — Form */}
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-card-logo">🚌</div>
            <h2 className="login-card-title">Espace Parent</h2>
            <p className="login-card-subtitle">Connectez-vous pour suivre votre enfant</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">📱 Téléphone</label>
              <input
                className="form-control"
                type="tel"
                inputMode="tel"
                placeholder="Ex. 20200200"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="form-group">
              <label className="form-label">🔒 Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 18, color: 'var(--gray-400)',
                  }}
                >{showPwd ? '🙈' : '👁️'}</button>
              </div>
            </div>

            {error && (
              <div className="login-error">⚠️ {error}</div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Connexion...</> : '🔐 Se connecter'}
            </button>
          </form>

          <p className="login-hint">
            Compte test : <code>20200200</code> / <code>demo1234</code>
          </p>
        </div>
      </div>

      <style>{`
        .login-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 24px; position: relative; overflow: hidden;
        }
        .login-blob {
          position: absolute; border-radius: 50%;
          filter: blur(80px); pointer-events: none; z-index: 0;
        }
        .login-blob-1 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 70%);
          top: -100px; left: -100px;
        }
        .login-blob-2 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%);
          bottom: -80px; right: -80px;
        }
        .login-wrapper {
          display: flex; gap: 0; position: relative; z-index: 1;
          max-width: 900px; width: 100%;
          border-radius: 24px; overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
        }
        .login-hero {
          flex: 1; background: linear-gradient(135deg, var(--teal-600) 0%, var(--teal-700) 100%);
          padding: 48px 40px; display: flex; flex-direction: column;
          justify-content: center; color: #fff;
        }
        .login-hero-icon { font-size: 52px; margin-bottom: 16px; }
        .login-hero-title { font-size: 28px; font-weight: 800; margin-bottom: 10px; }
        .login-hero-sub { font-size: 15px; opacity: 0.85; margin-bottom: 36px; line-height: 1.6; }
        .login-features { display: flex; flex-direction: column; gap: 14px; }
        .login-feature-item {
          display: flex; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.12); border-radius: 10px;
          padding: 12px 16px; font-size: 14px; font-weight: 500;
        }
        .login-feature-icon { font-size: 20px; }

        .login-card {
          width: 400px; background: #fff;
          padding: 40px 36px; display: flex; flex-direction: column; gap: 0;
        }
        .login-card-header { text-align: center; margin-bottom: 28px; }
        .login-card-logo { font-size: 40px; margin-bottom: 12px; }
        .login-card-title { font-size: 22px; font-weight: 800; color: var(--gray-800); margin-bottom: 6px; }
        .login-card-subtitle { font-size: 13px; color: var(--gray-500); }

        .login-quick { margin-bottom: 20px; }
        .login-quick-label { font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .login-quick-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .login-quick-btn {
          padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
          border: 2px solid; cursor: pointer; transition: all 0.2s; background: none;
        }
        .login-quick-btn.admin   { border-color: var(--violet-500); color: var(--violet-500); }
        .login-quick-btn.admin:hover   { background: var(--violet-500); color: #fff; }
        .login-quick-btn.assistante { border-color: var(--teal-500); color: var(--teal-500); }
        .login-quick-btn.assistante:hover { background: var(--teal-500); color: #fff; }

        .login-error {
          background: #fee2e2; color: #dc2626; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; font-weight: 500;
          margin-bottom: 16px;
        }
        .login-hint {
          text-align: center; font-size: 12px; color: var(--gray-400);
          margin-top: 20px;
        }
        .login-hint code {
          background: var(--gray-100); padding: 2px 6px; border-radius: 4px;
          font-family: monospace; color: var(--teal-600);
        }

        @media (max-width: 700px) {
          .login-hero { display: none; }
          .login-bg { padding: 12px; align-items: flex-start; padding-top: max(20px, env(safe-area-inset-top)); overflow-y: auto; }
          .login-card { width: 100%; padding: 30px 22px; border-radius: 20px; }
          .login-wrapper { max-width: 440px; border-radius: 20px; }
          .login-card-header { margin-bottom: 22px; }
          .login-card-logo { font-size: 36px; margin-bottom: 8px; }
          .login-card .form-control { min-height: 48px; font-size: 16px; }
          .login-card .btn { min-height: 48px; }
        }
        @media (max-width: 360px) {
          .login-card { padding: 24px 16px; }
          .login-card-title { font-size: 20px; }
          .login-hint { line-height: 1.8; }
        }
      `}</style>
    </div>
  );
}
