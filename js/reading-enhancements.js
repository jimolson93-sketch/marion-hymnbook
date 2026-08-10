(() => {
  const SWIPE_MIN_X = 90;
  const SWIPE_MAX_Y = 55;
  const SWIPE_RATIO = 1.5;
  const TOP_TOLERANCE = 30;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchHymn = null;
  let startedAtHymnTop = false;

  function activeSection() {
    return Array.from(document.querySelectorAll('.section')).find(section =>
      !section.classList.contains('hidden') && getComputedStyle(section).display !== 'none'
    ) || null;
  }

  function visibleSingleHymn(section = activeSection()) {
    if (!section) return null;
    const visible = Array.from(section.querySelectorAll('.hymn')).filter(hymn =>
      hymn.classList.contains('show') && getComputedStyle(hymn).display !== 'none'
    );
    return visible.length === 1 ? visible[0] : null;
  }

  function hymnNumber(hymn) {
    return hymn?.querySelector('h3')?.textContent?.trim().split(/\s+/)[0] || '';
  }

  function closeIndexDrawers(index, exceptLink = null) {
    index.querySelectorAll('.index-hymn-drawer').forEach(drawer => drawer.remove());
    index.querySelectorAll('a.index-expanded').forEach(link => {
      if (link !== exceptLink) {
        link.classList.remove('index-expanded');
        link.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function buildDrawer(target) {
    const drawer = document.createElement('div');
    drawer.className = 'index-hymn-drawer';
    drawer.setAttribute('role', 'region');
    drawer.setAttribute('aria-label', target.querySelector('h3')?.textContent?.trim() || 'Hymn');

    Array.from(target.children).forEach(child => {
      if (child.matches('h3, .hymn-step-nav')) return;
      drawer.appendChild(child.cloneNode(true));
    });

    return drawer;
  }

  function handleIndexLink(event) {
    const link = event.target.closest('.index a');
    if (!link) return;

    const index = link.closest('.index');
    if (!index) return;

    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const existing = link.nextElementSibling?.classList.contains('index-hymn-drawer')
      ? link.nextElementSibling
      : null;

    if (existing) {
      existing.remove();
      link.classList.remove('index-expanded');
      link.setAttribute('aria-expanded', 'false');
      return;
    }

    closeIndexDrawers(index, link);

    const drawer = buildDrawer(target);
    link.insertAdjacentElement('afterend', drawer);
    link.classList.add('index-expanded');
    link.setAttribute('aria-expanded', 'true');

    requestAnimationFrame(() => {
      const rowTop = link.getBoundingClientRect().top;
      if (rowTop < 8) {
        window.scrollBy({ top: rowTop - 8, behavior: 'smooth' });
      }
    });
  }

  function showAdjacentHymn(current, direction) {
    const section = current.closest('.section');
    if (!section) return;

    const hymns = Array.from(section.querySelectorAll('.hymn'));
    const currentIndex = hymns.indexOf(current);
    if (currentIndex < 0) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= hymns.length) return;

    const next = hymns[nextIndex];
    hymns.forEach(hymn => hymn.classList.remove('show'));
    section.querySelectorAll('.index.show').forEach(index => index.classList.remove('show'));
    next.classList.add('show');

    const search = document.getElementById('searchInput');
    if (search) search.value = hymnNumber(next);

    document.getElementById('indexBtn')?.classList.remove('active');
    document.getElementById('showAllBtn')?.classList.remove('active');
    document.body.classList.remove('show-all-mode');

    next.classList.add(direction > 0 ? 'hymn-swipe-in-right' : 'hymn-swipe-in-left');
    setTimeout(() => {
      next.classList.remove('hymn-swipe-in-right', 'hymn-swipe-in-left');
    }, 180);

    const title = next.querySelector('h3') || next;
    const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function handleTouchStart(event) {
    if (event.touches.length !== 1) return;

    const hymn = event.target.closest('.hymn.show');
    const single = visibleSingleHymn();
    if (!hymn || hymn !== single) {
      touchHymn = null;
      return;
    }

    const title = hymn.querySelector('h3') || hymn;
    const hymnTop = title.getBoundingClientRect().top + window.pageYOffset - 8;

    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchHymn = hymn;
    startedAtHymnTop = window.pageYOffset <= hymnTop + TOP_TOLERANCE;
  }

  function handleTouchEnd(event) {
    if (!touchHymn || !startedAtHymnTop || event.changedTouches.length !== 1) {
      touchHymn = null;
      return;
    }

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const dx = endX - touchStartX;
    const dy = endY - touchStartY;

    touchHymn = touchHymn.isConnected ? touchHymn : null;
    if (!touchHymn) return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX >= SWIPE_MIN_X && absY <= SWIPE_MAX_Y && absX >= absY * SWIPE_RATIO) {
      // Swipe left = next hymn. Swipe right = previous hymn.
      showAdjacentHymn(touchHymn, dx < 0 ? 1 : -1);
    }

    touchHymn = null;
  }

  document.addEventListener('mgh:data-ready', () => {
    // Capture phase prevents the legacy index "jump to hymn" handler from running.
    document.addEventListener('click', handleIndexLink, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    document.querySelectorAll('.index a').forEach(link => {
      link.setAttribute('aria-expanded', 'false');
    });
  }, { once: true });
})();
