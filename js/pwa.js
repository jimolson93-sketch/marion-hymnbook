(() => {
  const DISMISS_KEY = 'mghInstallPromptDismissed';
  const UPDATE_CHECK_THROTTLE_MS = 15000;
  let deferredInstallPrompt = null;
  let refreshing = false;
  let activeRegistration = null;
  let lastUpdateCheck = 0;

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

  async function checkForUpdate(force = false) {
    if (!activeRegistration || !navigator.onLine || refreshing) return;

    const now = Date.now();
    if (!force && now - lastUpdateCheck < UPDATE_CHECK_THROTTLE_MS) return;
    lastUpdateCheck = now;

    try {
      await activeRegistration.update();
      if (activeRegistration.waiting && navigator.serviceWorker.controller) {
        showUpdateNotice(activeRegistration);
      }
    } catch (error) {
      console.debug('Update check skipped:', error);
    }
  }

  window.addEventListener('online', () => {
    showOfflineStatus();
    checkForUpdate(true);
  });
  window.addEventListener('offline', showOfflineStatus);

  window.addEventListener('focus', () => checkForUpdate());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('pageshow', () => checkForUpdate());

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

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      activeRegistration = registration;

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateNotice(registration);
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotice(registration);
          }
        });
      });

      // Do a fresh check whenever the app launches instead of waiting for the
      // browser's normal service-worker update interval.
      setTimeout(() => checkForUpdate(true), 350);

      navigator.serviceWorker.ready.then(readyRegistration => {
        activeRegistration = readyRegistration;
        showOfflineStatus();
        setTimeout(showInstallNotice, 900);
      });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
      setTimeout(showInstallNotice, 900);
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  async function refreshToLatest(registration) {
    if (refreshing) return;
    refreshing = true;

    const notice = document.getElementById('pwa-update-notice');
    if (notice) {
      notice.querySelectorAll('button').forEach(button => { button.disabled = true; });
      const text = notice.querySelector('.pwa-notice-text');
      if (text) text.textContent = 'Updating Hymn Book…';
    }

    try {
      await registration.unregister();
    } catch (error) {
      console.warn('Could not reset service worker registration:', error);
    }

    window.location.reload();
  }

  function showUpdateNotice(registration) {
    createNotice('pwa-update-notice', 'Hymn Book update available. Tap Refresh to get the latest version.', [
      {
        label: 'Refresh',
        onClick: () => refreshToLatest(registration)
      },
      { label: 'Later', secondary: true, onClick: () => hideNotice('pwa-update-notice') }
    ]);
  }
})();
