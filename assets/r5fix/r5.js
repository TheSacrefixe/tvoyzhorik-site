/* Твій Жорик — круг 5, r5fix3 (site-r5fix3-2411; Олег MSG 11395, скрин iPhone 11394). Свой JS, без библиотек, без внешних запросов.
   Сцена: руки сходятся → касаются (свет) → рука робота плавно встаёт туда, где она была на слайде 2 r3, рука человека уходит →
   ДАЛЬШЕ 1:1 СЛАЙД 2 r3 (pre-r5-2311, asciiSetup/asciiFrame в r2.js; Кэт MSG 11237): та же картинка hand-robot (на телефоне — кисть
   с 44% ширины, 94% экрана, на компьютере — с 18%), та же сетка (клетка 7 px телефон / 10 px компьютер, строка 1,25), тот же набор
   символов и цвет rgb(11,21,32), тот же темп в пикселях прокрутки (фронт от кончика пальца к запястью, частицы у фронта, бегущие
   символы, стекание и гашение) → «Рутина — йому, рішення — вам» (как на слайде 2: на телефоне внизу) → часть того же кода летит и
   собирается в 5 кнопок «Куди далі» → кнопки застывают.
   Против r5fix2 убрано (Олег MSG 11395 «контуры ужасны»): поле кода из картинки двух рук на весь кадр.
   Сохранено из r5fix/r5fix2: свой цикл кадров в try/catch (ошибка → обычные блоки, кнопки видны); кнопки прячет только этот скрипт
   (r5run); сторож раз в 0,7 с; доигрывание начатой фазы; без clip-path/drop-shadow на картинках в кадре (тень рук — заранее
   нарисованный слой); холст не заходит под стеклянную шапку; без mix-blend-mode; WebKit: источник картинки не выходит за край.
   Доля прокрутки p считается в каждом кадре из getBoundingClientRect (не из событий прокрутки). */
