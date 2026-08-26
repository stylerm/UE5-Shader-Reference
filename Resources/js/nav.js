/* Mobile nav ─────────────────── */
(function(){
  const toggle=document.getElementById('menu-toggle');
  const nav=document.getElementById('sidenav');
  const ov=document.getElementById('nav-overlay');
  if(!toggle||!nav||!ov) return;
  function open(){ nav.classList.add('open'); ov.classList.add('open'); toggle.textContent='\u2715'; document.body.style.overflow='hidden'; }
  function close(){ nav.classList.remove('open'); ov.classList.remove('open'); toggle.innerHTML='&#9776;'; document.body.style.overflow=''; }
  toggle.addEventListener('click', ()=> nav.classList.contains('open') ? close() : open());
  ov.addEventListener('click', close);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
})();
