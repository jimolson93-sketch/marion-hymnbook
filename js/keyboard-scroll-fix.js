(() => {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const isPhone = () => window.matchMedia('(max-width:700px)').matches;
  let focusedNumericValue = '';
  let scrollTimer = null;
  let viewportTimer = null;

  function visibleHymn(){
    const section = document.querySelector('.section:not(.hidden)');
    if (!section) return null;
    return Array.from(section.querySelectorAll('.hymn.show')).find(item =>
      getComputedStyle(item).display !== 'none' && item.offsetParent !== null
    ) || null;
  }

  function scrollVisibleHymnToTop(){
    if (!isPhone()) return;
    const hymn = visibleHymn();
    if (!hymn) return;
    const title = hymn.querySelector('h3') || hymn;
    const y = Math.max(0, title.getBoundingClientRect().top + window.pageYOffset - 8);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function scheduleScrollAfterKeyboard(){
    clearTimeout(scrollTimer);
    clearTimeout(viewportTimer);

    let lastHeight = window.visualViewport?.height || window.innerHeight;
    let stableCount = 0;

    const finish = () => {
      clearTimeout(scrollTimer);
      clearTimeout(viewportTimer);
      requestAnimationFrame(() => requestAnimationFrame(scrollVisibleHymnToTop));
    };

    const watchViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      if (Math.abs(height - lastHeight) < 2) stableCount += 1;
      else stableCount = 0;
      lastHeight = height;

      if (stableCount >= 2) {
        finish();
        return;
      }
      viewportTimer = setTimeout(watchViewport, 80);
    };

    viewportTimer = setTimeout(watchViewport, 80);
    scrollTimer = setTimeout(finish, 650);
  }

  input.addEventListener('focus', () => {
    if (!isPhone()) return;
    if (input.getAttribute('inputmode') !== 'numeric') return;
    focusedNumericValue = input.value.trim();
  });

  // iOS PWA numeric keyboards do not reliably dispatch an Enter key event for
  // the Done/checkmark button. They do reliably blur the input, so blur is the
  // primary signal for advancing the selected hymn after the keyboard closes.
  input.addEventListener('blur', () => {
    if (!isPhone()) return;
    if (input.getAttribute('inputmode') !== 'numeric') return;

    const value = input.value.trim();
    if (!/^\d+$/.test(value)) return;
    if (!visibleHymn()) return;

    focusedNumericValue = value;
    scheduleScrollAfterKeyboard();
  });

  // Keep Enter support for hardware keyboards and iOS versions that do emit it.
  input.addEventListener('keydown', event => {
    if (!isPhone() || event.key !== 'Enter') return;
    if (input.getAttribute('inputmode') !== 'numeric') return;

    event.preventDefault();
    input.blur();
  }, true);
})();
