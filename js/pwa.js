(() => {
  const DISMISS_KEY = 'mghInstallPromptDismissed';
  const VERSION_KEY = 'mgh-deployed-version';
  const RELOAD_KEY = 'mgh-update-reload';
  const CHECK_INTERVAL = 60000;
  let deferredInstallPrompt = null;
  let hadController = !!navigator.serviceWorker?.controller;
  let checking = false;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function createNotice(id, message, actions = []) {
    let notice = document.getElementById(id);
    if (!notice) {
      notice = document.createElement('div');
      notice.id = id;
      notice.className = 'pwa-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.appendChild(notice);
    }

    notice.innerHTML = '';
    const text = document.createElement('span');
    text.className = 'pwa-notice-text';
    text.textContent = message;
    notice.appendChild(text);

    if (actions.length) {
      const actionWrap = document.createElement('div');
      actionWrap.className = 'pwa-notice-actions';
      actions.forEach(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label;
        if (action.secondary) button.classList.add('secondary');
        button.addEventListener('click', action.onClick);
        actionWrap.appendChild(button);
      });
      notice.appendChild(actionWrap);
    }

    requestAnimationFrame(() => notice.classList.add('show'));
    return notice;
  }

  function hideNotice(id) {
    const notice = document.getElementById(id);
    if (!notice) return;
    notice.classList.remove('show');
    setTimeout(() => notice.remove(), 250);
  }

  function installDismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }

  function dismissInstall() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    hideNotice('pwa-install-notice');
  }

  function showInstallNotice() {
    if (isStandalone() || installDismissed()) return;

    if (deferredInstallPrompt) {
      createNotice('pwa-install-notice', 'Install the Marion Gospel Hall Hymn Book for quick access and offline use.', [
        {
          label: 'Install',
          onClick: async () => {
            const promptEvent = deferredInstallPrompt;
            deferredInstallPrompt = null;
            hideNotice('pwa-install-notice');
            await promptEvent.prompt();
          }
        },
        { label: 'Later', secondary: true, onClick: dismissInstall }
      ]);
    } else if (isIOS()) {
      createNotice('pwa-install-notice', 'To install on iPhone: tap Share, then Add to Home Screen.', [
        { label: 'Got it', secondary: true, onClick: dismissInstall }
      ]);
    }
  }

  function showOfflineStatus() {
    if (navigator.onLine) {
      createNotice('pwa-status-notice', '✓ Hymn Book is available offline.');
      setTimeout(() => hideNotice('pwa-status-notice'), 2800);
    } else {
      createNotice('pwa-status-notice', 'Offline — using the saved Hymn Book.');
    }
  }

  function reloadOnce() {
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, '1');
    } catch (e) {}
    window.location.reload();
  }

  try {
    if (sessionStorage.getItem(RELOAD_KEY)) {
      setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 5000);
    }
  } catch (e) {}

  async function fetchDeployedVersion() {
    const response = await fetch('version.json?check=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.version || null;
  }

  async function refreshVersionCache(registration, deployed) {
    const worker = registration.waiting || registration.active || navigator.serviceWorker.controller;
    if (!worker) return false;

    const channel = new MessageChannel();
    const completed = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('update timeout')), 10000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        event.data && event.data.ok ? resolve(true) : reject(new Error('update failed'));
      };
    });

    worker.postMessage({ type: 'REFRESH_CACHE', version: deployed }, [channel.port2]);
    return completed;
  }

  async function checkDeployment(registration, forceReload = false) {
    try {
      const deployed = await fetchDeployedVersion();
      if (!deployed) return false;

      const known = localStorage.getItem(VERSION_KEY);
      if (!known) {
        localStorage.setItem(VERSION_KEY, deployed);
        return false;
      }
      if (known === deployed) return false;

      await refreshVersionCache(registration, deployed);
      localStorage.setItem(VERSION_KEY, deployed);

      if (forceReload) {
        // Returning to the app should pick up the new build immediately instead
        // of waiting for iOS to cycle the service worker on its own.
        window.location.replace(window.location.href.split('#')[0]);
      } else {
        reloadOnce();
      }
      return true;
    } catch (e) {
      // Offline or failed checks leave the currently working cache untouched.
      return false;
    }
  }

  async function runUpdateCheck(registration, forceReload = false) {
    if (checking || document.visibilityState === 'hidden' || !navigator.onLine) return;
    checking = true;
    try {
      // Read version.json first on foreground checks so a changed deployment
      // can be acted on even if iOS delays the service-worker update lifecycle.
      if (forceReload) {
        const changed = await checkDeployment(registration, true);
        if (changed) return;
      }

      await registration.update();
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      if (!forceReload) await checkDeployment(registration, false);
    } catch (e) {
      // Keep the current version if the update check fails.
    } finally {
      checking = false;
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallNotice();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideNotice('pwa-install-notice');
    try { localStorage.removeItem(DISMISS_KEY); } catch (e) {}
  });

  if (!('serviceWorker' in navigator)) {
    if (isIOS()) window.addEventListener('load', () => setTimeout(showInstallNotice, 1000));
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) reloadOnce();
    hadController = true;
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });
      await runUpdateCheck(registration, true);

      setInterval(() => runUpdateCheck(registration, false), CHECK_INTERVAL);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') runUpdateCheck(registration, true);
      });
      window.addEventListener('focus', () => runUpdateCheck(registration, true));
      window.addEventListener('pageshow', () => runUpdateCheck(registration, true));
      window.addEventListener('online', () => {
        showOfflineStatus();
        runUpdateCheck(registration, true);
      });
      window.addEventListener('offline', showOfflineStatus);

      navigator.serviceWorker.ready.then(() => {
        showOfflineStatus();
        setTimeout(showInstallNotice, 900);
      });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
      setTimeout(showInstallNotice, 900);
    }
  });
})();
