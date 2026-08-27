(() => {
  const DISMISS_KEY = 'mghInstallPromptDismissed';
  const VERSION_KEY = 'mgh-deployed-version';
  const RESTORE_KEY = 'mgh-update-restore-state';
  let deferredInstallPrompt = null;
  let checking = false;
  let hasBackgrounded = false;

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
    const hymnNumber = activeHymn.querySelector('h3')?.textContent?.trim().split(/\s+/)[0] || '';
    if (!hymnNumber) return null;
    return {
      sectionId: activeSection.id,
      hymnNumber,
      scrollY: Math.max(0, Math.round(window.scrollY || 0))
    };
  }

  function saveReadingStateForReload() {
    const state = captureReadingState();
    if (!state) return;
    try { localStorage.setItem(RESTORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function restoreReadingState() {
    let state = null;
    try {
      const raw = localStorage.getItem(RESTORE_KEY);
      if (!raw) return;
      state = JSON.parse(raw);
    } catch (_) { return; }

    setTimeout(() => {
      const nav = document.querySelector(`.nav button[data-target="${state.sectionId}"]`);
      const section = document.getElementById(state.sectionId);
      const input = document.getElementById('searchInput');
      if (!nav || !section || !input || !state.hymnNumber) return;

      nav.click();

      // search-flow.js intentionally clears the newly selected book in a
      // zero-delay callback after a book switch. Restore the hymn only after
      // that normal cleanup has completed, otherwise it gets hidden again.
      setTimeout(() => {
        input.value = String(state.hymnNumber);
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const restored = Array.from(section.querySelectorAll('.hymn')).find(hymn => {
          const num = hymn.querySelector('h3')?.textContent?.trim().split(/\s+/)[0];
          return num === String(state.hymnNumber);
        });
        if (restored && !restored.classList.contains('show')) {
          section.querySelectorAll('.hymn.show').forEach(hymn => hymn.classList.remove('show'));
          restored.classList.add('show');
        }

        if (!restored) return;
        try { localStorage.removeItem(RESTORE_KEY); } catch (_) {}

        const restoreScroll = () => window.scrollTo({
          top: Number(state.scrollY) || 0,
          left: 0,
          behavior: 'auto'
        });
        requestAnimationFrame(() => requestAnimationFrame(restoreScroll));
        setTimeout(restoreScroll, 150);
      }, 0);
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

  async function checkForUpdateOnResume(registration) {
    if (checking || document.visibilityState !== 'visible' || !navigator.onLine) return;
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

      saveReadingStateForReload();
      await refreshVersionCache(registration, deployed);
      localStorage.setItem(VERSION_KEY, deployed);
      await registration.update();
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    } catch (_) {
      // Keep the current working version if the update check or cache refresh fails.
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

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          hasBackgrounded = true;
          registration.update().catch(() => {});
          return;
        }
        if (document.visibilityState === 'visible' && hasBackgrounded) {
          hasBackgrounded = false;
          checkForUpdateOnResume(registration);
        }
      });

      window.addEventListener('online', () => {
        showOfflineStatus();
        if (document.visibilityState === 'visible' && hasBackgrounded) {
          hasBackgrounded = false;
          checkForUpdateOnResume(registration);
        }
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
