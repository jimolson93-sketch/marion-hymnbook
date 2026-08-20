(() => {
  const body = document.body;
  const showAllBtn = document.getElementById('showAllBtn');
  const indexBtn = document.getElementById('indexBtn');
  const searchInput = document.getElementById('searchInput');

  if (!body || !showAllBtn) return;

  showAllBtn.addEventListener('click', () => {
    body.classList.add('show-all-mode');
  });

  indexBtn?.addEventListener('click', () => {
    body.classList.remove('show-all-mode');
  });

  document.querySelectorAll('.nav button').forEach(button => {
    button.addEventListener('click', () => {
      body.classList.remove('show-all-mode');
    });
  });

  searchInput?.addEventListener('input', () => {
    if (searchInput.value.trim().toLowerCase() !== 'all') {
      body.classList.remove('show-all-mode');
    }
  });
})();
