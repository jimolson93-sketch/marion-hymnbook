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
      const target = activeBtn?activeBtn.dataset.target:'';
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

  function close(){
    if (drawer.classList.contains('open')) setOpen(false);
  }

  setOpen(false);

  btn.addEventListener('click', function(e){
    e.stopPropagation();
    setOpen(!drawer.classList.contains('open'));
  });

  // Keep the drawer open while the user is adjusting size or appearance.
  drawer.addEventListener('click', function(e){
    e.stopPropagation();
  });
  drawer.addEventListener('pointerdown', function(e){
    e.stopPropagation();
  });

  // Once the user interacts elsewhere, the settings are no longer the focus.
  document.addEventListener('pointerdown', function(e){
    if (!drawer.classList.contains('open')) return;
    if (drawer.contains(e.target) || btn.contains(e.target)) return;
    close();
  });

  // Scrolling the page means the user has returned to reading. Pointer activity
  // inside the drawer itself does not scroll the page, so slider use stays open.
  window.addEventListener('scroll', close, { passive:true });
})();

(function(){
  const indexBtn = document.getElementById('indexBtn');
  const showAllBtn = document.getElementById('showAllBtn');

  if (!indexBtn || !showAllBtn) return;

  function setActive(button, active){
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  indexBtn.addEventListener('click', function(){
    setActive(indexBtn, true);
    setActive(showAllBtn, false);
  });

  showAllBtn.addEventListener('click', function(){
    setActive(showAllBtn, true);
    setActive(indexBtn, false);
  });

  document.querySelectorAll('.nav button').forEach(btn => {
    btn.addEventListener('click', function(){
      setActive(indexBtn, false);
      setActive(showAllBtn, false);
    });
  });
})();
