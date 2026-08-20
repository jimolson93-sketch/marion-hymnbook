(() => {
  const trigger = document.getElementById('shareQrBtn');
  const modal = document.getElementById('shareQrModal');
  const closeBtn = document.getElementById('shareQrClose');
  const settingsDrawer = document.getElementById('settingsDrawer');
  const settingsBtn = document.getElementById('settingsBtn');
  if (!trigger || !modal || !closeBtn) return;

  let previousFocus = null;

  function closeSettingsDrawer(){
    if (!settingsDrawer || !settingsBtn) return;
    settingsDrawer.classList.remove('open');
    settingsBtn.classList.remove('active');
    settingsBtn.setAttribute('aria-expanded', 'false');
    settingsDrawer.setAttribute('aria-hidden', 'true');
  }

  function openModal(){
    previousFocus = document.activeElement;
    closeSettingsDrawer();
    modal.hidden = false;
    document.body.classList.add('share-qr-open');
    requestAnimationFrame(() => closeBtn.focus({ preventScroll:true }));
  }

  function closeModal(){
    modal.hidden = true;
    document.body.classList.remove('share-qr-open');
    if (previousFocus && typeof previousFocus.focus === 'function') {
      requestAnimationFrame(() => previousFocus.focus({ preventScroll:true }));
    }
  }

  trigger.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openModal();
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
})();
