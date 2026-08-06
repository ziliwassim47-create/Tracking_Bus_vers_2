(function () {
  'use strict';

  const rootElement = document.getElementById('react-root');
  if (!rootElement) return;

  const React = window.React;
  const ReactDOM = window.ReactDOM;

  function renderFallback() {
    rootElement.innerHTML = `
      <section class="react-shell">
        <article class="react-card hero-card">
          <div class="hero-top">
            <div>
              <p class="eyebrow">Tracking Bus • Frontend dynamique</p>
              <h1>Une interface vivante et réactive</h1>
            </div>
            <div class="status-pill">En ligne</div>
          </div>
          <p class="hero-copy">L’accueil s’adapte automatiquement au rôle, à l’heure et à l’état de connexion.</p>
        </article>
      </section>`;
  }

  if (!React || !ReactDOM) {
    renderFallback();
    return;
  }

  const { useEffect, useMemo, useState } = React;

  const roleConfigs = {
    PARENT: {
      title: 'Parent',
      summary: 'Suivi des enfants et des trajets scolaires en temps réel.',
      accent: '#3b82f6',
      page: 'parent/accueil.html',
      quickActions: ['Voir le trajet', 'Consulter la carte', 'Ouvrir l’historique']
    },
    DRIVER: {
      title: 'Chauffeur',
      summary: 'Pilotage du parcours, état de circulation et départs mis à jour.',
      accent: '#f59e0b',
      page: 'assistante/accueil.html',
      quickActions: ['Démarrer le trajet', 'Gérer les arrêts', 'Signer les présences']
    },
    ASSISTANT: {
      title: 'Assistante',
      summary: 'Supervision du bus et coordination des élèves pendant le trajet.',
      accent: '#10b981',
      page: 'assistante/accueil.html',
      quickActions: ['Vérifier les élèves', 'Mettre à jour le trajet', 'Notifier un incident']
    },
    ADMIN: {
      title: 'Administration',
      summary: 'Vue globale sur les lignes, les bus, les inscriptions et les incidents.',
      accent: '#8b5cf6',
      page: 'administration/accueil.html',
      quickActions: ['Dashboard', 'Gérer les comptes', 'Valider les demandes']
    }
  };

  function App() {
    const [selectedRole, setSelectedRole] = useState('PARENT');
    const [now, setNow] = useState(new Date());
    const [online, setOnline] = useState(navigator.onLine !== false);
    const [pulse, setPulse] = useState(0);

    useEffect(function () {
      const timer = window.setInterval(function () {
        setNow(new Date());
      }, 1000);
      return function () {
        window.clearInterval(timer);
      };
    }, []);

    useEffect(function () {
      function syncOnlineState() {
        setOnline(navigator.onLine !== false);
      }
      window.addEventListener('online', syncOnlineState);
      window.addEventListener('offline', syncOnlineState);
      return function () {
        window.removeEventListener('online', syncOnlineState);
        window.removeEventListener('offline', syncOnlineState);
      };
    }, []);

    useEffect(function () {
      const timer = window.setInterval(function () {
        setPulse(function (value) {
          return (value + 1) % 4;
        });
      }, 3200);
      return function () {
        window.clearInterval(timer);
      };
    }, []);

    const config = roleConfigs[selectedRole];
    const stats = useMemo(function () {
      return [
        { label: 'Trajets actifs', value: 2 + pulse, detail: 'Mise à jour automatique' },
        { label: 'Bus en service', value: 6 + (selectedRole === 'ADMIN' ? 2 : 0), detail: 'Surveillance en direct' },
        { label: 'Notifications', value: 3 + pulse, detail: 'Nouvelles alertes' }
      ];
    }, [pulse, selectedRole]);

    return React.createElement(
      'main',
      { className: 'react-shell' },
      React.createElement(
        'section',
        { className: 'react-card hero-card' },
        React.createElement('div', { className: 'hero-top' },
          React.createElement('div', null,
            React.createElement('p', { className: 'eyebrow' }, 'Tracking Bus • Frontend dynamique'),
            React.createElement('h1', null, 'Une interface vivante et réactive')
          ),
          React.createElement('div', { className: 'status-pill' }, online ? 'En ligne' : 'Hors ligne')
        ),
        React.createElement('p', { className: 'hero-copy' }, 'Le tableau de bord se met à jour automatiquement, adapte le contenu au rôle et reflète l’état du réseau.'),
        React.createElement('div', { className: 'hero-meta' },
          React.createElement('span', null, 'Dernière mise à jour : ' + now.toLocaleTimeString('fr-FR')),
          React.createElement('span', null, 'Écran : ' + now.toLocaleDateString('fr-FR'))
        )
      ),
      React.createElement(
        'section',
        { className: 'stats-grid' },
        stats.map(function (item) {
          return React.createElement(
            'article',
            { key: item.label, className: 'react-card stat-card' },
            React.createElement('strong', null, item.value),
            React.createElement('span', null, item.label),
            React.createElement('small', null, item.detail)
          );
        })
      ),
      React.createElement(
        'section',
        { className: 'react-card' },
        React.createElement('div', { className: 'section-title' },
          React.createElement('h2', null, 'Choisir un profil'),
          React.createElement('p', null, 'Le rendu change selon le rôle sélectionné.')
        ),
        React.createElement('div', { className: 'role-grid' },
          Object.entries(roleConfigs).map(function ([roleKey, role]) {
            return React.createElement(
              'button',
              {
                key: roleKey,
                className: 'role-pill' + (selectedRole === roleKey ? ' active' : ''),
                onClick: function () {
                  setSelectedRole(roleKey);
                },
                type: 'button',
                style: { '--accent': role.accent }
              },
              role.title
            );
          })
        ),
        React.createElement('div', { className: 'role-detail' },
          React.createElement('h3', null, config.title),
          React.createElement('p', null, config.summary),
          React.createElement('ul', null,
            config.quickActions.map(function (item) {
              return React.createElement('li', { key: item }, item);
            })
          ),
          React.createElement('a', { className: 'cta-link', href: config.page }, 'Ouvrir l’espace ' + config.title)
        )
      )
    );
  }

  var root = ReactDOM.createRoot(rootElement);
  root.render(React.createElement(App));
})();
