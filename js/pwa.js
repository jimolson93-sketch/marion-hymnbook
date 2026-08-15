(() => {
  let refreshing = false;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.mghDeferredInstallPrompt = event;
    window.dispatchEvent(new Event('mgh:install-available'));
  });

  window.addEventListener('appinstalled', () => {
    window.mghDeferredInstallPrompt = null;
  });

  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');

      const notifyIfWaiting = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('mgh:update-available', { detail:{ registration } }));
        }
      };

      notifyIfWaiting();

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('mgh:update-available', { detail:{ registration } }));
          }
        });
      });

      // Check for updates on each normal launch without blocking startup.
      setTimeout(() => registration.update().catch(() => {}), 1200);
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
})();
