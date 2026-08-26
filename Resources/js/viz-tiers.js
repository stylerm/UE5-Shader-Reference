/* 07 — Shader instruction tiers thermometer ───────── */
(function(){
  const svg = document.getElementById('tiers-svg');
  if(!svg) return;
  const W = 640, H = 260;
  const tiers = [
    {min:0,  max:30,  label:'CHEAP',     color:'#b8ff57', ex:'UI / masks / unlit'},
    {min:30, max:80,  label:'OK',        color:'#00e5ff', ex:'props · character PBR'},
    {min:80, max:200, label:'EXPENSIVE', color:'#ffb347', ex:'hero PBR · water'},
    {min:200,max:400, label:'HERO',      color:'#ff6b35', ex:'landscape · skin'},
    {min:400,max:600, label:'REWRITE',   color:'#ff5757', ex:'stop · rethink'}
  ];
  const examples = [
    {ins:22,  name:'UI rect'},
    {ins:48,  name:'prop (standard PBR)'},
    {ins:96,  name:'foliage (WPO+mask)'},
    {ins:178, name:'character skin'},
    {ins:312, name:'hero water'},
    {ins:520, name:'landscape layered ×4'}
  ];

  const padL=34, padR=24, padT=56, padB=80;
  const barY = padT, barH = 40;
  const innerW = W-padL-padR;
  const max = 600;
  const xOf = v => padL + (v/max)*innerW;

  let html = '';
  // title
  html += `<text x="${padL}" y="28" fill="#cdd6e0" font-family="Inter,sans-serif" font-size="14" font-weight="700">Material instruction count · cost bands</text>`;
  html += `<text x="${padL}" y="46" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" letter-spacing="1.5">VIEWMODE SHADERCOMPLEXITY · RULE-OF-THUMB TIERS</text>`;

  // tier segments
  tiers.forEach(t => {
    const x = xOf(t.min), w = xOf(t.max)-xOf(t.min);
    html += `<rect x="${x}" y="${barY}" width="${w}" height="${barH}" fill="${t.color}" opacity="0.22"/>`;
    html += `<rect x="${x}" y="${barY}" width="${w}" height="${barH}" fill="none" stroke="${t.color}" stroke-width="1" opacity="0.8"/>`;
    html += `<text x="${x+6}" y="${barY+15}" fill="${t.color}" font-family="JetBrains Mono,monospace" font-size="10" font-weight="700" letter-spacing="1">${t.label}</text>`;
    html += `<text x="${x+6}" y="${barY+30}" fill="#cdd6e0" font-family="JetBrains Mono,monospace" font-size="8.5" letter-spacing="0.5">${t.ex}</text>`;
    // boundary tick
    if(t.min>0){
      html += `<line x1="${x}" y1="${barY-6}" x2="${x}" y2="${barY}" stroke="#6b7a8d" stroke-width="1"/>`;
      html += `<text x="${x}" y="${barY-10}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="9" text-anchor="middle">${t.min}</text>`;
    }
  });
  html += `<line x1="${xOf(max)}" y1="${barY-6}" x2="${xOf(max)}" y2="${barY}" stroke="#6b7a8d" stroke-width="1"/>`;
  html += `<text x="${xOf(max)}" y="${barY-10}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="9" text-anchor="middle">600+</text>`;

  // mercury fill (animated via CSS)
  const fillX = xOf(0), fillW = xOf(312)-xOf(0);
  html += `<defs>
    <linearGradient id="merc" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b8ff57"/>
      <stop offset="0.3" stop-color="#00e5ff"/>
      <stop offset="0.55" stop-color="#ffb347"/>
      <stop offset="0.8" stop-color="#ff6b35"/>
    </linearGradient>
  </defs>`;
  html += `<rect x="${padL}" y="${barY+barH+6}" width="${innerW}" height="6" fill="rgba(30,37,48,0.5)"/>`;
  html += `<rect id="tiers-merc" x="${padL}" y="${barY+barH+6}" width="${fillW}" height="6" fill="url(#merc)"/>`;

  // example pins
  examples.forEach((e,i) => {
    const x = xOf(e.ins);
    const y = padT + barH + 30 + (i%3)*22;
    html += `<line x1="${x}" y1="${barY+barH}" x2="${x}" y2="${y-4}" stroke="rgba(205,214,224,0.35)" stroke-width="1" stroke-dasharray="2 3"/>`;
    html += `<circle cx="${x}" cy="${y}" r="3" fill="#fff"/>`;
    html += `<text x="${x+8}" y="${y+3.5}" fill="#cdd6e0" font-family="JetBrains Mono,monospace" font-size="10">${e.ins} · ${e.name}</text>`;
  });

  // axis
  html += `<text x="${padL}" y="${H-14}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" letter-spacing="1">INSTRUCTIONS →</text>`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = html;

  // Animate mercury
  const merc = document.getElementById('tiers-merc');
  function tick(){
    const t = VIZ.time()*0.5;
    const v = (Math.sin(t)*0.5+0.5) * 550 + 20;
    merc.setAttribute('width', xOf(v)-padL);
    const tier = tiers.find(x => v>=x.min && v<x.max) || tiers[tiers.length-1];
    const lbl = document.getElementById('tiers-readout');
    if(lbl) lbl.innerHTML = `INSTRUCTIONS <b style="color:${tier.color}">${v|0}</b> · ${tier.label}`;
    requestAnimationFrame(tick);
  }
  tick();
})();
