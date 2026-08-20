(() => {
  const PHONE_QUERY = '(max-width:600px)';
  const fitCache = new Map();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let resizeTimer = null;

  function fitTitle(fullTitle, available, font) {
    if (!context || !available) return fullTitle;
    const key = `${Math.round(available)}|${font}|${fullTitle}`;
    if (fitCache.has(key)) return fitCache.get(key);

    context.font = font;
    if (context.measureText(fullTitle).width <= available) {
      fitCache.set(key, fullTitle);
      return fullTitle;
    }

    const words = fullTitle.split(/\s+/).filter(Boolean);
    let low = 1;
    let high = words.length;
    let best = words[0] || '';

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = words.slice(0, mid).join(' ');
      if (context.measureText(candidate).width <= available) {
        best = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    fitCache.set(key, best);
    return best;
  }

  function formatIndex(index) {
    if (!index) return;

    const links = Array.from(index.querySelectorAll('a'));
    if (!links.length) return;

    // Write all DOM changes first so Safari does not recalculate layout for every hymn.
    links.forEach(link => {
      if (link.classList.contains('index-entry')) return;

      const text = (link.textContent || '').trim();
      const match = text.match(/^(\d+)\s+(.*)$/);
      if (!match) return;

      const number = document.createElement('span');
      number.className = 'index-number';
      number.textContent = match[1];

      const title = document.createElement('span');
      title.className = 'index-title';
      title.textContent = match[2];
      title.dataset.fullTitle = match[2];

      link.textContent = '';
      link.classList.add('index-entry');
      link.append(number, title);
    });

    const titles = Array.from(index.querySelectorAll('.index-title'));
    if (!titles.length) return;

    if (!window.matchMedia(PHONE_QUERY).matches) {
      titles.forEach(title => {
        title.textContent = title.dataset.fullTitle || title.textContent || '';
      });
      return;
    }

    // Force layout only once, then reuse the same width/font for every title.
    const firstTitle = titles[0];
    const available = firstTitle.clientWidth;
    const font = getComputedStyle(firstTitle).font;

    titles.forEach(title => {
      const fullTitle = title.dataset.fullTitle || title.textContent || '';
      title.dataset.fullTitle = fullTitle;
      title.textContent = fitTitle(fullTitle, available, font);
    });
  }

  function refreshVisibleIndexes() {
    document.querySelectorAll('.index.show').forEach(formatIndex);
  }

  function estimatePhoneTitleWidth(section) {
    if (!section || !window.matchMedia(PHONE_QUERY).matches) return 0;
    const index = section.querySelector('.index');
    if (!index) return 0;

    const sectionStyle = getComputedStyle(section);
    const indexStyle = getComputedStyle(index);
    const font = indexStyle.font || sectionStyle.font;
    if (!context || !font) return 0;

    context.font = font;
    const numberWidth = context.measureText('000').width;
    const sectionInner = section.clientWidth
      - parseFloat(sectionStyle.paddingLeft || 0)
      - parseFloat(sectionStyle.paddingRight || 0);
    const indexInner = sectionInner
      - parseFloat(indexStyle.paddingLeft || 0)
      - parseFloat(indexStyle.paddingRight || 0);

    // Index links use 10px horizontal padding and the number/title grid uses a 14px gap.
    return Math.max(0, indexInner - 20 - numberWidth - 14 - 2);
  }

  function warmSection(section) {
    if (!section || !window.matchMedia(PHONE_QUERY).matches || !context) return;

    const available = estimatePhoneTitleWidth(section);
    if (!available) return;

    const index = section.querySelector('.index');
    const font = index ? getComputedStyle(index).font : getComputedStyle(section).font;
    const headings = Array.from(section.querySelectorAll('.hymn h3'));
    let cursor = 0;

    const runChunk = deadline => {
      while (cursor < headings.length && (!deadline || deadline.timeRemaining() > 2)) {
        const text = (headings[cursor++].textContent || '').trim();
        const match = text.match(/^\d+\s+(.*)$/);
        if (match) fitTitle(match[1], available, font);
      }
      if (cursor < headings.length) schedule(runChunk);
    };

    schedule(runChunk);
  }

  function schedule(callback) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 600 });
    } else {
      setTimeout(() => callback(null), 40);
    }
  }

  document.addEventListener('click', event => {
    const indexButton = event.target.closest('#indexBtn');
    if (indexButton) {
      setTimeout(refreshVisibleIndexes, 0);
      return;
    }

    const navButton = event.target.closest('.nav button[data-target]');
    if (navButton) {
      const section = document.getElementById(navButton.dataset.target);
      setTimeout(() => warmSection(section), 60);
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fitCache.clear();
      refreshVisibleIndexes();
    }, 120);
  });
})();
