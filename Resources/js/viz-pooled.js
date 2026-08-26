/* 11 — Pooled consumer vs N-per-actor ──────────────── */
(function(){
  const canvas = document.getElementById('pooled-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let mode = 'naive';
  document.querySelectorAll('[data-pl]').forEach(b=>{
    b.addEventListener('click', e=>{
      e.preventDefault();
      document.querySelectorAll('[data-pl]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      mode = b.dataset.pl;
      const el = document.getElementById('pooled-count');
      if(el) el.textContent = mode==='naive' ? 'N SYSTEMS · N TICKS' : '1 SYSTEM · 1 TICK';
    });
  });

  function draw(){
    const dpr = VIZ.fitCanvas(canvas);
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#080b0f'; ctx.fillRect(0,0,W,H);

    const t = VIZ.time()*0.5;
    const N = 8;

    // Title bar
    ctx.fillStyle='#6b7a8d';
    ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
    ctx.fillText(mode==='naive' ? '▸ N PROJECTILE ACTORS · EACH OWNS A TRAIL EMITTER' :
                                  '▸ 1 CONSUMER SYSTEM · READS DATA CHANNEL · N PROJECTILES WRITE', 16*dpr, 22*dpr);

    // Left column: actors (projectiles)
    const actorsX = 70*dpr;
    for(let i=0;i<N;i++){
      const y = 55*dpr + i*((H-80*dpr)/N);
      // actor dot
      ctx.fillStyle='#00e5ff';
      ctx.beginPath(); ctx.arc(actorsX, y, 4*dpr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#cdd6e0'; ctx.font=`${9*dpr}px JetBrains Mono, monospace`;
      ctx.fillText(`actor_${i}`, actorsX-46*dpr, y+3*dpr);

      if(mode==='naive'){
        // each actor has its own trail emitter (middle column)
        const midX = W*0.5;
        const emitY = y;
        // connection (ticking)
        const pulse = (Math.sin(t*3 + i*0.7)*0.5+0.5);
        ctx.strokeStyle=`rgba(255,107,53,${0.3 + 0.5*pulse})`;
        ctx.lineWidth=1.5*dpr;
        ctx.beginPath(); ctx.moveTo(actorsX+5*dpr, y); ctx.lineTo(midX-14*dpr, emitY); ctx.stroke();
        // trail emitter box
        ctx.fillStyle='rgba(255,107,53,0.18)';
        ctx.strokeStyle='#ff6b35';
        ctx.fillRect(midX-14*dpr, emitY-10*dpr, 76*dpr, 20*dpr);
        ctx.strokeRect(midX-14*dpr+0.5, emitY-10*dpr+0.5, 76*dpr-1, 20*dpr-1);
        ctx.fillStyle='#ff6b35'; ctx.font=`${9*dpr}px JetBrains Mono, monospace`;
        ctx.fillText('trail emitter', midX-10*dpr, emitY+3*dpr);
      } else {
        // write to data channel (center)
        const chanX = W*0.5;
        const pulse = (Math.sin(t*4 + i*0.4)*0.5+0.5);
        ctx.strokeStyle=`rgba(184,255,87,${0.2 + 0.6*pulse})`;
        ctx.lineWidth=1.2*dpr;
        ctx.beginPath(); ctx.moveTo(actorsX+5*dpr, y); ctx.lineTo(chanX-30*dpr, H*0.5); ctx.stroke();
        // little "packet" glyph
        const tp = ((t*0.8 + i*0.12)%1);
        const px = actorsX + (chanX-30*dpr - actorsX)*tp;
        const py = y + (H*0.5 - y)*tp;
        ctx.fillStyle='#b8ff57';
        ctx.fillRect(px-2*dpr, py-2*dpr, 4*dpr, 4*dpr);
      }
    }

    if(mode==='naive'){
      // N sim arrows going to render (right side)
      for(let i=0;i<N;i++){
        const y = 55*dpr + i*((H-80*dpr)/N);
        ctx.strokeStyle='rgba(255,107,53,0.35)';
        ctx.lineWidth=1*dpr;
        ctx.beginPath(); ctx.moveTo(W*0.5+62*dpr, y); ctx.lineTo(W-90*dpr, y); ctx.stroke();
      }
      // render box
      ctx.fillStyle='rgba(255,107,53,0.18)';
      ctx.strokeStyle='#ff6b35';
      ctx.fillRect(W-90*dpr, H*0.3, 70*dpr, H*0.4);
      ctx.strokeRect(W-90*dpr+0.5, H*0.3+0.5, 70*dpr-1, H*0.4-1);
      ctx.fillStyle='#ff6b35'; ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
      ctx.textAlign='center';
      ctx.fillText('N × RENDER', W-55*dpr, H*0.5-4*dpr);
      ctx.fillText('N × TICK', W-55*dpr, H*0.5+10*dpr);
      ctx.textAlign='left';
    } else {
      // single Data Channel
      const chanX = W*0.5;
      ctx.fillStyle='rgba(184,255,87,0.18)';
      ctx.strokeStyle='#b8ff57';
      ctx.fillRect(chanX-30*dpr, H*0.4, 60*dpr, H*0.2);
      ctx.strokeRect(chanX-30*dpr+0.5, H*0.4+0.5, 60*dpr-1, H*0.2-1);
      ctx.fillStyle='#b8ff57'; ctx.font=`${9*dpr}px JetBrains Mono, monospace`;
      ctx.textAlign='center';
      ctx.fillText('NDC', chanX, H*0.5-2*dpr);
      ctx.fillText('channel', chanX, H*0.5+10*dpr);
      ctx.textAlign='left';

      // channel -> consumer
      const consX = W-110*dpr;
      const pulse = (Math.sin(t*3)*0.5+0.5);
      ctx.strokeStyle=`rgba(184,255,87,${0.4 + 0.5*pulse})`;
      ctx.lineWidth=1.5*dpr;
      ctx.beginPath(); ctx.moveTo(chanX+30*dpr, H*0.5); ctx.lineTo(consX, H*0.5); ctx.stroke();

      // consumer box
      ctx.fillStyle='rgba(0,229,255,0.18)';
      ctx.strokeStyle='#00e5ff';
      ctx.fillRect(consX, H*0.35, 90*dpr, H*0.3);
      ctx.strokeRect(consX+0.5, H*0.35+0.5, 90*dpr-1, H*0.3-1);
      ctx.fillStyle='#00e5ff';
      ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
      ctx.textAlign='center';
      ctx.fillText('1 CONSUMER', consX+45*dpr, H*0.5-4*dpr);
      ctx.fillText('1 × TICK', consX+45*dpr, H*0.5+10*dpr);
      ctx.textAlign='left';
    }

    // cost meter bottom
    const cost = mode==='naive' ? 0.85 : 0.18;
    const barY = H-16*dpr;
    ctx.fillStyle='rgba(30,37,48,0.6)';
    ctx.fillRect(16*dpr, barY, W-32*dpr, 6*dpr);
    ctx.fillStyle = cost>0.5 ? '#ff6b35' : '#b8ff57';
    ctx.fillRect(16*dpr, barY, (W-32*dpr)*cost, 6*dpr);
    ctx.fillStyle='#6b7a8d';
    ctx.font=`${9*dpr}px JetBrains Mono, monospace`;
    ctx.fillText('TOTAL TICK COST', 16*dpr, barY-4*dpr);

    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', ()=>VIZ.fitCanvas(canvas));
})();
