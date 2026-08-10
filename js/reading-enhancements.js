(() => {
  const SWIPE_START_X = 12;
  const SWIPE_RATIO = 1.35;
  const COMMIT_RATIO = 0.32;
  const TOP_TOLERANCE = 30;
  const SETTLE_MS = 180;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchHymn = null;
  let adjacentHymn = null;
  let preview = null;
  let swipeDirection = 0;
  let horizontalGesture = false;
  let startedAtHymnTop = false;
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

  function clearPreview() {
    preview?.remove();
    preview = null;
    if (touchHymn) {
      touchHymn.classList.remove('hymn-dragging', 'hymn-settling');
      touchHymn.style.transform = '';
      touchHymn.style.transition = '';
    }
  }

  function makePreview(hymn, direction) {
    const clone = hymn.cloneNode(true);
    clone.classList.remove('show');
    clone.classList.add('swipe-hymn-preview');
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');

    const rect = touchHymn.getBoundingClientRect();
    clone.style.top = `${Math.max(0, rect.top)}px`;
    clone.style.left = '0';
    clone.style.width = `${window.innerWidth}px`;
    clone.style.height = `${Math.max(window.innerHeight - Math.max(0, rect.top), 1)}px`;
    clone.style.transform = `translate3d(${direction > 0 ? window.innerWidth : -window.innerWidth}px,0,0)`;
    document.body.appendChild(clone);
    return clone;
  }

  function updateSearchForProgress(progress) {
    const search = document.getElementById('searchInput');
    if (!search) return;
    search.value = progress >= COMMIT_RATIO && adjacentHymn ? hymnNumber(adjacentHymn) : originalSearchValue;
  }

  function resetSwipeState() {
    touchHymn = null;
    adjacentHymn = null;
    swipeDirection = 0;
    horizontalGesture = false;
    startedAtHymnTop = false;
  }

  function settleSwipe(commit, dx) {
    if (!touchHymn) return;

    const width = window.innerWidth;
    const current = touchHymn;
    const destination = adjacentHymn;
    const search = document.getElementById('searchInput');

    current.classList.remove('hymn-dragging');
    current.classList.add('hymn-settling');
    current.style.transition = `transform ${SETTLE_MS}ms ease-out`;
    if (preview) preview.style.transition = `transform ${SETTLE_MS}ms ease-out`;

    if (!commit || !destination) {
      current.style.transform = 'translate3d(0,0,0)';
      if (preview) preview.style.transform = `translate3d(${swipeDirection > 0 ? width : -width}px,0,0)`;
      if (search) search.value = originalSearchValue;

      setTimeout(() => {
        clearPreview();
        resetSwipeState();
      }, SETTLE_MS);
      return;
    }

    const finalCurrentX = swipeDirection > 0 ? -width : width;
    current.style.transform = `translate3d(${finalCurrentX}px,0,0)`;
    if (preview) preview.style.transform = 'translate3d(0,0,0)';
    if (search) search.value = hymnNumber(destination);

    setTimeout(() => {
      const section = current.closest('.section');
      section?.querySelectorAll('.hymn').forEach(hymn => hymn.classList.remove('show'));
      section?.querySelectorAll('.index.show').forEach(index => index.classList.remove('show'));
      destination.classList.add('show');

      document.getElementById('indexBtn')?.classList.remove('active');
      document.getElementById('showAllBtn')?.classList.remove('active');
      document.body.classList.remove('show-all-mode');

      clearPreview();

      const title = destination.querySelector('h3') || destination;
      const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: y, behavior: 'auto' });
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

    const title = hymn.querySelector('h3') || hymn;
    const hymnTop = title.getBoundingClientRect().top + window.pageYOffset - 8;

    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchHymn = hymn;
    startedAtHymnTop = window.pageYOffset <= hymnTop + TOP_TOLERANCE;
    originalSearchValue = document.getElementById('searchInput')?.value || hymnNumber(hymn);
  }

  function handleTouchMove(event) {
    if (!touchHymn || !startedAtHymnTop || event.touches.length !== 1) return;

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
      touchHymn.classList.add('hymn-dragging');
      preview = makePreview(adjacentHymn, swipeDirection);
    }

    event.preventDefault();

    const width = window.innerWidth;
    const limitedDx = swipeDirection > 0
      ? Math.max(-width, Math.min(0, dx))
      : Math.min(width, Math.max(0, dx));

    touchHymn.style.transform = `translate3d(${limitedDx}px,0,0)`;
    if (preview) {
      const previewX = (swipeDirection > 0 ? width : -width) + limitedDx;
      preview.style.transform = `translate3d(${previewX}px,0,0)`;
    }

    updateSearchForProgress(Math.abs(limitedDx) / width);
  }

  function handleTouchEnd(event) {
    if (!touchHymn) return;

    if (!horizontalGesture || event.changedTouches.length !== 1) {
      const search = document.getElementById('searchInput');
      if (search) search.value = originalSearchValue;
      clearPreview();
      resetSwipeState();
      return;
    }

    const endX = event.changedTouches[0].clientX;
    const dx = endX - touchStartX;
    const progress = Math.abs(dx) / window.innerWidth;
    settleSwipe(progress >= COMMIT_RATIO, dx);
  }

  document.addEventListener('mgh:data-ready', () => {
    normalizeMalformedFirstVerses();

    document.addEventListener('click', handleIndexLink, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', () => settleSwipe(false, 0), { passive: true });

    document.querySelectorAll('.index a').forEach(link => {
      link.setAttribute('aria-expanded', 'false');
    });
  }, { once: true });
})();
