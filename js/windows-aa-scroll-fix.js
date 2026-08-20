(() => {
  if (!window.matchMedia('(min-width:701px)').matches) return;

  const btn = document.getElementById('settingsBtn');
  const drawer = document.getElementById('settingsDrawer');
  if (!btn || !drawer) return;

  function setOpen(open){
    drawer.classList.toggle('open', open);
    btn.classList.toggle('active', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  btn.addEventListener('click', event => {
    // Desktop Aa is intentionally a pure toggle. No scrollTo, no focus changes,
    // no delayed reopen, and no dependency on where the page currently sits.
    event.preventDefault();
    event.stopImmediatePropagation();
    setOpen(!drawer.classList.contains('open'));
  }, true);
})();
