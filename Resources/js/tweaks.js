/* Tweaks + edit mode protocol ─────────────────── */
(function(){
  const panel = document.getElementById('tweaks-panel');
  if(!panel) return;

  const apply = (t) => {
    document.body.classList.remove('viz-style-match','viz-style-schematic','viz-style-crt');
    document.body.classList.add('viz-style-' + t.style);
    VIZ.speed = parseFloat(t.speed);
    document.getElementById('tw-speed-val').textContent = VIZ.speed.toFixed(2)+'×';
    document.getElementById('tw-speed').value = VIZ.speed;
    document.body.classList.toggle('viz-labels-off', t.labels==='off');
    document.querySelectorAll('#tw-style button').forEach(b=>b.classList.toggle('active', b.dataset.style===t.style));
    document.querySelectorAll('#tw-labels button').forEach(b=>b.classList.toggle('active', b.dataset.labels===t.labels));
  };

  const state = Object.assign({}, TWEAK_DEFAULTS);
  apply(state);

  function commit(){ apply(state); try{ window.parent.postMessage({type:'__edit_mode_set_keys', edits:state}, '*'); }catch(e){} }

  document.querySelectorAll('#tw-style button').forEach(b=>{
    b.addEventListener('click', ()=>{ state.style=b.dataset.style; commit(); });
  });
  document.querySelectorAll('#tw-labels button').forEach(b=>{
    b.addEventListener('click', ()=>{ state.labels=b.dataset.labels; commit(); });
  });
  document.getElementById('tw-speed').addEventListener('input', e=>{
    state.speed = parseFloat(e.target.value); commit();
  });

  // edit-mode listener BEFORE announcing availability
  window.addEventListener('message', ev=>{
    const m = ev.data || {};
    if(m.type==='__activate_edit_mode') document.body.classList.add('tweaks-on');
    else if(m.type==='__deactivate_edit_mode') document.body.classList.remove('tweaks-on');
  });
  try{ window.parent.postMessage({type:'__edit_mode_available'}, '*'); }catch(e){}
})();
