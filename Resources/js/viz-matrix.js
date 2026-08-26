/* 09 — Emitter × Topology matrix ─────────────────── */
(function(){
  const svg = document.getElementById('matrix-svg');
  if(!svg) return;
  const W = 620, H = 360;

  const rows = ['STATEFUL · CPU', 'STATEFUL · GPU', 'STATELESS · GPU'];
  const cols = ['SINGLE ACTOR', 'POOLED CONSUMER', 'DATA CHANNEL HUB'];
  // cost 0-1, note
  const grid = [
    [{c:0.15,n:'fine for hero VFX'},  {c:0.25,n:'cullable systems'},  {c:0.4, n:'N→1 but CPU-bound'}],
    [{c:0.3, n:'big GPU sim'},        {c:0.5, n:'N dispatches ×'},    {c:0.65,n:'GPU pub/sub · medium'}],
    [{c:0.1, n:'best for trivial'},   {c:0.2, n:'MILLION particle fx'}, {c:0.35,n:'✶ sweet spot'}]
  ];
  function col(v){
    if(v<0.2) return '#b8ff57';
    if(v<0.4) return '#00e5ff';
    if(v<0.6) return '#ffb347';
    return '#ff6b35';
  }

  const padL=140, padT=60, padR=20, padB=40;
  const cw = (W-padL-padR)/cols.length;
  const rh = (H-padT-padB)/rows.length;

  let html = '';
  html += `<text x="${padL}" y="30" fill="#cdd6e0" font-family="Inter,sans-serif" font-size="14" font-weight="700">Emitter type × System topology</text>`;
  html += `<text x="${padL}" y="46" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" letter-spacing="1.5">PICK THE CELL · ARROWS SHOW GOOD MIGRATIONS</text>`;

  // col headers
  cols.forEach((c,i) => {
    html += `<text x="${padL + cw*(i+0.5)}" y="${padT-10}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" letter-spacing="1.5" text-anchor="middle">${c}</text>`;
  });
  // row headers
  rows.forEach((r,i) => {
    html += `<text x="${padL-10}" y="${padT + rh*(i+0.5)+4}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" letter-spacing="1.5" text-anchor="end">${r}</text>`;
  });

  // cells
  grid.forEach((row,ri) => row.forEach((cell,ci) => {
    const x = padL + ci*cw, y = padT + ri*rh;
    const color = col(cell.c);
    html += `<rect x="${x+3}" y="${y+3}" width="${cw-6}" height="${rh-6}" fill="${color}" fill-opacity="${0.08 + cell.c*0.15}" stroke="${color}" stroke-opacity="0.55" stroke-width="1"/>`;
    html += `<circle cx="${x+14}" cy="${y+16}" r="5" fill="${color}"/>`;
    html += `<text x="${x+24}" y="${y+20}" fill="#cdd6e0" font-family="JetBrains Mono,monospace" font-size="10" font-weight="700">${(cell.c*100|0)}</text>`;
    html += `<text x="${x+12}" y="${y+rh-14}" fill="#cdd6e0" font-family="JetBrains Mono,monospace" font-size="9.5" letter-spacing="0.5">${cell.n}</text>`;
  }));

  // migration arrow — stateful single → stateless data-channel hub (best)
  const fromX = padL + cw*0.5, fromY = padT + rh*0.5;
  const toX   = padL + cw*2.5, toY   = padT + rh*2.5;
  html += `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M0 0 L10 5 L0 10 z" fill="#b8ff57"/></marker></defs>`;
  html += `<path d="M ${fromX+30} ${fromY+12} Q ${padL + cw*1.8} ${padT + rh*1.4} ${toX-18} ${toY-16}" fill="none" stroke="#b8ff57" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr)" opacity="0.9"/>`;
  html += `<text x="${padL + cw*1.5}" y="${padT + rh*1.3}" fill="#b8ff57" font-family="JetBrains Mono,monospace" font-size="9.5" letter-spacing="1">GOOD MIGRATION →</text>`;

  // colour key
  const keyY = H-20;
  html += `<text x="${padL}" y="${keyY}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="9.5" letter-spacing="1">COST</text>`;
  ['#b8ff57','#00e5ff','#ffb347','#ff6b35'].forEach((c,i)=>{
    html += `<rect x="${padL+44+i*50}" y="${keyY-10}" width="12" height="10" fill="${c}"/>`;
    html += `<text x="${padL+60+i*50}" y="${keyY-1}" fill="#cdd6e0" font-family="JetBrains Mono,monospace" font-size="9">${['cheap','ok','hot','hero'][i]}</text>`;
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = html;
})();
