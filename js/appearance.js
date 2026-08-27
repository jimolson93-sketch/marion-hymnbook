(() => {
  const STORAGE_KEY = 'mgh-appearance';

  function readMode() {
    try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
    catch (_) { return 'light'; }
  }

  function applyMode(mode, persist = true) {
    mode = mode === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.appearance = mode;
    document.documentElement.dataset.theme = mode;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#1d211e' : '#747d72');

    const button = document.querySelector('.appearance-toggle');
    if (button) {
      const active = mode === 'dark';
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', active ? 'true' : 'false');
    }

    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
    }
  }

  function init() {
    const button = document.querySelector('.appearance-toggle');
    if (button && !button.dataset.bound) {
      button.dataset.bound = 'true';
      button.addEventListener('click', () => applyMode(readMode() === 'dark' ? 'light' : 'dark', true));
    }
    applyMode(readMode(), false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();