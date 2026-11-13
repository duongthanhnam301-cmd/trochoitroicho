// Cảnh 3D của game: ánh sáng điện ảnh, camera lượn, gạch rơi/trồi/xoáy vào vị trí, chi tiết chuyển động (bánh răng, quỹ đạo, cờ bay, chim Lạc…).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const BG = 0x06070b;
const TAU = Math.PI * 2;

// Chữ trên mặt khối / nhãn nổi. Hỗ trợ xuống dòng bằng "\n".
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
  const lines = text.toUpperCase().split('\n');
  let px = (c.height * (bg ? 0.42 : 0.7)) / lines.length;
  const font = () => `700 ${px}px Oswald, "Be Vietnam Pro", sans-serif`;
  ctx.font = font();
  while (lines.some((l) => ctx.measureText(l).width > c.width * 0.86) && px > 10) { px *= 0.94; ctx.font = font(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const y = c.height / 2 + (i - (lines.length - 1) / 2) * px * 1.12;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(l, c.width / 2 + 3, y + 4);
    ctx.fillStyle = bg ? 'rgba(255,240,214,.95)' : 'rgba(255,236,196,1)';
    ctx.fillText(l, c.width / 2, y);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Mặt trống đồng: các vành hoa văn đồng tâm
function drumTexture() {
  const n = 1024, c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d'), m = n / 2;
  const g = ctx.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, '#b58a45'); g.addColorStop(1, '#6b4c22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
  ctx.strokeStyle = 'rgba(40,24,8,.75)';
  [0.98, 0.9, 0.84, 0.72, 0.66, 0.52, 0.46, 0.34, 0.3].forEach((f) => { ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(m, m, f * m, 0, TAU); ctx.stroke(); });
  // gạch chéo giữa các vành
  [[0.9, 0.98, 120], [0.66, 0.72, 90], [0.46, 0.52, 64], [0.3, 0.34, 40]].forEach(([a, b, k]) => {
    ctx.lineWidth = 3;
    for (let i = 0; i < k; i++) {
      const t = (i / k) * TAU;
      ctx.beginPath(); ctx.moveTo(m + Math.cos(t) * a * m, m + Math.sin(t) * a * m);
      ctx.lineTo(m + Math.cos(t + 0.04) * b * m, m + Math.sin(t + 0.04) * b * m); ctx.stroke();
    }
  });
  // chấm tròn trong vành giữa
  ctx.fillStyle = 'rgba(40,24,8,.6)';
  for (let i = 0; i < 48; i++) { const t = (i / 48) * TAU; ctx.beginPath(); ctx.arc(m + Math.cos(t) * 0.59 * m, m + Math.sin(t) * 0.59 * m, 10, 0, TAU); ctx.fill(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Cờ đỏ sao vàng
function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 200;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#da251d'; ctx.fillRect(0, 0, 300, 200);
  ctx.fillStyle = '#ffde00'; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 26 : 66;
    ctx.lineTo(150 + Math.cos(a) * r, 104 + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function stdMat(p, extra = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: p.color || '#dddddd', roughness: p.rough ?? 0.6, metalness: p.metal ?? 0,
    emissive: p.emissive || '#000000', emissiveIntensity: p.glow ?? 0, ...extra,
  });
  if (p.opacity != null) { m.transparent = true; m.opacity = p.opacity; m.depthWrite = false; }
  if (p.additive) m.blending = THREE.AdditiveBlending;
  return m;
}

const shapeFrom = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

function gearShape(R, teeth, th, hole) {
  const step = TAU / teeth, r = R - th, pts = [];
  for (let k = 0; k < teeth; k++) {
    const a = k * step;
    [[r, 0], [R, 0.14], [R, 0.42], [r, 0.56]].forEach(([rr, f]) => pts.push([Math.cos(a + f * step) * rr, Math.sin(a + f * step) * rr]));
  }
  const s = shapeFrom(pts);
  if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return s;
}

function starShape(n, R, r) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return shapeFrom(pts);
}

function heartShape(size) {
  const pts = [], k = size / 17;
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * TAU;
    pts.push([16 * Math.sin(t) ** 3 * k, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k]);
  }
  return shapeFrom(pts);
}

// Chim Lạc nhìn từ trên xuống: mỏ dài, cánh dang rộng (trục x là hướng bay)
function birdShape() {
  const half = [[1, 0], [0.45, 0.07], [0.2, 0.16], [0.02, 0.85], [-0.14, 0.92], [-0.08, 0.2], [-0.55, 0.12], [-0.85, 0.36], [-0.75, 0.02]];
  return shapeFrom([...half, ...half.slice(1, -1).reverse().map(([x, y]) => [x, -y])]);
}

function extrude(shape, depth, bevel = true) {
  const geo = new THREE.ExtrudeGeometry(shape, bevel
    ? { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 24 }
    : { depth, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  return geo;
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
    const geo = new THREE.CylinderGeometry(p.r, p.r2 ?? p.r, p.h, p.seg || 40);
    if (p.faceTex) {
      const side = stdMat(p);
      mesh = new THREE.Mesh(geo, [side, stdMat(p, { color: '#ffffff', map: drumTexture() }), side]);
    } else mesh = new THREE.Mesh(geo, stdMat(p));
  } else if (p.type === 'prism') {
    const geo = new THREE.ExtrudeGeometry(shapeFrom([[-p.w / 2, 0], [p.w / 2, 0], [0, p.h]]), { depth: p.d, bevelEnabled: false });
    geo.translate(0, 0, -p.d / 2);
    mesh = new THREE.Mesh(geo, stdMat(p));
  } else if (p.type === 'sphere') {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 32, 20), stdMat(p));
  } else if (p.type === 'dome') {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 48, 20, 0, TAU, 0, Math.PI / 2), stdMat(p));
  } else if (p.type === 'torus') {
    mesh = new THREE.Mesh(new THREE.TorusGeometry(p.R, p.tube, 8, 96, p.arc ?? TAU), stdMat(p));
  } else if (p.type === 'lathe') {
    mesh = new THREE.Mesh(new THREE.LatheGeometry(p.points.map(([r, y]) => new THREE.Vector2(r, y)), 72), stdMat(p, { side: THREE.DoubleSide }));
  } else if (p.type === 'gear') {
    mesh = new THREE.Mesh(extrude(gearShape(p.R, p.teeth, p.th, p.hole), p.depth), stdMat(p));
  } else if (p.type === 'star') {
    mesh = new THREE.Mesh(extrude(starShape(p.n || 5, p.R, p.r), p.depth), stdMat(p));
  } else if (p.type === 'heart') {
    mesh = new THREE.Mesh(extrude(heartShape(p.size), p.depth), stdMat(p));
  } else if (p.type === 'flag') {
    const geo = new THREE.PlaneGeometry(p.w, p.h, 20, 8);
    geo.translate(p.w / 2, 0, 0);
    mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.75 }));
    mesh.userData.wave = { base: Float32Array.from(geo.attributes.position.array), w: p.w };
  } else if (p.type === 'birds') {
    mesh = new THREE.Group();
    const geo = extrude(birdShape(), 0.05, false);
    geo.rotateX(-Math.PI / 2);
    geo.scale(p.size, 1, p.size);
    const mat = stdMat(p);
    for (let i = 0; i < p.count; i++) {
      const a = (i / p.count) * TAU, b = new THREE.Mesh(geo, mat);
      b.position.set(Math.cos(a) * p.R, Math.sin(a * 3) * 0.25, -Math.sin(a) * p.R);
      b.rotation.y = a + Math.PI / 2;
      b.userData.flap = Math.random() * 6;
      b.castShadow = true;
      mesh.add(b);
    }
  } else if (p.type === 'flow') {
    // dòng hạt sáng chạy từ "from" tới "to"
    mesh = new THREE.Group();
    const geo = new THREE.SphereGeometry(p.r || 0.09, 12, 8), mat = stdMat(p);
    for (let i = 0; i < p.count; i++) { const b = new THREE.Mesh(geo, mat); b.userData.noGhost = true; mesh.add(b); }
    mesh.userData.flow = { a: new THREE.Vector3(...p.from), b: new THREE.Vector3(...p.to), speed: p.speed || 0.08 };
  } else if (p.type === 'group') {
    mesh = new THREE.Group();
    p.parts.forEach((c) => mesh.add(makePart(c)));
  } else if (p.type === 'label') {
    const mat = new THREE.MeshBasicMaterial({ map: textTexture(p.text, p.size[0], p.size[1], null), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.size[0], p.size[1]), mat);
    mesh.userData.label = true;
    mesh.userData.billboard = !!p.billboard;
  }
  if (p.pos) mesh.position.set(...p.pos);
  if (p.order) mesh.rotation.order = p.order;
  if (p.rot) mesh.rotation.set(...p.rot, p.order || 'XYZ');
  if (p.scale) mesh.scale.set(...p.scale);
  if (mesh.isMesh && !mesh.userData.label && !p.opacity) { mesh.castShadow = true; mesh.receiveShadow = true; }
  if (p.spin) mesh.userData.spin = p.spin;
  if (p.float) mesh.userData.float = { y: mesh.position.y, seed: Math.random() * 6 };
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
  scene.fog = new THREE.FogExp2(BG, 0.024);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  // ----- Ánh sáng -----
  scene.add(new THREE.HemisphereLight(0x8fa4ff, 0x1a120c, 0.4));
  const key = new THREE.SpotLight(0xffe2b8, 1500, 0, 0.55, 0.6, 2);
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
  let bricks = [], model = null, nextIdx = 0, boost = 1;
  const accent = new THREE.Color('#ffffff');
  const target = new THREE.Vector3(0, 4.6, 0);
  const anims = [];
  const bursts = [];
  const cam = { angle: 0.22, sway: 0.34, vel: 0, height: 6.2, radius: 23, halfW: 6.9, intro: 0, spin: 0, zoom: 1, shake: 0, aspect: 1 };
  const clock = new THREE.Clock();
  const qTmp = new THREE.Quaternion(), boxTmp = new THREE.Box3();
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
    cam.halfW = model.halfW || 6.9;
    cam.height = model.height ?? 6.2;
    cam.sway = model.sway ?? 0.34;
    cam.angle = model.angle ?? 0.22; cam.vel = 0;
    key.target.position.copy(target);
    bricks = model.bricks.map((b, i) => {
      const g = new THREE.Group();
      const ghost = new THREE.Group();
      const ghostMat = new THREE.LineBasicMaterial({ color: 0x7f93c8, transparent: true, opacity: 0.13, depthWrite: false });
      b.parts.forEach((p) => g.add(makePart(p)));
      root.add(g); ghostRoot.add(ghost);
      g.updateMatrixWorld(true);
      const box = new THREE.Box3();
      g.traverse((m) => {
        if (!m.isMesh || m.userData.label || m.userData.noGhost) return;
        let eg = new THREE.EdgesGeometry(m.geometry, 25);
        if (!eg.attributes.position.count) { eg.dispose(); eg = new THREE.EdgesGeometry(m.geometry, 4); }
        const lines = new THREE.LineSegments(eg, ghostMat);
        m.matrixWorld.decompose(lines.position, lines.quaternion, lines.scale);
        ghost.add(lines);
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        box.union(boxTmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld));
      });
      g.visible = i < placed;
      ghost.visible = i >= placed;
      return { g, ghost, ghostMat, entry: b.entry || model.entry || 'drop', center: box.getCenter(new THREE.Vector3()), minY: box.min.y };
    });
    nextIdx = placed;
    if (intro) { cam.intro = 1; animate(1.6, (k) => { cam.intro = 1 - ease(k); }); }
  }

  function burst(pos, count, color, speed, up) {
    const p = new Float32Array(count * 3), v = [];
    for (let i = 0; i < count; i++) {
      p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z;
      const a = Math.random() * TAU, s = speed * (0.35 + Math.random());
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
    const slam = B.entry === 'slam';
    cam.shake = B.entry === 'rise' ? 0.2 : 0.42;
    const flash = new THREE.PointLight(accent, 160, 18, 2);
    flash.position.set(B.center.x, B.center.y, B.center.z + (slam ? 2 : 0));
    fx.add(flash);
    animate(0.55, (k) => { flash.intensity = 160 * (1 - k); }, () => { fx.remove(flash); flash.dispose(); });

    const wave = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 64),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    if (slam) wave.position.set(B.center.x, B.center.y, B.center.z + 0.5);
    else { wave.rotation.x = -Math.PI / 2; wave.position.set(B.center.x, B.minY + 0.06, B.center.z); }
    fx.add(wave);
    animate(0.8, (k) => { const s = 1 + ease(k) * 9; wave.scale.set(s, s, s); wave.material.opacity = 0.9 * (1 - k); },
      () => { fx.remove(wave); wave.geometry.dispose(); wave.material.dispose(); });

    const at = slam ? new THREE.Vector3(B.center.x, B.center.y, B.center.z + 0.5) : new THREE.Vector3(B.center.x, B.minY + 0.1, B.center.z);
    burst(at, 70, 0xe8d6b0, slam ? 5 : 6.5, slam ? 3 : 2.2);
    burst(at, 24, accent.getHex(), 3, 4.5);
  }

  // Kiểu xuất hiện: drop (rơi từ trời), slam (lao từ phía trước), rise (trồi từ lòng đất), swirl (xoáy vào từ bên cạnh)
  function place(i, onImpact) {
    const B = bricks[i];
    if (!B) return;
    B.ghost.visible = false;
    B.g.visible = true;
    nextIdx = i + 1;
    const rnd = () => Math.random() - 0.5;
    let from, r0, dur = 0.72, curve = (k) => k * k * k, twist = 0;
    if (B.entry === 'slam') { from = new THREE.Vector3(0, 2, 26); r0 = new THREE.Vector3(rnd() * 0.9, rnd() * 1.6, rnd() * 0.9); }
    else if (B.entry === 'rise') { from = new THREE.Vector3(0, -9, 0); r0 = new THREE.Vector3(0, rnd() * 0.8, 0); dur = 0.95; curve = (k) => 1 - (1 - k) ** 3; }
    else if (B.entry === 'swirl') { const a = Math.random() * TAU; from = new THREE.Vector3(Math.cos(a) * 15, 6, Math.sin(a) * 15); r0 = new THREE.Vector3(0, 5, 0); dur = 1.15; curve = ease; twist = 2.4; }
    else { from = new THREE.Vector3(0, 17, 0); r0 = new THREE.Vector3(rnd() * 0.9, rnd() * 1.6, rnd() * 0.9); }
    B.g.position.copy(from);
    animate(dur, (k) => {
      const e = curve(k), rest = 1 - e;
      B.g.position.copy(from).applyAxisAngle(THREE.Object3D.DEFAULT_UP, twist * rest).multiplyScalar(rest);
      B.g.rotation.set(r0.x * rest, r0.y * rest, r0.z * rest);
    }, () => {
      B.g.position.set(0, 0, 0); B.g.rotation.set(0, 0, 0);
      impact(B);
      animate(0.28, (k) => { const s = Math.sin(k * Math.PI) * 0.035; B.g.scale.set(1 + s, 1 - s, 1 + s); }, () => B.g.scale.set(1, 1, 1));
      if (onImpact) onImpact();
    });
  }

  function celebrate() {
    cam.spin = 0;
    animate(9, (k) => { cam.spin = ease(k) * TAU; cam.zoom = 1 - Math.sin(k * Math.PI) * 0.16; }, () => { cam.spin = 0; cam.zoom = 1; });
    animate(2.5, (k) => { bloom.strength = 0.75 + Math.sin(k * Math.PI) * 0.9; }, () => { bloom.strength = 0.75; });
    animate(7, (k) => { boost = 1 + Math.sin(k * Math.PI) * 3; }, () => { boost = 1; });
    for (let i = 0; i < 9; i++) {
      setTimeout(() => {
        const a = Math.random() * TAU, r = 4 + Math.random() * 4;
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

  // chuyển động thường trực của chi tiết: xoay, bay lơ lửng, vỗ cánh, cờ bay, dòng hạt
  function liveParts(o, dt) {
    const u = o.userData;
    if (u.spin) { o.rotation.x += u.spin[0] * dt * boost; o.rotation.y += u.spin[1] * dt * boost; o.rotation.z += u.spin[2] * dt * boost; }
    if (u.float) o.position.y = u.float.y + Math.sin(now * 1.4 + u.float.seed) * 0.18;
    if (u.flap != null) o.scale.z = 0.65 + Math.abs(Math.sin(now * 6 * boost + u.flap)) * 0.45;
    if (u.wave) {
      const pos = o.geometry.attributes.position, arr = pos.array, b = u.wave.base;
      for (let i = 0; i < arr.length; i += 3) {
        const x = b[i], k = x / u.wave.w;
        arr[i + 2] = (Math.sin(x * 2.6 - now * 5) * 0.16 + Math.sin(b[i + 1] * 2 + now * 3) * 0.04) * k;
      }
      pos.needsUpdate = true;
      o.geometry.computeVertexNormals();
    }
    if (u.flow) {
      const n = o.children.length;
      o.children.forEach((c, i) => {
        const f = (now * u.flow.speed * boost + i / n) % 1;
        c.position.lerpVectors(u.flow.a, u.flow.b, f);
        c.position.y += Math.abs(Math.sin(f * 60)) * 0.06;
        c.scale.setScalar(Math.min(1, Math.sin(f * Math.PI) * 3));
      });
    }
  }

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
    bricks.forEach((B) => { if (B.g.visible) B.g.traverse((o) => liveParts(o, dt)); });
    ambientDust.rotation.y = now * 0.012;
    ringMat.color.copy(accent).multiplyScalar(1.1 + Math.sin(now * 1.5) * 0.35);

    // camera
    if (!drag) { cam.angle += cam.vel; cam.vel *= 0.92; }
    const fit = Math.max(1, cam.halfW / (0.364 * cam.aspect) / cam.radius);
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
    root.traverse((o) => {
      if (!o.userData.billboard) return;
      o.parent.getWorldQuaternion(qTmp);
      o.quaternion.copy(qTmp.invert().multiply(camera.quaternion));
    });
    composer.render();
  }
  frame();

  // step: chạy tay n khung hình (dùng khi kiểm thử lúc tab bị ẩn)
  return { setModel, place, celebrate, resize, step: (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) tick(dt); } };
}
