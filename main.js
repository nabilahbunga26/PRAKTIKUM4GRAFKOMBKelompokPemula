/* main.js — Rotating 3D Cube Camera Playground (WebGL2) */
(() => {
  'use strict';
  const { V, M4, rad, clamp } = Math3D;
  const $ = (id) => document.getElementById(id);
  const canvas = $('glCanvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) { $('glError').style.display = 'block'; $('glError').textContent = 'WebGL2 tidak didukung browser ini.'; return; }

  /* ---------- Shader ---------- */
  const VS = `#version 300 es
  layout(location=0) in vec3 aPosition;
  layout(location=1) in vec3 aColor;
  uniform mat4 uModel, uView, uProjection;
  out vec3 vColor;
  void main(){ vColor = aColor; gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0); }`;
  const FS = `#version 300 es
  precision mediump float;
  in vec3 vColor; out vec4 outColor;
  void main(){ outColor = vec4(vColor, 1.0); }`;
  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const uModel = gl.getUniformLocation(prog, 'uModel');
  const uView = gl.getUniformLocation(prog, 'uView');
  const uProj = gl.getUniformLocation(prog, 'uProjection');

  /* ---------- Geometri: cube 36 vertex (posisi vec3 + warna per sisi) ---------- */
  const hex = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
  const FACES = [ // [4 sudut CCW, warna]
    [[-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1], 0xFF3D00],     // depan
    [[1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1], 0x00F0FF], // belakang
    [[1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1], 0x00C853],     // kanan
    [[-1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1], 0x0047FF], // kiri
    [[-1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1], 0xFFD600],     // atas
    [[-1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1], 0xFF69B4]  // bawah
  ];
  const cubeData = [];
  FACES.forEach(([c, col]) => {
    const rgb = hex(col);
    [0, 1, 2, 0, 2, 3].forEach((i) => cubeData.push(c[i * 3], c[i * 3 + 1], c[i * 3 + 2], ...rgb));
  });
  const CUBE_VERTS = cubeData.length / 6; // 36

  // Grid lantai + sumbu XYZ (GL_LINES) sebagai referensi ruang
  const lineData = [];
  const seg = (a, b, c) => lineData.push(...a, ...c, ...b, ...c);
  for (let i = -8; i <= 8; i++) { const g = i === 0 ? [.55, .55, .6] : [.28, .28, .34]; seg([i, -1.6, -8], [i, -1.6, 8], g); seg([-8, -1.6, i], [8, -1.6, i], g); }
  seg([0, 0, 0], [3, 0, 0], [1, .2, .2]); seg([0, 0, 0], [0, 3, 0], [.2, 1, .3]); seg([0, 0, 0], [0, 0, 3], [.3, .4, 1]);
  const LINE_VERTS = lineData.length / 6;

  function makeVAO(data) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    return vao;
  }
  const cubeVAO = makeVAO(cubeData), lineVAO = makeVAO(lineData);

  /* ---------- State ---------- */
  const NF_PRESETS = [
    { n: 0.1, f: 100, name: 'Lebar' },
    { n: 1, f: 12, name: 'Normal' },
    { n: 5.5, f: 7, name: 'Sempit (clipping)' }
  ];
  const RATIOS = ['16 / 9', '1 / 1', '21 / 9', '3 / 4'];
  const UP = [0, 1, 0];
  const S = {};
  function resetState() {
    Object.assign(S, {
      cam: [0, 0, 6], target: [0, 0, 0], fov: 60, proj: 'perspective', nf: 0, depth: true,
      orbit: false, cubes3: false, split: false, grid: true, paused: false, angle: 0
    });
  }
  resetState();
  let ratioIdx = 0;

  /* ---------- Input: state-based (kontinu) + event-based (sekali tekan) ---------- */
  const keys = {};
  const actions = {
    KeyP: () => { S.proj = S.proj === 'perspective' ? 'orthographic' : 'perspective'; },
    KeyN: () => { S.nf = (S.nf + 1) % NF_PRESETS.length; },
    KeyD: () => { S.depth = !S.depth; },
    KeyR: () => { resetState(); },
    KeyO: () => { S.orbit = !S.orbit; },
    KeyT: () => { S.cubes3 = !S.cubes3; },
    KeyV: () => { S.split = !S.split; },
    KeyG: () => { S.grid = !S.grid; },
    Space: () => { S.paused = !S.paused; },
    Digit1: () => { S.fov = 35; }, Digit2: () => { S.fov = 60; }, Digit3: () => { S.fov = 90; }
  };
  const held = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'BracketLeft', 'BracketRight', 'KeyQ', 'KeyE'];
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /SELECT|INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (held.includes(e.code)) { keys[e.code] = true; e.preventDefault(); }
    else if (actions[e.code]) { if (!e.repeat) actions[e.code](); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // Tombol on-screen memakai action yang sama dengan keyboard
  const bind = (id, fn) => $(id).addEventListener('click', (e) => { fn(); e.currentTarget.blur(); });
  bind('btnProj', actions.KeyP); bind('btnNF', actions.KeyN); bind('btnDepth', actions.KeyD);
  bind('btnReset', actions.KeyR); bind('btnOrbit', actions.KeyO); bind('btnCubes', actions.KeyT);
  bind('btnSplit', actions.KeyV); bind('btnGrid', actions.KeyG); bind('btnPause', actions.Space);
  bind('btnFov35', actions.Digit1); bind('btnFov60', actions.Digit2); bind('btnFov90', actions.Digit3);
  bind('btnFovDown', () => { S.fov = clamp(S.fov - 5, 20, 120); });
  bind('btnFovUp', () => { S.fov = clamp(S.fov + 5, 20, 120); });
  bind('btnRatio', () => { ratioIdx = (ratioIdx + 1) % RATIOS.length; canvas.style.aspectRatio = RATIOS[ratioIdx]; });

  /* ---------- Update ---------- */
  function update(dt) {
    const sp = 3 * dt, c = S.cam;
    if (keys.ArrowLeft) c[0] -= sp;  if (keys.ArrowRight) c[0] += sp;
    if (keys.ArrowUp) c[1] += sp;    if (keys.ArrowDown) c[1] -= sp;
    if (keys.KeyW) c[2] -= sp;       if (keys.KeyS) c[2] += sp;
    if (keys.BracketLeft) S.fov -= 40 * dt;
    if (keys.BracketRight) S.fov += 40 * dt;
    S.fov = clamp(S.fov, 20, 120);
    // Orbit kamera mengelilingi target pada sumbu Y (otomatis dengan O, manual dengan Q/E)
    const w = (S.orbit ? 0.6 : 0) + (keys.KeyE ? 1.5 : 0) - (keys.KeyQ ? 1.5 : 0);
    if (w) {
      const dx = c[0] - S.target[0], dz = c[2] - S.target[2], a = w * dt, cs = Math.cos(a), sn = Math.sin(a);
      c[0] = S.target[0] + dx * cs - dz * sn; c[2] = S.target[2] + dx * sn + dz * cs;
    }
    // Batas kamera agar cube tidak "tertelan" kamera
    c[1] = clamp(c[1], -12, 12); c[2] = clamp(c[2], -25, 25); c[0] = clamp(c[0], -25, 25);
    const r = Math.hypot(c[0] - S.target[0], c[2] - S.target[2]);
    if (r < 4) { const k = r < 1e-6 ? 0 : 4 / r; c[0] = r < 1e-6 ? 0 : S.target[0] + (c[0] - S.target[0]) * k; c[2] = r < 1e-6 ? 4 : S.target[2] + (c[2] - S.target[2]) * k; }
    if (!S.paused) S.angle += dt;
  }

  /* ---------- Render ---------- */
  function resizeCanvas() { // ukuran buffer mengikuti ukuran tampil -> aspect ratio selalu benar
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  function projection(type, aspect) {
    const nf = NF_PRESETS[S.nf];
    if (type === 'perspective') return M4.perspective(rad(S.fov), aspect, nf.n, nf.f);
    const dist = V.length(V.sub(S.cam, S.target)), hh = dist * Math.tan(rad(S.fov) / 2), hw = hh * aspect; // FOV mengatur ukuran frustum ortho
    return M4.orthographic(-hw, hw, -hh, hh, nf.n, nf.f);
  }
  function drawPane(x, w, h, type) {
    gl.viewport(x, 0, w, h);
    gl.uniformMatrix4fv(uProj, false, projection(type, w / h));
    gl.uniformMatrix4fv(uView, false, M4.lookAt(S.cam, S.target, UP));
    if (S.grid) {
      gl.uniformMatrix4fv(uModel, false, M4.identity());
      gl.bindVertexArray(lineVAO); gl.drawArrays(gl.LINES, 0, LINE_VERTS);
    }
    const list = S.cubes3
      ? [[-2.2, 0, 2.5, 0.8, 1.0], [0, 0, 0, 0.8, 1.6], [2.2, 0, -2.5, 0.8, 0.7]]
      : [[0, 0, 0, 1, 1]];
    gl.bindVertexArray(cubeVAO);
    list.forEach(([x0, y0, z0, sc, spd], i) => {
      // Model Matrix = T * Ry * Rx * S
      let m = M4.multiply(M4.rotateX(S.angle * spd * 0.6 + i), M4.scale(sc, sc, sc));
      m = M4.multiply(M4.rotateY(S.angle * spd), m);
      m = M4.multiply(M4.translate(x0, y0, z0), m);
      gl.uniformMatrix4fv(uModel, false, m);
      gl.drawArrays(gl.TRIANGLES, 0, CUBE_VERTS);
    });
  }
  function render() {
    resizeCanvas();
    const W = canvas.width, H = canvas.height;
    gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, W, H);
    gl.clearColor(0.082, 0.082, 0.11, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // depth buffer dibersihkan tiap frame
    S.depth ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
    if (S.split) {
      const half = Math.floor(W / 2), other = S.proj === 'perspective' ? 'orthographic' : 'perspective';
      drawPane(0, half, H, S.proj);
      drawPane(half, W - half, H, other);
      gl.enable(gl.SCISSOR_TEST); gl.scissor(half - 1, 0, 3, H); gl.clearColor(1, 0.84, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    } else drawPane(0, W, H, S.proj);
  }

  /* ---------- HUD ---------- */
  const setT = (id, t) => { const el = $(id); if (el.textContent !== t) el.textContent = t; };
  const onOff = (id, v) => $(id).classList.toggle('on', v);
  function hud(fps) {
    const nf = NF_PRESETS[S.nf], P = (p) => p === 'perspective' ? 'Perspective' : 'Orthographic';
    setT('hudCam', `Kamera: (${S.cam.map((v) => v.toFixed(2)).join(', ')})`);
    setT('hudTarget', `Target: (${S.target.join(', ')})`);
    setT('hudProj', 'Proyeksi: ' + (S.split ? `SPLIT ${P(S.proj)} | ${P(S.proj === 'perspective' ? 'orthographic' : 'perspective')}` : P(S.proj)));
    setT('hudFov', `FOV: ${Math.round(S.fov)}°`);
    setT('hudNF', `Near/Far: ${nf.n} / ${nf.f} (${nf.name})`);
    setT('hudDepth', `Depth Test: ${S.depth ? 'ON' : 'OFF'}`);
    setT('hudAspect', `Canvas: ${canvas.width}×${canvas.height} · Aspect ${(canvas.width / canvas.height).toFixed(2)}`);
    setT('hudMode', `Cube: ${S.cubes3 ? 3 : 1} · Orbit: ${S.orbit ? 'ON' : 'OFF'}`);
    setT('hudFps', `FPS: ${fps}`);
    onOff('btnDepth', S.depth); onOff('btnOrbit', S.orbit); onOff('btnCubes', S.cubes3);
    onOff('btnSplit', S.split); onOff('btnGrid', S.grid); onOff('btnPause', S.paused);
    onOff('btnFov35', Math.round(S.fov) === 35); onOff('btnFov60', Math.round(S.fov) === 60); onOff('btnFov90', Math.round(S.fov) === 90);
  }

  /* ---------- Loop ---------- */
  let last = performance.now(), fps = 0, acc = 0, frames = 0;
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    acc += dt; frames++; if (acc >= 0.5) { fps = Math.round(frames / acc); acc = 0; frames = 0; }
    update(dt); render(); hud(fps);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
