const CACHE_NAME = 'tracking-bus-v7';
const APP_FILES = [
  "/administration/accueil.html",
  "/administration/affecter-assistantes.html",
  "/administration/affecter-chauffeurs.html",
  "/administration/affecter-enfants.html",
  "/administration/affecter-trajet.html",
  "/administration/ajouter-admin.html",
  "/administration/ajouter-assistante.html",
  "/administration/ajouter-bus.html",
  "/administration/ajouter-chauffeur.html",
  "/administration/ajouter-compte.html",
  "/administration/ajouter-ligne.html",
  "/administration/ajouter-parent.html",
  "/administration/carte.html",
  "/administration/dashboard.html",
  "/administration/liste-assistantes.html",
  "/administration/liste-bus.html",
  "/administration/liste-chauffeurs.html",
  "/administration/liste-enfants.html",
  "/administration/liste-lignes.html",
  "/administration/liste-parents.html",
  "/administration/profil.html",
  "/administration/reclamations.html",
  "/administration/signaler-probleme.html",
  "/assets/educanet-logo.png",
  "/assets/app.css",
  "/assets/app.js",
  "/assets/react-app.js",
    "/assets/hybrid.css",
    "/assets/hybrid.js",
    "/assets/icons/arrow-left.png",
    "/assets/icons/bell.png",
    "/assets/icons/bell-ring.png",
    "/assets/icons/bus-front.png",
    "/assets/icons/circle-plus.png",
    "/assets/icons/clock.png",
    "/assets/icons/clock-3.png",
    "/assets/icons/clock-alert.png",
    "/assets/icons/graduation-cap.png",
    "/assets/icons/history.png",
    "/assets/icons/house.png",
    "/assets/icons/icon-192.png",
    "/assets/icons/icon-512.png",
    "/assets/icons/info.png",
    "/assets/icons/layout-dashboard.png",
    "/assets/icons/log-in.png",
    "/assets/icons/log-out.png",
    "/assets/icons/mail.png",
    "/assets/icons/map.png",
    "/assets/icons/map-pin.png",
    "/assets/icons/map-pinned.png",
    "/assets/icons/phone.png",
    "/assets/icons/play.png",
    "/assets/icons/plus.png",
    "/assets/icons/route.png",
    "/assets/icons/send.png",
    "/assets/icons/share-2.png",
    "/assets/icons/shield-check.png",
    "/assets/icons/square.png",
    "/assets/icons/steering-wheel.png",
    "/assets/icons/sunrise.png",
    "/assets/icons/sunset.png",
    "/assets/icons/timer.png",
    "/assets/icons/triangle-alert.png",
    "/assets/icons/user.png",
    "/assets/icons/user-check.png",
    "/assets/icons/user-plus.png",
    "/assets/icons/user-round.png",
    "/assets/icons/users.png",
    "/assets/icons/users-round.png",
    "/assets/interactions.js",
    "/assets/style.css",
  "/assistante/accueil.html",
  "/assistante/carte.html",
  "/assistante/demarrer-trajet.html",
  "/assistante/enfants.html",
  "/assistante/historique.html",
  "/assistante/notifications.html",
  "/assistante/profil.html",
  "/assistante/recapitulatif-trajet.html",
  "/assistante/signaler-probleme.html",
  "/assistante/trajet-arrets.html",
  "/auth/accueil.html",
  "/auth/connexion.html",
  "/auth/inscription.html",
  "/auth/mot-de-passe-oublie.html",
  "/index.html",
  "/manifest.webmanifest",
  "/parent/accueil.html",
  "/parent/carte.html",
  "/parent/historique.html",
  "/parent/informations-trajet.html",
  "/parent/notifications.html",
  "/parent/profil.html",
  "/parent/reclamation.html",
  "/parent/trajet-arrets.html",
  "/screens.html"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      if (!response || response.type === 'error') {
        throw new Error('Fetch failed');
      }
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    } catch (error) {
      if (event.request.mode === 'navigate') {
        const page = await caches.match('/index.html');
        return page || Response.error();
      }
      return cached || Response.error();
    }
  })());
});
