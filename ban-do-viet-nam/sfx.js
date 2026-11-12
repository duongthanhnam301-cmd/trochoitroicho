// Hiệu ứng âm thanh tạo bằng Web Audio (không cần file nhạc).
// Dùng: SFX.play('ok' | 'bad' | 'click' | 'whoosh' | 'thud' | 'sparkle' | 'streak' | 'win'), SFX.toggle(), SFX.muted
(() => {
  const KEY = 'sfx_muted';
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch { /* bỏ qua */ }

  function ready() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // Một nốt: tần số f (có thể trượt tới f2), bắt đầu sau `at` giây, dài `dur` giây
  function tone({ f, f2, at = 0, dur = 0.2, vol = 0.2, type = 'sine', attack = 0.01 }) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // Tiếng ồn qua bộ lọc: dùng cho tiếng gió, tiếng va chạm
  function noise({ at = 0, dur = 0.3, vol = 0.2, from = 800, to = 800, q = 1, type = 'bandpass', attack = 0.01 }) {
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(from, t);
    fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  const SOUNDS = {
    click() { tone({ f: 520, f2: 380, dur: 0.06, vol: 0.12, type: 'triangle' }); },
    hover() { tone({ f: 900, dur: 0.03, vol: 0.03 }); },
    ok() {
      tone({ f: 523, dur: 0.14, vol: 0.16, type: 'triangle' });
      tone({ f: 784, at: 0.08, dur: 0.22, vol: 0.16, type: 'triangle' });
      tone({ f: 1568, at: 0.08, dur: 0.3, vol: 0.04 });
    },
    bad() {
      tone({ f: 196, f2: 110, dur: 0.32, vol: 0.2, type: 'sawtooth' });
      tone({ f: 185, f2: 98, dur: 0.32, vol: 0.14, type: 'square' });
      noise({ dur: 0.18, vol: 0.06, from: 400, to: 150, type: 'lowpass' });
    },
    // gạch lao xuống
    whoosh() { noise({ dur: 0.7, vol: 0.22, from: 300, to: 2600, q: 1.4, attack: 0.5 }); },
    // gạch chạm đất
    thud() {
      tone({ f: 130, f2: 36, dur: 0.45, vol: 0.75, attack: 0.004 });
      tone({ f: 62, f2: 30, dur: 0.6, vol: 0.5, attack: 0.004 });
      noise({ dur: 0.22, vol: 0.4, from: 1800, to: 180, type: 'lowpass', attack: 0.003 });
      noise({ at: 0.03, dur: 0.6, vol: 0.07, from: 3500, to: 900, q: 0.6 });
    },
    // tỉnh sáng đèn
    sparkle() {
      [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone({ f, at: i * 0.055, dur: 0.35, vol: 0.09 }));
      noise({ dur: 0.5, vol: 0.03, from: 5000, to: 9000, q: 3 });
      tone({ f: 131, dur: 0.6, vol: 0.14 });
    },
    streak() { [659, 784, 988, 1319].forEach((f, i) => tone({ f, at: i * 0.06, dur: 0.16, vol: 0.12, type: 'triangle' })); },
    win() {
      // hợp âm dâng lên rồi kèn chiến thắng
      [65, 98, 131, 196].forEach((f) => tone({ f, dur: 3.2, vol: 0.16, type: 'sawtooth', attack: 1.2 }));
      noise({ dur: 1.4, vol: 0.12, from: 200, to: 5000, q: 0.8, attack: 1.2 });
      [[392, 1.3], [523, 1.5], [659, 1.7], [784, 1.9]].forEach(([f, at]) => tone({ f, at, dur: 0.3, vol: 0.2, type: 'triangle' }));
      [523, 659, 784, 1047].forEach((f) => tone({ f, at: 2.15, dur: 1.6, vol: 0.14, type: 'triangle' }));
      tone({ f: 110, f2: 40, at: 2.15, dur: 1.2, vol: 0.6, attack: 0.005 });
    },
  };

  window.SFX = {
    get muted() { return muted; },
    play(name) {
      if (muted || !SOUNDS[name]) return;
      try { if (ready()) SOUNDS[name](); } catch { /* trình duyệt chặn âm thanh */ }
    },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* bỏ qua */ }
      return muted;
    },
  };
})();
