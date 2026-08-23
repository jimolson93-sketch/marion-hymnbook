(() => {
  const SWIPE_START_X = 18;
  const SWIPE_RATIO = 1.35;
  const COMMIT_RATIO = 0.45;
  const SETTLE_MS = 160;
  const SWIPE_FADE = 0.08;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchHymn = null;
  let adjacentHymn = null;
  let swipeViewport = null;
  let currentPanel = null;
  let nextPanel = null;
  let swipeDirection = 0;
  let horizontalGesture = false;
  let originalSearchValue = '';

  function normalizeMalformedFirstVerses() {
    let corrected = 0;

    document.querySelectorAll('.hymn').forEach(hymn => {
      const paragraphs = Array.from(hymn.querySelectorAll(':scope > p.verse'));
      if (!paragraphs.length) return;

      const first = paragraphs[0];
      if (!first.classList.contains('indent-2')) return;

      const hasVerseTwo = paragraphs.some(p => {
        if (!p.classList.contains('main')) return false;
        const number = p.querySelector('.verse-number')?.textContent?.trim() || '';
        return number === '2.' || number === '2';
      });

      if (!hasVerseTwo) return;

      const firstMainIndex = paragraphs.findIndex(p => p.classList.contains('main'));
      const openingBlock = firstMainIndex === -1 ? paragraphs : paragraphs.slice(0, firstMainIndex);
      if (!openingBlock.length) return;

      const firstLineText = first.textContent.replace(/^\s*1\.\s*/, '').trimStart();
      first.className = 'verse main';
      first.innerHTML = '';

      const number = document.createElement('span');
      number.className = 'verse-number';
      number.textContent = '1.';
      first.appendChild(number);
      first.appendChild(document.createTextNode(' ' + firstLineText));

      openingBlock.slice(1).forEach(line => {
        line.className = 'verse indent-1';
      });

      hymn.dataset.firstVerseNormalized = 'true';
      corrected += 1;
    });

    if (corrected) {
      console.info(`Normalized ${corrected} malformed first verse${corrected === 1 ? '' : 's'}.`);
    }
  }

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

  function adjacentFor(current, direction) {
    const section = current?.closest('.section');
    if (!section) return null;
    const hymns = Array.from(section.querySelectorAll('.hymn'));
    const index = hymns.indexOf(current);
    const nextIndex = index + direction;
    return index >= 0 && nextIndex >= 0 && nextIndex < hymns.length ? hymns[nextIndex] : null;
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
      if (rowTop < 8) window.scrollBy({ top: rowTop - 8, behavior: 'smooth' });
    });
  }

  function clonePanel(hymn, className) {
    const panel = hymn.cloneNode(true);
    panel.classList.remove('show');
    panel.classList.add('swipe-panel', className);
    panel.removeAttribute('id');
    panel.setAttribute('aria-hidden', 'true');
    panel.style.transform = '';
    panel.style.transition = '';
    return panel;
  }

  function buildSwipeViewport(current, destination, direction) {
    const rect = current.getBoundingClientRect();
    const styles = getComputedStyle(current);
    const viewport = document.createElement('div');
    viewport.className = 'hymn-swipe-viewport';
    viewport.style.left = `${rect.left}px`;
    viewport.style.top = `${Math.max(0, rect.top)}px`;
    viewport.style.width = `${rect.width}px`;
    viewport.style.height = `${Math.max(window.innerHeight - Math.max(0, rect.top), 1)}px`;
    viewport.style.borderRadius = styles.borderRadius;
    viewport.style.boxShadow = styles.boxShadow;

    const currentClone = clonePanel(current, 'swipe-panel-current');
    const nextClone = clonePanel(destination, 'swipe-panel-next');
    currentClone.style.transform = 'translate3d(0,0,0)';
    currentClone.style.opacity = '1';
    nextClone.style.transform = `translate3d(${direction > 0 ? 100 : -100}%,0,0)`;
    nextClone.style.opacity = `${1 - SWIPE_FADE}`;

    viewport.append(currentClone, nextClone);
    document.body.appendChild(viewport);

    current.classList.add('hymn-swipe-source-hidden');
    return { viewport, currentClone, nextClone };
  }

  function clearSwipeViewport() {
    swipeViewport?.remove();
    swipeViewport = null;
    currentPanel = null;
    nextPanel = null;
    if (touchHymn) touchHymn.classList.remove('hymn-swipe-source-hidden');
  }

  function clearMobileScrollFades() {
    document.querySelectorAll('.mobile-scroll-fade.visible').forEach(fade => {
      fade.classList.remove('visible');
    });
  }

  function updateSearchForProgress(progress) {
    const search = document.getElementById('searchInput');
    if (!search) return;
    search.value = progress >= COMMIT_RATIO && adjacentHymn ? hymnNumber(adjacentHymn) : originalSearchValue;
  }

  function updatePanelFade(progress) {
    const eased = Math.min(1, Math.max(0, progress));
    if (currentPanel) currentPanel.style.opacity = `${1 - (SWIPE_FADE * eased)}`;
    if (nextPanel) nextPanel.style.opacity = `${(1 - SWIPE_FADE) + (SWIPE_FADE * eased)}`;
  }

  function resetSwipeState() {
    touchHymn = null;
    adjacentHymn = null;
    swipeDirection = 0;
    horizontalGesture = false;
  }

  function settleSwipe(commit) {
    if (!touchHymn || !currentPanel || !nextPanel) {
      clearSwipeViewport();
      clearMobileScrollFades();
      resetSwipeState();
      return;
    }

    const current = touchHymn;
    const destination = adjacentHymn;
    const search = document.getElementById('searchInput');

    currentPanel.style.transition = `transform ${SETTLE_MS}ms ease-out, opacity ${SETTLE_MS}ms ease-out`;
    nextPanel.style.transition = `transform ${SETTLE_MS}ms ease-out, opacity ${SETTLE_MS}ms ease-out`;

    if (!commit || !destination) {
      currentPanel.style.transform = 'translate3d(0,0,0)';
      currentPanel.style.opacity = '1';
      nextPanel.style.transform = `translate3d(${swipeDirection > 0 ? 100 : -100}%,0,0)`;
      nextPanel.style.opacity = `${1 - SWIPE_FADE}`;
      if (search) search.value = originalSearchValue;

      setTimeout(() => {
        clearSwipeViewport();
        clearMobileScrollFades();
        resetSwipeState();
      }, SETTLE_MS);
      return;
    }

    currentPanel.style.transform = `translate3d(${swipeDirection > 0 ? -100 : 100}%,0,0)`;
    currentPanel.style.opacity = `${1 - SWIPE_FADE}`;
    nextPanel.style.transform = 'translate3d(0,0,0)';
    nextPanel.style.opacity = '1';
    if (search) search.value = hymnNumber(destination);

    setTimeout(() => {
      const section = current.closest('.section');
      section?.querySelectorAll('.hymn').forEach(hymn => hymn.classList.remove('show'));
      section?.querySelectorAll('.index.show').forEach(index => index.classList.remove('show'));
      destination.classList.add('show');

      document.getElementById('indexBtn')?.classList.remove('active');
      document.getElementById('showAllBtn')?.classList.remove('active');
      document.body.classList.remove('show-all-mode');

      clearSwipeViewport();

      const title = destination.querySelector('h3') || destination;
      const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: y, behavior: 'auto' });
      clearMobileScrollFades();
      resetSwipeState();
    }, SETTLE_MS);
  }

  function handleTouchStart(event) {
    if (event.touches.length !== 1) return;

    const hymn = event.target.closest('.hymn.show');
    const single = visibleSingleHymn();
    if (!hymn || hymn !== single) {
      resetSwipeState();
      return;
    }

    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchHymn = hymn;
    originalSearchValue = document.getElementById('searchInput')?.value || hymnNumber(hymn);
  }

  function handleTouchMove(event) {
    if (!touchHymn || event.touches.length !== 1) return;

    const x = event.touches[0].clientX;
    const y = event.touches[0].clientY;
    const dx = x - touchStartX;
    const dy = y - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!horizontalGesture) {
      if (absX < SWIPE_START_X) return;
      if (absX < absY * SWIPE_RATIO) {
        touchHymn = null;
        return;
      }

      swipeDirection = dx < 0 ? 1 : -1;
      adjacentHymn = adjacentFor(touchHymn, swipeDirection);
      if (!adjacentHymn) {
        touchHymn = null;
        return;
      }

      horizontalGesture = true;
      const built = buildSwipeViewport(touchHymn, adjacentHymn, swipeDirection);
      swipeViewport = built.viewport;
      currentPanel = built.currentClone;
      nextPanel = built.nextClone;
    }

    event.preventDefault();

    const width = swipeViewport?.getBoundingClientRect().width || window.innerWidth;
    const limitedDx = swipeDirection > 0
      ? Math.max(-width, Math.min(0, dx))
      : Math.min(width, Math.max(0, dx));
    const percent = (limitedDx / width) * 100;
    const progress = Math.abs(limitedDx) / width;

    currentPanel.style.transform = `translate3d(${percent}%,0,0)`;
    const nextPercent = (swipeDirection > 0 ? 100 : -100) + percent;
    nextPanel.style.transform = `translate3d(${nextPercent}%,0,0)`;

    updatePanelFade(progress);
    updateSearchForProgress(progress);
  }

  function handleTouchEnd(event) {
    if (!touchHymn) return;

    if (!horizontalGesture || event.changedTouches.length !== 1) {
      const search = document.getElementById('searchInput');
      if (search) search.value = originalSearchValue;
      clearSwipeViewport();
      clearMobileScrollFades();
      resetSwipeState();
      return;
    }

    const endX = event.changedTouches[0].clientX;
    const width = swipeViewport?.getBoundingClientRect().width || window.innerWidth;
    const progress = Math.abs(endX - touchStartX) / width;
    settleSwipe(progress >= COMMIT_RATIO);
  }

  document.addEventListener('mgh:data-ready', () => {
    normalizeMalformedFirstVerses();

    document.addEventListener('click', handleIndexLink, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', () => settleSwipe(false), { passive: true });

    document.querySelectorAll('.index a').forEach(link => {
      link.setAttribute('aria-expanded', 'false');
    });
  }, { once: true });
})();
