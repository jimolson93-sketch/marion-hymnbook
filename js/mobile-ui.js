(() => {
  function buildBookPicker() {
    const nav = document.querySelector('.nav[role="tablist"]');
    if (!nav || document.querySelector('.mobile-book-picker')) return;

    const picker = document.createElement('div');
    picker.className = 'mobile-book-picker';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-book-picker-toggle';
    toggle.textContent = 'Choose Hymn Book';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'true');

    const drawer = document.createElement('div');
    drawer.className = 'mobile-book-picker-drawer';
    drawer.setAttribute('aria-hidden', 'true');

    const sourceButtons = Array.from(nav.querySelectorAll('button[data-target]'));

    function closePicker() {
      picker.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
    }

    function syncSelection(sourceButton) {
      if (!sourceButton) return;
      toggle.textContent = sourceButton.textContent.trim();
      picker.classList.add('has-selection');
      drawer.querySelectorAll('.mobile-book-picker-option').forEach(option => {
        const active = option.dataset.target === sourceButton.dataset.target;
        option.classList.toggle('active', active);
        option.setAttribute('aria-current', active ? 'true' : 'false');
      });
    }

    sourceButtons.forEach(sourceButton => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'mobile-book-picker-option';
      option.dataset.target = sourceButton.dataset.target;
      option.textContent = sourceButton.textContent.trim();
      option.addEventListener('click', () => {
        sourceButton.click();
        syncSelection(sourceButton);
        closePicker();
      });
      drawer.appendChild(option);

      sourceButton.addEventListener('click', () => {
        syncSelection(sourceButton);
        closePicker();
      });
    });

    toggle.addEventListener('click', () => {
      const open = !picker.classList.contains('open');
      picker.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    });

    document.addEventListener('click', event => {
      if (!picker.contains(event.target)) closePicker();
    });

    picker.append(toggle, drawer);
    nav.parentNode.insertBefore(picker, nav);
  }

  function init() {
    buildBookPicker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
