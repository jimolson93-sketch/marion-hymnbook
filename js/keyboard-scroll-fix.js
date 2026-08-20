(() => {
  const input = document.getElementById('searchInput');
  if (!input) return;

  let enterHandledAt = 0;
  let fallbackTimer = 0;

  function visibleHymn(){
    const section = document.querySelector('.section:not(.hidden)');
    if (!section) return null;
    return Array.from(section.querySelectorAll('.hymn.show'))
      .find(item => getComputedStyle(item).display !== 'none' && item.offsetParent !== null) || null;
  }

  function scrollVisibleHymnToTop(){
    const hymn = visibleHymn();
    if (!hymn) return;
    const title = hymn.querySelector('h3') || hymn;
    const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  // Do not intercept Enter/Done. app.js already contains the original fast,
  // smooth 50 ms Done-key scroll that worked well before the cleanup.
  // We only remember that Enter happened so the blur fallback does not run too.
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && input.getAttribute('inputmode') === 'numeric') {
      enterHandledAt = performance.now();
    }
  }, true);

  // Some iOS/PWA keyboard variants dismiss with blur without delivering Enter.
  // Keep a lightweight fallback, but only when the original Enter path did not run.
  input.addEventListener('blur', () => {
    if (input.getAttribute('inputmode') !== 'numeric') return;
    if (!/^\d+$/.test(input.value.trim())) return;

    const elapsed = performance.now() - enterHandledAt;
    if (elapsed >= 0 && elapsed < 250) return;

    clearTimeout(fallbackTimer);
    fallbackTimer = window.setTimeout(scrollVisibleHymnToTop, 70);
  });
})();
