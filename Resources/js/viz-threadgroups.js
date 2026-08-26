/* 03 — Threadgroup dispatch grid ───────────────────── */
(function () {
  const canvas = document.getElementById('tg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let threadsPerGroup = 64; // 64 = [64,1,1], 16 = [16,4,1], 1 = [1,1,1]
  const label = document.getElementById('tg-info');
  document.querySelectorAll('[data-tg]').forEach(b => {
    b.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('[data-tg]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      threadsPerGroup = parseInt(b.dataset.tg, 10);
      label.textContent = b.textContent.trim();
    });
  });

  // 16×10 grid = 160 threadgroups; with a "tail" past 144 representing > limit overflow
  const COLS = 16, ROWS = 10, TOTAL = COLS*ROWS;
  const TAIL_START = 144;

  function draw(){
    const dpr = VIZ.fitCanvas(canvas);
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#080b0f'; ctx.fillRect(0,0,W,H);

    const pad = 18*dpr;
    const cellW = (W-pad*2) / COLS;
    const cellH = (H-pad*2-18*dpr) / ROWS;
    const gap = 2*dpr;

    // Wavefront sweep: which threadgroup is "active now"?
    const t = VIZ.time() * 0.7;
    const front = Math.floor((t*20) % (TOTAL+20));

    for (let i=0;i<TOTAL;i++){
      const r = Math.floor(i/COLS), c = i%COLS;
      const x = pad + c*cellW, y = pad + r*cellH;
      const w = cellW-gap, h = cellH-gap;
      const dist = front - i;
      let fill, stroke;

      if (i >= TAIL_START){
        // overflow tail
        fill = 'rgba(255,107,53,0.22)';
        stroke = 'rgba(255,107,53,0.55)';
      } else if (dist < 0){
        // not yet dispatched
        fill = 'rgba(184,255,87,0.03)';
        stroke = 'rgba(30,37,48,0.7)';
      } else if (dist < 8){
        // active wavefront (bright)
        const k = 1 - dist/8;
        fill = `rgba(184,255,87,${0.15 + 0.55*k})`;
        stroke = `rgba(184,255,87,${0.5 + 0.5*k})`;
      } else {
        // retired
        fill = 'rgba(184,255,87,0.08)';
        stroke = 'rgba(184,255,87,0.25)';
      }

      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1*dpr;
      ctx.strokeRect(x+0.5, y+0.5, w-1, h-1);

      // inner thread dots
      if (threadsPerGroup > 1 && dist >= 0 && dist < 8 && i < TAIL_START){
        const threads = threadsPerGroup;
        const tCols = threadsPerGroup === 64 ? 8 : 4;
        const tRows = threads / tCols;
        const tw = w / (tCols+1), th = h / (tRows+1);
        ctx.fillStyle = 'rgba(0,229,255,0.8)';
        for (let tr=0; tr<tRows; tr++){
          for (let tc=0; tc<tCols; tc++){
            const dx = x + tw*(tc+1);
            const dy = y + th*(tr+1);
            ctx.fillRect(dx-dpr, dy-dpr, 2*dpr, 2*dpr);
          }
        }
      }
    }

    // tail divider line
    const divX = pad + (TAIL_START % COLS) * cellW;
    const divY = pad + Math.floor(TAIL_START/COLS) * cellH;
    ctx.strokeStyle = 'rgba(255,107,53,0.6)';
    ctx.setLineDash([4*dpr, 4*dpr]);
    ctx.lineWidth = 1.2*dpr;
    ctx.beginPath();
    ctx.moveTo(pad, divY);
    ctx.lineTo(pad + (W-pad*2), divY);
    ctx.stroke();
    ctx.setLineDash([]);

    // label
    ctx.font = `${10*dpr}px JetBrains Mono, monospace`;
    ctx.fillStyle = '#ff6b35';
    ctx.fillText('▸ D3D LIMIT · 65,535 TAIL', pad, divY-5*dpr);

    // dispatch frame label
    ctx.fillStyle = '#6b7a8d';
    ctx.fillText(`DISPATCH(${COLS},${ROWS},1) · ${COLS*ROWS} GROUPS · ${threadsPerGroup} THREADS/GRP`, pad, H-6*dpr);

    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', () => VIZ.fitCanvas(canvas));
})();
