(() => {
  if (!window.matchMedia('(min-width:701px)').matches) return;
  const btn = document.getElementById('settingsBtn');
  if (!btn) return;

  btn.addEventListener('pointerdown', () => {
    const x = window.scrollX;
    const y = window.scrollY;

    // Cancel any lingering smooth-scroll animation from Enter/search before
    // the Aa click changes focus or layout. This is mainly for Chrome/Windows.
    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();
    window.scrollTo({ left: x, top: y, behavior: 'auto' });

    requestAnimationFrame(() => {
      window.scrollTo({ left: x, top: y, behavior: 'auto' });
    });
  }, true);
})();
