/* math3d.js — utilitas matematika 3D (matriks 4x4 column-major, siap dikirim ke WebGL) */
(function (global) {
  'use strict';
  const V = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    length: (a) => Math.hypot(a[0], a[1], a[2]),
    normalize(a) { const l = V.length(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  };
  const rad = (d) => (d * Math.PI) / 180;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const M4 = {
    identity: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    // out = a * b  (column-major: out[c*4+r])
    multiply(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++) {
          let s = 0;
          for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
          o[c * 4 + r] = s;
        }
      return o;
    },
    translate(x, y, z) { const m = M4.identity(); m[12] = x; m[13] = y; m[14] = z; return m; },
    scale(x, y, z) { const m = M4.identity(); m[0] = x; m[5] = y; m[10] = z; return m; },
    rotateX(t) { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
    rotateY(t) { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
    rotateZ(t) { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
    // View Matrix (look-at): eye = posisi kamera, center = target, up = vektor atas
    lookAt(eye, center, up) {
      const z = V.normalize(V.sub(eye, center));
      let x = V.cross(up, z);
      if (V.length(x) < 1e-6) x = V.cross([0, 0, 1], z); // up sejajar arah pandang
      x = V.normalize(x);
      const y = V.cross(z, x);
      return new Float32Array([
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -V.dot(x, eye), -V.dot(y, eye), -V.dot(z, eye), 1
      ]);
    },
    // Perspective: fovY (radian), aspect = lebar/tinggi
    perspective(fovY, aspect, near, far) {
      const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
      return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
    },
    orthographic(l, r, b, t, n, f) {
      return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0,
        -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]);
    }
  };
  global.Math3D = { V, M4, rad, clamp };
})(window);
