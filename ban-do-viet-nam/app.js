(() => {
  'use strict';

  const LS_STATE = 'tsvn_state';
  const LS_CUSTOM = 'tsvn_custom';
  const KEYS = ['A', 'B', 'C', 'D'];
  const CHEERS = ['Chuẩn luôn!', 'Giỏi quá!', 'Chính xác!', 'Xuất sắc!', 'Quá đỉnh!', 'Đúng rồi nè!'];
  const SVGNS = 'http://www.w3.org/2000/svg';

  const $ = (s) => document.querySelector(s);
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Dữ liệu ----------
  const LIST = VN_MAP.provinces.map((p) => ({ ...p, ...PROVINCES[p.id] }));
  const BY_ID = Object.fromEntries(LIST.map((p) => [p.id, p]));
  const TOTAL = LIST.length;
  const shortName = (p) => p.name.replace(/^TP\. /, '');
  const answerName = (p) => p.name;

  const fresh = () => ({ lit: [], streak: 0, best: 0, correct: 0, wrong: 0, badge: null, name: '' });
  let state = Object.assign(fresh(), load(LS_STATE, {}));
  state.lit = (Array.isArray(state.lit) ? state.lit : []).filter((id) => BY_ID[id]);
  let custom = load(LS_CUSTOM, []).filter((q) => q && typeof q.q === 'string' && BY_ID[q.p]);
  const persist = () => save(LS_STATE, state);

  const askedCount = {};
  let current = null, answered = false, asked = 0;
  const isLit = (id) => state.lit.includes(id);

  // ---------- Vẽ bản đồ ----------
  const svg = $('#map');
  svg.setAttribute('viewBox', `0 0 ${VN_MAP.w} ${VN_MAP.h}`);
  const paths = {};
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function drawMap() {
    svg.innerHTML = `<defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    const sea = el('g', {}, svg);
    [['BIỂN ĐÔNG', 545, 600, 'sea big'], ['Vịnh Bắc Bộ', 345, 255, 'sea'], ['Vịnh Thái Lan', 80, 870, 'sea'],
      ['LÀO', 140, 330, 'sea'], ['CAMPUCHIA', 160, 665, 'sea'], ['TRUNG QUỐC', 400, 45, 'sea']]
      .forEach(([t, x, y, c]) => { el('text', { x, y, class: c }, sea).textContent = t; });
    LIST.forEach((p) => {
      if (!p.arch) return;
      const [x, y, w, h] = p.arch.box;
      el('rect', { x, y, width: w, height: h, rx: 12, class: 'inset' }, sea);
      const label = p.arch.grp === 'HS' ? 'QĐ. Hoàng Sa' : 'QĐ. Trường Sa';
      const sub = p.arch.grp === 'HS' ? '(TP. Đà Nẵng)' : '(Khánh Hòa)';
      const ty = p.arch.grp === 'HS' ? y - 22 : y + h + 16;
      el('text', { x: x + w / 2, y: ty, class: 'sea' }, sea).textContent = label;
      el('text', { x: x + w / 2, y: ty + 14, class: 'sea', 'font-size': 11 }, sea).textContent = sub;
    });
    const g = el('g', {}, svg);
    LIST.forEach((p) => {
      const path = el('path', { d: p.d, class: 'prov', 'data-id': p.id, 'fill-rule': 'evenodd' }, g);
      path.style.setProperty('--c', REGIONS[p.region].color);
      paths[p.id] = path;
    });
    const hn = BY_ID['ha-noi'];
    el('path', { d: star(hn.cx, hn.cy - 1, 6, 2.6), class: 'cap-star' }, svg);
    el('g', { id: 'labels' }, svg);
    refreshMap();
  }
  function star(cx, cy, R, r) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }
  function refreshMap() {
    const labels = $('#labels');
    labels.innerHTML = '';
    LIST.forEach((p) => {
      const lit = isLit(p.id);
      paths[p.id].classList.toggle('lit', lit);
      paths[p.id].classList.toggle('target', !lit && current && current.target === p.id);
      if (lit) {
        const t = el('text', { x: p.cx, y: p.cy + (p.id === 'ha-noi' ? 9 : 0), class: 'lbl' }, labels);
        t.textContent = shortName(p);
      }
    });
    renderProgress();
  }

  // Tooltip & bấm vào tỉnh
  const tip = $('#tip');
  svg.addEventListener('pointermove', (e) => {
    const t = e.target.closest('.prov');
    if (!t) { tip.hidden = true; return; }
    const p = BY_ID[t.dataset.id];
    tip.textContent = isLit(p.id) ? `✨ ${p.name}` : (current && current.target === p.id ? '🔦 Tỉnh bí ẩn' : '🌑 Chưa thắp sáng');
    const r = $('.map-wrap').getBoundingClientRect();
    tip.style.left = e.clientX - r.left + 'px';
    tip.style.top = e.clientY - r.top + 'px';
    tip.hidden = false;
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  svg.addEventListener('click', (e) => {
    const t = e.target.closest('.prov');
    if (!t) return;
    const id = t.dataset.id;
    if (isLit(id)) showInfo(id);
    else toast('🌑 Tỉnh này còn tối. Trả lời đúng để thắp sáng nhé!');
  });

  // ---------- Thanh tiến độ ----------
  function renderProgress() {
    const n = state.lit.length;
    $('#litCount').textContent = `${n}/${TOTAL}`;
    $('#streak').textContent = state.streak;
    $('#bar').style.width = (n / TOTAL) * 100 + '%';
    $('#pct').textContent = Math.round((n / TOTAL) * 100) + '%';
    $('#badgeBtn').classList.toggle('locked', !state.badge);
    const box = $('#regions');
    box.innerHTML = '';
    Object.entries(REGIONS).forEach(([key, r]) => {
      const all = LIST.filter((p) => p.region === key);
      const lit = all.filter((p) => isLit(p.id)).length;
      const d = document.createElement('div');
      d.className = 'reg';
      d.style.setProperty('--c', r.color);
      d.innerHTML = `<i></i><span>${esc(r.name)}</span><b>${lit}/${all.length}</b>`;
      d.title = r.name;
      box.appendChild(d);
    });
  }

  // ---------- Thông tin tỉnh ----------
  function showInfo(id) {
    const p = BY_ID[id];
    const r = REGIONS[p.region];
    Object.values(paths).forEach((x) => x.classList.remove('sel'));
    paths[id].classList.add('sel');
    const card = $('#info');
    card.style.setProperty('--c', r.color);
    card.innerHTML = `
      <div class="info-head"><span class="dot"></span><h2>${esc(p.name)}</h2>
        <span class="chip ${p.city ? 'city' : ''}">${p.city ? 'Thành phố trực thuộc TW' : 'Tỉnh'}</span></div>
      <div class="region-name">${esc(r.name)}</div>
      <div class="facts">
        <div class="fact"><span>Diện tích</span><b>${esc(p.area)} km²</b></div>
        <div class="fact"><span>Dân số</span><b>${esc(p.pop)} người</b></div>
        <div class="fact"><span>Trung tâm hành chính</span><b>${esc(p.center)}</b></div>
        <div class="fact"><span>Hình thành từ</span><b>${p.merged ? esc(p.merged) : 'Giữ nguyên, không hợp nhất'}</b></div>
      </div>
      <div class="sec">📍 Nổi tiếng với</div>
      <div class="tags">${p.famous.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
      <div class="sec">🍜 Đặc sản</div>
      <div>${esc(p.food)}</div>
      <div class="didyou">💡 Bạn có biết? ${esc(p.fact)}</div>`;
    card.classList.remove('reveal'); void card.offsetWidth; card.classList.add('reveal');
  }

  // ---------- Câu hỏi ----------
  function questionsFor(id) {
    const p = BY_ID[id];
    return p.qs.map((q, i) => ({ key: id + ':' + i, q, p: id }))
      .concat(custom.filter((c) => c.p === id).map((c) => ({ key: c.id, q: c.q, p: id, custom: true })));
  }
  function makeOptions(id) {
    const p = BY_ID[id];
    const same = shuffle(LIST.filter((x) => x.region === p.region && x.id !== id)).slice(0, 2);
    const rest = shuffle(LIST.filter((x) => x.id !== id && !same.includes(x))).slice(0, 3 - same.length);
    return shuffle([p, ...same, ...rest]);
  }

  function nextQuestion() {
    const locked = LIST.filter((p) => !isLit(p.id));
    const bonus = !locked.length;
    const prev = current && current.target;
    let pool = bonus ? LIST : locked;
    if (pool.length > 1 && prev) pool = pool.filter((p) => p.id !== prev);
    const target = pick(pool).id;
    const qs = questionsFor(target);
    const minAsk = Math.min(...qs.map((q) => askedCount[q.key] || 0));
    const q = pick(qs.filter((x) => (askedCount[x.key] || 0) === minAsk));
    askedCount[q.key] = (askedCount[q.key] || 0) + 1;
    const opts = makeOptions(target);
    current = { ...q, target, bonus, opts, correct: opts.findIndex((o) => o.id === target) };
    answered = false; asked++;

    $('#question').textContent = q.q;
    const tag = $('#qTag');
    tag.textContent = bonus ? '⭐ Ôn tập' : q.custom ? '💖 Câu của bạn · tỉnh bí ẩn đang nhấp nháy' : '🔦 Tỉnh bí ẩn đang nhấp nháy';
    tag.classList.toggle('custom', !!q.custom);
    $('#qCount').textContent = `Câu thứ ${asked}`;
    const box = $('#options');
    box.innerHTML = '';
    opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'opt';
      b.innerHTML = `<span class="k">${KEYS[i]}</span><span class="t"></span>`;
      b.querySelector('.t').textContent = answerName(o);
      b.addEventListener('click', () => answer(i));
      box.appendChild(b);
    });
    $('#feedback').hidden = true;
    $('#nextBtn').hidden = true;
    refreshMap();
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
    const p = BY_ID[current.target];
    const fb = $('#feedback');
    fb.className = 'feedback ' + (ok ? 'good' : 'bad');
    if (ok) {
      state.correct++; state.streak++; state.best = Math.max(state.best, state.streak);
      if (!current.bonus && !isLit(p.id)) {
        state.lit.push(p.id);
        fb.textContent = `${pick(CHEERS)} ✨ ${p.name} đã sáng đèn!` + (state.streak >= 3 ? ` (chuỗi ${state.streak} câu)` : '');
        persist();
        current.target = null;
        refreshMap();
        const path = paths[p.id];
        path.classList.remove('flash'); void path.getBBox(); path.classList.add('flash');
        showInfo(p.id);
        toast(`💡 Thắp sáng ${p.name}! (${state.lit.length}/${TOTAL})`);
        if (state.lit.length === TOTAL && !state.badge) {
          state.badge = new Date().toLocaleDateString('vi-VN');
          persist();
          setTimeout(() => { confetti(); openBadge(true); }, 1200);
        }
      } else {
        fb.textContent = `${pick(CHEERS)} Đáp án là ${p.name}.`;
      }
    } else {
      state.wrong++; state.streak = 0;
      fb.textContent = `Tiếc quá 🥺 Đáp án đúng là ${p.name}. Tỉnh này vẫn còn tối, sẽ quay lại sau nhé!`;
      const path = paths[p.id];
      path.classList.remove('miss'); void path.getBBox(); path.classList.add('miss');
    }
    persist();
    renderProgress();
    fb.hidden = false;
    $('#nextBtn').hidden = false;
    $('#nextBtn').focus({ preventScroll: true });
  }

  // ---------- Huy hiệu ----------
  function badgeSvg(name, date) {
    let burst = '';
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2, r = i % 2 ? 150 : 162;
      burst += (i ? 'L' : 'M') + (200 + r * Math.cos(a)).toFixed(1) + ',' + (210 + r * Math.sin(a)).toFixed(1);
    }
    const nm = esc(name || 'Bạn');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 470" width="800" height="940">
      <path d="M120,300 L80,450 L130,425 L155,470 L185,330 Z" fill="#c9283a"/>
      <path d="M280,300 L320,450 L270,425 L245,470 L215,330 Z" fill="#c9283a"/>
      <path d="${burst}Z" fill="#ffd166" stroke="#e8a93a" stroke-width="4"/>
      <circle cx="200" cy="210" r="132" fill="#da251d" stroke="#fff3c4" stroke-width="6"/>
      <circle cx="200" cy="210" r="112" fill="none" stroke="#ffd166" stroke-width="2" stroke-dasharray="3 6"/>
      <path d="${star(200, 190, 50, 20)}" fill="#ffde00"/>
      <defs><path id="arc" d="M90,210 A110,110 0 0,1 310,210"/></defs>
      <text font-family="'Baloo 2', Arial, sans-serif" font-weight="800" font-size="25" fill="#fff3c4" letter-spacing="2">
        <textPath href="#arc" startOffset="50%" text-anchor="middle">NGƯỜI VIỆT NAM</textPath></text>
      <text x="200" y="272" text-anchor="middle" font-family="'Baloo 2', Arial, sans-serif" font-weight="800" font-size="58" fill="#ffde00">CHẤT</text>
      <rect x="70" y="318" width="260" height="56" rx="16" fill="#fff3c4" stroke="#e8a93a" stroke-width="3"/>
      <text x="200" y="344" text-anchor="middle" font-family="'Baloo 2', Arial, sans-serif" font-weight="800" font-size="${nm.length > 18 ? 18 : 24}" fill="#8a1c24">${nm}</text>
      <text x="200" y="364" text-anchor="middle" font-family="'Baloo 2', Arial, sans-serif" font-weight="600" font-size="12" fill="#8a5a24">Thắp sáng 34/34 tỉnh thành${date ? ' · ' + esc(date) : ''}</text>
    </svg>`;
  }
  function openBadge(justEarned) {
    const earned = !!state.badge;
    $('#badgeTitle').textContent = earned ? (justEarned ? '🎉 Chúc mừng! Bạn là Người Việt Nam chất!' : '🏅 Người Việt Nam chất') : '🏅 Huy hiệu chưa mở khóa';
    $('#badgeText').textContent = earned
      ? `Bạn đã thắp sáng toàn bộ ${TOTAL} tỉnh thành, từ Lũng Cú đến Mũi Cà Mau, từ Hoàng Sa đến Trường Sa.`
      : `Thắp sáng đủ ${TOTAL} tỉnh thành để nhận huy hiệu. Còn ${TOTAL - state.lit.length} tỉnh thành nữa thôi!`;
    $('#badgeName').value = state.name || '';
    $('#badgeArt').classList.toggle('locked', !earned);
    $('#badgeArt').innerHTML = badgeSvg(earned ? state.name : '???', earned ? state.badge : '');
    $('#badgeForm').hidden = !earned;
    $('#badgeModal').hidden = false;
  }
  $('#badgeBtn').addEventListener('click', () => openBadge(false));
  $('#badgeName').addEventListener('input', (e) => {
    state.name = e.target.value.trim(); persist();
    $('#badgeArt').innerHTML = badgeSvg(state.name, state.badge);
  });
  $('#badgeDl').addEventListener('click', () => {
    const data = badgeSvg(state.name, state.badge);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 800; c.height = 940;
      c.getContext('2d').drawImage(img, 0, 0, 800, 940);
      c.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: 'huy-hieu-nguoi-viet-nam-chat.png' });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
  });

  function confetti() {
    const box = $('#confetti');
    const bits = ['⭐', '🇻🇳', '✨', '🎉', '💛', '🏅', '🌟'];
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('span');
      s.textContent = pick(bits);
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = 2.2 + Math.random() * 2.2 + 's';
      s.style.animationDelay = Math.random() * 0.8 + 's';
      box.appendChild(s);
      setTimeout(() => s.remove(), 6000);
    }
  }

  // ---------- Toast & modal ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
  }
  document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => {
    if (e.target === m || e.target.closest('[data-close]')) m.hidden = true;
  }));

  // ---------- Kho câu hỏi ----------
  const sel = $('#fP');
  [...LIST].sort((a, b) => shortName(a).localeCompare(shortName(b), 'vi')).forEach((p) => {
    const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o);
  });
  function renderList() {
    const term = $('#search').value.trim().toLowerCase();
    const all = custom.map((c) => ({ ...c, mine: true })).reverse()
      .concat(LIST.flatMap((p) => p.qs.map((q) => ({ q, p: p.id }))));
    const list = all.filter((x) => !term || x.q.toLowerCase().includes(term) || BY_ID[x.p].name.toLowerCase().includes(term));
    $('#listCount').textContent = `${list.length} câu · ${custom.length} của bạn`;
    const ul = $('#qList'); ul.innerHTML = '';
    list.forEach((x) => {
      const li = document.createElement('li');
      if (x.mine) li.className = 'mine';
      li.innerHTML = '<div class="qt"><div class="qq"></div><div class="qa"></div></div>';
      li.querySelector('.qq').textContent = x.q;
      li.querySelector('.qa').textContent = '✓ ' + BY_ID[x.p].name;
      if (x.mine) {
        const del = document.createElement('button');
        del.className = 'del'; del.type = 'button'; del.textContent = 'Xóa';
        del.addEventListener('click', () => { custom = custom.filter((c) => c.id !== x.id); save(LS_CUSTOM, custom); renderList(); });
        li.appendChild(del);
      }
      ul.appendChild(li);
    });
  }
  $('#openBank').addEventListener('click', () => { renderList(); $('#bank').hidden = false; });
  $('#search').addEventListener('input', renderList);
  $('#addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#fQ').value.trim();
    if (!q) return;
    custom.push({ id: 'c' + Date.now().toString(36), q, p: sel.value });
    save(LS_CUSTOM, custom);
    $('#fQ').value = '';
    renderList();
    toast(`💖 Đã thêm câu hỏi cho ${BY_ID[sel.value].name}`);
  });
  $('#exportBtn').addEventListener('click', () => {
    const data = custom.map(({ q, p }) => ({ q, p, tinh: BY_ID[p].name }));
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'cau-hoi-thap-sang-viet-nam.json' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const arr = JSON.parse(await f.text());
      const seen = new Set(custom.map((c) => c.q + '|' + c.p));
      let n = 0;
      (Array.isArray(arr) ? arr : []).forEach((x, i) => {
        if (!x || typeof x.q !== 'string' || !x.q.trim() || !BY_ID[x.p] || seen.has(x.q.trim() + '|' + x.p)) return;
        seen.add(x.q.trim() + '|' + x.p);
        custom.push({ id: 'c' + Date.now().toString(36) + i, q: x.q.trim(), p: x.p }); n++;
      });
      save(LS_CUSTOM, custom); renderList();
      toast(n ? `⬆️ Đã nhập ${n} câu hỏi` : 'Không có câu hỏi mới hợp lệ');
    } catch { toast('⚠️ File JSON không hợp lệ'); }
  });
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Tắt đèn toàn bộ bản đồ và chơi lại từ đầu? (Huy hiệu đã nhận và câu hỏi của bạn vẫn được giữ.)')) return;
    const keep = { badge: state.badge, name: state.name, best: state.best };
    state = Object.assign(fresh(), keep);
    persist();
    $('#bank').hidden = true;
    $('#info').innerHTML = '<div class="info-empty"><div class="big">🌙</div><p>Bản đồ lại chìm trong bóng tối.<br />Cùng thắp sáng lại nào!</p></div>';
    nextQuestion();
  });

  // ---------- Bàn phím ----------
  $('#nextBtn').addEventListener('click', nextQuestion);
  document.addEventListener('keydown', (e) => {
    const modalOpen = [...document.querySelectorAll('.modal')].some((m) => !m.hidden);
    if (modalOpen) { if (e.key === 'Escape') document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; }); return; }
    if (e.target.matches('input, textarea, select')) return;
    const n = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
    if (!answered && e.key.length === 1 && n >= 0) { answer(n); return; }
    if (answered && e.key === 'Enter' && document.activeElement !== $('#nextBtn')) { e.preventDefault(); nextQuestion(); }
  });

  // ---------- Khởi động ----------
  drawMap();
  if (state.lit.length) showInfo(state.lit[state.lit.length - 1]);
  nextQuestion();
})();
