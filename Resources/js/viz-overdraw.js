/* 01 — Translucency overdraw stacking ─────────────── */
(function () {
  const canvas = document.getElementById('overdraw-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let layers = 5;
  let shape = 'disc'; // 'disc' or 'square'

  document.querySelectorAll('[data-ov]').forEach(b => {
    b.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('[data-ov]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      layers = parseInt(b.dataset.ov, 10);
      document.getElementById('overdraw-layers').textContent = layers;
    });
  });
  document.querySelectorAll('[data-shape]').forEach(b => {
    b.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('[data-shape]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      shape = b.dataset.shape;
      document.getElementById('overdraw-shape').textContent = shape.toUpperCase();
    });
  });

  function draw(){
    const dpr = VIZ.fitCanvas(canvas);
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#080b0f'; ctx.fillRect(0,0,W,H);

    // grid
    ctx.strokeStyle = 'rgba(30,37,48,0.6)'; ctx.lineWidth = 1*dpr;
    for (let x=0; x<W; x+=40*dpr){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0; y<H; y+=40*dpr){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    const cellPx = 8*dpr;
    const cw = Math.ceil(W/cellPx), ch = Math.ceil(H/cellPx);
    const cnt = new Uint8Array(cw*ch);

    const t = VIZ.time() * 0.35;
    const puffs = [];
    for (let i=0;i<layers;i++){
      const phase = i*1.21;
      const cx = W*(0.35 + 0.25*Math.sin(t + phase));
      const cy = H*(0.5  + 0.22*Math.cos(t*0.9 + phase*0.7));
      const rx = W*(0.22 + 0.05*Math.sin(t*1.3+i));
      const ry = H*(0.30 + 0.06*Math.cos(t*1.1+i));
      puffs.push({cx,cy,rx,ry,i});
      // Accumulate: DISC = ellipse mask (alpha cutout), SQUARE = full quad AABB
      for (let gy=0; gy<ch; gy++){
        for (let gx=0; gx<cw; gx++){
          const px = gx*cellPx + cellPx*0.5;
          const py = gy*cellPx + cellPx*0.5;
          if (shape === 'disc'){
            const dx = (px-cx)/rx, dy=(py-cy)/ry;
            if (dx*dx+dy*dy < 1) cnt[gy*cw+gx]++;
          } else {
            // Square quad = full bounding rect of the sprite. Every texel in the
            // quad runs the shader, even the transparent corners of a "smoke" texture.
            if (Math.abs(px-cx) < rx && Math.abs(py-cy) < ry) cnt[gy*cw+gx]++;
          }
        }
      }
    }

    // Draw heatmap
    let shaded = 0;
    for (let gy=0; gy<ch; gy++){
      for (let gx=0; gx<cw; gx++){
        const c = cnt[gy*cw+gx]; if (!c) continue;
        shaded += c;
        let r,g,b,a;
        if (c<=1)      { r=0xb8; g=0xff; b=0x57; a=0.22; }
        else if (c<=4) { r=0xff; g=0xb3; b=0x47; a=0.18 + 0.10*c; }
        else           { r=0xff; g=0x57; b=0x57; a=0.22 + 0.08*Math.min(c,10); }
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(a, 0.85)})`;
        ctx.fillRect(gx*cellPx, gy*cellPx, cellPx, cellPx);
      }
    }

    // Draw sprite outlines — show the actual quad (square) regardless of shape,
    // plus the disc cutout so users see the wasted area in SQUARE mode.
    puffs.forEach(p => {
      if (shape === 'square'){
        ctx.strokeStyle = 'rgba(255,87,87,0.55)';
        ctx.setLineDash([4*dpr, 3*dpr]);
        ctx.lineWidth = 1*dpr;
        ctx.strokeRect(p.cx-p.rx, p.cy-p.ry, p.rx*2, p.ry*2);
        ctx.setLineDash([]);
        // show wasted disc outline for contrast
        ctx.strokeStyle = 'rgba(0,229,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI*2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(0,229,255,0.35)';
        ctx.lineWidth = 1*dpr;
        ctx.beginPath();
        ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI*2);
        ctx.stroke();
      }
    });

    // Cost bar — square is significantly more expensive (4/π ≈ 1.27× more area
    // per sprite, and corners overlap far more often)
    const avg = shaded / (cw*ch);
    // Scale so DISC @5 layers sits ~0.5 and SQUARE @5 layers pushes into red
    const cost = Math.min(avg / 3.0, 1);
    const barW = W-40*dpr, barH=6*dpr;
    ctx.fillStyle = 'rgba(30,37,48,0.9)'; ctx.fillRect(20*dpr, H-18*dpr, barW, barH);
    const fillCol = cost<0.33? '#b8ff57' : cost<0.66? '#ffb347' : '#ff5757';
    ctx.fillStyle = fillCol;
    ctx.fillRect(20*dpr, H-18*dpr, barW*cost, barH);

    const pixEl = document.getElementById('overdraw-pixels');
    const cEl   = document.getElementById('overdraw-cost');
    if (pixEl) pixEl.textContent = (shaded/1000).toFixed(1)+'K';
    if (cEl)   { cEl.textContent = (cost*100).toFixed(0)+'%'; cEl.parentElement.className = 'viz-readout ' + (cost<0.33?'good':cost<0.66?'warn':'bad'); }

    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', () => VIZ.fitCanvas(canvas));
})();
