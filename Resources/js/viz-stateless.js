/* 04 — Stateless flow: pos = f(Age, UniqueID) ───────── */
(function(){
  const canvas = document.getElementById('stateless-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const N = 220;

  function draw(){
    const dpr = VIZ.fitCanvas(canvas);
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#080b0f'; ctx.fillRect(0,0,W,H);

    // grid
    ctx.strokeStyle='rgba(30,37,48,0.5)'; ctx.lineWidth=1*dpr;
    for(let x=0;x<W;x+=40*dpr){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0;y<H;y+=40*dpr){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // spawn & target rails
    const spawnY = H*0.78, targetY = H*0.22;
    ctx.strokeStyle='rgba(0,229,255,0.25)'; ctx.setLineDash([3*dpr,5*dpr]);
    ctx.beginPath(); ctx.moveTo(30*dpr, spawnY);  ctx.lineTo(W-30*dpr, spawnY);  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30*dpr, targetY); ctx.lineTo(W-30*dpr, targetY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#6b7a8d'; ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
    ctx.fillText('Age = 0 · SPAWN', 30*dpr, spawnY-5*dpr);
    ctx.fillText('Age = Lifetime · TARGET', 30*dpr, targetY-5*dpr);

    const t = VIZ.time();
    const life = 4.0;

    for(let id=0; id<N; id++){
      const h1 = VIZ.hash(id*747+1);
      const h2 = VIZ.hash(id*1231+9);
      const offset = h1 * life;
      const age = (t*0.7 + offset) % life;
      const na  = age / life;
      // x = hash(UID)·width   y = lerp(spawn, target, na)
      const xBase = 40*dpr + h1*(W-80*dpr);
      const wobble = Math.sin(na*6.28 + h2*10) * 14*dpr * na;
      const x = xBase + wobble;
      const y = spawnY + (targetY-spawnY) * na;

      // color curve: cyan → orange → lime along age
      const r = 0 + 255*Math.min(1, na*1.4);
      const g = 229 - 160*na + 120*Math.max(0,na-0.6);
      const b = 255 - 255*na + 87*Math.max(0,na-0.7);
      const a = 0.15 + 0.85*(1-Math.abs(na-0.5)*1.8);

      // trail
      ctx.strokeStyle = `rgba(${r|0},${g|0},${b|0},${a*0.4})`;
      ctx.lineWidth = 1*dpr;
      ctx.beginPath();
      for(let s=0; s<6; s++){
        const na2 = Math.max(0, na - s*0.02);
        const wob2 = Math.sin(na2*6.28 + h2*10) * 14*dpr * na2;
        const x2 = xBase + wob2;
        const y2 = spawnY + (targetY-spawnY)*na2;
        if(s===0) ctx.moveTo(x2,y2); else ctx.lineTo(x2,y2);
      }
      ctx.stroke();

      // dot
      ctx.fillStyle=`rgba(${r|0},${g|0},${b|0},${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.2*dpr, 0, Math.PI*2);
      ctx.fill();
    }

    // formula corner
    ctx.fillStyle='#00e5ff';
    ctx.font=`${11*dpr}px JetBrains Mono, monospace`;
    ctx.fillText('pos = lerp(spawn, target, Age/Life) + sin(Age·τ + hash(ID)) · wobble', 30*dpr, 24*dpr);

    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', ()=>VIZ.fitCanvas(canvas));
})();
