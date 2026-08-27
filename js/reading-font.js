(() => {
  const STORAGE_KEY = 'mgh-reading-font';

  function readMode(){
    try{return localStorage.getItem(STORAGE_KEY) === 'accessible' ? 'accessible' : 'default';}
    catch(_){return 'default';}
  }

  function applyMode(mode, persist = true){
    mode = mode === 'accessible' ? 'accessible' : 'default';
    document.documentElement.dataset.readingFont = mode;
    const button = document.querySelector('.reading-font-toggle');
    if(button){
      const active = mode === 'accessible';
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', active ? 'true' : 'false');
    }
    if(persist){try{localStorage.setItem(STORAGE_KEY, mode);}catch(_){}}
  }

  function buildControls(){
    const appearance = document.querySelector('.appearance-controls');
    if(!appearance || document.querySelector('.reading-font-controls')) return;

    const wrap = document.createElement('div');
    wrap.className = 'reading-font-controls';

    const label = document.createElement('span');
    label.className = 'reading-font-label';
    label.textContent = 'Low Vision';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reading-font-toggle';
    button.setAttribute('role','switch');
    button.setAttribute('aria-label','Use low vision reading font');
    button.setAttribute('aria-checked','false');
    button.innerHTML = '<span class="reading-font-switch-knob" aria-hidden="true"></span>';
    button.addEventListener('click', () => applyMode(readMode() === 'accessible' ? 'default' : 'accessible', true));

    wrap.append(label, button);
    appearance.parentNode.insertBefore(wrap, appearance);
    applyMode(readMode(), false);
  }

  document.documentElement.dataset.readingFont = readMode();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildControls, {once:true});
  else buildControls();
})();
