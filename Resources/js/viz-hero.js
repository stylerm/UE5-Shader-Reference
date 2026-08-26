/* Shared helpers ─────────────────────────────────── */
window.VIZ = window.VIZ || {
  speed: 1.0,
  raf: new Set(),
  time() { return (performance.now() / 1000) * this.speed; },
  fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width  = Math.max(1, Math.floor(r.width  * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    return dpr;
  },
  hash(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967295;
  }
};

/* Hero — live WebGL Voronoi / Worley ───────────────── */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) { canvas.getContext('2d').fillText('WebGL unavailable', 20, 40); return; }

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    vec2 hash2(vec2 p){
      p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
      return fract(sin(p)*43758.5453);
    }
    // F1 + F2 worley distances
    vec2 worley(vec2 uv){
      vec2 g = floor(uv), f = fract(uv);
      float d1 = 9.0, d2 = 9.0;
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
        vec2 o = vec2(i,j);
        vec2 h = hash2(g+o);
        h = 0.5 + 0.5*sin(uTime*0.6 + 6.2831*h);
        float d = length(o + h - f);
        if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d;
      }
      return vec2(d1, d2);
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      vec2 p  = uv * vec2(uRes.x/uRes.y, 1.0) * 5.5;
      vec2 w  = worley(p);
      float edge   = smoothstep(0.02, 0.12, w.y - w.x);
      float cell   = smoothstep(0.0, 1.2, w.x);
      // palette: cyan lows, lime mids, orange rim
      vec3 cy = vec3(0.0, 0.90, 1.0);
      vec3 lm = vec3(0.72, 1.0, 0.34);
      vec3 or = vec3(1.0, 0.42, 0.20);
      vec3 col = mix(cy*0.15, lm*0.55, 1.0 - cell);
      col = mix(col, or, 1.0 - edge);
      col *= 0.55 + 0.45*edge;
      // vignette + background
      col += vec3(0.02, 0.03, 0.05);
      col *= smoothstep(1.35, 0.2, length(uv-0.5));
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  function sh(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const pLoc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
  const uRes  = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');

  function render(){
    VIZ.fitCanvas(canvas);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, VIZ.time());
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  render();
  window.addEventListener('resize', () => VIZ.fitCanvas(canvas));
})();
