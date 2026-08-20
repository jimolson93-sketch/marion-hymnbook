document.addEventListener("mgh:data-ready", () => {
  const navButtons = document.querySelectorAll(".nav button");
  const sections = document.querySelectorAll(".section");
  const searchRow = document.querySelector(".search-row");
  const fontSizeRow = document.getElementById("fontSizeRow");
  const searchInput = document.getElementById("searchInput");
  const indexBtn = document.getElementById("indexBtn");
  const showAllBtn = document.getElementById("showAllBtn");

  function setUtilityState(indexActive, allActive){
    indexBtn.classList.toggle('active', indexActive);
    indexBtn.setAttribute('aria-pressed', indexActive ? 'true' : 'false');
    showAllBtn.classList.toggle('active', allActive);
    showAllBtn.setAttribute('aria-pressed', allActive ? 'true' : 'false');
  }

  function clearVisibleContent(section){
    if (!section) return;
    section.querySelectorAll('.hymn.show').forEach(hymn => hymn.classList.remove('show'));
    section.querySelectorAll('.index.show').forEach(index => index.classList.remove('show'));
  }

  sections.forEach(sec => sec.classList.add("hidden"));
  searchRow.style.display = "none";
  if (fontSizeRow) fontSizeRow.style.display = "none";

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.dataset.target;
      sections.forEach(sec => {
        if (sec.id === targetId) sec.classList.remove("hidden");
        else sec.classList.add("hidden");
      });
      searchRow.style.display = "flex";
      if (fontSizeRow) fontSizeRow.style.display = "flex";
      document.querySelectorAll(".index.show").forEach(i => i.classList.remove("show"));
      document.body.classList.remove('show-all-mode');
      setUtilityState(false, false);
    });
  });

  function performSearch(query) {
    const activeSection = document.querySelector(".section:not(.hidden)");
    if (!activeSection) return;
    const hymns = activeSection.querySelectorAll(".hymn");
    const indexDiv = activeSection.querySelector(".index");

    hymns.forEach(hymn => hymn.classList.remove("show"));
    indexDiv?.classList.remove("show");

    query = query.toLowerCase().trim();
    if (query === "") return;

    if (query === "all") {
      hymns.forEach(hymn => hymn.classList.add("show"));
      return;
    }

    if (query === "index") {
      if (!indexDiv) return;
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

    hymns.forEach(hymn => {
      const num = hymn.querySelector("h3")?.textContent.split(" ")[0];
      if (num && num.toLowerCase() === query) hymn.classList.add("show");
    });
  }

  searchInput.addEventListener("input", (e) => {
    setUtilityState(false, false);
    document.body.classList.remove('show-all-mode');
    performSearch(e.target.value);
  });

  indexBtn.addEventListener("click", () => {
    const activeSection = document.querySelector('.section:not(.hidden)');
    const wasActive = indexBtn.classList.contains('active');
    document.body.classList.remove('show-all-mode');
    if (wasActive) {
      clearVisibleContent(activeSection);
      setUtilityState(false, false);
      return;
    }
    performSearch("index");
    setUtilityState(true, false);
  });

  showAllBtn.addEventListener("click", () => {
    const activeSection = document.querySelector('.section:not(.hidden)');
    const wasActive = showAllBtn.classList.contains('active');
    if (wasActive) {
      clearVisibleContent(activeSection);
      document.body.classList.remove('show-all-mode');
      setUtilityState(false, false);
      return;
    }
    performSearch("all");
    document.body.classList.add('show-all-mode');
    setUtilityState(false, true);
  });
});

(function(){
  const slider = document.getElementById('fontSizeSlider');
  const display = document.getElementById('fontSizeDisplay');
  const minus = document.getElementById('fontDecreaseBtn');
  const plus = document.getElementById('fontIncreaseBtn');
  if (!slider || !display || !minus || !plus) return;
  const MIN = 60, MAX = 100, STEP = 5;
  const STORAGE_KEY = 'mghHymnZoomPercent';
  function normalize(value){
    let pct = Number(value);
    if (!Number.isFinite(pct)) pct = 100;
    pct = Math.round(pct / STEP) * STEP;
    return Math.max(MIN, Math.min(MAX, pct));
  }
  function applyZoom(value){
    const pct = normalize(value);
    slider.value = String(pct);
    display.textContent = pct + '%';
    document.documentElement.style.setProperty('--hymn-scale', String(pct / 100));
    document.documentElement.setAttribute('data-hymn-zoom', String(pct));
    const gutter = Math.round(8 + ((100 - pct) / 40) * 20);
    document.documentElement.style.setProperty('--mobile-hymn-gutter', gutter + 'px');
    minus.disabled = pct <= MIN;
    plus.disabled = pct >= MAX;
    try { localStorage.setItem(STORAGE_KEY, String(pct)); } catch(e) {}
  }
  slider.addEventListener('input', function(){ applyZoom(this.value); });
  minus.addEventListener('click', function(){ applyZoom(Number(slider.value) - STEP); });
  plus.addEventListener('click', function(){ applyZoom(Number(slider.value) + STEP); });
  let startingValue = 100;
  const isMobile = window.matchMedia("(max-width:700px)").matches;
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) startingValue = saved;
    else if (isMobile) {
      const activeBtn = document.querySelector('.nav button.active');
      startingValue = (activeBtn?.dataset.target === 'section2') ? 70 : 75;
    }
  } catch(e){ if (isMobile) startingValue = 75; }
  function applyDefaultForBook(){
    if (!isMobile) return;
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch(e){}
    const target=document.querySelector('.nav button.active')?.dataset.target || '';
    applyZoom(target==='section2'?70:75);
  }
  document.querySelectorAll('.nav button').forEach(btn=>btn.addEventListener('click',()=>setTimeout(applyDefaultForBook,0)));
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
    setTimeout(function(){
      const visibleHymns = Array.from(document.querySelectorAll(".hymn.show"));
      const visibleHymn = visibleHymns.find(h => getComputedStyle(h).display !== "none" && h.offsetParent !== null) || visibleHymns[0];
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
  function close(){ if (drawer.classList.contains('open')) setOpen(false); }
  setOpen(false);
  btn.addEventListener('click', function(e){ e.stopPropagation(); setOpen(!drawer.classList.contains('open')); });
  drawer.addEventListener('click', e => e.stopPropagation());
  drawer.addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('pointerdown', function(e){
    if (!drawer.classList.contains('open')) return;
    if (drawer.contains(e.target) || btn.contains(e.target)) return;
    close();
  });
  window.addEventListener('scroll', close, { passive:true });
})();
