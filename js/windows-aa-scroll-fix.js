(() => {
  if (!window.matchMedia('(min-width:701px)').matches) return;

  const btn = document.getElementById('settingsBtn');
  const drawer = document.getElementById('settingsDrawer');
  if (!btn || !drawer) return;

  let openTimer = 0;

  function setOpen(open){
    drawer.classList.toggle('open', open);
    btn.classList.toggle('active', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  btn.addEventListener('click', event => {
    // Own the desktop Aa click completely so the normal settings handler and
    // the page scroll handler cannot race each other. This was the source of
    // the second/third-click behavior in Chrome on Windows.
    event.preventDefault();
    event.stopImmediatePropagation();
    clearTimeout(openTimer);

    if (drawer.classList.contains('open')) {
      setOpen(false);
      return;
    }

    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();

    // Close first, jump to the exact state that already works reliably at the
    // top of the page, then open only after the resulting scroll event settles.
    setOpen(false);
    window.scrollTo({ left: 0, top: 0, behavior: 'auto' });

    openTimer = window.setTimeout(() => {
      setOpen(true);
    }, window.scrollY > 1 ? 70 : 20);
  }, true);
})();
