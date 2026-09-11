/*
 * Procedural trabecular-bone background.
 *
 * Raymarches a domain-warped gyroid "foam" that is sliced by a flat plane,
 * so the viewer sees a cut face (flat cream) with holes that open into the
 * porous interior below. Rendered once per resize; no per-frame cost.
 */
(function () {
  const canvas = document.getElementById('bone-bg');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
  if (!gl) return; // CSS fallback background stays visible.

  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_seed;

    // ---------- noise ----------
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z);
    }

    // ---------- geometry ----------
    const float SCALE = 25.0;  // pore density (higher = smaller pores)
    const float THICK = 1.00;  // strut thickness (higher = thicker walls)

    float gyroid(vec3 p) { return dot(sin(p), cos(p.yzx)); }

    float structure(vec3 p) {
      vec3 q = p * SCALE + u_seed;
      // Domain warp: breaks the regular gyroid lattice into organic cells.
      vec3 w = vec3(
        noise(q * 0.55),
        noise(q * 0.55 + vec3(19.1, 7.3, 3.7)),
        noise(q * 0.55 + vec3(5.2, 41.0, 13.6)));
      q += (w - 0.5) * 2.6;
      float g = gyroid(q);
      g += 0.30 * gyroid(q * 1.9 + vec3(1.7, 3.1, 0.4));
      // Vary wall thickness a little across space.
      float t = THICK + 0.12 * (noise(p * 1.3 + 7.0) - 0.5);
      return (abs(g) - t) / (SCALE * 1.9);
    }

    // Solid only below the cut plane z = 0, with a slightly rounded rim.
    float smax(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
      return mix(b, a, h) + k * h * (1.0 - h);
    }
    float map(vec3 p) { return smax(structure(p), p.z, 0.012); }

    vec3 normalAt(vec3 p) {
      vec2 e = vec2(0.0006, 0.0);
      return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)));
    }

    float ambientOcclusion(vec3 p, vec3 n) {
      float occ = 0.0, sca = 1.0;
      for (int i = 0; i < 5; i++) {
        float h = 0.004 + 0.016 * float(i);
        float d = map(p + n * h);
        occ += (h - d) * sca;
        sca *= 0.75;
      }
      return clamp(1.0 - 12.0 * occ, 0.0, 1.0);
    }

    float softShadow(vec3 ro, vec3 rd) {
      float res = 1.0, t = 0.006;
      for (int i = 0; i < 24; i++) {
        float h = map(ro + rd * t);
        res = min(res, 16.0 * h / t);
        t += clamp(h, 0.002, 0.03);
        if (res < 0.01 || t > 0.35) break;
      }
      return clamp(res, 0.0, 1.0);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

      // Camera: slightly above and to the left, looking down onto the cut face.
      vec3 ro = vec3(0.0, 0.0, 2.6);
      vec3 rd = normalize(vec3(uv, -1.15));
      float ax = -0.18, ay = 0.16;
      mat3 rx = mat3(1, 0, 0,  0, cos(ax), -sin(ax),  0, sin(ax), cos(ax));
      mat3 ry = mat3(cos(ay), 0, sin(ay),  0, 1, 0,  -sin(ay), 0, cos(ay));
      rd = ry * rx * rd;
      ro = ry * rx * ro;

      // Skip the empty space above the cut plane.
      float t = (0.0 - ro.z) / rd.z - 0.01;
      float hit = -1.0;
      for (int i = 0; i < 160; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < 0.0003) { hit = t; break; }
        t += d * 0.9;
        if (t > 4.0) break;
      }

      // ---------- colour field: white -> pink -> coral -> orange ----------
      vec2 sc = gl_FragCoord.xy / u_res;                 // 0..1 across the screen
      float g = 0.58 * sc.x + 0.42 * (1.0 - sc.y);       // top-left = 0, bottom-right = 1
      g += 0.16 * (noise(vec3(sc * 2.2, 3.0)) - 0.5);    // organic wobble
      g += 0.10 * (noise(vec3(sc * 5.0, 9.0)) - 0.5);
      g = clamp(g, 0.0, 1.0);

      vec3 cWhite  = vec3(0.995, 0.985, 0.975);
      vec3 cPink   = vec3(0.975, 0.86,  0.87);
      vec3 cCoral  = vec3(0.985, 0.72,  0.64);
      vec3 cOrange = vec3(0.995, 0.76,  0.52);
      vec3 tint = mix(cWhite, cPink,  smoothstep(0.00, 0.38, g));
      tint      = mix(tint,   cCoral, smoothstep(0.38, 0.72, g));
      tint      = mix(tint,   cOrange, smoothstep(0.72, 1.00, g));

      // Haze inside the pores: same hue, slightly deeper and more saturated.
      vec3 deep = mix(tint * vec3(0.94, 0.88, 0.86), vec3(1.0), 0.14);
      vec3 col;

      if (hit < 0.0) {
        col = deep;
      } else {
        vec3 p = ro + rd * hit;
        vec3 n = normalAt(p);
        vec3 L = normalize(vec3(-0.45, 0.65, 0.62));

        float diff = clamp(dot(n, L), 0.0, 1.0);
        float ao   = mix(0.76, 1.0, ambientOcclusion(p, n));
        float sh   = softShadow(p + n * 0.003, L);
        vec3  h    = normalize(L - rd);
        float spec = pow(max(dot(n, h), 0.0), 40.0) * 0.015;

        vec3 ambient = vec3(0.90);
        vec3 key     = vec3(1.0, 0.99, 0.98);

        // The flat cross-section (normal pointing straight at the camera)
        // is near-white; curved walls inside the pores keep the gradient.
        float face = smoothstep(0.80, 0.985, n.z);
        vec3 surf = mix(mix(tint, vec3(1.0), 0.12), vec3(0.995, 0.99, 0.985), face);

        col = surf * (ambient * ao + key * diff * 0.20 * sh) + spec;
        // Slight saturation in the crevices instead of darkness.
        col *= mix(vec3(0.97, 0.92, 0.91), vec3(1.0), ao);
        // Fade into the haze quickly so holes stay soft.
        float depth = clamp(-p.z / 0.08, 0.0, 1.0);
        col = mix(col, deep, smoothstep(0.0, 1.0, depth));
        col = mix(col, vec3(1.0), 0.04);
      }

      // Soft vignette + dithering to avoid banding.
      float v = 1.0 - 0.04 * dot(uv, uv);
      col *= v;
      col += (hash(vec3(gl_FragCoord.xy, 1.0)) - 0.5) / 255.0;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('bone-bg shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('bone-bg link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes  = gl.getUniformLocation(prog, 'u_res');
  const uSeed = gl.getUniformLocation(prog, 'u_seed');

  // Change the seed to get a different pore layout.
  const seed = 3.7;

  function render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uSeed, seed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let raf = 0;
  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  window.addEventListener('resize', schedule);
  render();
})();
