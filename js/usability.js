(() => {
  const BOOK_KEY = 'mghLastHymnBook';
  const INSTALL_DISMISS_KEY = 'mghInstallDismissedAt';
  const INSTALL_DISMISS_DAYS = 7;

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIOS(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function recentlyDismissed(){
    try{
      const saved = Number(localStorage.getItem(INSTALL_DISMISS_KEY));
      if (!saved) return false;
      return (Date.now() - saved) < INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    }catch(e){ return false; }
  }

  function dismissForNow(){
    try{ localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); }catch(e){}
  }

  function createBanner(){
    let banner = document.getElementById('mghPwaBanner');
    if (banner) return banner;
    banner = document.createElement('aside');
    banner.id = 'mghPwaBanner';
    banner.className = 'mgh-pwa-banner';
    banner.setAttribute('role','status');
    banner.setAttribute('aria-live','polite');
    document.body.appendChild(banner);
    return banner;
  }

  function hideBanner(){
    const banner = document.getElementById('mghPwaBanner');
    if (banner) banner.classList.remove('visible');
  }

  function showBanner({title,text,primaryLabel,secondaryLabel,onPrimary,onSecondary}){
    const banner = createBanner();
    banner.innerHTML = '';

    const titleEl = document.createElement('p');
    titleEl.className = 'mgh-pwa-title';
    titleEl.textContent = title;
    banner.appendChild(titleEl);

    const textEl = document.createElement('p');
    textEl.className = 'mgh-pwa-text';
    textEl.textContent = text;
    banner.appendChild(textEl);

    const actions = document.createElement('div');
    actions.className = 'mgh-pwa-actions';

    if (secondaryLabel){
      const secondary = document.createElement('button');
      secondary.type = 'button';
      secondary.className = 'mgh-pwa-secondary';
      secondary.textContent = secondaryLabel;
      secondary.addEventListener('click', () => {
        hideBanner();
        if (onSecondary) onSecondary();
      });
      actions.appendChild(secondary);
    }

    if (primaryLabel){
      const primary = document.createElement('button');
      primary.type = 'button';
      primary.className = 'mgh-pwa-primary';
      primary.textContent = primaryLabel;
      primary.addEventListener('click', () => {
        if (onPrimary) onPrimary();
      });
      actions.appendChild(primary);
    }

    banner.appendChild(actions);
    requestAnimationFrame(() => banner.classList.add('visible'));
  }

  // Floating Home / top button.
  const home = document.createElement('button');
  home.type = 'button';
  home.className = 'mgh-home-button';
  home.setAttribute('aria-label','Return to top');
  home.setAttribute('title','Return to top');
  home.textContent = '↑';
  home.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
  document.body.appendChild(home);

  function syncHomeButton(){
    const bookSelected = !!document.querySelector('.nav button.active');
    home.classList.toggle('visible', bookSelected && window.scrollY > 450);
  }
  window.addEventListener('scroll', syncHomeButton, {passive:true});
  document.addEventListener('click', e => {
    if (e.target.closest('.nav button')) setTimeout(syncHomeButton, 20);
  });

  // Save and restore the last hymnbook. Existing app behavior remains responsible for clearing search/results.
  document.addEventListener('mgh:data-ready', () => {
    document.querySelectorAll('.nav button[data-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        try{ localStorage.setItem(BOOK_KEY, btn.dataset.target); }catch(e){}
      });
    });

    // Wait until all existing mgh:data-ready handlers have attached their click behavior.
    setTimeout(() => {
      let saved = '';
      try{ saved = localStorage.getItem(BOOK_KEY) || ''; }catch(e){}
      if (!saved) return;
      const btn = document.querySelector(`.nav button[data-target="${saved}"]`);
      if (btn) btn.click();
    }, 80);
  });

  // Install experience. Native prompt on Chromium; instructions on iPhone/iPad.
  function offerInstall(){
    if (isStandalone() || recentlyDismissed()) return;

    if (window.mghDeferredInstallPrompt){
      showBanner({
        title:'Install MGH Hymn Book',
        text:'Install for quick access and offline use.',
        primaryLabel:'Install',
        secondaryLabel:'Not now',
        onPrimary: async () => {
          const promptEvent = window.mghDeferredInstallPrompt;
          if (!promptEvent) return;
          hideBanner();
          promptEvent.prompt();
          try{ await promptEvent.userChoice; }catch(e){}
          window.mghDeferredInstallPrompt = null;
        },
        onSecondary:dismissForNow
      });
      return;
    }

    if (isIOS()){
      showBanner({
        title:'Install MGH Hymn Book',
        text:'Tap the Share button, then choose Add to Home Screen.',
        primaryLabel:'Got it',
        onPrimary:() => { dismissForNow(); hideBanner(); }
      });
    }
  }

  window.addEventListener('mgh:install-available', offerInstall);
  window.addEventListener('appinstalled', hideBanner);
  window.addEventListener('load', () => setTimeout(offerInstall, 1400));

  // PWA update notice from pwa.js.
  window.addEventListener('mgh:update-available', event => {
    const registration = event.detail?.registration;
    if (!registration?.waiting) return;
    showBanner({
      title:'Hymn book update available',
      text:'A newer version is ready to use.',
      primaryLabel:'Update',
      secondaryLabel:'Later',
      onPrimary:() => registration.waiting.postMessage({type:'SKIP_WAITING'}),
      onSecondary:hideBanner
    });
  });
})();
