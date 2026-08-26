/* 05 — Fixed vs dynamic bounds ──────────────────────── */
(function(){
  const canvas = document.getElementById('bounds-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let mode = 'dyn';
  const modeEl = document.getElementById('bounds-mode');
  const recEl  = document.getElementById('bounds-recompute');
  document.querySelectorAll('[data-bn]').forEach(b=>{
    b.addEventListener('click', e=>{
      e.preventDefault();
      document.querySelectorAll('[data-bn]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      mode = b.dataset.bn;
      modeEl.textContent = mode==='dyn'?'DYNAMIC':'FIXED';
      recEl.textContent  = mode==='dyn'?'EVERY FRAME':'NEVER';
      modeEl.style.color = mode==='dyn'?'#ffb347':'#b8ff57';
    });
  });

  const P = [];
  for(let i=0;i<80;i++) P.push({h:Math.random(), phase:Math.random()*6.28});

  function draw(){
    const dpr = VIZ.fitCanvas(canvas);
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#080b0f'; ctx.fillRect(0,0,W,H);

    // grid
    ctx.strokeStyle='rgba(30,37,48,0.5)'; ctx.lineWidth=1*dpr;
    for(let x=0;x<W;x+=40*dpr){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0;y<H;y+=40*dpr){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // actor moving across
    const t = VIZ.time()*0.4;
    const actorX = W*0.2 + (Math.sin(t)*0.5+0.5)*W*0.6;
    const actorY = H*0.55;

    // particles around actor
    let minX=1e9, maxX=-1e9, minY=1e9, maxY=-1e9;
    const pts = [];
    P.forEach((p,i)=>{
      const ang = t*0.5 + p.phase + i*0.08;
      const r   = 50*dpr + p.h*60*dpr;
      const px  = actorX + Math.cos(ang)*r + Math.sin(t*2+i)*10*dpr;
      const py  = actorY + Math.sin(ang)*r*0.55 + Math.cos(t*1.7+i)*8*dpr;
      pts.push([px,py]);
      minX=Math.min(minX,px); maxX=Math.max(maxX,px);
      minY=Math.min(minY,py); maxY=Math.max(maxY,py);
    });

    // Draw bounds box
    if(mode==='dyn'){
      // dynamic — hugs particles but lags by 1 frame; show flicker
      const wobble = Math.sin(t*4)*4*dpr;
      ctx.strokeStyle='#ffb347';
      ctx.setLineDash([4*dpr, 3*dpr]);
      ctx.lineWidth=1.5*dpr;
      ctx.strokeRect(minX-10*dpr+wobble, minY-10*dpr-wobble, (maxX-minX)+20*dpr, (maxY-minY)+20*dpr);
      ctx.setLineDash([]);
      ctx.fillStyle='#ffb347'; ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
      ctx.fillText('READBACK · GPU→CPU STALL', minX-10*dpr+wobble, minY-15*dpr);
    } else {
      // fixed — stable box
      const fx = W*0.1, fy=H*0.18, fw=W*0.8, fh=H*0.68;
      ctx.strokeStyle='#b8ff57';
      ctx.lineWidth=1.5*dpr;
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.fillStyle='rgba(184,255,87,0.03)';
      ctx.fillRect(fx, fy, fw, fh);
      ctx.fillStyle='#b8ff57'; ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
      ctx.fillText('FIXED AABB · AUTHOR-SET', fx, fy-6*dpr);
    }

    // particles
    pts.forEach(([px,py])=>{
      // in fixed mode, everything stays visible; in dynamic, simulate pop-in by
      // briefly flickering particles that stray past wobbling bounds
      let inside = true;
      if(mode==='dyn'){
        const wob = Math.sin(t*4)*4*dpr;
        const bl = minX-10*dpr+wob, br=maxX+10*dpr+wob;
        const bt = minY-10*dpr-wob, bb=maxY+10*dpr-wob;
        inside = px>bl && px<br && py>bt && py<bb;
      }
      ctx.fillStyle = inside ? 'rgba(0,229,255,0.85)' : 'rgba(255,87,87,0.25)';
      ctx.beginPath();
      ctx.arc(px, py, 2.5*dpr, 0, Math.PI*2);
      ctx.fill();
    });

    // actor crosshair
    ctx.strokeStyle='rgba(205,214,224,0.4)';
    ctx.lineWidth=1*dpr;
    ctx.beginPath(); ctx.moveTo(actorX-8*dpr, actorY); ctx.lineTo(actorX+8*dpr, actorY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(actorX, actorY-8*dpr); ctx.lineTo(actorX, actorY+8*dpr); ctx.stroke();
    ctx.fillStyle='#cdd6e0'; ctx.font=`${9*dpr}px JetBrains Mono, monospace`;
    ctx.fillText('ACTOR', actorX+12*dpr, actorY+4*dpr);

    // footer note
    ctx.fillStyle='#6b7a8d'; ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
    const note = mode==='dyn'
      ? '▸ each frame: dispatch → sim → readback positions → rebuild AABB'
      : '▸ each frame: dispatch → sim. no readback. no stall.';
    ctx.fillText(note, 14*dpr, H-8*dpr);

    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', ()=>VIZ.fitCanvas(canvas));
})();
