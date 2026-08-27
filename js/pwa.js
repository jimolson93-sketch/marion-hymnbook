(() => {
  const DISMISS_KEY = 'mghInstallPromptDismissed';
  const VERSION_KEY = 'mgh-deployed-version';
  const RESTORE_KEY = 'mgh-update-restore-state';
  const CHECK_INTERVAL = 60000;
  let deferredInstallPrompt = null;
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
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (_) { return false; }
  }

  function dismissInstall() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
    hideNotice('pwa-install-notice');
  }

  function showInstallNotice() {
    if (isStandalone() || installDismissed()) return;
    if (deferredInstallPrompt) {
      createNotice('pwa-install-notice', 'Install the Marion Gospel Hall Hymn Book for quick access and offline use.', [
        { label: 'Install', onClick: async () => {
          const promptEvent = deferredInstallPrompt;
          deferredInstallPrompt = null;
          hideNotice('pwa-install-notice');
          await promptEvent.prompt();
        }},
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
      hideNotice('pwa-status-notice');
      return;
    }
    createNotice('pwa-status-notice', 'Offline — using the saved Hymn Book.');
  }

  function captureReadingState() {
    const activeSection = document.querySelector('.section:not(.hidden)');
    const activeHymn = activeSection?.querySelector('.hymn.show');
    if (!activeSection || !activeHymn) return null;
    return {
      sectionId: activeSection.id,
      hymnId: activeHymn.id,
      searchValue: document.getElementById('searchInput')?.value || '',
      scrollY: Math.max(0, Math.round(window.scrollY || 0))
    };
  }

  function saveReadingState() {
    const state = captureReadingState();
    if (!state) return;
    try { sessionStorage.setItem(RESTORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function restoreReadingState() {
    let state = null;
    try {
      const raw = sessionStorage.getItem(RESTORE_KEY);
      if (!raw) return;
      state = JSON.parse(raw);
      sessionStorage.removeItem(RESTORE_KEY);
    } catch (_) { return; }

    setTimeout(() => {
      const nav = document.querySelector(`.nav button[data-target="${state.sectionId}"]`);
      if (!nav) return;
      nav.click();

      const hymn = document.getElementById(state.hymnId);
      const input = document.getElementById('searchInput');
      if (hymn && input) {
        const number = hymn.querySelector('h3')?.textContent?.trim().split(/\s+/)[0] || state.searchValue || '';
        input.value = number;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.scrollTo({ top: Number(state.scrollY) || 0, left: 0, behavior: 'auto' });
      }));
    }, 0);
  }

  document.addEventListener('mgh:data-ready', restoreReadingState, { once: true });

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

  async function checkForBackgroundUpdate(registration) {
    if (checking || document.visibilityState !== 'hidden' || !navigator.onLine) return;
    checking = true;
    try {
      const deployed = await fetchDeployedVersion();
      if (!deployed) return;
      const known = localStorage.getItem(VERSION_KEY);
      if (!known) {
        localStorage.setItem(VERSION_KEY, deployed);
        return;
      }
      if (known === deployed) return;

      saveReadingState();
      await refreshVersionCache(registration, deployed);
      localStorage.setItem(VERSION_KEY, deployed);
      await registration.update();
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Apply only while backgrounded. The saved hymn and scroll position are
      // restored when the refreshed app finishes loading.
      if (document.visibilityState === 'hidden') window.location.reload();
    } catch (_) {
      // Leave the current working version untouched if the background update fails.
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
    try { localStorage.removeItem(DISMISS_KEY); } catch (_) {}
  });

  if (!('serviceWorker' in navigator)) {
    if (isIOS()) window.addEventListener('load', () => setTimeout(showInstallNotice, 1000));
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });

      // Do not interrupt a fresh launch. Update checks happen only after the app
      // moves into the background/minimized state.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          saveReadingState();
          checkForBackgroundUpdate(registration);
        }
      });

      setInterval(() => {
        if (document.visibilityState === 'hidden') checkForBackgroundUpdate(registration);
      }, CHECK_INTERVAL);

      window.addEventListener('online', () => {
        showOfflineStatus();
        if (document.visibilityState === 'hidden') checkForBackgroundUpdate(registration);
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
