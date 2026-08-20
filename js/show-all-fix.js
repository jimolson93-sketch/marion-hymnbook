(() => {
  const body = document.body;
  const showAllBtn = document.getElementById('showAllBtn');
  const indexBtn = document.getElementById('indexBtn');
  const searchInput = document.getElementById('searchInput');

  if (!body || !showAllBtn) return;

  function syncShowAllMode(){
    body.classList.toggle('show-all-mode', showAllBtn.classList.contains('active'));
  }

  showAllBtn.addEventListener('click', () => setTimeout(syncShowAllMode, 0));
  indexBtn?.addEventListener('click', () => setTimeout(syncShowAllMode, 0));

  document.querySelectorAll('.nav button').forEach(button => {
    button.addEventListener('click', () => setTimeout(syncShowAllMode, 0));
  });

  searchInput?.addEventListener('input', () => setTimeout(syncShowAllMode, 0));
})();
