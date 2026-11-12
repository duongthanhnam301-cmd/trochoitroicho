(() => {
  'use strict';

  const LS_CUSTOM = 'xgth_custom';
  const LS_STATE = 'xgth_state';
  const LS_MODE = 'xgth_mode';
  const KEYS = ['A', 'B', 'C', 'D'];
  const CHEERS = ['Chuẩn luôn! 🎉', 'Giỏi quá! ✨', 'Chính xác! 🧱', 'Tuyệt vời! 🌟', 'Đúng rồi nè! 💛', 'Thông thái ghê! 🦉'];

  const $ = (s) => document.querySelector(s);
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  // ---------- Trạng thái ----------
  let custom = load(LS_CUSTOM, []).filter(isValidQ);
  let mode = load(LS_MODE, 'all');
  const freshState = () => ({ model: 0, placed: MODELS.map(() => 0), score: 0, streak: 0, best: 0 });
  let state = Object.assign(freshState(), load(LS_STATE, {}));
  if (!Array.isArray(state.placed) || state.placed.length !== MODELS.length) state.placed = MODELS.map(() => 0);
  state.placed = state.placed.map((n, i) => Math.max(0, Math.min(MODELS[i].bricks.length, n | 0)));
  if (!(state.model >= 0 && state.model < MODELS.length)) state.model = 0;

  let deck = [];
  let current = null;
  let answered = false;
  let asked = 0;

  function isValidQ(q) {
    return q && typeof q.q === 'string' && q.q.trim() && Array.isArray(q.a) && q.a.length >= 2 && q.a.length <= 6 &&
      q.a.every((x) => typeof x === 'string' && x.trim()) && Number.isInteger(q.c) && q.c >= 0 && q.c < q.a.length;
  }
  const persist = () => save(LS_STATE, state);

  // ---------- Câu hỏi ----------
  function pool() {
    const mine = custom.map((q) => ({ ...q, custom: true }));
    if (mode === 'custom' && mine.length) return mine;
    return DEFAULT_QUESTIONS.concat(mine);
  }

  function nextQuestion() {
    if (!deck.length) {
      deck = shuffle(pool().slice());
      // tránh lặp lại ngay câu vừa hỏi
      if (current && deck.length > 1 && deck[deck.length - 1].q === current.q) deck.unshift(deck.pop());
    }
    const q = deck.pop();
    const order = shuffle(q.a.map((_, i) => i));
    current = { ...q, opts: order.map((i) => q.a[i]), correct: order.indexOf(q.c) };
    answered = false;
    asked++;

    $('#question').textContent = q.q;
    const tag = $('#qTag');
    tag.textContent = q.custom ? '💖 Câu của bạn' : '📖 Câu hỏi';
    tag.classList.toggle('custom', !!q.custom);
    $('#qCount').textContent = `Câu thứ ${asked}`;

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
    if (asked > 1) owlSay(null, pick(OWL_ASK));
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
      head.textContent = pick(CHEERS) + (state.streak >= 3 ? ` Chuỗi ${state.streak} câu liền!` : '');
      owlSay('happy', state.streak >= 3 ? `Chuỗi ${state.streak} câu đúng liền! Bạn cháy quá! 🔥` : pick(OWL_OK));
      sound('ok');
      placeBrick();
    } else {
      state.streak = 0;
      head.textContent = `Ôi, chưa đúng rồi 🥺 Đáp án: ${current.opts[current.correct]}`;
      owlSay('sad', pick(OWL_BAD));
      sound('bad');
      const card = $('#stageCard');
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    }
    fb.appendChild(head);
    if (current.e) {
      const ex = document.createElement('span');
      ex.className = 'ex';
      ex.textContent = '💡 ' + current.e;
      fb.appendChild(ex);
    }
    fb.hidden = false;
    $('#nextBtn').hidden = false;
    $('#nextBtn').focus({ preventScroll: true });
    persist();
    renderStats();
  }

  // ---------- Xây gạch ----------
  const firstIncomplete = () => state.placed.findIndex((n, i) => n < MODELS[i].bricks.length);
  const isDone = (i) => state.placed[i] >= MODELS[i].bricks.length;

  function placeBrick() {
    state.score++;
    if (isDone(state.model)) {
      const m = firstIncomplete();
      if (m < 0) { toast('⭐ Gạch thưởng! Bạn đã xây xong cả 3 mô hình'); return; }
      state.model = m;
      renderModel();
    }
    const m = state.model;
    const idx = state.placed[m];
    state.placed[m]++;
    const el = $('#stage').querySelector(`.real .brick[data-i="${idx}"]`);
    if (el) {
      el.classList.add('on', 'drop');
      setTimeout(() => dust(el), 380);
      setTimeout(() => sound('pop'), 380);
    }
    updateGhost();
    renderProgress();
    renderTabs();
    toast(`🧱 +1 viên gạch: ${MODELS[m].bricks[idx].label}`);
    if (isDone(m)) setTimeout(() => showWin(m), 900);
  }

  // ---------- Khung cảnh phía sau mô hình ----------
  const SCENES = {
    day: { sky: ['#a9dcff', '#fff4dd'], hill: ['#bfe5a0', '#9fd282'], cloud: '#ffffff' },
    sunset: { sky: ['#ffc6a8', '#fff0d4'], hill: ['#cfe6a0', '#b5d886'], cloud: '#fff3ea' },
    night: { sky: ['#bdb6f2', '#fde6f1'], hill: null, cloud: '#f4f0ff' },
  };
  function sceneSvg(type) {
    const s = SCENES[type] || SCENES.day;
    const id = 'sky-' + type;
    let out = `<defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.sky[0]}"/><stop offset="1" stop-color="${s.sky[1]}"/></linearGradient>
      <radialGradient id="glow-${type}"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <pattern id="mortar" width="24" height="12" patternUnits="userSpaceOnUse">
        <path d="M0,11.5 H24 M12,0 V6 M0,6 H24 M0,6 V12 M24,6 V12" stroke="#5b4636" stroke-width="1" opacity=".22" fill="none"/>
      </pattern></defs>
      <rect x="-20" y="-20" width="360" height="360" fill="url(#${id})"/>`;
    const cloud = (x, y, k, cls) => `<g class="cloud ${cls}" transform="translate(${x} ${y}) scale(${k})"><g fill="${s.cloud}" opacity=".95">
      <ellipse cx="0" cy="10" rx="26" ry="11"/><circle cx="-10" cy="4" r="11"/><circle cx="8" cy="0" r="14"/><circle cx="22" cy="7" r="9"/></g></g>`;
    if (type === 'day') {
      out += `<g class="sun" transform="translate(296 14)"><g class="rays" stroke="#ffd36e" stroke-width="4" stroke-linecap="round">
        ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="0" y1="-27" x2="0" y2="-35" transform="rotate(${a})"/>`).join('')}</g>
        <circle r="20" fill="#ffe08a" stroke="#f2b84b" stroke-width="3"/></g>`;
      out += cloud(40, 30, 1, 'c1') + cloud(250, 70, 0.7, 'c2');
    } else if (type === 'sunset') {
      out += `<circle cx="280" cy="60" r="70" fill="url(#glow-sunset)"/>`;
      out += cloud(250, 40, 0.9, 'c1') + cloud(120, 6, 0.6, 'c2');
      out += `<g fill="none" stroke="#8a6a58" stroke-width="2" stroke-linecap="round" class="birds">
        <path d="M200,30 q5,-5 10,0 q5,-5 10,0"/><path d="M226,44 q4,-4 8,0 q4,-4 8,0"/></g>`;
    } else {
      out += `<circle cx="160" cy="160" r="120" fill="url(#glow-night)"/>`;
      const stars = [[10, 10], [60, -4], [110, 30], [230, 0], [300, 40], [320, 120], [-6, 120], [20, 230], [310, 230], [270, 300], [40, 300], [180, -10]];
      out += stars.map(([x, y], i) => `<path class="twinkle" style="animation-delay:${(i * 0.37) % 2}s" d="M${x},${y - 5} L${x + 1.5},${y - 1.5} L${x + 5},${y} L${x + 1.5},${y + 1.5} L${x},${y + 5} L${x - 1.5},${y + 1.5} L${x - 5},${y} L${x - 1.5},${y - 1.5}Z" fill="#fff"/>`).join('');
      out += `<path d="M304,-6 a18,18 0 1,0 14,26 a14,14 0 1,1 -14,-26Z" fill="#fff3c4" stroke="#e8c870" stroke-width="2"/>`;
      out += cloud(30, 330, 1.2, 'c1') + cloud(290, 330, 1, 'c2');
    }
    if (s.hill) {
      out += `<path d="M-20,312 Q60,286 150,300 T340,296 V340 H-20Z" fill="${s.hill[0]}"/>
        <path d="M-20,326 Q90,306 200,318 T340,314 V340 H-20Z" fill="${s.hill[1]}"/>
        <g class="flowers">${[[-2, 318], [22, 324], [300, 316], [318, 326], [276, 330]].map(([x, y], i) =>
          `<g transform="translate(${x} ${y})"><line y2="8" stroke="#6aa55a" stroke-width="2"/><circle r="3.6" fill="${['#ff9eb1', '#fff', '#ffd36e'][i % 3]}"/><circle r="1.4" fill="#f2a541"/></g>`).join('')}</g>`;
    }
    return out;
  }

  function modelSvg(m, placed, withGhost) {
    const b = MODELS[m].bricks;
    const shadow = sceneSvg(MODELS[m].scene) + '<ellipse cx="160" cy="304" rx="140" ry="9" fill="#5b4636" opacity=".12"/>';
    const ghost = withGhost
      ? `<g class="ghost">${b.map((x, i) => `<g class="gb${i === placed ? ' next' : ''}">${x.svg}</g>`).join('')}</g>`
      : '';
    const real = `<g class="real">${b.map((x, i) => `<g class="brick${i < placed ? ' on' : ''}" data-i="${i}">${x.svg}</g>`).join('')}</g>`;
    return shadow + ghost + real;
  }

  // Bụi bay ra khi viên gạch chạm chỗ
  function dust(el) {
    let bb;
    try { bb = el.getBBox(); } catch { return; }
    const svgEl = $('#stage');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'dust');
    for (let i = 0; i < 8; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const left = i % 2 === 0;
      c.setAttribute('cx', left ? bb.x + 4 : bb.x + bb.width - 4);
      c.setAttribute('cy', bb.y + bb.height - 2);
      c.setAttribute('r', 3 + Math.random() * 3);
      c.style.setProperty('--dx', (left ? -1 : 1) * (10 + Math.random() * 18) + 'px');
      c.style.setProperty('--dy', -(4 + Math.random() * 12) + 'px');
      g.appendChild(c);
    }
    const stars = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stars.setAttribute('x', bb.x + bb.width / 2);
    stars.setAttribute('y', bb.y - 6);
    stars.setAttribute('class', 'plus');
    stars.textContent = '+1 🧱';
    g.appendChild(stars);
    svgEl.appendChild(g);
    setTimeout(() => g.remove(), 1100);
  }

  // ---------- Âm thanh nhỏ (tạo bằng Web Audio, không cần file) ----------
  let muted = load('xgth_muted', false);
  let actx = null;
  function sound(kind) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const now = actx.currentTime;
      const notes = { pop: [[520, 0], [780, 0.07]], ok: [[660, 0], [880, 0.09]], bad: [[300, 0], [220, 0.12]], win: [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]] }[kind] || [];
      notes.forEach(([f, t]) => {
        const o = actx.createOscillator(), gn = actx.createGain();
        o.type = kind === 'bad' ? 'triangle' : 'sine';
        o.frequency.setValueAtTime(f, now + t);
        gn.gain.setValueAtTime(0.0001, now + t);
        gn.gain.exponentialRampToValueAtTime(0.18, now + t + 0.02);
        gn.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
        o.connect(gn).connect(actx.destination);
        o.start(now + t); o.stop(now + t + 0.25);
      });
    } catch { /* trình duyệt không hỗ trợ âm thanh */ }
  }
  const soundBtn = $('#soundBtn');
  const renderSound = () => { soundBtn.textContent = muted ? '🔇' : '🔊'; };
  soundBtn.addEventListener('click', () => { muted = !muted; save('xgth_muted', muted); renderSound(); });
  renderSound();

  // ---------- Cú Thông Thái ----------
  const OWL_OK = ['Tuyệt vời! Gạch mới đây!', 'Giỏi quá đi! Thêm một viên nè!', 'Chuẩn không cần chỉnh!', 'Bạn thông thái ghê!'];
  const OWL_BAD = ['Không sao, đọc giải thích rồi thử tiếp nhé!', 'Suýt đúng rồi! Câu sau chắc chắn được!', 'Sai là để nhớ lâu hơn đó!'];
  const OWL_ASK = ['Câu này bạn nghĩ sao?', 'Suy nghĩ kỹ rồi chọn nha!', 'Mình tin bạn làm được!', 'Đọc kỹ đề nhé!'];
  function owlSay(mood, text) {
    const owl = $('#owl');
    owl.classList.remove('happy', 'sad', 'hop');
    void owl.getBoundingClientRect();
    if (mood) owl.classList.add(mood, mood === 'happy' ? 'hop' : 'sad');
    const b = $('#bubble');
    b.textContent = text;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }

  function renderModel() {
    const m = MODELS[state.model];
    $('#modelName').textContent = `${m.emoji} ${m.name}`;
    $('#modelDesc').textContent = m.desc;
    $('#stage').innerHTML = modelSvg(state.model, state.placed[state.model], true);
    renderProgress();
  }

  function updateGhost() {
    const p = state.placed[state.model];
    $('#stage').querySelectorAll('.ghost .gb').forEach((g, i) => g.classList.toggle('next', i === p));
  }

  function renderProgress() {
    const total = MODELS[state.model].bricks.length;
    const p = state.placed[state.model];
    $('#modelProgress').textContent = p >= total ? '✅ Hoàn thành' : `${p} / ${total} viên`;
    $('#bar').style.width = (p / total) * 100 + '%';
  }

  function renderTabs() {
    const nav = $('#tabs');
    nav.innerHTML = '';
    MODELS.forEach((m, i) => {
      const total = m.bricks.length;
      const p = state.placed[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (i === state.model ? ' active' : '');
      if (p >= total) b.classList.add('done');
      b.innerHTML = `<svg class="thumb" viewBox="-20 -20 360 360" aria-hidden="true">${modelSvg(i, p, true)}</svg>
        <span class="tx"><span class="tn"></span>
          <span class="mini"><i style="width:${(p / total) * 100}%"></i></span>
          <span class="cnt">${p >= total ? '✅ Hoàn thành' : `${p}/${total} viên`}</span></span>`;
      b.querySelector('.tn').textContent = m.short;
      b.title = m.name;
      b.addEventListener('click', () => { state.model = i; persist(); renderModel(); renderTabs(); });
      nav.appendChild(b);
    });
  }

  function renderStats() {
    [['#score', state.score], ['#streak', state.streak]].forEach(([sel, val]) => {
      const elx = $(sel);
      if (elx.textContent !== String(val) && val > 0 && elx.textContent !== '') {
        const st = elx.closest('.stat');
        st.classList.remove('bump'); void st.offsetWidth; st.classList.add('bump');
      }
      elx.textContent = val;
    });
  }

  // ---------- Hoàn thành ----------
  function showWin(m) {
    const model = MODELS[m];
    const allDone = firstIncomplete() < 0;
    $('#winEmoji').textContent = allDone ? '🏆' : model.emoji;
    $('#winTitle').textContent = allDone ? 'Bạn đã xây xong cả 3 mô hình!' : `Hoàn thành ${model.name}!`;
    $('#winSvg').innerHTML = modelSvg(m, model.bricks.length, false);
    $('#winFact').textContent = model.fact;
    const btns = $('#winBtns');
    btns.innerHTML = '';
    const add = (text, cls, fn) => {
      const b = document.createElement('button');
      b.className = 'btn ' + cls; b.type = 'button'; b.textContent = text;
      b.addEventListener('click', fn); btns.appendChild(b); return b;
    };
    if (allDone) {
      add('🔁 Xây lại từ đầu', 'primary', () => { closeModal('#win'); resetProgress(); });
      add('Tiếp tục ôn bài', 'soft', () => closeModal('#win'));
    } else {
      const next = firstIncomplete();
      add(`Xây tiếp ${MODELS[next].emoji} ${MODELS[next].short} →`, 'primary', () => {
        closeModal('#win'); state.model = next; persist(); renderModel(); renderTabs();
      }).focus();
    }
    openModal('#win');
    confetti();
    sound('win');
  }

  function confetti() {
    const box = $('#confetti');
    const bits = ['🧱', '⭐', '💛', '✨', '🎉', '🦉', '☯️', '🌸'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      s.textContent = pick(bits);
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = 2 + Math.random() * 2 + 's';
      s.style.animationDelay = Math.random() * 0.6 + 's';
      box.appendChild(s);
      setTimeout(() => s.remove(), 5000);
    }
  }

  function resetProgress() {
    const keepBest = state.best;
    state = freshState();
    state.best = keepBest;
    persist();
    renderModel(); renderTabs(); renderStats();
    deck = [];
    nextQuestion();
    toast('🧹 Đã dọn công trường, xây lại thôi!');
  }

  // ---------- Toast & modal ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  const openModal = (id) => { $(id).hidden = false; };
  const closeModal = (id) => { $(id).hidden = true; };
  document.querySelectorAll('.modal').forEach((mod) => {
    mod.addEventListener('click', (e) => {
      if (e.target === mod || e.target.closest('[data-close]')) mod.hidden = true;
    });
  });

  // ---------- Kho câu hỏi ----------
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
        del.className = 'del'; del.type = 'button'; del.textContent = 'Xóa'; del.title = 'Xóa câu hỏi này';
        del.addEventListener('click', () => {
          custom = custom.filter((x) => x.id !== q.id);
          save(LS_CUSTOM, custom); deck = []; renderList(); toast('Đã xóa câu hỏi');
        });
        li.appendChild(del);
      }
      ul.appendChild(li);
    });
  }

  // Nút Kho câu hỏi chỉ hiện với người quản lý: mở trang kèm ?admin (vd: /?admin)
  if (new URLSearchParams(location.search).has('admin')) $('#openBank').hidden = false;
  $('#openBank').addEventListener('click', () => { $('#mode').value = mode; renderList(); openModal('#bank'); });
  $('#search').addEventListener('input', renderList);

  $('#addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#fQ').value.trim();
    const inputs = [...document.querySelectorAll('.fA')];
    const ci = +document.querySelector('input[name="fC"]:checked').value;
    if (!inputs[ci].value.trim()) { toast('⚠️ Đáp án được chọn là đúng đang để trống'); inputs[ci].focus(); return; }
    const a = []; let c = 0;
    inputs.forEach((inp, i) => { const v = inp.value.trim(); if (v) { if (i === ci) c = a.length; a.push(v); } });
    if (a.length < 2) { toast('⚠️ Cần ít nhất 2 đáp án'); return; }
    const item = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), q, a, c };
    const ex = $('#fE').value.trim();
    if (ex) item.e = ex;
    custom.push(item);
    save(LS_CUSTOM, custom);
    deck.push({ ...item, custom: true }); // câu mới sẽ được hỏi ngay câu tới
    e.target.reset();
    renderList();
    toast('💖 Đã thêm vào bộ sưu tập!');
  });

  $('#mode').addEventListener('change', (e) => {
    mode = e.target.value;
    if (mode === 'custom' && !custom.length) toast('Bạn chưa thêm câu nào, tạm dùng tất cả câu hỏi');
    save(LS_MODE, mode);
    deck = [];
  });

  $('#exportBtn').addEventListener('click', () => {
    const data = custom.map(({ q, a, c, e }) => (e ? { q, a, c, e } : { q, a, c }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
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
      toast(added ? `⬆️ Đã nhập ${added} câu hỏi` : 'Không có câu hỏi mới hợp lệ trong file');
    } catch {
      toast('⚠️ File JSON không hợp lệ');
    }
  });

  $('#resetBtn').addEventListener('click', () => {
    if (confirm('Xóa toàn bộ gạch đã xây và bắt đầu lại? (Câu hỏi bạn thêm vẫn được giữ.)')) {
      closeModal('#bank');
      resetProgress();
    }
  });

  // ---------- Bàn phím ----------
  $('#nextBtn').addEventListener('click', nextQuestion);
  document.addEventListener('keydown', (e) => {
    if (!$('#bank').hidden || e.target.matches('input, textarea, select')) {
      if (e.key === 'Escape') closeModal('#bank');
      return;
    }
    if (!$('#win').hidden) { if (e.key === 'Escape') closeModal('#win'); return; }
    const n = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
    if (!answered && n >= 0 && current && n < current.opts.length && e.key.length === 1) { answer(n); return; }
    if (answered && e.key === 'Enter' && document.activeElement !== $('#nextBtn')) { e.preventDefault(); nextQuestion(); }
  });

  // ---------- Khởi động ----------
  renderTabs();
  renderModel();
  renderStats();
  nextQuestion();
})();