(() => {
  'use strict';
  const root = document.documentElement;
  const R5 = window.R5 = { on: root.classList.contains('r5a'), run: false };
  if (!R5.on) return;
  const $ = s => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const bell = (a, m, b, v) => (v <= m ? smooth(a, m, v) : 1 - smooth(m, b, v));
  const rnd = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  let sec, pin, cv, hR, hH, spark, hbox, hands, hcopy, hlead, hcta, copy, go, head, list, btns, lis, fl, glow, bg2, raf = 0, dog = 0;

  /* ---------- сбой: сцена выключается, страница — обычные блоки (как без анимации), кнопки видны ---------- */
  function fail(e) {
    if (R5.failed) return;
    R5.failed = true; R5.on = false; R5.err = String((e && (e.message || e)) || 'r5');
    try { cancelAnimationFrame(raf); clearInterval(dog); } catch (_) {}
    root.classList.remove('r5a', 'r5run');
    try {
      [hR, hH].forEach(im => { if (im) { im.style.transform = ''; im.style.visibility = ''; } });
      [hcopy, hlead, hcta].forEach(el => { if (el) { el.style.opacity = ''; el.style.transform = ''; el.style.visibility = ''; } });
      if (hbox) hbox.style.removeProperty('--hz');
      if (lis) lis.forEach(li => { li.style.opacity = ''; li.style.transform = ''; li.classList.add('in'); });
      if (head) head.classList.add('in'); if (copy) copy.classList.add('in');
      if (cv) cv.width = cv.height = 0;
    } catch (_) {}
    if (window.console) console.warn('r5: сцена выключена —', R5.err);
  }
  R5.fail = fail;

  try {
    sec = $('#hello'); pin = $('.r5pin'); cv = $('#r5cv');
    hR = $('#handRobot'); hH = $('#handHuman'); spark = $('#spark'); hbox = $('.hbox'); hands = $('.hands');
    hcopy = $('.s-hands .copy'); hlead = $('.s-hands .lead'); hcta = $('.s-hands .cta');
    copy = $('#r5copy'); go = $('#r5go'); head = go && go.querySelector('.head'); list = go && go.querySelector('.go-list');
    btns = go ? [...go.querySelectorAll('.go')] : []; lis = btns.map(b => b.closest('li') || b);
    if (!sec || !pin || !cv || !cv.getContext || !hR || !hH || !spark || !hbox || !hcopy || !copy || !head || !list || btns.length !== 5) { fail('нет разметки сцены'); return; }
  } catch (e) { fail(e); return; }

  const q = new URLSearchParams(location.search);
  const FORCE_LOW = q.get('r5n') === 'low';
  const PROF = q.get('r5prof') ? (R5.prof = []) : null;   // замер времени кадра (для проверок)
  const MEM_LOW = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  /* ---------- шкала сцены (доли прокрутки p) ----------
     m1 — рука робота встала на место слайда 2. Дальше время слайда 2 (p2) — те же пиксели прокрутки, что на слайде 2 r3:
     p2 = (p − P0)·KQ, KQ = (длина прокрутки сцены r5) / (длина прокрутки слайда 2: 100vh телефон, 120vh компьютер). P0 — так, что p2 = .04 в m1. */
  const TL = {
    mob:  { touch: .10, d0: .115, m1: .16, cA: .16, cB: .43, head: .44, f0: .40, f1: .62, dur: .13, z0: .62, z1: .70 },
    desk: { touch: .10, d0: .115, m1: .16, cA: .16, cB: 2, head: .50, f0: .40, f1: .62, dur: .14, z0: .62, z1: .70 }
  };
  let T = TL.mob, KQ = 2.6;
  function timeline() {
    const mob = pinW < 820, rng = Math.max(1, sec.offsetHeight - pinH) / Math.max(1, pinH);
    T = mob ? TL.mob : TL.desk; KQ = clamp(rng / (mob ? 1 : 1.2), 1, 6);
    T.P0 = T.m1 - .04 / KQ; T.w1 = T.P0 + .42 / KQ;   // конец фронта слайда 2
  }
  const AUTO = () => [[T.d0, T.w1, 1100], [T.f0, T.z1, 1200]];   // начатая фаза доигрывает сама за N мс

  /* ---------- символы: как на слайде 2 (r3) ---------- */
  const RAMP = ' .:-=+*#%@', SCR = '01<>/\\|_=+*#%@$&?ЖTZ';
  const LABELS = btns.map(b => ((b.querySelector('b') || b).textContent || '').replace(/\s+/g, ' ').trim());
  const GL = [...new Set((RAMP.slice(1) + SCR + '|-+.:' + LABELS.join('').replace(/ /g, '')).split(''))];
  const GI = {}; GL.forEach((c, i) => { GI[c] = i; });
  const SCRI = [...SCR].map(c => GI[c]);
  const SYM = '11,21,32';   // --a-sym слайда 2
  const INK = [`rgb(${SYM})`, 'rgb(255,255,255)'];   // 0 — код (как на слайде 2), 1 — блик кнопок

  const fl0 = document.createElement('div'); fl0.className = 'r5flash'; fl0.setAttribute('aria-hidden', 'true'); hbox.appendChild(fl0); fl = fl0;
  const g0 = document.createElement('div'); g0.className = 'r5glow'; g0.setAttribute('aria-hidden', 'true'); pin.insertBefore(g0, pin.firstChild); glow = g0;
  /* картинка слайда 2 — отдельно, как в r3 (new Image, без srcset): у <img srcset> WebKit отдаёт naturalWidth в CSS-пикселях
     (409 вместо 1560), и вырезка источника по нему уходит мимо — Safari не рисует ничего */
  const S2 = new Image(); S2.decoding = 'async'; S2.src = '/assets/r2/hand-robot-820.webp';
  const b0 = document.createElement('div'); b0.className = 'r5s2bg'; b0.setAttribute('aria-hidden', 'true'); pin.insertBefore(b0, g0.nextSibling); bg2 = b0;

  /* запись стиля только при изменении */
  const memo = new Map();
  function put(el, key, val, fn) { const k = el; let m = memo.get(k); if (!m) memo.set(k, m = {}); if (m[key] === val) return; m[key] = val; fn(val); }
  const css = (el, prop, val) => put(el, prop, val, v => { el.style[prop] = v; });
  const cls = (el, c, on) => put(el, 'c:' + c, on, v => { el.classList.toggle(c, v); });

  /* ---------- поза рук: сходятся до касания (кончики пальцев рендера: робот 1557,638 — человек 1640,606 в кадре 3200×1400) ---------- */
  let hboxW = 0, pinW = 0, pinH = 0, VW = innerWidth;
  function measure() { hboxW = hbox.offsetWidth; pinW = pin.clientWidth; pinH = pin.clientHeight; VW = innerWidth; }
  function pose(p, intro) {
    const mob = VW < 820, k = hboxW / 3200;
    const a = easeIO(smooth(0, T.touch, p));
    const away = (1 - intro) * (1 - smooth(0, .08, p)) * (mob ? .7 : .3) * VW;
    return { rx: -away + a * 41.5 * k, ry: -a * 16 * k, hx: away - a * 41.5 * k, hy: a * 16 * k, z: 1 + a * .06 };
  }
  function applyPose(o, force) {
    const tr = `translate3d(${o.rx.toFixed(1)}px,${o.ry.toFixed(1)}px,0)`, th = `translate3d(${o.hx.toFixed(1)}px,${o.hy.toFixed(1)}px,0)`, z = o.z.toFixed(4);
    if (force) { hR.style.transform = tr; hH.style.transform = th; hbox.style.setProperty('--hz', z); memo.delete(hR); memo.delete(hH); memo.delete(hbox); return; }
    css(hR, 'transform', tr); css(hH, 'transform', th); put(hbox, '--hz', z, v => hbox.style.setProperty('--hz', v));
  }
  const rel = (b, o) => ({ left: b.left - o.left, top: b.top - o.top, right: b.right - o.left, bottom: b.bottom - o.top, width: b.width, height: b.height });

  /* ---------- атлас символов: символ рисуется один раз, дальше — копия картинки (drawImage вместо fillText) ---------- */
  function atlas(cs, d) {
    const fs = Math.round(cs * 1.22), cw = Math.ceil(fs * .64) + 1, ch = Math.ceil(fs * 1.25);   // шрифт — как на слайде 2: cs·1,22
    const a = document.createElement('canvas'); a.width = GL.length * cw * d; a.height = ch * d * INK.length;
    const x = a.getContext('2d'); x.font = `${fs * d}px ui-monospace,Consolas,Menlo,monospace`; x.textBaseline = 'top';
    INK.forEach((col, row) => { x.fillStyle = col; GL.forEach((g, i) => x.fillText(g, i * cw * d, row * ch * d + fs * d * .08)); });
    return { a, cw, ch, d, aw: cw * d, ah: ch * d, oy: fs * .08 };
  }
  let PER = 0;
  function bench(A) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 360; const x = c.getContext('2d');
    const one = n => { for (let i = 0; i < n; i++) { x.globalAlpha = .1 + (i % 9) / 10; x.drawImage(A.a, (i % GL.length) * A.aw, 0, A.aw, A.ah, (i * 37) % 340, (i * 53) % 340, A.cw, A.ch); } x.getImageData(0, 0, 1, 1); };
    one(60); let t0 = performance.now(); one(100); const a = performance.now() - t0; t0 = performance.now(); one(1600); return Math.max(0, (performance.now() - t0) - a) / 1500;
  }

  /* ---------- слайд 2 r3 1:1: место картинки и клетки (asciiSetup) ----------
     Телефон: кисть с 44% ширины картинки, 94% экрана, слева 3%, сверху max(70, 10% высоты). Компьютер: с 18% ширины, ширина как на слайде 2,
     по центру высоты; сторона — справа (зеркально слайду 2: слева у сцены r5 текст «Рутина…»). */
  function s2rect(W, H, mob) {
    const nw = S2.naturalWidth, nh = S2.naturalHeight, sx = Math.floor(nw * (mob ? .44 : .18)), sw = nw - sx;   // источник целиком внутри картинки (WebKit)
    const iw = mob ? W * .94 : Math.min(W * .46, W - Math.min(620, W * .44) - 120, 900), ih = iw * nh / sw;
    const x = mob ? W * .03 : W - W * .02 - iw, y = mob ? Math.max(70, H * .1) : (H - ih) / 2;
    return { x, y, w: iw, h: ih, sx, sw, nw, nh };
  }
  function cells(cs, R, A, rand) {
    const cols = Math.ceil(R.w / cs), rows = Math.ceil(R.h / (cs * 1.25));
    const oc = document.createElement('canvas'); oc.width = cols; oc.height = rows;
    const o = oc.getContext('2d'); o.drawImage(S2, R.sx, 0, R.sw, R.nh, 0, 0, cols, rows);
    const px = o.getImageData(0, 0, cols, rows).data, out = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 4, a = px[k + 3] / 255; if (a < .2) continue;
      const lum = (px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11) / 255;
      const dens = clamp(.38 + (1 - lum) * 1.0);
      const x = R.x + i * cs, y = R.y + j * cs * 1.25;
      out.push({ x, y, ya: y - A.oy, a: a * (.28 + .72 * dens), g: GI[RAMP[Math.max(1, Math.round(dens * (RAMP.length - 1)))]], r1: Math.random(), r2: .12 + Math.random() * .88, f: null });
    }
    out.forEach(e => { e.sh = Math.floor(e.r1 * 97); e.px = e.x + (e.r1 - .5) * 8; e.py = e.y + (e.r2 - .5) * 6; });
    return out;
  }
  /* ---------- цели: контур каждой кнопки + название кодом + редкий «код» внутри ---------- */
  function targets(cs, A, pr, rand) {
    const out = [], step = (pinW < 820 ? 8.5 : 11) * (FORCE_LOW || MEM_LOW || PER > .018 ? 1.25 : 1);
    btns.forEach((b, bi) => {
      const r = rel(b.getBoundingClientRect(), pr), rad = Math.min(parseFloat(getComputedStyle(b).borderTopLeftRadius) || 24, r.height / 2);
      const w = r.width - 2 * rad, h = r.height - 2 * rad, arc = Math.PI * rad / 2, L = 2 * w + 2 * h + 4 * arc, n = Math.max(8, Math.round(L / step));
      const segs = [[w, 'h'], [arc, 'a'], [h, 'v'], [arc, 'a'], [w, 'h'], [arc, 'a'], [h, 'v'], [arc, 'a']];
      for (let i = 0; i < n; i++) {
        let s = i * L / n, k = 0; while (s > segs[k][0] && k < 7) { s -= segs[k][0]; k++; }
        let x, y; const cx0 = r.left + rad, cx1 = r.right - rad, cy0 = r.top + rad, cy1 = r.bottom - rad;
        const ang = (c, a0) => { const t = a0 + (s / rad); return [c[0] + Math.cos(t) * rad, c[1] + Math.sin(t) * rad]; };
        if (k === 0) { x = cx0 + s; y = r.top; } else if (k === 1) [x, y] = ang([cx1, cy0], -Math.PI / 2);
        else if (k === 2) { x = r.right; y = cy0 + s; } else if (k === 3) [x, y] = ang([cx1, cy1], 0);
        else if (k === 4) { x = cx1 - s; y = r.bottom; } else if (k === 5) [x, y] = ang([cx0, cy1], Math.PI / 2);
        else if (k === 6) { x = r.left; y = cy1 - s; } else [x, y] = ang([cx0, cy0], Math.PI);
        const g = segs[k][1] === 'h' ? '-' : segs[k][1] === 'v' ? '|' : '+';
        out.push({ x: x - A.cw / 2, y: y - A.ch / 2, g: GI[g], ta: .95, out: 1, bi });
      }
      const bt = b.querySelector('b');
      if (bt) {
        const br = rel(bt.getBoundingClientRect(), pr), lh = A.ch * 1.15; let lx = br.left, ly = br.top + Math.min(br.height, lh) / 2 - A.ch / 2;
        LABELS[bi].split(' ').forEach(wd => {
          if (lx > br.left && lx + wd.length * A.cw > br.left + Math.max(br.width, A.cw * 8)) { lx = br.left; ly += lh; }
          for (const chr of wd) { if (GI[chr] !== undefined) out.push({ x: lx, y: ly, g: GI[chr], ta: .9, out: 1, bi }); lx += A.cw; }
          lx += A.cw;
        });
      }
      for (let y = r.top + step * 1.2; y < r.bottom - step * 1.2; y += step * 1.3) for (let x = r.left + rad * .7; x < r.right - rad * .7; x += step * 1.1)
        if (rand() < .16) out.push({ x: x - A.cw / 2, y: y - A.ch / 2, g: GI['.:01'[Math.floor(rand() * 4)]], ta: .42, out: 0, bi });
    });
    return out;
  }
  /* тень картинки рук (drop-shadow из CSS) — для слоя тени на холсте */
  function shadowOf(img) {
    const f = getComputedStyle(img).filter || '';
    const m = f.match(/drop-shadow\((rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/);
    return m ? { c: m[1], x: +m[2], y: +m[3], b: +m[4] } : { c: 'rgba(25,40,55,.2)', x: 0, y: 14, b: 16 };
  }

  /* мягкая маска прямоугольника (только тень фигуры): под текстом код приглушается, текст читается */
  function softMask(W, H, rects, blur) {
    const m = document.createElement('canvas'); m.width = Math.max(1, Math.round(W)); m.height = Math.max(1, Math.round(H));
    const x = m.getContext('2d'); x.shadowColor = '#000'; x.shadowBlur = blur; x.shadowOffsetX = 10000; x.fillStyle = '#000';
    rects.forEach(r => { if (r && r.width > 0 && r.height > 0) x.fillRect(r.left - 10000 - 8, r.top - 8, r.width + 16, r.height + 16); });
    return m;
  }

  /* ---------- подготовка: тени рук, клетки слайда 2, полёты в кнопки ---------- */
  let G = null, B = null;
  /* подготовка разбита на шаги по кадрам (yield) — без долгой паузы на слабом телефоне */
  function* build() {
    if (!hR.complete || !hH.complete || !hR.naturalWidth || !hH.naturalWidth || !S2.complete || !S2.naturalWidth) return null;
    measure(); timeline();
    const W = pinW, H = pinH; if (!W || !H) return null;
    const mob = W < 820;
    if (!PER) { const A0 = atlas(mob ? 6 : 9, 1); PER = bench(A0); yield; PER = Math.min(PER, bench(A0)); yield; }   // два замера, берём лучший (шум)
    const tb = $('#top'), TOP = tb ? Math.round(clamp(tb.offsetTop + tb.offsetHeight, 0, Math.min(160, H * .2))) : 0;   // холст не заходит под стеклянную шапку
    const low = FORCE_LOW || MEM_LOW || PER > .03;
    let d = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
    while (W * H * d * d > 4.2e6 && d > 1) d = Math.max(1, d - .25);   // лимит площади холста iOS — с запасом
    applyPose(pose(1, 1), true);   // геометрия в момент касания
    const pr = pin.getBoundingClientRect();
    const rr = rel(hR.getBoundingClientRect(), pr), rh = rel(hH.getBoundingClientRect(), pr);
    const z = 1.06, shR = shadowOf(hR), shH = shadowOf(hH);
    applyPose(pose(pS, introAt ? easeIO(clamp((performance.now() - introAt) / 1900)) : 0), true);
    // клетка — как на слайде 2 r3: 7 px телефон, 10 px компьютер; очень слабое устройство — крупнее
    const cs = (mob ? 7 : 10) * (low ? 1.25 : 1);
    const R = s2rect(W, H, mob), A = atlas(cs, d);
    const src = cells(cs, R, A), tg = targets(cs, A, pr, rnd(11));
    yield;
    // тени рук в позе касания — заранее, один раз (в кадре без drop-shadow): только тень, сама картинка рисуется отдельно
    const mkc = () => { const c = document.createElement('canvas'); c.width = Math.round(W * d); c.height = Math.round(H * d); const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return [c, x]; };
    const shade = (img, r, sh) => { const [c, x] = mkc(); x.shadowColor = sh.c; x.shadowOffsetX = (sh.x * z + 10000) * d; x.shadowOffsetY = sh.y * z * d; x.shadowBlur = sh.b * z * d;
      x.drawImage(img, r.left - 10000, r.top, r.width, r.height); return c; };
    const SR = shade(hR, rr, shR); yield;
    const SH = shade(hH, rh, shH); yield;
    // кто летит в кнопки: до взлёта весь код ведёт себя ровно как на слайде 2 (стекает и гаснет); взлетает символ, который к своему
    // моменту взлёта ещё не стёк (сверху вниз → верхние кнопки); где таких нет — копия проявляется на месте кода
    const rand = rnd(23), meltAt = st => clamp(((st - T.P0) * KQ - .36) / .52);
    if (!src.length) throw new Error('нет клеток картинки слайда 2');
    const ord = src.map((e, i) => i).sort((a, b) => src[a].y - src[b].y || src[a].x - src[b].x);
    tg.sort((a, b) => a.y - b.y || a.x - b.x);
    const used = new Uint8Array(src.length), F = [];
    tg.forEach((t, k) => {
      const u = clamp(.55 * t.bi / 4 + .45 * rand()), st = T.f0 + u * (T.f1 - T.f0 - T.dur), ms = meltAt(st);
      const j0 = Math.floor(k * ord.length / tg.length); let si = -1;
      for (let q = 0; q < ord.length && si < 0; q++) { const j = ord[(j0 + q) % ord.length]; if (!used[j] && src[j].r2 > ms + .05 && rand() < .5) si = j; }
      const clone = si < 0 ? 1 : 0; if (clone) si = ord[j0]; else used[si] = 1;
      const s = src[si];
      // откуда взлетает: состояние символа слайда 2 в момент взлёта (сдвиг стекания и гашение)
      const y0 = s.ya + (clone ? 0 : smooth(s.r2 - .25, s.r2, ms) * cs * 5), a0 = clone ? s.a : s.a * (1 - smooth(s.r2 - .18, s.r2, ms));
      const dx = t.x - s.x, dy = t.y - y0, len = Math.hypot(dx, dy) || 1, off = (rand() - .5) * len * .55;
      const f = { s, clone, x0: s.x, y0, a0, tx: t.x, ty: t.y, tg: t.g, ta: t.ta, out: t.out,
        cx: (s.x + t.x) / 2 - dy / len * off, cy: (y0 + t.y) / 2 + dx / len * off - len * .08, st };
      if (!clone) s.f = f;
      F.push(f);
    });
    yield;
    // кэш (цена кадра): неподвижные символы — заранее нарисованные слои по времени капли (r2), рамка — только рамка картинки.
    // По одному символу рисуются только полоса у фронта, стекающие сейчас и летящие в кнопки.
    const BB = { x: R.x - 2, y: R.y - A.oy - 2, w: R.w + A.cw + 4, h: R.h + A.ch + 4 };
    const mkl = () => { const c = document.createElement('canvas'); c.width = Math.ceil(BB.w * d); c.height = Math.ceil(BB.h * d); const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, -BB.x * d, -BB.y * d); return [c, x]; };
    const put1 = (x, e) => { x.globalAlpha = e.a; x.drawImage(A.a, e.g * A.aw, 0, A.aw, A.ah, e.x, e.ya, A.cw, A.ch); };
    const K = 10, LY = [];
    for (let k = 0; k < K; k++) { const [c, x] = mkl(); LY.push({ c, x, lo: .12 + k * .88 / K, cells: [], hasF: false, st: false }); }
    src.forEach(e => { const L = LY[Math.min(K - 1, Math.floor((e.r2 - .12) / .88 * K))]; L.cells.push(e); if (e.f) L.hasF = true; put1(L.x, e); });
    const [CP, cpx] = mkl();   // сводный слой неподвижных: пересобирается, только когда меняется состав (≈10 раз за сцену)
    const SX = src.slice().sort((a, b) => a.x - b.x), XS = new Float32Array(SX.map(e => e.x));
    yield;
    const rc = rel(copy.getBoundingClientRect(), pr), rhd = rel(head.getBoundingClientRect(), pr);
    const MC = softMask(W, H, [rc], 26), MH = softMask(W, H, [rhd], 22);
    // маска нужна, только если текст заходит на код (на телефоне «Рутина…» внизу, рука вверху — не заходит)
    const hit = (q, m) => q.left - m < R.x + R.w + 20 && q.right + m > R.x - 30 && q.top - m < R.y + R.h + 60 && q.bottom + m > R.y - 20;
    const MCon = hit(rc, 40);
    const box = (q, m) => ({ x: q.left - m, y: q.top - m, w: q.width + 2 * m, h: q.height + 2 * m });
    const MCb = box(rc, 40), MHb = box(rhd, 36);
    cv.width = Math.round(W * d); cv.height = Math.round((H - TOP) * d);
    cv.style.top = TOP + 'px'; cv.style.bottom = 'auto'; cv.style.height = (H - TOP) + 'px';
    glow.style.clipPath = glow.style.webkitClipPath = `inset(${Math.round(H * .12 + TOP)}px 0 0 0)`;
    const ctx = cv.getContext('2d');
    // куда встаёт рука робота: вся картинка так, чтобы её часть с sx оказалась в рамке слайда 2
    const kx = R.w / R.sw, RF = { x: R.x - R.sx * kx, y: R.y, w: R.nw * kx, h: R.nh * (R.h / R.nh) };
    R5.info = { mode: 'slide2', cs: +cs.toFixed(2), src: src.length, tg: tg.length, fly: F.length, flysrc: F.filter(f => !f.clone).length,
      per: +PER.toFixed(4), low, d, W, H, TOP, KQ: +KQ.toFixed(3), P0: +T.P0.toFixed(4), w1: +T.w1.toFixed(4), R: { x: Math.round(R.x), y: Math.round(R.y), w: Math.round(R.w), h: Math.round(R.h) } };
    return { W, H, TOP, d, mob, ctx, A, src, F, R, RF, rr, rh, SR, SH, cs, MC, MH, BB, LY, CP, cpx, cpKey: '', SX, XS, MCon, MCb, MHb, blank: true, key: '' };
  }
  function lower(arr, v) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; }

  /* ---------- кадр холста ---------- */
  function draw(p, now) {
    const c = G.ctx, A = G.A, a = A.a, aw = A.aw, ah = A.ah, W = G.W, H = G.H, TOP = G.TOP, R = G.R;
    if (p < T.d0 || p > T.z1 + .01) { if (!G.blank) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); G.blank = true; G.key = ''; } return; }
    const t14 = now / 1000 * 14, tick = Math.floor(t14);
    const p2 = (p - T.P0) * KQ;
    const dimC = !G.MCon ? 0 : G.mob ? smooth(T.cA, T.cA + .03, p) * (1 - smooth(T.cB, T.cB + .04, p)) : smooth(T.cA, T.cA + .03, p);
    const dimH = smooth(T.head - .01, T.head + .03, p);
    const key = (p < T.m1 ? 'm' : tick) + '|' + p.toFixed(4) + '|' + dimC.toFixed(3) + '|' + dimH.toFixed(3);
    if (key === G.key) return; G.key = key;
    G.blank = false;
    c.setTransform(G.d, 0, 0, G.d, 0, -TOP * G.d); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    const part = p >= T.m1 + .004 && G.wasPart && p < T.f0 - .001;   // до полёта всё нарисованное — в рамке картинки (+ стекание вниз до 5 клеток)
    if (part) { const B = G.BB; c.clearRect(B.x - 8, B.y - 8, B.w + 16, B.h + G.cs * 6 + 16); } else c.clearRect(0, TOP, W, H - TOP);
    G.wasPart = p >= T.m1 + .004 && p < T.f0 - .001;
    const dim = () => {
      if (dimC < .01 && dimH < .01) return;
      c.globalCompositeOperation = 'destination-out';
      const m1 = (M, b, al) => { c.globalAlpha = al; const k = M.width / W; c.drawImage(M, b.x * k, b.y * k, b.w * k, b.h * k, b.x, b.y, b.w, b.h); };   // только вокруг текста
      if (dimC >= .01) m1(G.MC, G.MCb, dimC * .86);
      if (dimH >= .01) m1(G.MH, G.MHb, dimH * .8);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    };
    // 1) после касания: рука робота встаёт в рамку слайда 2, рука человека уходит вправо и гаснет
    if (p < T.m1) {
      const e = easeIO(smooth(T.d0, T.m1, p)), rr = G.rr, rh = G.rh, F = G.RF;
      const x = rr.left + (F.x - rr.left) * e, y = rr.top + (F.y - rr.top) * e, w = rr.width + (F.w - rr.width) * e, h = rr.height + (F.h - rr.height) * e, s = w / rr.width;
      const hx = e * W * .55, ha = 1 - smooth(0, .8, e);
      // тени (заранее нарисованные слои) — тем же переносом, гаснут к рамке слайда 2 (там тени нет)
      if (ha > .01) { c.globalAlpha = ha; c.drawImage(G.SH, hx, 0, W, H); }
      c.globalAlpha = 1 - e; c.setTransform(G.d * s, 0, 0, G.d * s, G.d * (x - rr.left * s), G.d * (y - rr.top * s) - TOP * G.d); c.drawImage(G.SR, 0, 0, W, H);
      c.setTransform(G.d, 0, 0, G.d, 0, -TOP * G.d); c.globalAlpha = 1;
      if (ha > .01) { c.globalAlpha = ha; c.drawImage(hH, rh.left + hx, rh.top, rh.width, rh.height); c.globalAlpha = 1; }
      c.save(); c.beginPath(); c.rect(R.x * e - 2, 0, W, H); c.clip(); c.drawImage(e < .5 ? hR : S2, x, y, w, h); c.restore();   // целиком, без вырезки источника
      dim(); return;
    }
    // 2) слайд 2 r3, asciiFrame 1:1
    const cs = G.cs, wipe = smooth(.04, .42, p2);
    const front = R.x + R.w - wipe * (R.w + 60);      // рука рассыпается от кончика пальца к запястью
    const melt = clamp((p2 - .36) / .52);
    if (front > R.x) {   // целая часть картинки
      const ia = 1 - smooth(.3, .44, p2);
      if (ia > .002) { c.save(); c.beginPath(); c.rect(R.x - 2, 0, front - R.x + 2, H); c.clip(); c.globalAlpha = ia; c.drawImage(S2, R.sx, 0, R.sw, R.nh, R.x, R.y, R.w, R.h); c.restore(); c.globalAlpha = 1; }
    }
    c.fillStyle = INK[0];
    const cw = A.cw, chh = A.ch, n = SCRI.length, xs = front + 90, BB = G.BB;
    // а) неподвижное (дальше полосы фронта, ещё не стекает, ещё не взлетает) — одним сводным слоем
    const pre = p < T.f0; let mask = '';
    for (const L of G.LY) { L.st = L.cells.length > 0 && melt <= L.lo - .25 && (pre || !L.hasF); mask += L.st ? 1 : 0; }
    if (mask !== G.cpKey) {
      G.cpKey = mask; const x = G.cpx; x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, G.CP.width, G.CP.height); x.restore();
      for (const L of G.LY) if (L.st) x.drawImage(L.c, BB.x, BB.y, BB.w, BB.h);
    }
    if (mask.indexOf('1') >= 0 && xs < BB.x + BB.w) { c.save(); c.beginPath(); c.rect(xs, 0, W - xs, H); c.clip(); c.drawImage(G.CP, BB.x, BB.y, BB.w, BB.h); c.restore(); }
    // б) по одному символу — как asciiFrame слайда 2
    const one = e => {
      const edge = e.x - front;
      if (edge < -e.r1 * 26) return;
      let al = e.a, dy = 0;
      if (e.f && p > e.f.st) return;   // взлетел в кнопку — рисуется ниже
      if (melt > e.r2) return;
      al *= 1 - smooth(e.r2 - .18, e.r2, melt);
      dy = smooth(e.r2 - .25, e.r2, melt) * cs * 5;
      if (edge < 22) { c.globalAlpha = al * .9; c.fillRect(e.px, e.py + dy, 1.6, 1.6); return; }   // фронт: частицы, а не символы
      let g = e.g;
      if (edge < 90 || (melt > e.r2 - .2 && melt > 0)) g = SCRI[Math.floor(t14 + e.sh) % n];
      c.globalAlpha = al; c.drawImage(a, g * aw, 0, aw, ah, e.x, e.ya + dy, cw, chh);
    };
    const SX = G.SX;
    for (let i = lower(G.XS, front - 27); i < SX.length && SX[i].x < xs; i++) one(SX[i]);   // полоса у фронта
    for (const L of G.LY) if (!L.st) for (const e of L.cells) if (e.x >= xs) one(e);   // стекают сейчас или ждут взлёта
    c.globalAlpha = 1; dim();
    // 3) полёт в контуры кнопок, вспышка контура, застывание
    if (p < T.f0) return;
    const fz = smooth(T.z0 + .012, T.z1, p);
    const glint = smooth(T.z0 - .03, T.z0 + .008, p) * (1 - smooth(T.z0 + .025, T.z1, p));
    const F = G.F;
    for (let i = 0; i < F.length; i++) {
      const f = F[i], e = f.s, k = clamp((p - f.st) / T.dur);
      if (k <= 0) continue;
      const t = easeIO(k), m = 1 - t;
      const x = m * m * f.x0 + 2 * m * t * f.cx + t * t * f.tx, y = m * m * f.y0 + 2 * m * t * f.cy + t * t * f.ty;
      const al = (f.a0 + (f.ta - f.a0) * t) * (f.clone ? smooth(0, .35, k) : 1) * (1 - fz);
      if (al < .02) continue;
      const g = k < 1 ? SCRI[Math.floor(t14 + e.sh) % n] : f.tg;
      if (f.out && k >= 1 && glint > 0) {
        c.globalAlpha = al * (1 - glint); c.drawImage(a, g * aw, 0, aw, ah, x, y, cw, chh);
        c.globalAlpha = Math.min(1, al * glint * 1.3); c.drawImage(a, g * aw, ah, aw, ah, x, y, cw, chh);
      } else { c.globalAlpha = al; c.drawImage(a, g * aw, 0, aw, ah, x, y, cw, chh); }
    }
    c.globalAlpha = 1;
  }

  /* ---------- проигрыватель: прокрутка → p; начатая фаза доигрывает сама; при броске — догоняет ---------- */
  let pS = 0, pT = 0, last = 0, snap = true, introAt = 0, lastFrame = 0, bvShown = 0, stuck = 0, inView = true;
  R5.snap = () => { snap = true; };
  function step(now) {
    const r = sec.getBoundingClientRect();
    if (!pinH) measure();
    pT = clamp(-r.top / Math.max(1, r.height - pinH));
    const dt = last ? Math.min(100, now - last) : 16; last = now;
    let goal = pT, auto = 0;
    for (const [a, b, ms] of AUTO()) if (pT > a + .002 && pT < b && pS >= a - .01) { goal = b; auto = (b - a) / ms; break; }
    if (R5.exact) { pS = pT; return r; }   // для проверок: ровно по прокрутке, без доигрывания
    if (snap) { pS = goal === pT ? pT : Math.max(pT, Math.min(goal, pS)); snap = false; }
    const lag = goal - pS;
    let nx = pS + lag * (1 - Math.pow(.8, dt / 16.7));
    if (auto && lag > 0) nx = Math.max(nx, Math.min(goal, pS + auto * dt));
    if (Math.abs(goal - nx) < 2e-4) nx = goal;
    nx = clamp(nx, pT - .06, Math.max(goal, pT) + .06);   // не отставать от прокрутки больше чем на 6%
    pS = nx;
    return r;
  }
  function frame(now) {
    lastFrame = now;
    const r = step(now), p = pS; R5.p = p; R5.pT = pT;
    const vis = r.bottom > -40 && r.top < innerHeight + 40;
    if (!vis) { if (inView && G && !G.blank) { G.ctx.setTransform(1, 0, 0, 1, 0, 0); G.ctx.clearRect(0, 0, cv.width, cv.height); G.blank = true; } inView = false; return; }
    inView = true;
    if (!R5.run) { R5.run = true; root.classList.add('r5run'); }
    if (!introAt && hands && hands.classList.contains('lit')) introAt = now;
    const intro = introAt ? easeIO(clamp((now - introAt) / 1900)) : 0;
    if (!G && introAt) {
      const t0 = performance.now(); if (!B) { B = build(); R5.bms = 0; R5.bsteps = 0; }
      const r1 = B.next(); R5.bms += performance.now() - t0; R5.bsteps++; R5.bmax = Math.max(R5.bmax || 0, performance.now() - t0);
      if (r1.done) { G = r1.value; B = null; if (G) { R5.info.setup_ms = Math.round(R5.bms); R5.info.setup_steps = R5.bsteps; R5.info.setup_max_ms = Math.round(R5.bmax); } }
    }
    const mob = pinW < 820;
    // первый экран: заголовок, подпись и кнопка уходят, руки сходятся
    const cf = 1 - smooth(0, .06, p);
    css(hcopy, 'opacity', cf.toFixed(2)); css(hcopy, 'transform', `translateY(${(-smooth(0, .09, p) * 60).toFixed(0)}px)`);
    css(hlead, 'opacity', (1 - smooth(0, .04, p)).toFixed(2)); if (hcta) { css(hcta, 'opacity', (1 - smooth(0, .04, p)).toFixed(2)); css(hcta, 'visibility', p > .05 ? 'hidden' : ''); }
    const handsOn = !G || p < T.d0;
    css(hR, 'visibility', handsOn ? '' : 'hidden'); css(hH, 'visibility', handsOn ? '' : 'hidden');
    if (handsOn) applyPose(pose(p, Math.max(intro, smooth(0, .06, p))));
    const idle = intro >= 1 ? .75 + .25 * Math.sin(now / 520) : 0;
    put(spark, '--sp', (idle * (1 - smooth(0, .07, p)) * .9 + bell(.07, .105, .18, p) * 1.6).toFixed(2), v => spark.style.setProperty('--sp', v));
    const fv = bell(.085, .11, .19, p);
    css(fl, 'visibility', fv > .004 ? 'visible' : 'hidden');
    if (fv > .004) { css(fl, 'opacity', fv.toFixed(2)); css(fl, 'transform', `scale(${(.3 + smooth(.085, .19, p) * 2.4).toFixed(2)})`); }
    css(glow, 'opacity', (smooth(.09, .28, p) * (1 - .45 * smooth(T.z0, T.z1 + .1, p)) * (1 - .6 * smooth(T.d0, T.m1, p) * (1 - smooth(T.f1 - .04, T.z1, p)))).toFixed(2));
    css(bg2, 'opacity', (smooth(T.d0, T.m1, p) * (1 - smooth(T.f1 - .04, T.z1, p))).toFixed(2));   // фон слайда 2 (полоса #dfe7ed .88)
    if (G) draw(p, now);
    // тексты
    cls(copy, 'in', mob ? p >= T.cA && p < T.cB : p >= T.cA);
    cls(head, 'in', p >= T.head);
    const bv = smooth(T.z0 + .005, T.z0 + .05, p); bvShown = bv;
    lis.forEach((li, i) => {
      const v = clamp(bv * 1.6 - i * .15);
      css(li, 'opacity', v.toFixed(2)); css(li, 'transform', v >= 1 ? '' : `translateY(${((1 - v) * 10).toFixed(1)}px)`);
    });
    cls(list, 'live', bv > .6);
    cls(go, 'lit', p > T.z0 + .055);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    try { const t0 = PROF ? performance.now() : 0; frame(now); if (PROF) PROF.push(+(performance.now() - t0).toFixed(2)); } catch (e) { fail(e); }
  }
  /* сторож: нет кадров (rAF уснул) — рисуем сами; кнопки должны быть видны, а их нет — показываем */
  dog = setInterval(() => {
    if (R5.failed || document.hidden) return;
    try {
      const now = performance.now();
      if (now - lastFrame > 900) frame(now);
      const r = sec.getBoundingClientRect(), raw = clamp(-r.top / Math.max(1, r.height - pinH));
      if (raw >= T.z0 + .06 && bvShown < .99) { if (++stuck >= 2) { pS = Math.max(pS, T.z1); snap = false; frame(performance.now()); } }
      else stuck = 0;
    } catch (e) { fail(e); }
  }, 700);

  /* ---------- размеры: перестройка только если сцена реально поменяла размер (не на сворачивание адресной строки) ---------- */
  function onResize() {
    clearTimeout(R5.rt);
    R5.rt = setTimeout(() => { try { const w = pin.clientWidth, h = pin.clientHeight; measure(); timeline(); if (G && (w !== G.W || h !== G.H)) G = null; B = null; snap = true; } catch (e) { fail(e); } }, 150);
  }
  addEventListener('resize', onResize); addEventListener('orientationchange', onResize);
  if (window.visualViewport) visualViewport.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (G) { G = null; B = null; } }).catch(() => {});   // подписи кнопок — по загруженному шрифту
  addEventListener('pageshow', e => { if (e.persisted) { snap = true; last = 0; } });

  /* ---------- кнопки с клавиатуры и по ссылке #go: сразу к готовым ---------- */
  function jumpEnd() {
    const r = sec.getBoundingClientRect();
    scrollTo(0, Math.round(r.top + scrollY + sec.offsetHeight - pin.clientHeight + 2)); pS = 1; snap = true;
  }
  list.addEventListener('focusin', () => { if (pS < T.z1) jumpEnd(); });
  document.addEventListener('click', e => { const l = e.target.closest && e.target.closest('a[href="#go"]'); if (l) { e.preventDefault(); jumpEnd(); } });
  addEventListener('load', () => { if (location.hash === '#go') jumpEnd(); });

  try { measure(); timeline(); frame(performance.now()); raf = requestAnimationFrame(loop); } catch (e) { fail(e); }
})();
