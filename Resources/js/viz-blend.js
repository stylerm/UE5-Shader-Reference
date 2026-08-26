/* 08 — Blend mode cost chart ─────────────────────── */
(function(){
  const canvas = document.getElementById('blend-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  // (name, depthWrite, depthTest, overdrawMult, color)
  const modes = [
    {n:'Opaque',     dw:true,  dt:true,  od:1.0, col:'#b8ff57', note:'writes depth → culls later'},
    {n:'Masked',     dw:true,  dt:true,  od:1.1, col:'#00e5ff', note:'alpha test, early-Z issues'},
    {n:'Translucent',dw:false, dt:true,  od:3.8, col:'#ffb347', note:'sorted back→front, full shade per layer'},
    {n:'Additive',   dw:false, dt:true,  od:4.2, col:'#ff6b35', note:'saturates fast, cheap per-pixel but stacks'},
    {n:'Modulate',   dw:false, dt:true,  od:2.4, col:'#ff5757', note:'multiplicative, darkens quickly'}
  ];

  function draw(){
    const dpr = VIZ.fitCanvas(canvas);
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#080b0f'; ctx.fillRect(0,0,W,H);

    const padL=110*dpr, padR=20*dpr, padT=30*dpr, padB=40*dpr;
    const innerW = W-padL-padR;
    const rowH = (H-padT-padB) / modes.length;
    const maxOd = 5;

    // grid lines
    ctx.font = `${10*dpr}px JetBrains Mono, monospace`;
    ctx.fillStyle = '#6b7a8d';
    for(let i=0;i<=5;i++){
      const x = padL + (i/maxOd)*innerW;
      ctx.strokeStyle = 'rgba(30,37,48,0.7)';
      ctx.lineWidth = 1*dpr;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H-padB); ctx.stroke();
      ctx.fillText(i+'×', x-6*dpr, H-padB+16*dpr);
    }
    ctx.fillText('OVERDRAW COST MULTIPLIER →', padL, H-padB+32*dpr);

    const t = VIZ.time()*0.6;

    modes.forEach((m,i) => {
      const y = padT + i*rowH + rowH*0.5;
      const barH = rowH*0.55;

      // label
      ctx.fillStyle = '#cdd6e0';
      ctx.font = `700 ${11*dpr}px JetBrains Mono, monospace`;
      ctx.textAlign='right';
      ctx.fillText(m.n.toUpperCase(), padL-12*dpr, y+4*dpr);
      ctx.textAlign='left';

      // DW / DT pips
      ctx.font = `${8.5*dpr}px JetBrains Mono, monospace`;
      ctx.fillStyle = m.dw ? '#b8ff57' : '#3a4556';
      ctx.fillText('DW', padL-102*dpr, y+18*dpr);
      ctx.fillStyle = m.dt ? '#b8ff57' : '#3a4556';
      ctx.fillText('DT', padL-82*dpr, y+18*dpr);

      // animated bar (pulse to show "cost over frames")
      const pulse = 0.94 + 0.06*Math.sin(t*2 + i*0.4);
      const bw = (m.od/maxOd) * innerW * pulse;
      const barY = y - barH*0.5;

      // bg
      ctx.fillStyle = 'rgba(30,37,48,0.5)';
      ctx.fillRect(padL, barY, innerW, barH);
      // fill
      const grad = ctx.createLinearGradient(padL, 0, padL+bw, 0);
      grad.addColorStop(0, m.col+'88'); grad.addColorStop(1, m.col);
      ctx.fillStyle = grad;
      ctx.fillRect(padL, barY, bw, barH);
      // outline
      ctx.strokeStyle = m.col;
      ctx.lineWidth = 1*dpr;
      ctx.strokeRect(padL+0.5, barY+0.5, bw-1, barH-1);

      // value
      ctx.fillStyle = m.col;
      ctx.font = `700 ${11*dpr}px JetBrains Mono, monospace`;
      ctx.fillText(m.od.toFixed(1)+'×', padL + bw + 8*dpr, y+4*dpr);

      // note
      ctx.fillStyle = '#6b7a8d';
      ctx.font = `${9*dpr}px JetBrains Mono, monospace`;
      ctx.fillText(m.note, padL + bw + 48*dpr, y+4*dpr);
    });

    // header pips legend
    ctx.font = `${8.5*dpr}px JetBrains Mono, monospace`;
    ctx.fillStyle='#6b7a8d';
    ctx.fillText('DW = DEPTH WRITE · DT = DEPTH TEST', padL-102*dpr, padT-8*dpr);

    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', ()=>VIZ.fitCanvas(canvas));
})();
