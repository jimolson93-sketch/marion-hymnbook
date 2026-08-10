(() => {
  const DISMISS_KEY = 'mghInstallPromptDismissed';
  let deferredInstallPrompt = null;
  let refreshing = false;

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

  window.addEventListener('online', showOfflineStatus);
  window.addEventListener('offline', showOfflineStatus);

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

      navigator.serviceWorker.ready.then(() => {
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

  function showUpdateNotice(registration) {
    createNotice('pwa-update-notice', 'A new version of the Hymn Book is available.', [
      {
        label: 'Refresh',
        onClick: () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else {
            window.location.reload();
          }
        }
      },
      { label: 'Later', secondary: true, onClick: () => hideNotice('pwa-update-notice') }
    ]);
  }
})();
