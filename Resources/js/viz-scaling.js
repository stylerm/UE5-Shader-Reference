/* 02 — GPU vs CPU scaling curve ─────────────────── */
(function () {
  const svg = document.getElementById('scaling-svg');
  if (!svg) return;
  const slider = document.getElementById('scaling-slider');
  const nEl    = document.getElementById('scaling-n');
  const vEl    = document.getElementById('scaling-verdict');

  const W = 520, H = 420, padL=54, padR=18, padT=22, padB=50;
  const innerW = W-padL-padR, innerH = H-padT-padB;

  // Cost models (arbitrary ms units, shape matters)
  // n ∈ [1, 1e6] → x in log10 [0..6]
  function cpu(n){ return 0.02 + 0.0006*n; }                        // linear
  function gpu(n){ return 0.35 + 0.00002*n + 0.000000004*n*n; }     // flat-ish then rise

  function pathFor(fn){
    let d = '';
    for (let i=0;i<=120;i++){
      const lx = i/120 * 6; // log10(n)
      const n  = Math.pow(10, lx);
      const y  = fn(n);
      const px = padL + lx/6 * innerW;
      // log y 0.02..20
      const ly = Math.max(0.02, Math.min(20, y));
      const py = padT + innerH - (Math.log10(ly/0.02) / Math.log10(20/0.02)) * innerH;
      d += (i?'L':'M') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
    }
    return d;
  }

  function xFor(n){ return padL + Math.log10(n)/6 * innerW; }
  function yFor(y){
    const ly = Math.max(0.02, Math.min(20, y));
    return padT + innerH - (Math.log10(ly/0.02) / Math.log10(20/0.02)) * innerH;
  }

  function render(){
    const n = Math.round(Math.pow(10, parseFloat(slider.value)));
    nEl.textContent = n.toLocaleString();

    let html = '';
    // grid
    for (let i=0;i<=6;i++){
      const x = padL + i*innerW/6;
      html += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT+innerH}" stroke="rgba(30,37,48,0.7)" stroke-width="1"/>`;
      html += `<text x="${x}" y="${padT+innerH+16}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" text-anchor="middle">10^${i}</text>`;
    }
    [0.02, 0.2, 2, 20].forEach(v => {
      const y = yFor(v);
      html += `<line x1="${padL}" y1="${y}" x2="${padL+innerW}" y2="${y}" stroke="rgba(30,37,48,0.4)" stroke-width="1"/>`;
      html += `<text x="${padL-8}" y="${y+3}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" text-anchor="end">${v}ms</text>`;
    });
    // axes labels
    html += `<text x="${padL+innerW/2}" y="${H-10}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" text-anchor="middle" letter-spacing="2">PARTICLE COUNT (LOG)</text>`;
    html += `<text x="14" y="${padT+innerH/2}" fill="#6b7a8d" font-family="JetBrains Mono,monospace" font-size="10" text-anchor="middle" transform="rotate(-90 14 ${padT+innerH/2})" letter-spacing="2">COST (LOG)</text>`;

    // curves
    html += `<path d="${pathFor(cpu)}" fill="none" stroke="#ff6b35" stroke-width="2.2"/>`;
    html += `<path d="${pathFor(gpu)}" fill="none" stroke="#00e5ff" stroke-width="2.2"/>`;

    // crossover marker at n=~100
    const cx = xFor(100);
    html += `<line x1="${cx}" y1="${padT}" x2="${cx}" y2="${padT+innerH}" stroke="rgba(184,255,87,0.35)" stroke-dasharray="3 4" stroke-width="1"/>`;
    html += `<text x="${cx+6}" y="${padT+12}" fill="#b8ff57" font-family="JetBrains Mono,monospace" font-size="9" letter-spacing="1">CROSSOVER ~100</text>`;

    // cursor
    const vx = xFor(n);
    const cCpu = cpu(n), cGpu = gpu(n);
    html += `<line x1="${vx}" y1="${padT}" x2="${vx}" y2="${padT+innerH}" stroke="#fff" stroke-width="1" opacity="0.5"/>`;
    html += `<circle cx="${vx}" cy="${yFor(cCpu)}" r="5" fill="#ff6b35" stroke="#0a0c10" stroke-width="2"/>`;
    html += `<circle cx="${vx}" cy="${yFor(cGpu)}" r="5" fill="#00e5ff" stroke="#0a0c10" stroke-width="2"/>`;

    // legend
    html += `<g font-family="JetBrains Mono,monospace" font-size="10" letter-spacing="1">
      <rect x="${padL+12}" y="${padT+12}" width="10" height="10" fill="#ff6b35"/>
      <text x="${padL+28}" y="${padT+21}" fill="#cdd6e0">CPU SIM · ${cCpu.toFixed(2)}ms</text>
      <rect x="${padL+12}" y="${padT+30}" width="10" height="10" fill="#00e5ff"/>
      <text x="${padL+28}" y="${padT+39}" fill="#cdd6e0">GPU SIM · ${cGpu.toFixed(2)}ms</text>
    </g>`;

    svg.innerHTML = html;
    vEl.textContent = cGpu < cCpu ? 'GPU favored' : 'CPU favored';
    vEl.style.color = cGpu < cCpu ? '#00e5ff' : '#ff6b35';
  }
  slider.addEventListener('input', render);
  render();
})();
