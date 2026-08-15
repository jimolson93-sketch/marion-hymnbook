(() => {
  let searchMode = 'number';
  let modeButton = null;
  let results = null;

  function activeSection(){
    return Array.from(document.querySelectorAll('.section')).find(section =>
      !section.classList.contains('hidden') && getComputedStyle(section).display !== 'none'
    ) || null;
  }

  function normalize(value){
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘`']/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  function escapeRegex(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }

  function highlight(text,tokens){
    if (!tokens.length) return escapeHtml(text);
    const pattern = tokens.slice().sort((a,b) => b.length-a.length).map(escapeRegex).join('|');
    if (!pattern) return escapeHtml(text);
    const re = new RegExp(`(${pattern})`, 'ig');
    return String(text).split(re).map((part,index) =>
      index % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)
    ).join('');
  }

  function hymnNumber(hymn){
    const heading = hymn.querySelector('h3');
    return heading ? (heading.textContent.trim().match(/^\d+/)?.[0] || '') : '';
  }

  function hymnTitle(hymn){
    const heading = hymn.querySelector('h3');
    if (!heading) return '';
    return heading.textContent.trim().replace(/^\d+\s*/, '');
  }

  function hymnLines(hymn){
    return Array.from(hymn.querySelectorAll('.verse')).map(line => line.textContent.trim());
  }

  function clearResults(){
    if (!results) return;
    results.innerHTML = '';
    results.classList.remove('show');
  }

  function hideSectionViews(section){
    section.querySelectorAll('.hymn.show').forEach(hymn => hymn.classList.remove('show'));
    const index = section.querySelector('.index');
    if (index){
      index.classList.remove('show');
      index.setAttribute('aria-hidden','true');
    }
    document.body.classList.remove('show-all-mode');
    document.getElementById('indexBtn')?.classList.remove('active');
    document.getElementById('showAllBtn')?.classList.remove('active');
  }

  function openHymn(section, hymn){
    hideSectionViews(section);
    clearResults();
    section.querySelectorAll('.hymn.show').forEach(item => item.classList.remove('show'));
    hymn.classList.add('show');
    const input = document.getElementById('searchInput');
    if (input) input.value = hymnNumber(hymn);
    setSearchMode('number', { reset:false, focus:false });
    setTimeout(() => {
      const title = hymn.querySelector('h3') || hymn;
      const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({top:y,behavior:'smooth'});
    }, 30);
  }

  function matchesFor(section, query){
    const normalizedQuery = normalize(query);
    if (normalizedQuery.length < 2) return [];
    const tokens = [...new Set(normalizedQuery.split(' ').filter(Boolean))];

    return Array.from(section.querySelectorAll('.hymn')).map(hymn => {
      const number = hymnNumber(hymn);
      const title = hymnTitle(hymn);
      const titleNorm = normalize(title);
      const titleExact = titleNorm.includes(normalizedQuery);
      const titleAll = tokens.every(token => titleNorm.includes(token));
      let bestLine = '';
      let bestScore = 0;

      hymnLines(hymn).forEach(line => {
        const lineNorm = normalize(line);
        const exact = lineNorm.includes(normalizedQuery);
        const all = tokens.every(token => lineNorm.includes(token));
        const score = exact ? 3 : (all ? 2 : 0);
        if (score > bestScore){
          bestScore = score;
          bestLine = line;
        }
      });

      if (!titleExact && !titleAll && !bestLine) return null;
      const titleScore = titleExact ? 5 : (titleAll ? 4 : 0);
      return {
        hymn,
        number,
        title,
        titleMatch:titleScore >= bestScore,
        line:titleScore >= bestScore ? '' : bestLine,
        score:Math.max(titleScore,bestScore),
        tokens
      };
    }).filter(Boolean).sort((a,b) => b.score-a.score || Number(a.number)-Number(b.number));
  }

  function renderTextResults(query){
    const section = activeSection();
    if (!section || !results) return;
    const raw = query.trim();

    hideSectionViews(section);

    if (!raw){
      clearResults();
      return;
    }

    if (/^\d+$/.test(raw)){
      const hymn = Array.from(section.querySelectorAll('.hymn')).find(item => hymnNumber(item) === raw);
      results.innerHTML = `<div class="search-results-summary">${hymn ? '1 result' : 'No exact hymn'} for “${escapeHtml(raw)}”</div>` +
        (hymn ? `<button type="button" class="search-result" data-number="${escapeHtml(raw)}"><span class="search-result-title"><mark>${escapeHtml(raw)}</mark>. ${escapeHtml(hymnTitle(hymn))}</span><span class="search-result-meta">Hymn number match</span></button>` : `<div class="search-results-empty">No hymn found with that number in this hymn book.</div>`);
      results.classList.add('show');
      return;
    }

    const normalizedQuery = normalize(raw);
    if (normalizedQuery.length < 2){
      results.innerHTML = '<div class="search-results-empty">Type at least two letters to search hymn titles and lyrics.</div>';
      results.classList.add('show');
      return;
    }

    const matches = matchesFor(section, raw);
    results.innerHTML = `<div class="search-results-summary">${matches.length} result${matches.length === 1 ? '' : 's'} for “${escapeHtml(raw)}”</div>` +
      (matches.length ? matches.map(match => `
        <button type="button" class="search-result" data-number="${escapeHtml(match.number)}">
          <span class="search-result-title">${escapeHtml(match.number)}. ${highlight(match.title,match.tokens)}</span>
          ${match.titleMatch ? '<span class="search-result-meta">Title match</span>' : `<span class="search-result-snippet">${highlight(match.line,match.tokens)}</span>`}
        </button>`).join('') : '<div class="search-results-empty">No hymns found in this hymn book.</div>');
    results.classList.add('show');
  }

  function applySearchUI(){
    const input = document.getElementById('searchInput');
    if (!input || !modeButton) return;
    const textMode = searchMode === 'text';
    modeButton.textContent = textMode ? 'ABC' : '#';
    modeButton.classList.toggle('words', textMode);
    modeButton.setAttribute('aria-label', textMode ? 'Switch to hymn number search' : 'Switch to word search');
    modeButton.title = textMode ? 'Switch to hymn number search' : 'Switch to word search';
    input.placeholder = textMode ? 'Search words or number…' : 'Go to hymn…';
    input.setAttribute('inputmode', textMode ? 'text' : 'numeric');
    input.setAttribute('enterkeyhint', textMode ? 'search' : 'done');
    input.setAttribute('aria-label', textMode ? 'Search hymn titles, lyrics, or hymn number' : 'Go to hymn');
    if (textMode){
      input.removeAttribute('pattern');
      input.setAttribute('autocapitalize','none');
    } else {
      input.setAttribute('pattern','[0-9]*');
      input.removeAttribute('autocapitalize');
    }
  }

  function setSearchMode(next,{reset=true,focus=false}={}){
    const input = document.getElementById('searchInput');
    if (!input) return;
    searchMode = next;
    input.blur();
    if (reset){
      input.value = '';
      clearResults();
      const section = activeSection();
      if (section) hideSectionViews(section);
    }
    applySearchUI();
    if (focus) setTimeout(() => input.focus(),30);
  }

  document.addEventListener('mgh:data-ready', () => {
    const input = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchBtn');
    if (!input || !searchButton || modeButton) return;

    const shell = document.createElement('div');
    shell.className = 'search-input-shell';
    input.parentNode.insertBefore(shell,input);
    shell.appendChild(input);

    modeButton = document.createElement('button');
    modeButton.type = 'button';
    modeButton.className = 'search-mode-btn';
    shell.appendChild(modeButton);

    results = document.createElement('div');
    results.className = 'search-results';
    results.setAttribute('aria-live','polite');
    const activeMain = document.querySelector('.main');
    activeMain.insertBefore(results,activeMain.firstChild);

    modeButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      setSearchMode(searchMode === 'number' ? 'text' : 'number',{reset:true,focus:true});
    });

    input.addEventListener('input', event => {
      if (searchMode !== 'text') return;
      event.stopImmediatePropagation();
      renderTextResults(input.value);
    }, true);

    input.addEventListener('keydown', event => {
      if (searchMode !== 'text' || event.key !== 'Enter') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      renderTextResults(input.value);
      input.blur();
    }, true);

    searchButton.addEventListener('click', event => {
      if (searchMode !== 'text') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      renderTextResults(input.value);
      input.blur();
    }, true);

    results.addEventListener('click', event => {
      const button = event.target.closest('.search-result[data-number]');
      if (!button) return;
      const section = activeSection();
      if (!section) return;
      const hymn = Array.from(section.querySelectorAll('.hymn')).find(item => hymnNumber(item) === button.dataset.number);
      if (hymn) openHymn(section,hymn);
    });

    document.querySelectorAll('.nav button[data-target]').forEach(button => {
      button.addEventListener('click', () => {
        clearResults();
        if (searchMode === 'text') setSearchMode('text',{reset:true,focus:false});
      });
    });

    document.getElementById('indexBtn')?.addEventListener('click',clearResults);
    document.getElementById('showAllBtn')?.addEventListener('click',clearResults);

    applySearchUI();
  });
})();
