document.addEventListener("mgh:data-ready", () => {
  const navButtons = document.querySelectorAll(".nav button");
  const sections = document.querySelectorAll(".section");
  const searchRow = document.querySelector(".search-row");
  const fontSizeRow = document.getElementById("fontSizeRow");
  const searchInput = document.getElementById("searchInput");
  const indexBtn = document.getElementById("indexBtn");
  const showAllBtn = document.getElementById("showAllBtn");

  // Hide everything initially
  sections.forEach(sec => sec.classList.add("hidden"));
  searchRow.style.display = "none";
  if (fontSizeRow) fontSizeRow.style.display = "none";

  // Navigation button behavior
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const targetId = btn.dataset.target;

      // Show selected section, hide others
      sections.forEach(sec => {
        if (sec.id === targetId) sec.classList.remove("hidden");
        else sec.classList.add("hidden");
      });

      // Reveal search controls and font controls
      searchRow.style.display = "flex";
      if (fontSizeRow) fontSizeRow.style.display = "flex";

      // Hide any visible indexes when switching
      document.querySelectorAll(".index.show").forEach(i => i.classList.remove("show"));
    });
  });

  // Function to perform search
  function performSearch(query) {
    const activeSection = document.querySelector(".section:not(.hidden)");
    if (!activeSection) return;

    const hymns = activeSection.querySelectorAll(".hymn");
    const indexDiv = activeSection.querySelector(".index");

    hymns.forEach(hymn => hymn.classList.remove("show"));
    indexDiv.classList.remove("show");

    query = query.toLowerCase().trim();
    if (query === "") return;

    if (query === "all") {
      hymns.forEach(hymn => hymn.classList.add("show"));
      return;
    }

    if (query === "index") {
      indexDiv.innerHTML = "";
      const titles = activeSection.querySelectorAll(".hymn h3");
      titles.forEach(hymn => {
        const link = document.createElement("a");
        link.textContent = hymn.textContent;
        link.href = "#" + hymn.parentElement.id;
        indexDiv.appendChild(link);
      });
      indexDiv.classList.add("show");
      return;
    }

    // If number, show specific hymn
    hymns.forEach(hymn => {
      const num = hymn.querySelector("h3")?.textContent.split(" ")[0];
      if (num && num.toLowerCase() === query) hymn.classList.add("show");
    });
  }

  // Auto search as user types
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value;
    performSearch(query);
  });

  // Index button
  indexBtn.addEventListener("click", () => {
    performSearch("index");
  });

  // Show all button
  showAllBtn.addEventListener("click", () => {
    performSearch("all");
  });
});

(function(){
  const slider = document.getElementById('fontSizeSlider');
  const display = document.getElementById('fontSizeDisplay');
  const minus = document.getElementById('fontDecreaseBtn');
  const plus = document.getElementById('fontIncreaseBtn');

  if (!slider || !display || !minus || !plus) return;

  const MIN = 60;
  const MAX = 100;
  const STEP = 5;
  const STORAGE_KEY = 'mghHymnZoomPercent';

  function normalize(value){
    let pct = Number(value);
    if (!Number.isFinite(pct)) pct = 100;
    pct = Math.round(pct / STEP) * STEP;
    return Math.max(MIN, Math.min(MAX, pct));
  }

  function applyZoom(value){
    const pct = normalize(value);

    // Slider is the single source of truth.
    slider.value = String(pct);
    display.textContent = pct + '%';

    // One scale controls title/number, verses, verse numbers, and chorus together.
    document.documentElement.style.setProperty('--hymn-scale', String(pct / 100));
    document.documentElement.setAttribute('data-hymn-zoom', String(pct));

    // On phones, larger hymn text gets nearly the full screen.
    // Smaller zoom levels keep a little more centered breathing room.
    const gutter = Math.round(8 + ((100 - pct) / 40) * 20); // 8px at 100%, 28px at 60%
    document.documentElement.style.setProperty('--mobile-hymn-gutter', gutter + 'px');

    minus.disabled = pct <= MIN;
    plus.disabled = pct >= MAX;

    try {
      localStorage.setItem(STORAGE_KEY, String(pct));
    } catch(e) {}
  }

  slider.addEventListener('input', function(){
    applyZoom(this.value);
  });

  minus.addEventListener('click', function(){
    applyZoom(Number(slider.value) - STEP);
  });

  plus.addEventListener('click', function(){
    applyZoom(Number(slider.value) + STEP);
  });

  let startingValue = 100;
  const isMobile = window.matchMedia("(max-width:700px)").matches;
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) {
      startingValue = saved;
    } else if (isMobile) {
      const activeBtn = document.querySelector('.nav button.active');
      const target = activeBtn ? activeBtn.dataset.target : '';
      startingValue = (target === 'section2') ? 70 : 75;
    }
  } catch(e){
    if (isMobile){
      const activeBtn = document.querySelector('.nav button.active');
      const target = activeBtn ? activeBtn.dataset.target : '';
      startingValue = (target === 'section2') ? 70 : 75;
    }
  }

  function applyDefaultForBook(){
    if (!isMobile) return;
    try{
      if (localStorage.getItem(STORAGE_KEY)) return;
    }catch(e){}
    const activeBtn=document.querySelector('.nav button.active');
    const target=activeBtn?activeBtn.dataset.target:'';
    applyZoom(target==='section2'?70:75);
  }

  document.querySelectorAll('.nav button').forEach(btn=>{
    btn.addEventListener('click',()=>setTimeout(applyDefaultForBook,0));
  });

  applyZoom(startingValue);
})();

