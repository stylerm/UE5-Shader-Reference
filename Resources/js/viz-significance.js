/* 12 — Significance culling rings ──────────────────── */
(function(){
  const canvas = document.getElementById('sig-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  const rings = [
    {r:0.18, lbl:'LOD 0 · FULL SIM',        col:'#b8ff57', sig:'100%'},
    {r:0.36, lbl:'LOD 1 · REDUCED SPAWN',   col:'#00e5ff', sig:'60%'},
    {r:0.56, lbl:'LOD 2 · CHEAPER RENDER',  col:'#ffb347', sig:'25%'},
    {r:0.80, lbl:'CULL · DESTROY/SLEEP',    col:'#ff6b35', sig:'0%'}
  ];

  // fake "system" instances scattered around
  const systems = [];
  for(let i=0;i<42;i++){
    const a = Math.random()*Math.PI*2;
    const r = 0.1 + Math.random()*0.85;
    systems.push({a, r, id:i});
  }

  function draw(){
    const dpr = VIZ.fitCanvas(canvas);
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#080b0f'; ctx.fillRect(0,0,W,H);

    const cx = W*0.5, cy = H*0.55;
    const maxR = Math.min(W,H)*0.42;

    // title
    ctx.fillStyle='#6b7a8d';
    ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
    ctx.fillText('▸ SIGNIFICANCE FALLOFF · DISTANCE → CULL TIERS', 16*dpr, 22*dpr);

    // grid compass
    ctx.strokeStyle='rgba(30,37,48,0.5)';
    ctx.lineWidth=1*dpr;
    ctx.beginPath(); ctx.moveTo(cx-maxR, cy); ctx.lineTo(cx+maxR, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-maxR); ctx.lineTo(cx, cy+maxR); ctx.stroke();

    // rings (outermost first so inner rings paint over)
    for(let i=rings.length-1; i>=0; i--){
      const ring = rings[i];
      const rr = ring.r * maxR;
      const pr = i>0 ? rings[i-1].r*maxR : 0;
      // filled annulus
      ctx.fillStyle = ring.col + '14';
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2);
      if(pr>0){ ctx.arc(cx, cy, pr, 0, Math.PI*2, true); }
      ctx.fill('evenodd');
      // outline
      ctx.strokeStyle = ring.col;
      ctx.setLineDash(i===rings.length-1 ? [6*dpr, 4*dpr] : []);
      ctx.lineWidth = 1.2*dpr;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);

      // label on right edge
      const lx = cx + rr + 8*dpr;
      const ly = cy - 4*dpr - i*1*dpr;
      ctx.fillStyle = ring.col;
      ctx.font = `700 ${9.5*dpr}px JetBrains Mono, monospace`;
      ctx.fillText(ring.lbl, lx, ly);
      ctx.fillStyle = '#6b7a8d';
      ctx.font = `${9*dpr}px JetBrains Mono, monospace`;
      ctx.fillText('significance → '+ring.sig, lx, ly+12*dpr);
    }

    // systems
    const t = VIZ.time()*0.3;
    systems.forEach(s => {
      const ang = s.a + t*0.05*(s.id%2?1:-1);
      const rr = s.r*maxR + Math.sin(t + s.id)*4*dpr;
      const x = cx + Math.cos(ang)*rr;
      const y = cy + Math.sin(ang)*rr;
      // determine tier by r
      let tier = 0;
      for(let i=0;i<rings.length;i++) if(s.r>rings[i].r) tier=i+1; else break;
      const culled = tier>=rings.length-1;
      const c = culled ? '#ff6b35' : rings[tier].col;
      ctx.globalAlpha = culled ? 0.18 : 0.9;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x, y, 3*dpr, 0, Math.PI*2); ctx.fill();
      if(culled){
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 1*dpr;
        ctx.beginPath();
        ctx.moveTo(x-4*dpr, y-4*dpr); ctx.lineTo(x+4*dpr, y+4*dpr);
        ctx.moveTo(x-4*dpr, y+4*dpr); ctx.lineTo(x+4*dpr, y-4*dpr);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });

    // camera icon at center
    ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.moveTo(cx-8*dpr, cy-5*dpr);
    ctx.lineTo(cx+6*dpr, cy-5*dpr);
    ctx.lineTo(cx+10*dpr, cy-8*dpr);
    ctx.lineTo(cx+10*dpr, cy+8*dpr);
    ctx.lineTo(cx+6*dpr, cy+5*dpr);
    ctx.lineTo(cx-8*dpr, cy+5*dpr);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle='#0a0c10';
    ctx.beginPath(); ctx.arc(cx-2*dpr, cy, 2.5*dpr, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font=`${9*dpr}px JetBrains Mono, monospace`;
    ctx.textAlign='center';
    ctx.fillText('CAM', cx, cy+22*dpr);
    ctx.textAlign='left';

    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', ()=>VIZ.fitCanvas(canvas));
})();
