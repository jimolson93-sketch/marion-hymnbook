(() => {
  const FAVORITES_KEY = 'mghFavoritesV1';
  const HISTORY_KEY = 'mghHistoryV1';
  const HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  const HISTORY_DWELL_MS = 2 * 60 * 1000;
  const EVENING_START_HOUR = 15;
  const HOLD_MS = 650;
  const MOVE_CANCEL_PX = 12;

  const BOOKS = {
    section1: { name: 'New Believers Hymns', short: 'New Believers' },
    section2: { name: 'Gospel Hymns', short: 'Gospel' },
    section3: { name: 'Old Believers Hymns', short: 'Old Believers' }
  };

  let favorites = readList(FAVORITES_KEY);
  let history = pruneHistory(readList(HISTORY_KEY));
  let holdTimer = null;
  let holdTarget = null;
  let holdRecord = null;
  let holdTriggered = false;
  let holdStartX = 0;
  let holdStartY = 0;
  let candidate = null;
  let initialized = false;

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

  function pruneHistory(items) {
    const cutoff = Date.now() - HISTORY_RETENTION_MS;
    const valid = items.filter(item => item && Number.isFinite(Number(item.timestamp)) && Number(item.timestamp) >= cutoff);
    if (valid.length !== items.length) writeList(HISTORY_KEY, valid);
    return valid;
  }

  function hymnInfo(hymn) {
    if (!hymn) return null;
    const section = hymn.closest('.section');
    const heading = hymn.querySelector('h3');
    if (!section || !heading || !BOOKS[section.id]) return null;
    const text = (heading.textContent || '').trim();
    const match = text.match(/^(\d+)\s+(.*)$/);
    if (!match) return null;
    return { key: `${section.id}:${match[1]}`, sectionId: section.id, number: match[1], title: match[2] };
  }

  function hymnFromRecord(record) {
    if (!record) return null;
    const section = document.getElementById(record.sectionId);
    if (!section) return null;
    return Array.from(section.querySelectorAll('.hymn')).find(hymn => hymnInfo(hymn)?.key === record.key) || null;
  }

  function isFavorite(key) { return favorites.some(item => item.key === key); }

  function applyFavoriteState(hymn) {
    const info = hymnInfo(hymn);
    if (info) hymn.classList.toggle('is-favorite', isFavorite(info.key));
  }

  function applyAllFavoriteStates() { document.querySelectorAll('.hymn').forEach(applyFavoriteState); }

  function toggleFavorite(hymn) {
    const info = hymnInfo(hymn);
    if (!info) return;
    const existing = favorites.findIndex(item => item.key === info.key);
    if (existing >= 0) favorites.splice(existing, 1); else favorites.push(info);
    writeList(FAVORITES_KEY, favorites);
    applyFavoriteState(hymn);
    refreshSavedIndexIfVisible(true);
  }

  function removeFavoriteRecord(record) {
    if (!record) return;
    const before = favorites.length;
    favorites = favorites.filter(item => item.key !== record.key);
    if (favorites.length === before) return;
    writeList(FAVORITES_KEY, favorites);
    const hymn = hymnFromRecord(record);
    if (hymn) applyFavoriteState(hymn);
    refreshSavedIndexIfVisible(true);
  }

  function periodForTimestamp(timestamp) {
    return new Date(timestamp).getHours() < EVENING_START_HOUR ? 'Morning' : 'Evening';
  }

  function dayKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function recordHistory(hymn, startedAt) {
    const info = hymnInfo(hymn);
    if (!info) return;
    const timestamp = Number(startedAt) || Date.now();
    const day = dayKey(timestamp);
    const period = periodForTimestamp(timestamp);
    history = pruneHistory(history).filter(item => !(item.key === info.key && dayKey(item.timestamp) === day && periodForTimestamp(item.timestamp) === period));
    history.push({ ...info, timestamp });
    history.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    writeList(HISTORY_KEY, history);
    refreshSavedIndexIfVisible();
  }

  function clearCandidateTimer() {
    if (candidate?.timer) clearTimeout(candidate.timer);
    if (candidate) candidate.timer = null;
  }

  function pauseCandidate() {
    if (!candidate || candidate.paused) return;
    clearCandidateTimer();
    candidate.elapsed += Math.max(0, Date.now() - candidate.segmentStartedAt);
    candidate.paused = true;
  }

  function armCandidate() {
    if (!candidate || candidate.recorded || document.hidden) return;
    const remaining = HISTORY_DWELL_MS - candidate.elapsed;
    if (remaining <= 0) {
      candidate.recorded = true;
      recordHistory(candidate.hymn, candidate.startedAt);
      return;
    }
    candidate.paused = false;
    candidate.segmentStartedAt = Date.now();
    clearCandidateTimer();
    candidate.timer = setTimeout(() => {
      if (!candidate || candidate.recorded) return;
      candidate.elapsed += Math.max(0, Date.now() - candidate.segmentStartedAt);
      candidate.recorded = true;
      clearCandidateTimer();
      recordHistory(candidate.hymn, candidate.startedAt);
    }, remaining);
  }

  function cancelCandidate(sourceLink = null) {
    if (!candidate) return;
    if (sourceLink && candidate.sourceLink !== sourceLink) return;
    clearCandidateTimer();
    candidate = null;
  }

  function startCandidate(hymn, sourceLink = null) {
    const info = hymnInfo(hymn);
    if (!info) { cancelCandidate(); return; }
    if (candidate?.info?.key === info.key && candidate.sourceLink === sourceLink) return;
    cancelCandidate();
    candidate = {
      hymn,
      info,
      sourceLink,
      startedAt: Date.now(),
      elapsed: 0,
      segmentStartedAt: Date.now(),
      paused: document.hidden,
      recorded: false,
      timer: null
    };
    armCandidate();
  }

  function clearHold() {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    holdTarget = null;
    holdRecord = null;
  }

  function beginHold(event) {
    if (typeof event.button === 'number' && event.button > 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const favoriteLink = target.closest('.index[data-index-mode="favorites"] a.saved-index-entry');
    const heading = target.closest('.hymn h3');
    if (!favoriteLink && !heading) return;
    clearHold();
    holdTriggered = false;
    holdStartX = event.clientX;
    holdStartY = event.clientY;
    if (favoriteLink) holdRecord = favoriteLink._mghRecord || null;
    else holdTarget = heading.closest('.hymn');
    holdTimer = setTimeout(() => {
      const hymn = holdTarget;
      const record = holdRecord;
      holdTriggered = true;
      clearHold();
      if (record) removeFavoriteRecord(record);
      else if (hymn) toggleFavorite(hymn);
    }, HOLD_MS);
  }

  function moveHold(event) {
    if (!holdTimer) return;
    if (Math.abs(event.clientX - holdStartX) > MOVE_CANCEL_PX || Math.abs(event.clientY - holdStartY) > MOVE_CANCEL_PX) clearHold();
  }

  function activeSection() { return Array.from(document.querySelectorAll('.section')).find(section => !section.classList.contains('hidden')) || null; }

  function visibleSingleHymn() {
    const section = activeSection();
    if (!section || document.body.classList.contains('show-all-mode')) return null;
    const visible = Array.from(section.querySelectorAll('.hymn.show')).filter(hymn => getComputedStyle(hymn).display !== 'none');
    return visible.length === 1 ? visible[0] : null;
  }

  function syncMainHistoryCandidate() {
    const hymn = visibleSingleHymn();
    if (hymn) startCandidate(hymn, null);
    else if (!candidate?.sourceLink) cancelCandidate();
  }

  function buildDrawer(target) {
    const drawer = document.createElement('div');
    drawer.className = 'index-hymn-drawer';
    drawer.setAttribute('role', 'region');
    drawer.setAttribute('aria-label', target.querySelector('h3')?.textContent?.trim() || 'Hymn');
    Array.from(target.children).forEach(child => {
      if (!child.matches('h3, .hymn-step-nav')) drawer.appendChild(child.cloneNode(true));
    });
    return drawer;
  }

  function closeDrawers(index, exceptLink = null) {
    index.querySelectorAll('.index-hymn-drawer').forEach(drawer => drawer.remove());
    index.querySelectorAll('a.index-expanded').forEach(link => {
      if (link !== exceptLink) {
        cancelCandidate(link);
        link.classList.remove('index-expanded');
        link.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function openIndexEntry(event, record, link) {
    event.preventDefault();
    event.stopPropagation();
    if (holdTriggered) { holdTriggered = false; return; }
    const index = link.closest('.index');
    const target = hymnFromRecord(record);
    if (!index || !target) return;
    const existing = link.nextElementSibling?.classList.contains('index-hymn-drawer') ? link.nextElementSibling : null;
    if (existing) {
      existing.remove();
      cancelCandidate(link);
      link.classList.remove('index-expanded');
      link.setAttribute('aria-expanded', 'false');
      return;
    }
    closeDrawers(index, link);
    const drawer = buildDrawer(target);
    link.insertAdjacentElement('afterend', drawer);
    link.classList.add('index-expanded');
    link.setAttribute('aria-expanded', 'true');
    if (index.dataset.indexMode !== 'history') startCandidate(target, link);
  }

  function makeEntry(record, includeBook, extraClass = 'saved-index-entry') {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'index-entry ' + extraClass + (includeBook ? ' has-book-label' : '');
    link.setAttribute('aria-expanded', 'false');
    link._mghRecord = record;

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

    [['all', 'All Hymns'], ['favorites', 'Favorites'], ['history', 'History']].forEach(([mode, label]) => {
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
      if (!info) return;
      const entry = makeEntry(info, false, 'book-index-entry');
      entry.classList.toggle('is-favorite-index', isFavorite(info.key));
      fragment.appendChild(entry);
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

  function formatHistoryDate(timestamp) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(timestamp));
  }

  function renderHistory(index) {
    const content = index.querySelector('.index-view-content');
    if (!content) return;
    history = pruneHistory(history).filter(item => hymnFromRecord(item));
    writeList(HISTORY_KEY, history);
    const fragment = document.createDocumentFragment();

    if (!history.length) {
      const empty = document.createElement('div');
      empty.className = 'saved-index-empty';
      empty.innerHTML = '<strong>No history yet.</strong><span>Hymns kept open for about two minutes will appear here.</span>';
      fragment.appendChild(empty);
      content.replaceChildren(fragment);
      return;
    }

    const days = new Map();
    history.slice().sort((a, b) => Number(b.timestamp) - Number(a.timestamp)).forEach(item => {
      const key = dayKey(item.timestamp);
      if (!days.has(key)) days.set(key, { timestamp: item.timestamp, Morning: [], Evening: [] });
      days.get(key)[periodForTimestamp(item.timestamp)].push(item);
    });

    days.forEach(day => {
      const dateHeading = document.createElement('div');
      dateHeading.className = 'history-date-heading';
      dateHeading.textContent = formatHistoryDate(day.timestamp);
      fragment.appendChild(dateHeading);

      ['Morning', 'Evening'].forEach(period => {
        const items = day[period].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
        if (!items.length) return;
        const periodHeading = document.createElement('div');
        periodHeading.className = 'history-period-heading';
        periodHeading.textContent = period;
        fragment.appendChild(periodHeading);
        items.forEach(item => fragment.appendChild(makeEntry(item, true)));
      });
    });

    content.replaceChildren(fragment);
  }

  function renderMode(index, mode) {
    ensureIndexShell(index);
    closeDrawers(index);
    setTabState(index, mode);
    if (mode === 'favorites') renderFavorites(index);
    else if (mode === 'history') renderHistory(index);
    else renderAll(index);
  }

  function setupVisibleIndex() {
    const index = activeSection()?.querySelector('.index.show');
    if (!index) return;
    ensureIndexShell(index);
    renderMode(index, index.dataset.indexMode || 'all');
  }

  function refreshSavedIndexIfVisible(includeAll = false) {
    const index = activeSection()?.querySelector('.index.show');
    if (!index || index.dataset.savedViewsReady !== 'true') return;
    const mode = index.dataset.indexMode || 'all';
    if (mode === 'favorites' || mode === 'history' || (includeAll && mode === 'all')) renderMode(index, mode);
  }

  function initialize() {
    if (initialized) return;
    if (!document.querySelector('.section .hymn')) return;
    initialized = true;
    applyAllFavoriteStates();
    writeList(HISTORY_KEY, history);

    document.addEventListener('pointerdown', beginHold, true);
    document.addEventListener('pointermove', moveHold, { capture: true, passive: true });
    document.addEventListener('pointerup', clearHold, true);
    document.addEventListener('pointercancel', clearHold, true);
    document.addEventListener('contextmenu', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.hymn h3, .index[data-index-mode="favorites"] a.saved-index-entry')) event.preventDefault();
    });

    const observer = new MutationObserver(mutations => {
      if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'class' && (m.target.classList?.contains('hymn') || m.target.classList?.contains('section')))) {
        setTimeout(syncMainHistoryCandidate, 80);
      }
    });
    document.querySelectorAll('.section').forEach(section => observer.observe(section, { subtree: true, attributes: true, attributeFilter: ['class'] }));

    document.addEventListener('visibilitychange', () => {
      if (!candidate) return;
      if (document.hidden) pauseCandidate();
      else armCandidate();
    });

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('#indexBtn')) setTimeout(setupVisibleIndex, 30);
    });

    setTimeout(syncMainHistoryCandidate, 120);
  }

  document.addEventListener('mgh:data-ready', initialize, { once: true });
  if (document.querySelector('.section .hymn')) initialize();
  else setTimeout(initialize, 1000);
})();
