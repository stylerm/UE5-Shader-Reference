/* 06 — Noise field strip (Value / Worley / fBm) ──────── */
(function(){
  const canvas = document.getElementById('noise-canvas');
  if(!canvas) return;
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if(!gl){ return; }

  let mode = 0; // 0 value, 1 worley, 2 fbm
  document.querySelectorAll('[data-ns]').forEach(b=>{
    b.addEventListener('click', e=>{
      e.preventDefault();
      document.querySelectorAll('[data-ns]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      mode = b.dataset.ns==='value'?0 : b.dataset.ns==='worley'?1 : 2;
    });
  });

  const vs = `attribute vec2 p; void main(){ gl_Position=vec4(p,0.,1.);}`;
  const fs = `
    precision highp float;
    uniform vec2 uRes; uniform float uTime; uniform int uMode;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5); }
    float value(vec2 p){
      vec2 i=floor(p), f=fract(p);
      float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
      vec2 u=f*f*(3.-2.*f);
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }
    float worley(vec2 p){
      vec2 i=floor(p), f=fract(p); float m=9.;
      for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
        vec2 o=vec2(x,y); vec2 h=hash2(i+o);
        h=0.5+0.5*sin(uTime*0.8 + 6.28*h);
        m=min(m, length(o+h-f));
      }
      return m;
    }
    float fbm(vec2 p){
      float v=0., a=0.5;
      for(int i=0;i<5;i++){ v += a*value(p); p*=2.03; a*=0.5; }
      return v;
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/uRes.xy;
      vec2 p=uv*vec2(uRes.x/uRes.y,1.)*6.0 + vec2(uTime*0.15, 0.0);
      float n=0.;
      if(uMode==0) n = value(p*2.0);
      else if(uMode==1) n = worley(p);
      else n = fbm(p);
      vec3 cy=vec3(0.0,0.9,1.0);
      vec3 lm=vec3(0.72,1.0,0.34);
      vec3 or=vec3(1.0,0.42,0.2);
      vec3 col = mix(cy*0.2, lm*0.5, n);
      col = mix(col, or*0.9, pow(n, 3.0));
      col *= 0.75;
      col += 0.04;
      // slight vignette top/bottom
      col *= smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  function sh(t,s){ const x=gl.createShader(t); gl.shaderSource(x,s); gl.compileShader(x); return x; }
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr); gl.useProgram(pr);

  const bf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const pa = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(pa);
  gl.vertexAttribPointer(pa, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(pr,'uRes');
  const uTime= gl.getUniformLocation(pr,'uTime');
  const uMode= gl.getUniformLocation(pr,'uMode');

  function render(){
    VIZ.fitCanvas(canvas);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, VIZ.time());
    gl.uniform1i(uMode, mode);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  render();
  window.addEventListener('resize', ()=>VIZ.fitCanvas(canvas));
})();
