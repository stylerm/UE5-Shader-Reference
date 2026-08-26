/* 10 — DI cost tier pyramid ─────────────────────── */
(function(){
  const svg = document.getElementById('pyramid-svg');
  if(!svg) return;
  const W = 560, H = 380;

  const tiers = [
    {lbl:'TIER 4 · VERY EXPENSIVE', col:'#ff5757', ms:'2-10ms+', ex:['Neighbor Grid 3D','Physics Collision (sync)','High-res Grid3D']},
    {lbl:'TIER 3 · EXPENSIVE',      col:'#ff6b35', ms:'0.5-2ms',  ex:['Grid2D (dynamic)','Ray Tracing DI','Mesh Vertex/Index sample']},
    {lbl:'TIER 2 · CHEAP WINS',     col:'#ffb347', ms:'0.1-0.5ms',ex:['Data Channel (read)','Skeletal Mesh DI','Spline DI']},
    {lbl:'TIER 1 · EFFECTIVELY FREE',col:'#b8ff57', ms:'<0.1ms',  ex:['Curve LUT','Parameter Collection','Static Array (small)']}
  ];

  const apex = {x: W/2, y: 30};
  const baseL = {x: 40,    y: H-70};
  const baseR = {x: W-40,  y: H-70};

  // Divide height into 4 horizontal slabs of the triangle
  const totalH = baseL.y - apex.y;
  const slabH = totalH / tiers.length;

  let html = '';
  html += `<text x="${W/2}" y="18" text-anchor="middle" fill="#cdd6e0" font-family="Inter,sans-serif" font-size="14" font-weight="700">Data Interface cost pyramid</text>`;

  tiers.forEach((t,i) => {
    const yTop = apex.y + i*slabH;
    const yBot = apex.y + (i+1)*slabH;
    // widths from linear interp apex→base
    const wTop = ((yTop-apex.y)/totalH) * (W-80);
    const wBot = ((yBot-apex.y)/totalH) * (W-80);
    const xTopL = W/2 - wTop/2, xTopR = W/2 + wTop/2;
    const xBotL = W/2 - wBot/2, xBotR = W/2 + wBot/2;

    html += `<path d="M ${xTopL} ${yTop} L ${xTopR} ${yTop} L ${xBotR} ${yBot} L ${xBotL} ${yBot} Z"
             fill="${t.col}" fill-opacity="0.18" stroke="${t.col}" stroke-width="1"/>`;

    // label inside slab
    const cy = (yTop+yBot)/2;
    html += `<text x="${W/2}" y="${cy-3}" text-anchor="middle" fill="${t.col}" font-family="JetBrains Mono,monospace" font-size="10" font-weight="700" letter-spacing="1.5">${t.lbl}</text>`;
    html += `<text x="${W/2}" y="${cy+10}" text-anchor="middle" fill="#cdd6e0" font-family="JetBrains Mono,monospace" font-size="8.5" letter-spacing="0.5">${t.ms}</text>`;

    // examples on the right of the slab
    const exX = xBotR + 10;
    t.ex.forEach((e,j) => {
      html += `<line x1="${xBotR-6}" y1="${cy-10 + j*11}" x2="${exX-4}" y2="${cy-10 + j*11}" stroke="${t.col}" stroke-opacity="0.4" stroke-width="1"/>`;
      html += `<text x="${exX}" y="${cy-7 + j*11}" fill="#cdd6e0" font-family="JetBrains Mono,monospace" font-size="9">${e}</text>`;
    });
  });

  // base label
  html += `<text x="${W/2}" y="${H-40}" text-anchor="middle" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" letter-spacing="1.5">PICK LOWEST TIER THAT SOLVES THE PROBLEM</text>`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = html;
})();
