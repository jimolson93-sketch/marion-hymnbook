(() => {
  const STORAGE_KEY = 'mgh-appearance';
  const VALID = new Set(['light', 'auto', 'dark']);
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function readMode() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return VALID.has(saved) ? saved : 'light';
    } catch (_) {
      return 'light';
    }
  }

  function resolvedTheme(mode) {
    if (mode === 'auto') return media.matches ? 'dark' : 'light';
    return mode;
  }

  function applyMode(mode, persist = true) {
    if (!VALID.has(mode)) mode = 'light';
    const theme = resolvedTheme(mode);
    document.documentElement.dataset.appearance = mode;
    document.documentElement.dataset.theme = theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1d211e' : '#747d72');

    document.querySelectorAll('.appearance-option').forEach(button => {
      const active = button.dataset.appearance === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
    }
  }

  function buildControls() {
    const fontControls = document.getElementById('fontSizeControls');
    if (!fontControls || document.querySelector('.appearance-controls')) return;

    const wrap = document.createElement('div');
    wrap.className = 'appearance-controls';

    const options = document.createElement('div');
    options.className = 'appearance-options';
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', 'Appearance');

    [['light', 'Light'], ['auto', 'Auto'], ['dark', 'Dark']].forEach(([value, text]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'appearance-option';
      button.dataset.appearance = value;
      button.textContent = text;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => applyMode(value, true));
      options.appendChild(button);
    });

    wrap.append(options);

    // Keep the app-level share action beside the app-level appearance choices.
    const shareRow = document.querySelector('.share-row');
    if (shareRow) wrap.appendChild(shareRow);

    const version = fontControls.querySelector('.app-version');
    if (version) fontControls.insertBefore(wrap, version);
    else fontControls.appendChild(wrap);

    applyMode(readMode(), false);
  }

  function onSystemChange() {
    if (readMode() === 'auto') applyMode('auto', false);
  }

  if (typeof media.addEventListener === 'function') media.addEventListener('change', onSystemChange);
  else if (typeof media.addListener === 'function') media.addListener(onSystemChange);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildControls, { once: true });
  } else {
    buildControls();
  }
})();