(function(){
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  if (!searchInput || !searchBtn) return;

  searchInput.addEventListener("keydown", function(e){
    if (e.key !== "Enter") return;

    e.preventDefault();
    e.stopImmediatePropagation();

    searchBtn.click();

    // Wait until the search result has been rendered/shown, then bring its title into view.
    setTimeout(function(){
      const visibleHymns = Array.from(document.querySelectorAll(".hymn.show"));
      const visibleHymn = visibleHymns.find(h => {
        const style = getComputedStyle(h);
        return style.display !== "none" && h.offsetParent !== null;
      }) || visibleHymns[0];

      if (!visibleHymn) return;

      const title = visibleHymn.querySelector("h3") || visibleHymn;
      const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: y, behavior: "smooth" });
    }, 50);
  }, true);
})();

(function(){
  const btn = document.getElementById('settingsBtn');
  const drawer = document.getElementById('settingsDrawer');
  if (!btn || !drawer) return;

  function setOpen(open){
    drawer.classList.toggle('open', open);
    btn.classList.toggle('active', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  setOpen(false);

  btn.addEventListener('click', function(){
    setOpen(!drawer.classList.contains('open'));
  });
})();

(function(){
  const indexBtn = document.getElementById('indexBtn');
  const showAllBtn = document.getElementById('showAllBtn');

  if (!indexBtn || !showAllBtn) return;

  function activeSection(){
    return Array.from(document.querySelectorAll('.section')).find(s =>
      !s.classList.contains('hidden') && getComputedStyle(s).display !== 'none'
    );
  }

  function clearUtilityStates(){
    indexBtn.classList.remove('active');
    showAllBtn.classList.remove('active');
  }

  // Keep button state synced when another action changes the view.
  document.addEventListener('click', function(e){
    if (e.target.closest('.index a')) {
      clearUtilityStates();
    }
    if (e.target.closest('.nav button')) {
      clearUtilityStates();
    }
    if (e.target.closest('#searchBtn')) {
      clearUtilityStates();
    }
  });

  // Capture the clicks first so we can turn Index and Show All into true toggles.
  indexBtn.addEventListener('click', function(e){
    const section = activeSection();
    if (!section) return;

    const index = section.querySelector('.index');
    if (!index) return;

    const isOpen = index.classList.contains('show');

    if (isOpen) {
      e.preventDefault();
      e.stopImmediatePropagation();
      index.classList.remove('show');
      index.setAttribute('aria-hidden','true');
      indexBtn.classList.remove('active');
      return;
    }

    // Let the page's existing Index behavior run, then sync appearance.
    setTimeout(function(){
      clearUtilityStates();
      indexBtn.classList.add('active');
    }, 0);
  }, true);

  showAllBtn.addEventListener('click', function(e){
    const section = activeSection();
    if (!section) return;

    const hymns = Array.from(section.querySelectorAll('.hymn'));
    const allShown = hymns.length > 0 && hymns.every(h => h.classList.contains('show'));

    if (showAllBtn.classList.contains('active') || allShown) {
      e.preventDefault();
      e.stopImmediatePropagation();

      hymns.forEach(h => h.classList.remove('show'));
      const index = section.querySelector('.index');
      if (index) {
        index.classList.remove('show');
        index.setAttribute('aria-hidden','true');
      }

      showAllBtn.classList.remove('active');
      return;
    }

    // Let the existing Show All behavior run, then mark the button active.
    setTimeout(function(){
      clearUtilityStates();
      showAllBtn.classList.add('active');
    }, 0);
  }, true);
})();

(function(){
  const navButtons = document.querySelectorAll('.nav button');
  const sections = document.querySelectorAll('.section');
  const searchRow = document.querySelector('.search-row');
  const settingsDrawer = document.getElementById('settingsDrawer');

  // Neutral startup state: no book appears selected.
  navButtons.forEach(btn => btn.classList.remove('active'));

  // Hide both hymn-book sections until a selection is made.
  sections.forEach(section => section.classList.add('hidden'));

  // Hide controls until a hymn book is chosen.
  if (searchRow) searchRow.style.display = 'none';

  // Keep settings closed at startup as well.
  if (settingsDrawer) {
    settingsDrawer.classList.remove('open');
    settingsDrawer.setAttribute('aria-hidden', 'true');
  }
})();

(function(){
  const showAllBtn = document.getElementById('showAllBtn');
  const searchBtn = document.getElementById('searchBtn');
  const indexBtn = document.getElementById('indexBtn');
  const navButtons = document.querySelectorAll('.nav button');

  if (!showAllBtn) return;

  function setShowAllMode(on){
    document.body.classList.toggle('show-all-mode', !!on);
  }

  // Sync after Show All's existing behavior runs.
  showAllBtn.addEventListener('click', function(){
    setTimeout(function(){
      setShowAllMode(showAllBtn.classList.contains('active'));
    }, 0);
  });

  // Any action that leaves Show All view restores normal spacing.
  if (searchBtn) searchBtn.addEventListener('click', function(){ setShowAllMode(false); });
  if (indexBtn) indexBtn.addEventListener('click', function(){
    setTimeout(function(){
      if (!showAllBtn.classList.contains('active')) setShowAllMode(false);
    }, 0);
  });

  navButtons.forEach(btn => {
    btn.addEventListener('click', function(){ setShowAllMode(false); });
  });

  document.addEventListener('click', function(e){
    if (e.target.closest('.index a')) setShowAllMode(false);
  });

  // Start clean.
  setShowAllMode(false);
})();

document.addEventListener('mgh:data-ready',()=>{
  const navButtons=document.querySelectorAll('.nav button[data-target]');
  const search=document.querySelector('.search-row input[type="text"], #searchInput, input[type="search"]');

  function resetView(){
    // Clear search box
    if(search) search.value='';

    // Hide all displayed hymns
    document.querySelectorAll('.hymn.show').forEach(h=>h.classList.remove('show'));

    // Hide any visible index
    document.querySelectorAll('.index.show').forEach(i=>{
      i.classList.remove('show');
      i.setAttribute('aria-hidden','true');
    });

    // Reset utility button states
    ['searchBtn','indexBtn','showAllBtn'].forEach(id=>{
      const b=document.getElementById(id);
      if(b) b.classList.remove('active');
    });

    document.body.classList.remove('show-all-mode');
  }

  navButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      // Run after existing book-switch logic.
      setTimeout(resetView,10);
    });
  });
});

(function(){
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  if (!searchInput || !searchBtn) return;

  let blurTimer = null;

  function scrollToVisibleHymn(){
    setTimeout(function(){
      const visibleHymns = Array.from(document.querySelectorAll('.hymn.show'));
      const visibleHymn = visibleHymns.find(h => {
        const style = getComputedStyle(h);
        return style.display !== 'none' && h.offsetParent !== null;
      }) || visibleHymns[0];

      if (!visibleHymn) return;

      const title = visibleHymn.querySelector('h3') || visibleHymn;
      const y = title.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 60);
  }

  searchInput.addEventListener('blur', function(){
    clearTimeout(blurTimer);

    const value = searchInput.value.trim();
    if (!value) return;

    blurTimer = setTimeout(function(){
      searchBtn.click();
      scrollToVisibleHymn();
    }, 40);
  });
})();
