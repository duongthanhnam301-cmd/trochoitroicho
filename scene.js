// Cảnh 3D của game: ánh sáng điện ảnh, camera lượn, gạch rơi từ trên trời xuống và va chạm.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const BG = 0x06070b;

function textTexture(text, w, h, bg) {
  const s = 150;
  const c = document.createElement('canvas');
  c.width = Math.max(64, Math.round(w * s));
  c.height = Math.max(64, Math.round(h * s));
  const ctx = c.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  }
  const label = text.toUpperCase();
  let px = c.height * (bg ? 0.4 : 0.7);
  const font = () => `700 ${px}px Oswald, "Be Vietnam Pro", sans-serif`;
  ctx.font = font();
  while (ctx.measureText(label).width > c.width * 0.86 && px > 10) { px *= 0.94; ctx.font = font(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(label, c.width / 2 + 3, c.height / 2 + 4);
  ctx.fillStyle = bg ? 'rgba(255,240,214,.95)' : 'rgba(255,236,196,1)';
  ctx.fillText(label, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function stdMat(p, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color: p.color || '#dddddd', roughness: p.rough ?? 0.6, metalness: p.metal ?? 0,
    emissive: p.emissive || '#000000', emissiveIntensity: p.glow ?? 0, ...extra,
  });
}

function yyShape(kind, R) {
  const s = new THREE.Shape();
  s.moveTo(0, R);
  if (kind === 'yang') s.absarc(0, 0, R, Math.PI / 2, (3 * Math.PI) / 2, false);
  else s.absarc(0, 0, R, Math.PI / 2, -Math.PI / 2, true);
  s.absarc(0, -R / 2, R / 2, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(0, R / 2, R / 2, -Math.PI / 2, Math.PI / 2, true);
  return s;
}

function makePart(p) {
  let mesh;
  if (p.type === 'box') {
    const geo = new THREE.BoxGeometry(...p.size);
    if (p.text) {
      const plain = stdMat(p);
      const face = () => stdMat(p, { color: '#ffffff', map: textTexture(p.text, p.size[0], p.size[1], p.color) });
      mesh = new THREE.Mesh(geo, [plain, plain, plain, plain, face(), face()]);
    } else mesh = new THREE.Mesh(geo, stdMat(p));
  } else if (p.type === 'cyl') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, p.h, 28), stdMat(p));
  } else if (p.type === 'prism') {
    const s = new THREE.Shape();
    s.moveTo(-p.w / 2, 0); s.lineTo(p.w / 2, 0); s.lineTo(0, p.h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: p.d, bevelEnabled: false });
    geo.translate(0, 0, -p.d / 2);
    mesh = new THREE.Mesh(geo, stdMat(p));
  } else if (p.type === 'yy') {
    const geo = new THREE.ExtrudeGeometry(yyShape(p.kind, p.R), { depth: p.depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 40 });
    geo.translate(0, 0, -p.depth / 2);
    mesh = new THREE.Mesh(geo, stdMat(p));
  } else if (p.type === 'ico') {
    mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(p.r, 0), stdMat(p, { flatShading: true }));
  } else if (p.type === 'sphere') {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 32, 20), stdMat(p));
  } else if (p.type === 'label') {
    const mat = new THREE.MeshBasicMaterial({ map: textTexture(p.text, p.size[0], p.size[1], null), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.size[0], p.size[1]), mat);
    mesh.userData.label = true;
    mesh.userData.billboard = !!p.billboard;
  }
  mesh.position.set(...p.pos);
  if (p.rot) mesh.rotation.set(...p.rot);
  if (!mesh.userData.label) { mesh.castShadow = true; mesh.receiveShadow = true; }
  if (p.float) mesh.userData.float = { y: p.pos[1], seed: Math.random() * 6 };
  return mesh;
}

