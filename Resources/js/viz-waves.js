/* 13 — Wave intrinsics 32-lane animation ────────────── */
(function(){
  const canvas = document.getElementById('wave-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let mode = 'sum';
  document.querySelectorAll('[data-wv]').forEach(b=>{
    b.addEventListener('click', e=>{
      e.preventDefault();
      document.querySelectorAll('[data-wv]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      mode = b.dataset.wv;
    });
  });

  const NLANES = 32;

  function draw(){
    const dpr = VIZ.fitCanvas(canvas);
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#080b0f'; ctx.fillRect(0,0,W,H);

    const padL = 30*dpr, padT = 50*dpr, padR = 30*dpr, padB = 70*dpr;
    const laneW = (W - padL - padR) / NLANES;
    const laneH = 44*dpr;
    const barTop = padT;

    const t = VIZ.time();

    // per-lane values: deterministic-ish
    const vals = [];
    for(let i=0;i<NLANES;i++){
      const v = 0.5 + 0.5*Math.sin(t*0.8 + i*0.28) * Math.cos(t*0.4 + i*0.11);
      vals.push(v);
    }

    // Compute wave op result
    let result = 0, resultLabel = '';
    if(mode==='sum'){
      result = vals.reduce((a,b)=>a+b,0);
      resultLabel = `WaveActiveSum = ${result.toFixed(2)}`;
    } else if(mode==='max'){
      result = Math.max(...vals);
      resultLabel = `WaveActiveMax = ${result.toFixed(2)}`;
    } else if(mode==='ballot'){
      // lanes with v>0.5 are "true"
      let bits = 0;
      for(let i=0;i<NLANES;i++) if(vals[i]>0.5) bits |= (1<<(i%31));
      resultLabel = `WaveActiveBallot → 0x${bits.toString(16).toUpperCase().padStart(8,'0')}`;
    } else if(mode==='prefix'){
      // prefix sum
      resultLabel = `WavePrefixSum · scan across lanes`;
    }

    // Title
    ctx.fillStyle='#6b7a8d';
    ctx.font=`${10*dpr}px JetBrains Mono, monospace`;
    ctx.fillText('▸ 32-LANE WAVEFRONT · SM6 INTRINSIC', padL, 24*dpr);
    ctx.fillStyle='#00e5ff';
    ctx.font=`700 ${12*dpr}px JetBrains Mono, monospace`;
    ctx.fillText(resultLabel, padL, 42*dpr);

    // lanes
    let prefix = 0;
    for(let i=0;i<NLANES;i++){
      const x = padL + i*laneW;
      const y = barTop;
      let v = vals[i];
      let active = true;
      let barColor = '#3a4556';

      if(mode==='sum' || mode==='max'){
        barColor = mode==='max' && Math.abs(v-result)<0.001 ? '#ff6b35' : '#00e5ff';
      } else if(mode==='ballot'){
        active = v>0.5;
        barColor = active ? '#b8ff57' : '#3a4556';
      } else if(mode==='prefix'){
        prefix += v;
        v = prefix / NLANES / 0.6; // normalize-ish
        barColor = '#ffb347';
      }

      // bar bg
      ctx.fillStyle = 'rgba(30,37,48,0.5)';
      ctx.fillRect(x+1, y, laneW-2, laneH);
      // bar fill
      const h = v * laneH;
      ctx.fillStyle = barColor;
      ctx.fillRect(x+1, y+laneH-h, laneW-2, h);
      // outline
      ctx.strokeStyle = active ? barColor : '#2a3340';
      ctx.lineWidth = 1;
      ctx.strokeRect(x+1, y, laneW-2, laneH);
      // lane id
      ctx.fillStyle = '#6b7a8d';
      ctx.font = `${8*dpr}px JetBrains Mono, monospace`;
      ctx.textAlign='center';
      ctx.fillText(i.toString(), x+laneW/2, y+laneH+12*dpr);
    }
    ctx.textAlign='left';

    // For Sum/Max: draw the "flow" aggregating into result bar
    if(mode==='sum' || mode==='max'){
      const resY = barTop + laneH + 32*dpr;
      // aggregation lines
      for(let i=0;i<NLANES;i++){
        const x = padL + i*laneW + laneW/2;
        ctx.strokeStyle='rgba(0,229,255,0.18)';
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(x, barTop+laneH+4*dpr);
        ctx.lineTo(W/2, resY);
        ctx.stroke();
      }
      // result pill
      const rw = 160*dpr, rh = 26*dpr;
      ctx.fillStyle='rgba(0,229,255,0.18)';
      ctx.strokeStyle='#00e5ff';
      ctx.fillRect(W/2-rw/2, resY, rw, rh);
      ctx.strokeRect(W/2-rw/2+0.5, resY+0.5, rw-1, rh-1);
      ctx.fillStyle='#00e5ff';
      ctx.font=`700 ${11*dpr}px JetBrains Mono, monospace`;
      ctx.textAlign='center';
      ctx.fillText('SINGLE CYCLE · NO TGSM', W/2, resY+17*dpr);
      ctx.textAlign='left';
    } else if(mode==='ballot'){
      // bitmask strip
      const bY = barTop + laneH + 36*dpr;
      ctx.fillStyle='#6b7a8d';
      ctx.font=`${9*dpr}px JetBrains Mono, monospace`;
      ctx.fillText('BITMASK →', padL, bY-4*dpr);
      for(let i=0;i<NLANES;i++){
        const x = padL + i*laneW;
        const bit = vals[i]>0.5;
        ctx.fillStyle = bit ? '#b8ff57' : '#2a3340';
        ctx.fillRect(x+2, bY, laneW-4, 12*dpr);
        ctx.fillStyle = bit ? '#0a0c10' : '#6b7a8d';
        ctx.font=`700 ${8*dpr}px JetBrains Mono, monospace`;
        ctx.textAlign='center';
        ctx.fillText(bit?'1':'0', x+laneW/2, bY+9*dpr);
      }
      ctx.textAlign='left';
    }

    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', ()=>VIZ.fitCanvas(canvas));
})();
