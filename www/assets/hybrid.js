(function () {
  'use strict';

  const scriptUrl = document.currentScript && document.currentScript.src;
  const assetBase = scriptUrl ? new URL('.', scriptUrl).href : '/assets/';
  const modernStyles = document.createElement('link');
  modernStyles.rel = 'stylesheet';
  modernStyles.href = assetBase + 'app.css';
  document.head.appendChild(modernStyles);

  function loadStyle(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  loadStyle('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  loadStyle('https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css');

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve; // Continue even if optional load fails
      document.head.appendChild(s);
    });
  }

  function loadApplication() {
    loadScript('https://unpkg.com/react@18/umd/react.development.js')
      .then(function () { return loadScript('https://unpkg.com/react-dom@18/umd/react-dom.development.js'); })
      .then(function () { return loadScript('https://cdn.socket.io/4.7.5/socket.io.min.js'); })
      .then(function () { return loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'); })
      .then(function () { return loadScript('https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js'); })
      .then(function () { return loadScript(assetBase + 'app.js'); });
  }

  if (location.protocol === 'file:') {
    const cordovaScript = document.createElement('script');
    cordovaScript.src = new URL('../cordova.js', assetBase).href;
    cordovaScript.onload = loadApplication;
    cordovaScript.onerror = loadApplication;
    document.head.appendChild(cordovaScript);
  } else {
    loadApplication();
  }

  const APP_ROOT = '/';
  let initialViewportHeight = window.innerHeight;

  function createNetworkBanner() {
    let banner = document.querySelector('.hybrid-network-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'hybrid-network-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      document.body.appendChild(banner);
    }
    return banner;
  }

  function updateNetworkState() {
    const banner = createNetworkBanner();
    const offline = navigator.onLine === false;
    banner.textContent = offline ? 'Connexion Internet indisponible' : 'Connexion rétablie';
    banner.classList.add('visible');
    document.body.classList.toggle('is-offline', offline);
    window.setTimeout(function () {
      if (!offline) banner.classList.remove('visible');
    }, 1800);
  }

  function setStatusBar() {
    try {
      if (window.StatusBar) {
        StatusBar.overlaysWebView(false);
        StatusBar.backgroundColorByHexString('#A8C2FF');
        StatusBar.styleDefault();
      }
    } catch (_) {}
  }

  function vibrate(milliseconds) {
    try {
      if (navigator.vibrate) navigator.vibrate(milliseconds || 12);
    } catch (_) {}
  }

  function handleBackButton(event) {
    if (event && event.preventDefault) event.preventDefault();

    const activeModal = document.querySelector('.modal.show, dialog[open], [data-open="true"]');
    if (activeModal) {
      const close = activeModal.querySelector('[data-close], .btn-secondary');
      if (close) close.click();
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    // Retour sécurisé vers l'accueil de l'application autonome.
    const path = window.location.pathname;
    if (!path.endsWith('/index.html') && path !== '/') {
      window.location.href = APP_ROOT + 'index.html';
    }
  }

  function observeKeyboard() {
    window.addEventListener('resize', function () {
      const keyboardOpen = window.innerHeight < initialViewportHeight * 0.74;
      document.body.classList.toggle('keyboard-open', keyboardOpen);
      if (!keyboardOpen) initialViewportHeight = Math.max(initialViewportHeight, window.innerHeight);
    });
  }

  function enableTouchFeedback() {
    document.addEventListener('click', function (event) {
      const control = event.target.closest('button, .btn, .quick-action, .nav-item, .mini-btn, .header-action, .child-tab');
      if (control && !control.disabled) vibrate(10);
    }, { passive: true });
  }


  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
  }

  function onDeviceReady() {
    document.documentElement.classList.add('cordova-ready');
    document.body.classList.add('hybrid-app');
    setStatusBar();

    document.addEventListener('backbutton', handleBackButton, false);
    document.addEventListener('offline', updateNetworkState, false);
    document.addEventListener('online', updateNetworkState, false);

    if (navigator.onLine === false) updateNetworkState();
  }

  document.addEventListener('DOMContentLoaded', function () {
    observeKeyboard();
    enableTouchFeedback();
    registerServiceWorker();
  });

  // Dans un navigateur, le module continue à fonctionner. Dans Cordova, deviceready active les fonctions natives.
  document.addEventListener('deviceready', onDeviceReady, false);
  window.TrackingBusHybrid = { handleBackButton: handleBackButton, updateNetworkState: updateNetworkState };
})();
