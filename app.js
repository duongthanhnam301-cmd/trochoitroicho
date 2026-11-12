// Logic game Xây Gạch Triết Học. Cảnh 3D nằm trong scene.js, âm thanh trong sfx.js.
const LS_CUSTOM = 'xgth_custom';
const LS_STATE = 'xgth_state';
const LS_MODE = 'xgth_mode';
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const CHEERS = ['Chính xác', 'Chuẩn xác', 'Đúng rồi', 'Xuất sắc'];

const $ = (s) => document.querySelector(s);
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[(Math.random() * a.length) | 0];
const pad = (n) => String(n).padStart(2, '0');
const sfx = (name) => window.SFX && window.SFX.play(name);

// ---------- Trạng thái ----------
function isValidQ(q) {
  return q && typeof q.q === 'string' && q.q.trim() && Array.isArray(q.a) && q.a.length >= 2 && q.a.length <= 6 &&
    q.a.every((x) => typeof x === 'string' && x.trim()) && Number.isInteger(q.c) && q.c >= 0 && q.c < q.a.length;
}
let custom = load(LS_CUSTOM, []).filter(isValidQ);
let mode = load(LS_MODE, 'all');
const freshState = () => ({ model: 0, placed: MODELS.map(() => 0), score: 0, streak: 0, best: 0 });
let state = Object.assign(freshState(), load(LS_STATE, {}));
if (!Array.isArray(state.placed) || state.placed.length !== MODELS.length) state.placed = MODELS.map(() => 0);
state.placed = state.placed.map((n, i) => Math.max(0, Math.min(MODELS[i].bricks.length, n | 0)));
if (!(state.model >= 0 && state.model < MODELS.length)) state.model = 0;
const persist = () => save(LS_STATE, state);

let deck = [], current = null, answered = false, asked = 0;
const firstIncomplete = () => state.placed.findIndex((n, i) => n < MODELS[i].bricks.length);
const isDone = (i) => state.placed[i] >= MODELS[i].bricks.length;

