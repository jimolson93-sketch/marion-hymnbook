(() => {
  const input = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  if (!input) return;

  const isMobile = window.matchMedia('(max-width:700px)').matches;
  let enterHandledAt = 0;
  let fallbackTimer = 0;
  let lifecycleBlur = false;

  function visibleHymn(){
    const section = document.querySelector('.section:not(.hidden)');
    if (!section) return null;
    return Array.from(section.querySelectorAll('.hymn.show'))
      .find(item => getComputedStyle(item).display !== 'none' && item.offsetParent !== null) || null;
  }

  function scrollVisibleHymnToTop(behavior = 'smooth'){
    const hymn = visibleHymn();
    if (!hymn) return;
    const title = hymn.querySelector('h3') || hymn;
    const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
    window.scrollTo({ top: y, behavior });
  }

  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || input.getAttribute('inputmode') !== 'numeric') return;
    enterHandledAt = performance.now();

    // Desktop Chrome was continuing the smooth Enter-scroll after the user had
    // already scrolled back to the controls. That ongoing animation, not the Aa
    // button itself, was making Aa appear to scroll or require extra clicks.
    // Own desktop Enter here and use an immediate jump so there is no animation
    // left running when Aa is clicked later.
    if (!isMobile) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (searchBtn) searchBtn.click();
      window.setTimeout(() => scrollVisibleHymnToTop('auto'), 50);
    }
  }, true);

  // Some iOS/PWA keyboard variants dismiss with blur without delivering Enter.
  // Keep a lightweight fallback, but only when the original Enter path did not run.
  input.addEventListener('blur', () => {
    if (lifecycleBlur) return;
    if (input.getAttribute('inputmode') !== 'numeric') return;
    if (!/^\d+$/.test(input.value.trim())) return;

    const elapsed = performance.now() - enterHandledAt;
    if (elapsed >= 0 && elapsed < 250) return;

    clearTimeout(fallbackTimer);
    fallbackTimer = window.setTimeout(() => scrollVisibleHymnToTop('smooth'), 70);
  });

  // iOS standalone PWAs can preserve a focused input while the app is suspended.
  // On resume that can leave only the keyboard accessory bar visible at the bottom.
  // Clear focus as the app leaves/returns without changing the normal Done behavior.
  if (isMobile) {
    const clearStaleFocus = () => {
      clearTimeout(fallbackTimer);
      if (document.activeElement !== input) return;
      lifecycleBlur = true;
      input.blur();
      requestAnimationFrame(() => { lifecycleBlur = false; });
    };

    window.addEventListener('pagehide', clearStaleFocus, { passive:true });
    window.addEventListener('pageshow', () => requestAnimationFrame(clearStaleFocus), { passive:true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearStaleFocus();
      else requestAnimationFrame(clearStaleFocus);
    });
  }
})();
