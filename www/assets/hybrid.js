(function () {
  'use strict';

  const scriptUrl = document.currentScript && document.currentScript.src;
  const assetBase = scriptUrl ? new URL('.', scriptUrl).href : '/assets/';
  const modernStyles = document.createElement('link');
  modernStyles.rel = 'stylesheet';
  modernStyles.href = assetBase + 'app.css';
  document.head.appendChild(modernStyles);

  function loadApplication() {
    const reactScript = document.createElement('script');
    reactScript.src = 'https://unpkg.com/react@18/umd/react.development.js';
    reactScript.onload = function () {
      const reactDomScript = document.createElement('script');
      reactDomScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.development.js';
      reactDomScript.onload = function () {
        const appScript = document.createElement('script');
        appScript.src = assetBase + 'app.js';
        document.head.appendChild(appScript);
      };
      document.head.appendChild(reactDomScript);
    };
    document.head.appendChild(reactScript);
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