// ---------- Cảnh 3D ----------
let scene3d = null;
try {
  if (document.fonts && document.fonts.load) {
    await Promise.race([
      Promise.all([document.fonts.load('700 48px Oswald', 'Ạ'), document.fonts.load('600 16px "Be Vietnam Pro"', 'Ạ')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  }
  const { createScene } = await import('./scene.js?v=9');
  scene3d = createScene($('#canvasHost'), MODELS);
  window.__scene = scene3d;
} catch (err) {
  console.error('Không khởi tạo được cảnh 3D:', err);
  $('#no3d').hidden = false;
}

// ---------- Hiển thị ----------
function renderModel(intro = true) {
  const i = state.model, m = MODELS[i];
  document.documentElement.style.setProperty('--accent', m.accent);
  $('#modelKicker').textContent = `Công trình ${ROMAN[i]}`;
  $('#modelName').textContent = m.name;
  $('#modelDesc').textContent = m.desc;
  $('#lastBrick').textContent = '';
  if (scene3d) scene3d.setModel(i, state.placed[i], intro);
  renderProgress();
  renderTabs();
}

function renderProgress() {
  const i = state.model, total = MODELS[i].bricks.length, p = state.placed[i];
  $('#modelProgress').textContent = pad(p);
  $('#modelTotal').textContent = `/ ${pad(total)}`;
  const meter = $('#meter');
  if (meter.children.length !== total) meter.innerHTML = '<i></i>'.repeat(total);
  [...meter.children].forEach((el, j) => el.classList.toggle('on', j < p));
}

function renderTabs() {
  const nav = $('#tabs');
  nav.innerHTML = '';
  MODELS.forEach((m, i) => {
    const total = m.bricks.length, p = state.placed[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (i === state.model ? ' active' : '') + (p >= total ? ' done' : '');
    b.style.setProperty('--c', m.accent);
    b.innerHTML = `<span class="no">${ROMAN[i]}</span><span class="cnt">${p >= total ? 'Hoàn thành' : `${pad(p)} / ${pad(total)}`}</span>
      <span class="tn"></span><span class="mini"><i style="width:${(p / total) * 100}%"></i></span>`;
    b.querySelector('.tn').textContent = m.short;
    b.title = m.name;
    b.addEventListener('click', () => {
      if (i === state.model) return;
      sfx('click');
      state.model = i; persist(); renderModel();
    });
    nav.appendChild(b);
  });
}

function renderStats() {
  [['#score', state.score], ['#streak', state.streak]].forEach(([sel, val]) => {
    const el = $(sel), txt = pad(val);
    if (el.textContent !== txt && val > 0) {
      const st = el.closest('.stat');
      st.classList.remove('bump'); void st.offsetWidth; st.classList.add('bump');
    }
    el.textContent = txt;
  });
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------- Câu hỏi ----------
function pool() {
  const mine = custom.map((q) => ({ ...q, custom: true }));
  if (mode === 'custom' && mine.length) return mine;
  return DEFAULT_QUESTIONS.concat(mine);
}

function nextQuestion() {
  if (!deck.length) {
    deck = shuffle(pool().slice());
    if (current && deck.length > 1 && deck[deck.length - 1].q === current.q) deck.unshift(deck.pop());
  }
  const q = deck.pop();
  const order = shuffle(q.a.map((_, i) => i));
  current = { ...q, opts: order.map((i) => q.a[i]), correct: order.indexOf(q.c) };
  answered = false;
  asked++;

  $('#question').textContent = q.q;
  $('#qTag').hidden = !q.custom;
  $('#qCount').textContent = `Câu ${pad(asked)}`;
  const box = $('#options');
  box.innerHTML = '';
  current.opts.forEach((text, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.type = 'button';
    b.innerHTML = `<span class="k">${KEYS[i]}</span><span class="t"></span>`;
    b.querySelector('.t').textContent = text;
    b.addEventListener('click', () => answer(i));
    box.appendChild(b);
  });
  $('#feedback').hidden = true;
  $('#nextBtn').hidden = true;
}

function answer(i) {
  if (answered || !current) return;
  answered = true;
  const ok = i === current.correct;
  [...$('#options').children].forEach((b, j) => {
    b.disabled = true;
    if (j === current.correct) b.classList.add('right');
    else if (j === i) b.classList.add('wrong');
    else b.classList.add('dim');
  });

  const fb = $('#feedback');
  fb.className = 'feedback ' + (ok ? 'good' : 'bad');
  fb.innerHTML = '';
  const head = document.createElement('b');
  if (ok) {
    state.streak++;
    state.best = Math.max(state.best, state.streak);
    head.textContent = pick(CHEERS) + (state.streak >= 3 ? ` · chuỗi ${state.streak} câu` : '');
    sfx(state.streak >= 3 && state.streak % 3 === 0 ? 'streak' : 'ok');
    placeBrick();
  } else {
    state.streak = 0;
    head.textContent = `Sai rồi · đáp án: ${current.opts[current.correct]}`;
    sfx('bad');
    const st = $('#stageBox');
    st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake');
  }
  fb.appendChild(head);
  if (current.e) {
    const ex = document.createElement('span');
    ex.className = 'ex';
    ex.textContent = current.e;
    fb.appendChild(ex);
  }
  fb.hidden = false;
  $('#nextBtn').hidden = false;
  $('#nextBtn').focus({ preventScroll: true });
  persist();
  renderStats();
}

// ---------- Đặt gạch ----------
function placeBrick() {
  state.score++;
  if (isDone(state.model)) {
    const m = firstIncomplete();
    if (m < 0) { toast('Gạch thưởng · cả 3 công trình đã hoàn thành'); return; }
    state.model = m;
    renderModel();
  }
  const m = state.model;
  const idx = state.placed[m];
  state.placed[m]++;
  const label = MODELS[m].bricks[idx].label;
  const done = isDone(m);

  let hit = false;
  const onImpact = () => {
    if (hit) return;
    hit = true;
    sfx('thud');
    renderProgress();
    renderTabs();
    const lb = $('#lastBrick');
    lb.textContent = `+ ${label}`;
    lb.classList.remove('flash'); void lb.offsetWidth; lb.classList.add('flash');
    if (done) setTimeout(() => showCinema(m), 900);
  };
  if (scene3d) {
    setTimeout(() => sfx('whoosh'), 60);
    scene3d.place(idx, onImpact);
    setTimeout(onImpact, 2500); // phòng khi tab bị ẩn và hoạt ảnh không chạy
  } else onImpact();
}

// ---------- Cảnh hoàn thành ----------
function showCinema(m) {
  const model = MODELS[m];
  const allDone = firstIncomplete() < 0;
  $('#cineKicker').textContent = allDone ? 'Cả ba công trình đã hoàn thành' : `Công trình ${ROMAN[m]} hoàn thành`;
  $('#cineTitle').textContent = model.name;
  $('#cineFact').textContent = model.fact;
  const btns = $('#cineBtns');
  btns.innerHTML = '';
  const add = (text, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'btn ' + cls; b.type = 'button'; b.textContent = text;
    b.addEventListener('click', () => { sfx('click'); fn(); });
    btns.appendChild(b);
    return b;
  };
  if (allDone) {
    add('Xây lại từ đầu', 'primary', () => { hideCinema(); resetProgress(); });
    add('Tiếp tục ôn tập', '', hideCinema);
  } else {
    const next = firstIncomplete();
    add(`Công trình tiếp theo: ${MODELS[next].short}`, 'primary', () => { hideCinema(); state.model = next; persist(); renderModel(); });
    add('Ở lại ngắm', '', hideCinema);
  }
  $('#cine').hidden = false;
  $('#stageBox').classList.add('cinema');
  document.body.style.overflow = 'hidden';
  sfx('win');
  if (scene3d) scene3d.celebrate();
}
function hideCinema() {
  $('#stageBox').classList.remove('cinema');
  $('#cine').hidden = true;
  document.body.style.overflow = '';
}

function resetProgress() {
  const keepBest = state.best;
  state = freshState();
  state.best = keepBest;
  persist();
  renderModel(); renderStats();
  deck = [];
  nextQuestion();
  toast('Đã dọn công trường');
}

// ---------- Âm thanh ----------
const soundBtn = $('#soundBtn');
const renderSound = () => soundBtn.classList.toggle('off', !!(window.SFX && window.SFX.muted));
soundBtn.addEventListener('click', () => { if (window.SFX) { window.SFX.toggle(); renderSound(); sfx('click'); } });
renderSound();

// ---------- Kho câu hỏi (chỉ hiện khi mở trang kèm ?admin) ----------
document.querySelectorAll('.modal').forEach((mod) => {
  mod.addEventListener('click', (e) => { if (e.target === mod || e.target.closest('[data-close]')) mod.hidden = true; });
});

function renderList() {
  const term = $('#search').value.trim().toLowerCase();
  const all = custom.map((q) => ({ ...q, custom: true })).reverse().concat(DEFAULT_QUESTIONS);
  const list = all.filter((q) => !term || q.q.toLowerCase().includes(term) || q.a.some((a) => a.toLowerCase().includes(term)));
  $('#listCount').textContent = `${list.length} câu · ${custom.length} của bạn`;
  const ul = $('#qList');
  ul.innerHTML = '';
  list.forEach((q) => {
    const li = document.createElement('li');
    if (q.custom) li.className = 'mine';
    li.innerHTML = `<div class="qt"><div class="qq"></div><div class="qa"></div></div><span class="tag">${q.custom ? 'Của bạn' : 'Mặc định'}</span>`;
    li.querySelector('.qq').textContent = q.q;
    li.querySelector('.qa').textContent = '✓ ' + q.a[q.c];
    if (q.custom) {
      const del = document.createElement('button');
      del.className = 'del'; del.type = 'button'; del.textContent = 'Xóa';
      del.addEventListener('click', () => {
        custom = custom.filter((x) => x.id !== q.id);
        save(LS_CUSTOM, custom); deck = []; renderList(); toast('Đã xóa câu hỏi');
      });
      li.appendChild(del);
    }
    ul.appendChild(li);
  });
}

if (new URLSearchParams(location.search).has('admin')) $('#openBank').hidden = false;
$('#openBank').addEventListener('click', () => { $('#mode').value = mode; renderList(); $('#bank').hidden = false; });
$('#search').addEventListener('input', renderList);

$('#addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#fQ').value.trim();
  const inputs = [...document.querySelectorAll('.fA')];
  const ci = +document.querySelector('input[name="fC"]:checked').value;
  if (!inputs[ci].value.trim()) { toast('Đáp án được chọn là đúng đang để trống'); inputs[ci].focus(); return; }
  const a = []; let c = 0;
  inputs.forEach((inp, i) => { const v = inp.value.trim(); if (v) { if (i === ci) c = a.length; a.push(v); } });
  if (a.length < 2) { toast('Cần ít nhất 2 đáp án'); return; }
  const item = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), q, a, c };
  const ex = $('#fE').value.trim();
  if (ex) item.e = ex;
  custom.push(item);
  save(LS_CUSTOM, custom);
  deck.push({ ...item, custom: true }); // câu mới sẽ được hỏi ngay câu tới
  e.target.reset();
  renderList();
  toast('Đã thêm vào bộ sưu tập');
});

$('#mode').addEventListener('change', (e) => {
  mode = e.target.value;
  if (mode === 'custom' && !custom.length) toast('Chưa có câu tự thêm, tạm dùng tất cả câu hỏi');
  save(LS_MODE, mode);
  deck = [];
});

$('#exportBtn').addEventListener('click', () => {
  const data = custom.map(({ q, a, c, e }) => (e ? { q, a, c, e } : { q, a, c }));
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'cau-hoi-triet-hoc.json' });
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const arr = (Array.isArray(data) ? data : []).filter(isValidQ);
    const seen = new Set(custom.map((x) => x.q.trim()));
    let added = 0;
    arr.forEach((x) => {
      if (seen.has(x.q.trim())) return;
      seen.add(x.q.trim());
      const item = { id: 'c' + Date.now().toString(36) + added, q: x.q.trim(), a: x.a.map((s) => s.trim()), c: x.c };
      if (typeof x.e === 'string' && x.e.trim()) item.e = x.e.trim();
      custom.push(item); added++;
    });
    save(LS_CUSTOM, custom); deck = []; renderList();
    toast(added ? `Đã nhập ${added} câu hỏi` : 'Không có câu hỏi mới hợp lệ trong file');
  } catch {
    toast('File JSON không hợp lệ');
  }
});

$('#resetBtn').addEventListener('click', () => {
  if (confirm('Xóa toàn bộ gạch đã xây và bắt đầu lại? (Câu hỏi bạn thêm vẫn được giữ.)')) {
    $('#bank').hidden = true;
    resetProgress();
  }
});

// ---------- Bàn phím ----------
$('#nextBtn').addEventListener('click', () => { sfx('click'); nextQuestion(); });
document.addEventListener('keydown', (e) => {
  if (!$('#cine').hidden) { if (e.key === 'Escape') hideCinema(); return; }
  if (!$('#bank').hidden || e.target.matches('input, textarea, select')) {
    if (e.key === 'Escape') $('#bank').hidden = true;
    return;
  }
  const n = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
  if (!answered && e.key.length === 1 && n >= 0 && current && n < current.opts.length) { answer(n); return; }
  if (answered && e.key === 'Enter' && document.activeElement !== $('#nextBtn')) { e.preventDefault(); sfx('click'); nextQuestion(); }
});

// ---------- Khởi động ----------
renderModel();
renderStats();
nextQuestion();