export function createScene(host, models) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.026);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  // ----- Ánh sáng -----
  scene.add(new THREE.HemisphereLight(0x8fa4ff, 0x1a120c, 0.35));
  const key = new THREE.SpotLight(0xffe2b8, 1500, 0, 0.5, 0.6, 2);
  key.position.set(9, 20, 13);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.camera.near = 5; key.shadow.camera.far = 60;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x5f8cff, 1.3);
  rim.position.set(-10, 8, -12);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfff1dc, 0.9);
  fill.position.set(-4, 7, 16);
  scene.add(fill);
  const accentLight = new THREE.PointLight(0xffffff, 40, 26, 2);
  accentLight.position.set(0, 1.2, 7);
  scene.add(accentLight);

  // ----- Sàn và bệ -----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.3; floor.receiveShadow = true;
  scene.add(floor);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.6, 0.3, 72), new THREE.MeshStandardMaterial({ color: 0x12151b, roughness: 0.7, metalness: 0.15 }));
  plinth.position.y = -0.15; plinth.receiveShadow = true;
  scene.add(plinth);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.7, 0.035, 8, 160), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.03;
  scene.add(ring);

  // ----- Bụi lơ lửng -----
  const N = 420;
  const dustPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 44;
    dustPos[i * 3 + 1] = Math.random() * 18;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 44;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const ambientDust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe6c0, size: 0.07, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(ambientDust);

  // ----- Hậu kỳ: bloom -----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.7, 0.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ----- Trạng thái -----
  const root = new THREE.Group(), ghostRoot = new THREE.Group(), fx = new THREE.Group();
  scene.add(root, ghostRoot, fx);
  let bricks = [], model = null, nextIdx = 0;
  const accent = new THREE.Color('#ffffff');
  const target = new THREE.Vector3(0, 4.6, 0);
  const anims = [];
  const bursts = [];
  const cam = { angle: 0.22, sway: 0.34, vel: 0, height: 6.2, radius: 23, intro: 0, spin: 0, zoom: 1, shake: 0, aspect: 1 };
  const clock = new THREE.Clock();
  let last = 0;

  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  function animate(dur, update, done) { anims.push({ t: 0, dur, update, done }); }

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    g.clear();
  }

  function setModel(index, placed, intro = true) {
    disposeGroup(root); disposeGroup(ghostRoot);
    model = models[index];
    accent.set(model.accent);
    ringMat.color.copy(accent);
    accentLight.color.copy(accent);
    target.set(...model.target);
    cam.radius = model.radius || 23;
    cam.sway = model.sway ?? 0.34;
    cam.angle = model.angle ?? 0.22; cam.vel = 0;
    key.target.position.copy(target);
    bricks = model.bricks.map((b, i) => {
      const g = new THREE.Group();
      const ghost = new THREE.Group();
      const ghostMat = new THREE.LineBasicMaterial({ color: 0x7f93c8, transparent: true, opacity: 0.13, depthWrite: false });
      b.parts.forEach((p) => {
        const m = makePart(p);
        g.add(m);
        if (!m.userData.label) {
          const lines = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), ghostMat);
          lines.position.copy(m.position); lines.rotation.copy(m.rotation);
          ghost.add(lines);
        }
      });
      root.add(g); ghostRoot.add(ghost);
      g.updateMatrixWorld(true);
      const box = new THREE.Box3();
      g.children.forEach((m) => { if (!m.userData.label) box.expandByObject(m); });
      g.visible = i < placed;
      ghost.visible = i >= placed;
      return { g, ghost, ghostMat, center: box.getCenter(new THREE.Vector3()), minY: box.min.y, size: box.getSize(new THREE.Vector3()) };
    });
    nextIdx = placed;
    if (intro) { cam.intro = 1; animate(1.6, (k) => { cam.intro = 1 - ease(k); }); }
  }

  function burst(pos, count, color, speed, up) {
    const p = new Float32Array(count * 3), v = [];
    for (let i = 0; i < count; i++) {
      p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random());
      v.push(new THREE.Vector3(Math.cos(a) * s, up * (0.3 + Math.random()), Math.sin(a) * s));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.16, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    fx.add(pts);
    bursts.push({ pts, v, t: 0, life: 1.3 });
  }

  function impact(B) {
    const slam = model.entry === 'slam';
    cam.shake = 0.42;
    const flash = new THREE.PointLight(accent, 160, 18, 2);
    flash.position.set(B.center.x, B.center.y, B.center.z + (slam ? 2 : 0));
    fx.add(flash);
    animate(0.55, (k) => { flash.intensity = 160 * (1 - k); }, () => { fx.remove(flash); flash.dispose(); });

    const wave = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 64),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    if (slam) wave.position.set(B.center.x, B.center.y, 0.5);
    else { wave.rotation.x = -Math.PI / 2; wave.position.set(B.center.x, B.minY + 0.06, B.center.z); }
    fx.add(wave);
    animate(0.8, (k) => { const s = 1 + ease(k) * 9; wave.scale.set(s, s, s); wave.material.opacity = 0.9 * (1 - k); },
      () => { fx.remove(wave); wave.geometry.dispose(); wave.material.dispose(); });

    const at = slam ? new THREE.Vector3(B.center.x, B.center.y, 0.5) : new THREE.Vector3(B.center.x, B.minY + 0.1, B.center.z);
    burst(at, 70, 0xe8d6b0, slam ? 5 : 6.5, slam ? 3 : 2.2);
    burst(at, 24, accent.getHex(), 3, 4.5);
  }

  function place(i, onImpact) {
    const B = bricks[i];
    if (!B) return;
    B.ghost.visible = false;
    B.g.visible = true;
    nextIdx = i + 1;
    const slam = model.entry === 'slam';
    const from = slam ? new THREE.Vector3(0, 2, 26) : new THREE.Vector3(0, 17, 0);
    const r0 = new THREE.Vector3((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.9);
    B.g.position.copy(from);
    animate(0.72, (k) => {
      const e = k * k * k;
      B.g.position.copy(from).multiplyScalar(1 - e);
      B.g.rotation.set(r0.x * (1 - e), r0.y * (1 - e), r0.z * (1 - e));
    }, () => {
      B.g.position.set(0, 0, 0); B.g.rotation.set(0, 0, 0);
      impact(B);
      // nảy nhẹ sau va chạm
      animate(0.28, (k) => { const s = Math.sin(k * Math.PI) * 0.035; B.g.scale.set(1 + s, 1 - s, 1 + s); }, () => B.g.scale.set(1, 1, 1));
      if (onImpact) onImpact();
    });
  }

  function celebrate() {
    cam.spin = 0;
    animate(9, (k) => { cam.spin = ease(k) * Math.PI * 2; cam.zoom = 1 - Math.sin(k * Math.PI) * 0.16; }, () => { cam.spin = 0; cam.zoom = 1; });
    animate(2.5, (k) => { bloom.strength = 0.75 + Math.sin(k * Math.PI) * 0.9; }, () => { bloom.strength = 0.75; });
    for (let i = 0; i < 9; i++) {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 4;
        burst(new THREE.Vector3(Math.cos(a) * r, 1 + Math.random() * 9, Math.sin(a) * r), 80, i % 2 ? 0xffd27a : accent.getHex(), 5, 5);
      }, 300 + i * 420);
    }
  }

  // ----- Kéo để xoay -----
  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';
  let drag = null;
  el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    cam.vel = -dx * 0.006;
    cam.angle += cam.vel;
    cam.height = Math.min(15, Math.max(1.5, cam.height + dy * 0.03));
  });
  const endDrag = () => { drag = null; };
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    cam.aspect = w / h;
    camera.aspect = cam.aspect;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  let now = 0;
  function frame() {
    requestAnimationFrame(frame);
    const real = clock.getElapsedTime();
    const dt = Math.min(0.05, real - last); last = real;
    tick(dt);
  }
  function tick(dt) {
    now += dt;

    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.update(k);
      if (k >= 1) { anims.splice(i, 1); if (a.done) a.done(); }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt;
      const arr = b.pts.geometry.attributes.position.array;
      b.v.forEach((v, j) => {
        v.y -= 6 * dt; v.multiplyScalar(1 - 1.6 * dt);
        arr[j * 3] += v.x * dt; arr[j * 3 + 1] += v.y * dt; arr[j * 3 + 2] += v.z * dt;
      });
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.t / b.life);
      if (b.t >= b.life) { fx.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); }
    }

    // viên gạch kế tiếp nhấp nháy trên bản vẽ
    bricks.forEach((B, i) => {
      if (!B.ghost.visible) return;
      if (i === nextIdx) { B.ghostMat.color.copy(accent); B.ghostMat.opacity = 0.55 + Math.sin(now * 4) * 0.35; }
      else { B.ghostMat.color.set(0x7f93c8); B.ghostMat.opacity = 0.13; }
    });
    root.traverse((o) => {
      const f = o.userData.float;
      if (f) { o.position.y = f.y + Math.sin(now * 1.4 + f.seed) * 0.18; o.rotation.y = now * 0.8; o.rotation.x = now * 0.5; }
    });
    ambientDust.rotation.y = now * 0.012;
    ringMat.color.copy(accent).multiplyScalar(1.1 + Math.sin(now * 1.5) * 0.35);

    // camera
    if (!drag) { cam.angle += cam.vel; cam.vel *= 0.92; }
    const fit = Math.max(1, 6.9 / (0.364 * cam.aspect) / cam.radius);
    const ang = cam.angle + Math.sin(now * 0.2) * cam.sway + cam.spin;
    const radius = cam.radius * fit * cam.zoom + cam.intro * 16;
    const h = cam.height + Math.sin(now * 0.31) * 0.35 + cam.intro * 7;
    camera.position.set(
      target.x + Math.sin(ang) * radius + (Math.random() - 0.5) * cam.shake,
      h + (Math.random() - 0.5) * cam.shake,
      target.z + Math.cos(ang) * radius,
    );
    cam.shake *= 0.86;
    camera.lookAt(target);
    root.traverse((o) => { if (o.userData.billboard) o.quaternion.copy(camera.quaternion); });
    composer.render();
  }
  frame();

  // step: chạy tay n khung hình (dùng khi kiểm thử lúc tab bị ẩn)
  return { setModel, place, celebrate, resize, step: (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) tick(dt); } };
}
