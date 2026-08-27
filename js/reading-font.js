(() => {
  const STORAGE_KEY = 'mgh-reading-font';
  const VALID = new Set(['default', 'accessible']);

  function readMode(){
    try{
      const saved = localStorage.getItem(STORAGE_KEY);
      return VALID.has(saved) ? saved : 'default';
    }catch(_){
      return 'default';
    }
  }

  function applyMode(mode, persist = true){
    if(!VALID.has(mode)) mode = 'default';
    document.documentElement.dataset.readingFont = mode;
    document.querySelectorAll('.reading-font-option').forEach(button => {
      const active = button.dataset.readingFont === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if(persist){
      try{ localStorage.setItem(STORAGE_KEY, mode); }catch(_){}
    }
  }

  function buildControls(){
    const appearance = document.querySelector('.appearance-controls');
    if(!appearance || document.querySelector('.reading-font-controls')) return;

    const wrap = document.createElement('div');
    wrap.className = 'reading-font-controls';

    const label = document.createElement('div');
    label.className = 'reading-font-label';
    label.textContent = 'Reading Font';

    const options = document.createElement('div');
    options.className = 'reading-font-options';
    options.setAttribute('role','group');
    options.setAttribute('aria-label','Reading font');

    [['default','Standard'],['accessible','Accessible']].forEach(([value,text]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reading-font-option';
      button.dataset.readingFont = value;
      button.textContent = text;
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click', () => applyMode(value, true));
      options.appendChild(button);
    });

    wrap.append(label, options);
    appearance.insertBefore(wrap, appearance.firstChild);
    applyMode(readMode(), false);
  }

  const initial = readMode();
  document.documentElement.dataset.readingFont = initial;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildControls, {once:true});
  else buildControls();
})();
