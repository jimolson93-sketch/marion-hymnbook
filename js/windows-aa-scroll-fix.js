(() => {
  if (!window.matchMedia('(min-width:701px)').matches) return;
  const btn = document.getElementById('settingsBtn');
  if (!btn) return;

  btn.addEventListener('pointerdown', () => {
    // On desktop, make Aa behave exactly like it does at the top of the page.
    // Cancel any lingering search smooth-scroll, clear focus, then place the
    // page at the top before the normal click handler opens the drawer.
    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();
    window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  }, true);
})();
