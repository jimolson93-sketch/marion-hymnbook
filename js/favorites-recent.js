(() => {
  const FAVORITES_KEY = 'mghFavoritesV1';
  const RECENT_KEY = 'mghRecentV1';
  const RECENT_LIMIT = 10;
  const HOLD_MS = 650;
  const MOVE_CANCEL_PX = 12;

  const BOOKS = {
    section1: { name: 'New Believers Hymns', short: 'New Believers' },
    section2: { name: 'Gospel Hymns', short: 'Gospel' },
    section3: { name: 'Old Believers Hymns', short: 'Old Believers' }
  };

  let favorites = readList(FAVORITES_KEY);
  let recent = readList(RECENT_KEY);
  let holdTimer = null;
  let holdTarget = null;
  let holdStartX = 0;
  let holdStartY = 0;
  let recentTimer = null;

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function writeList(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function hymnInfo(hymn) {
    if (!hymn) return null;
    const section = hymn.closest('.section');
    const heading = hymn.querySelector('h3');
    if (!section || !heading || !BOOKS[section.id]) return null;
    const text = (heading.textContent || '').trim();
    const match = text.match(/^(\d+)\s+(.*)$/);
    if (!match) return null;
    return {
      key: `${section.id}:${match[1]}`,
      sectionId: section.id,
      number: match[1],
      title: match[2]
    };
  }

  function hymnFromRecord(record) {
    if (!record) return null;
    const section = document.getElementById(record.sectionId);
    if (!section) return null;
    return Array.from(section.querySelectorAll('.hymn')).find(hymn => {
      const info = hymnInfo(hymn);
      return info?.key === record.key;
    }) || null;
  }

  function isFavorite(key) {
    return favorites.some(item => item.key === key);
  }

  function applyFavoriteState(hymn) {
    const info = hymnInfo(hymn);
    if (!info) return;
    hymn.classList.toggle('is-favorite', isFavorite(info.key));
  }

  function applyAllFavoriteStates() {
    document.querySelectorAll('.hymn').forEach(applyFavoriteState);
  }

  function toggleFavorite(hymn) {
    const info = hymnInfo(hymn);
    if (!info) return;
    const existing = favorites.findIndex(item => item.key === info.key);
    if (existing >= 0) favorites.splice(existing, 1);
    else favorites.push(info);
    writeList(FAVORITES_KEY, favorites);
    applyFavoriteState(hymn);
    refreshSavedIndexIfVisible();
  }

  function recordRecent(hymn, refresh = true) {
    const info = hymnInfo(hymn);
    if (!info) return;
    recent = recent.filter(item => item.key !== info.key);
    recent.unshift(info);
    recent = recent.slice(0, RECENT_LIMIT);
    writeList(RECENT_KEY, recent);
    if (refresh) refreshSavedIndexIfVisible();
  }

  function clearHold() {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    holdTarget = null;
  }

  function beginHold(event) {
    const heading = event.target.closest('.hymn h3');
    if (!heading || event.button > 0) return;
    const hymn = heading.closest('.hymn');
    if (!hymn) return;
    clearHold();
    holdTarget = hymn;
    holdStartX = event.clientX;
    holdStartY = event.clientY;
    holdTimer = setTimeout(() => {
      const target = holdTarget;
      clearHold();
      if (target) toggleFavorite(target);
    }, HOLD_MS);
  }

  function moveHold(event) {
    if (!holdTimer) return;
    if (Math.abs(event.clientX - holdStartX) > MOVE_CANCEL_PX || Math.abs(event.clientY - holdStartY) > MOVE_CANCEL_PX) clearHold();
  }

  function activeSection() {
    return Array.from(document.querySelectorAll('.section')).find(section => !section.classList.contains('hidden')) || null;
  }

  function scheduleVisibleRecent() {
    clearTimeout(recentTimer);
    recentTimer = setTimeout(() => {
      const section = activeSection();
      if (!section || document.body.classList.contains('show-all-mode')) return;
      const visible = Array.from(section.querySelectorAll('.hymn.show')).filter(hymn => getComputedStyle(hymn).display !== 'none');
      if (visible.length === 1) recordRecent(visible[0]);
    }, 60);
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

  function closeDrawers(index, exceptLink = null) {
    index.querySelectorAll('.index-hymn-drawer').forEach(drawer => drawer.remove());
    index.querySelectorAll('a.index-expanded').forEach(link => {
      if (link !== exceptLink) {
        link.classList.remove('index-expanded');
        link.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function openIndexEntry(event, record, link) {
    event.preventDefault();
    event.stopPropagation();
    const index = link.closest('.index');
    const target = hymnFromRecord(record);
    if (!index || !target) return;

    const existing = link.nextElementSibling?.classList.contains('index-hymn-drawer') ? link.nextElementSibling : null;
    if (existing) {
      existing.remove();
      link.classList.remove('index-expanded');
      link.setAttribute('aria-expanded', 'false');
      return;
    }

    closeDrawers(index, link);
    const drawer = buildDrawer(target);
    link.insertAdjacentElement('afterend', drawer);
    link.classList.add('index-expanded');
    link.setAttribute('aria-expanded', 'true');
    recordRecent(target, false);
  }

  function makeEntry(record, includeBook, extraClass = 'saved-index-entry') {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'index-entry ' + extraClass + (includeBook ? ' has-book-label' : '');
    link.setAttribute('aria-expanded', 'false');

    const number = document.createElement('span');
    number.className = 'index-number';
    number.textContent = record.number;

    const title = document.createElement('span');
    title.className = 'index-title';
    title.textContent = record.title;
    title.dataset.fullTitle = record.title;

    link.append(number, title);

    if (includeBook) {
      const book = document.createElement('span');
      book.className = 'index-book-label';
      book.textContent = BOOKS[record.sectionId]?.short || '';
      link.appendChild(book);
    }

    link.addEventListener('click', event => openIndexEntry(event, record, link));
    return link;
  }

  function ensureIndexShell(index) {
    if (!index || index.dataset.savedViewsReady === 'true') return;

    const tabs = document.createElement('div');
    tabs.className = 'index-view-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Index view');

    [['all', 'All Hymns'], ['favorites', 'Favorites'], ['recent', 'Recent']].forEach(([mode, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.indexMode = mode;
      button.textContent = label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        renderMode(index, mode);
      });
      tabs.appendChild(button);
    });

    const content = document.createElement('div');
    content.className = 'index-view-content';
    index.replaceChildren(tabs, content);
    index.dataset.savedViewsReady = 'true';
    index.dataset.indexMode = 'all';
    setTabState(index, 'all');
  }

  function setTabState(index, mode) {
    index.dataset.indexMode = mode;
    index.querySelectorAll('.index-view-tabs button').forEach(button => {
      const active = button.dataset.indexMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function renderAll(index) {
    const section = index.closest('.section');
    const content = index.querySelector('.index-view-content');
    if (!section || !content) return;
    const fragment = document.createDocumentFragment();
    section.querySelectorAll('.hymn').forEach(hymn => {
      const info = hymnInfo(hymn);
      if (info) fragment.appendChild(makeEntry(info, false, 'book-index-entry'));
    });
    content.replaceChildren(fragment);
  }

  function renderFavorites(index) {
    const content = index.querySelector('.index-view-content');
    if (!content) return;
    const fragment = document.createDocumentFragment();
    let count = 0;

    Object.keys(BOOKS).forEach(sectionId => {
      const items = favorites
        .filter(item => item.sectionId === sectionId && hymnFromRecord(item))
        .sort((a, b) => Number(a.number) - Number(b.number));
      if (!items.length) return;
      count += items.length;
      const heading = document.createElement('div');
      heading.className = 'saved-index-book-heading';
      heading.textContent = BOOKS[sectionId].name;
      fragment.appendChild(heading);
      items.forEach(item => fragment.appendChild(makeEntry(item, false)));
    });

    if (!count) {
      const empty = document.createElement('div');
      empty.className = 'saved-index-empty';
      empty.innerHTML = '<strong>No favorites yet.</strong><span>Press and hold a hymn title to add it.</span>';
      fragment.appendChild(empty);
    }
    content.replaceChildren(fragment);
  }

  function renderRecent(index) {
    const content = index.querySelector('.index-view-content');
    if (!content) return;
    const valid = recent.filter(item => hymnFromRecord(item)).slice(0, RECENT_LIMIT);
    const fragment = document.createDocumentFragment();
    if (!valid.length) {
      const empty = document.createElement('div');
      empty.className = 'saved-index-empty';
      empty.innerHTML = '<strong>No recent hymns yet.</strong><span>Hymns you open will appear here.</span>';
      fragment.appendChild(empty);
    } else {
      valid.forEach(item => fragment.appendChild(makeEntry(item, true)));
    }
    content.replaceChildren(fragment);
  }

  function renderMode(index, mode) {
    ensureIndexShell(index);
    closeDrawers(index);
    setTabState(index, mode);
    if (mode === 'favorites') renderFavorites(index);
    else if (mode === 'recent') renderRecent(index);
    else renderAll(index);
  }

  function setupVisibleIndex() {
    const index = activeSection()?.querySelector('.index.show');
    if (!index) return;
    ensureIndexShell(index);
    renderMode(index, index.dataset.indexMode || 'all');
  }

  function refreshSavedIndexIfVisible() {
    const index = activeSection()?.querySelector('.index.show');
    if (!index || index.dataset.savedViewsReady !== 'true') return;
    const mode = index.dataset.indexMode || 'all';
    if (mode === 'favorites' || mode === 'recent') renderMode(index, mode);
  }

  document.addEventListener('mgh:data-ready', () => {
    applyAllFavoriteStates();

    document.addEventListener('pointerdown', beginHold, true);
    document.addEventListener('pointermove', moveHold, { capture: true, passive: true });
    document.addEventListener('pointerup', clearHold, true);
    document.addEventListener('pointercancel', clearHold, true);
    document.addEventListener('contextmenu', event => {
      if (event.target.closest('.hymn h3')) event.preventDefault();
    });

    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutation => mutation.type === 'attributes' && mutation.attributeName === 'class' && mutation.target.classList?.contains('hymn'))) scheduleVisibleRecent();
    });
    document.querySelectorAll('.section').forEach(section => observer.observe(section, { subtree: true, attributes: true, attributeFilter: ['class'] }));

    document.addEventListener('click', event => {
      if (event.target.closest('#indexBtn')) setTimeout(setupVisibleIndex, 30);
    });
  }, { once: true });
})();
