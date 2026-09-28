# Praktikum 4 — Rotating 3D Cube Camera Playground
**EF234504 · Grafika Komputer · Camera, Projection & 3D dengan WebGL2**

## Identitas Kelompok (Kelompok Pemula)
| Nama | NRP |
|---|---|
| Nabilah Bunga Sulistia | 5025241073 |
| Callista Fidelya Roba Gultom | 5025241086 |

## Cara Menjalankan
Tanpa build/dependency. Buka `index.html` di browser yang mendukung WebGL2 (Chrome/Edge/Firefox terbaru), atau jalankan server lokal: `python -m http.server 8000` lalu buka `http://localhost:8000`.

## File
`index.html` (halaman + HUD), `style.css`, `main.js` (WebGL2, input, render, HUD), `math3d.js` (Mat4/Vec3: multiply, translate, rotate, scale, lookAt, perspective, orthographic), `screenshot.png`.

## Kontrol
| Tombol | Fungsi |
|---|---|
| ← → / ↑ ↓ | Kamera X / Y (kontinu, state-based) |
| W / S | Kamera Z (maju / mundur) |
| P | Ganti perspective ↔ orthographic |
| [ / ] | FOV − / + (20°–120°) |
| N | Ganti preset near/far |
| D | Depth Test ON/OFF |
| R | Reset semua |
| 1 / 2 / 3 | Preset FOV 35° / 60° / 90° (challenge) |
| O, Q / E | Orbit otomatis / manual (challenge) |
| T | Tiga cube pada depth berbeda (challenge) |
| V | Split view dua proyeksi (challenge) |
| G, Space | Grid, pause rotasi |

Semua fungsi juga tersedia sebagai tombol di bawah canvas.

## Proyeksi dan Preset
- **Perspective**: `M4.perspective(fov, aspect, near, far)`.
- **Orthographic**: `M4.orthographic(l, r, b, t, near, far)`; tinggi frustum = `jarak_kamera × tan(FOV/2)`, sehingga FOV tetap berpengaruh dan cube selalu terlihat.
- **Aspect ratio** dihitung tiap frame dari ukuran canvas (`width/height`), buffer canvas mengikuti ukuran tampil, dan viewport di-set ulang.
- **Near/Far**: Lebar 0.1/100 · Normal 1/12 · Sempit 5.5/7 (demo clipping; cube terpotong dan bisa hilang jika kamera digeser jauh).
- **Depth test**: `gl.enable/disable(gl.DEPTH_TEST)`; `COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT` di-clear setiap frame.

## Challenge yang Dikerjakan
1. Orbit camera. 2. Preset FOV 35°/60°/90°. 3. Tiga cube pada depth berbeda. 4. Split view dua proyeksi.

## Catatan Pengujian
Uji otomatis (Chromium headless, software WebGL2): halaman termuat, cube dan HUD tampil, kamera X (→) dan mode 3 cube berfungsi, aspect ratio 1.79 sesuai ukuran canvas, tidak ada JavaScript error (hanya peringatan performa driver software GL saat screenshot).

**Isi/ubah setelah uji manual di komputer masing-masing:** semua kontrol, pergantian proyeksi, resize canvas, depth test ON/OFF (terutama dengan 3 cube), split view, dan orbit.

## Link
- Video demo: _(isi)_
- Repository: _(isi)_
