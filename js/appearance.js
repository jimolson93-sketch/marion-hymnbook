(() => {
  const STORAGE_KEY = 'mgh-appearance';

  function readMode() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch (_) {
      return 'light';
    }
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

  function buildControls() {
    const fontControls = document.getElementById('fontSizeControls');
    if (!fontControls || document.querySelector('.appearance-controls')) return;

    const wrap = document.createElement('div');
    wrap.className = 'appearance-controls';

    const label = document.createElement('span');
    label.className = 'appearance-label';
    label.textContent = 'Dark Mode';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'appearance-toggle';
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-label', 'Use dark mode');
    button.setAttribute('aria-checked', 'false');
    button.innerHTML = '<span class="appearance-switch-knob" aria-hidden="true"></span>';
    button.addEventListener('click', () => applyMode(readMode() === 'dark' ? 'light' : 'dark', true));

    wrap.append(label, button);

    const footer = fontControls.querySelector('.drawer-footer');
    if (footer) fontControls.insertBefore(wrap, footer);
    else fontControls.appendChild(wrap);

    applyMode(readMode(), false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildControls, { once: true });
  else buildControls();
})();
