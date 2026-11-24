/* Твій Жорик — круг 5, r5fix4 (site-r5fix4-2411; Олег MSG 11438–11445: «весь экран рассыпается на код, с него собираются кнопки», 1А 2А 3А).
   Свой JS, без библиотек, без внешних запросов.
   Сцена: руки сходятся по прокрутке, первый экран освобождает место «Рутине…» → касание (свет) → СРАЗУ, ПО ВРЕМЕНИ (не по прокрутке,
   прокрутка не блокируется) ВЕСЬ экран рассыпается в код волной от точки касания: обе руки (символы по яркости картинки, как слайд 2),
   фон (редкое поле символов), «ТВІЙ ЖОРИК», заголовок «Рутина — йому, рішення — вам» и абзацы (символы по реальному положению букв) →
   ВЕСЬ код летит в 5 кнопок «Куди далі» (контуры, названия, остальное впитывается) → кнопки проявляются, код гаснет → на экране только
   шапка с меню и 5 кнопок; текст на экран не возвращается, но остаётся в разметке (visually hidden; h1 на месте).
   Против r5fix3 (скрин iPhone 11438: «подвисает, комок символов стоит»):
   — рассыпание шло по прокрутке: палец остановился — код стоит «комком». Теперь после касания всё идёт по часам, само, ~2,6 с;
   — каждый кадр читал getBoundingClientRect сцены после записи стилей (пересчёт раскладки в кадре) → теперь в кадре читается только scrollY,
     раскладка — один раз при касании и при смене размера окна;
   — замер скорости (1600 drawImage + getImageData с видеокарты), 10 слоёв по размеру руки, clip/маски в кадре → убраны;
   — клетка на телефоне 10 px (было 7) — символов втрое меньше; холст рисуется только ~2,6 с после касания, в остальное время скрыт.
   Страховки (из r5fix): свой цикл кадров в try/catch (ошибка → обычные блоки, кнопки и текст видны); кнопки прячет только этот скрипт
   (r5run); сторож раз в 0,7 с (уснул rAF / сцена зависла дольше 4,5 с / не готова через 1,5 с после касания → сразу готовые кнопки);
   строчка в <head> снимает сцену, если скрипт не запустился за 4 с; ?r5=off, без JS, reduced-motion — обычные блоки. */
/* fix5 (Олег MSG 11504–11505, «квадрат» на iPhone): блок кнопок #r5go виден только с классом r5vis — проявление, финал, Tab;
   строки с нулевой прозрачностью — visibility:hidden; холст после финала освобождается. */
(() => {
  'use strict';
  const root = document.documentElement;
  const R5 = window.R5 = { on: root.classList.contains('r5a'), run: false, state: 'idle' };
  if (!R5.on) return;
  const $ = s => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const bell = (a, m, b, v) => (v <= m ? smooth(a, m, v) : 1 - smooth(m, b, v));
  const rnd = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  let sec, pin, cv, hR, hH, spark, hbox, hands, hcopy, hlead, hcta, cue, copy, lns, go, head, list, btns, lis, fl, glow, raf = 0, dog = 0;

  /* ---------- сбой: сцена выключается, страница — обычные блоки (как без анимации), кнопки и текст видны ---------- */
  function fail(e) {
    if (R5.failed) return;
    R5.failed = true; R5.on = false; R5.err = String((e && (e.message || e)) || 'r5');
    try { cancelAnimationFrame(raf); clearInterval(dog); } catch (_) {}
    root.classList.remove('r5a', 'r5run');
    try {
      [hR, hH, hands].forEach(el => { if (el) { el.style.transform = ''; el.style.visibility = ''; el.style.opacity = ''; el.style.transformOrigin = ''; } });
      [hcopy, hlead, hcta].forEach(el => { if (el) { el.style.opacity = ''; el.style.transform = ''; el.style.visibility = ''; } });
      if (hbox) hbox.style.removeProperty('--hz');
      if (lns) lns.forEach(el => { el.style.opacity = ''; });
      if (pin) pin.classList.remove('dz');
      if (copy) { copy.classList.remove('r5gone'); copy.classList.add('in'); }
      if (lis) lis.forEach(li => { li.style.opacity = ''; li.style.transform = ''; li.classList.add('in'); });
      if (head) head.classList.add('in');
      if (cv) { cv.classList.remove('on'); cv.width = cv.height = 0; }
    } catch (_) {}
    if (window.console) console.warn('r5: сцена выключена —', R5.err);
  }
  R5.fail = fail;

  try {
    sec = $('#hello'); pin = $('.r5pin'); cv = $('#r5cv');
    hR = $('#handRobot'); hH = $('#handHuman'); spark = $('#spark'); hbox = $('.hbox'); hands = $('.hands');
    hcopy = $('.s-hands .copy'); hlead = $('.s-hands .lead'); hcta = $('.s-hands .cta'); cue = $('.s-hands .scroll-cue');
    copy = $('#r5copy'); lns = copy ? [...copy.querySelectorAll('.ln')].filter(el => el.tagName !== 'IMG') : [];
    go = $('#r5go'); head = go && go.querySelector('.head'); list = go && go.querySelector('.go-list');
    btns = go ? [...go.querySelectorAll('.go')] : []; lis = btns.map(b => b.closest('li') || b);
    if (!sec || !pin || !cv || !cv.getContext || !hR || !hH || !spark || !hbox || !hands || !hcopy || !copy || !lns.length || !head || !list || btns.length !== 5) { fail('нет разметки сцены'); return; }
  } catch (e) { fail(e); return; }

  const q = new URLSearchParams(location.search);
  const FORCE_LOW = q.get('r5n') === 'low';
  const PROF = q.get('r5prof') ? (R5.prof = []) : null;   // замер времени кадра (для проверок)
  const MEM_LOW = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  /* ---------- шкала: прокрутка (u — в высотах экрана от начала сцены) и часы после касания (мс) ----------
     UT — касание. После касания всё по часам: D0..D1 — волна рассыпания, F0..F1 — взлёты в кнопки (полёт DU), B0 — кнопки проявляются,
     Z0..Z1 — код гаснет, END — сцена готова. Бросок прокрутки далеко за касание — те же шаги вдвое быстрее (кнопки ≤1,5 с). */
  const UT = .30, TM = { FL: 520, D0: 340, D1: 1000, F0: 1000, F1: 1640, DU: 640, G0: 2120, B0: 2080, BS: 60, BR: 300, Z0: 2360, Z1: 2760, END: 2800 };
  const CODE_RGB = '11,21,32';   // цвет кода слайда 2
  const RAMP = ' .:-=+*#%@', SCR = '01<>/\\|_=+*#%@$&?ЖTZ', BGR = '.:-=+';
  const LABELS = btns.map(b => ((b.querySelector('b') || b).textContent || '').replace(/\s+/g, ' ').trim());
  const TXT = lns.map(el => el.textContent || '').join('');
  const GL = [...new Set((RAMP.slice(1) + SCR + BGR + '|-+.:01' + LABELS.join('') + TXT + TXT.toUpperCase()).replace(/\s/g, '').split(''))];
  const GI = {}; GL.forEach((c, i) => { GI[c] = i; });
  const SCRI = [...SCR].map(c => GI[c]);

  const fl0 = document.createElement('div'); fl0.className = 'r5flash'; fl0.setAttribute('aria-hidden', 'true'); hbox.appendChild(fl0); fl = fl0;
  const g0 = document.createElement('div'); g0.className = 'r5glow'; g0.setAttribute('aria-hidden', 'true'); pin.insertBefore(g0, pin.firstChild); glow = g0;

  /* запись стиля только при изменении */
  const memo = new Map();
  function put(el, key, val, fn) { let m = memo.get(el); if (!m) memo.set(el, m = {}); if (m[key] === val) return; m[key] = val; fn(val); }
  const css = (el, prop, val) => put(el, prop, val, v => { el.style[prop] = v; });
  const cls = (el, c, on) => put(el, 'c:' + c, on, v => { el.classList.toggle(c, v); });

  /* ---------- раскладка: читается ТОЛЬКО здесь (загрузка, смена размера) и один раз при касании — не в каждом кадре ---------- */
  const L = { ok: false };
  function measure() {
    const W = pin.clientWidth, H = pin.clientHeight, mob = W < 820;
    const tb = $('#top'), TOP = tb ? Math.round(clamp(tb.offsetTop + tb.offsetHeight, 0, Math.min(160, H * .2))) : 0;
    const secTop = sec.getBoundingClientRect().top + scrollY;
    const Hb = hbox.offsetHeight, fy0 = hbox.offsetTop + Hb * .4443;   // точка касания без сдвига (CSS --fy)
    // место рук рядом с «Рутиной»: телефон — над текстом, компьютер — под ним. Руки от точки касания: вверх ~5%, вниз ~39% высоты hbox
    const cTop = copy.offsetTop, cBot = cTop + copy.offsetHeight;
    const lo = mob ? TOP + 14 : Math.min(H * .62, cBot + 18), hi = mob ? Math.max(TOP + 120, cTop - 10) : H - 10;
    const s = clamp((hi - lo) / (.44 * Hb), .45, 1), fy = lo + .05 * Hb * s + Math.max(0, (hi - lo) - .44 * Hb * s) * .45;
    Object.assign(L, { ok: true, W, H, mob, TOP, secTop, secH: sec.offsetHeight, VH: innerHeight, VW: innerWidth, Hb, hbW: hbox.offsetWidth, fy0, hs: s, hdy: fy - fy0 });
    hands.style.transformOrigin = `50% ${fy0.toFixed(1)}px`;
  }

  /* ---------- поза рук: сходятся до касания (кончики пальцев рендера: робот 1557,638 — человек 1640,606 в кадре 3200×1400) ---------- */
  function pose(a, intro, u) {
    const k = L.hbW / 3200, away = (1 - intro) * (1 - smooth(0, .2, u)) * (L.mob ? .7 : .3) * L.VW;
    return { rx: -away + a * 41.5 * k, ry: -a * 16 * k, hx: away - a * 41.5 * k, hy: a * 16 * k, z: 1 + a * .06 };
  }
  function applyPose(o) {
    css(hR, 'transform', `translate3d(${o.rx.toFixed(1)}px,${o.ry.toFixed(1)}px,0)`);
    css(hH, 'transform', `translate3d(${o.hx.toFixed(1)}px,${o.hy.toFixed(1)}px,0)`);
    put(hbox, '--hz', o.z.toFixed(4), v => hbox.style.setProperty('--hz', v));
  }
  function placeHands(k) {   // руки уходят туда, где не мешают «Рутине»
    const s = 1 + (L.hs - 1) * k, dy = L.hdy * k;
    css(hands, 'transform', `translate3d(0,${dy.toFixed(1)}px,0) scale(${s.toFixed(4)})`);
  }

  /* ---------- атлас символов: символ рисуется один раз в разрешении холста, дальше — копия 1:1 (без пересэмплинга) ---------- */
  function atlas(cs, d) {
    const SC = 1, fs = Math.round(cs * 1.22), cw = Math.ceil(fs * .64) + 1, ch = Math.ceil(fs * 1.25);
    const r = d * SC, a = document.createElement('canvas'); a.width = Math.ceil(GL.length * cw * r); a.height = Math.ceil(ch * r) * 2;
    const x = a.getContext('2d'); x.font = `${fs * r}px ui-monospace,Consolas,Menlo,monospace`; x.textBaseline = 'top';
    ['rgb(' + CODE_RGB + ')', 'rgb(255,255,255)'].forEach((col, row) => { x.fillStyle = col; GL.forEach((g, i) => x.fillText(g, i * cw * r, row * Math.ceil(ch * r) + fs * r * .08)); });
    return { a, cw, ch, fs, aw: cw * r, ah: Math.ceil(ch * r), oy: fs * .08 };
  }
  let AT = null;
  const atlasFor = (cs, d) => { const k = cs + '|' + d; if (!AT || AT.k !== k) { AT = atlas(cs, d); AT.k = k; } return AT; };
  function cellOf(W, H) { const low = FORCE_LOW || MEM_LOW, cs = (W < 820 ? 10 : 12) * (low ? 1.25 : 1); let d = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
    while (W * H * d * d > 3.6e6 && d > 1) d = Math.max(1, d - .25); return { cs, d, low }; }   // лимит площади холста iOS — с запасом
  /* пиксели картинки руки — один раз, заранее (вне кадров): при касании символы берутся из готового массива */
  const PIX = new Map();
  function pixOf(im) {
    if (PIX.has(im)) return PIX.get(im);
    if (!(im.complete && im.naturalWidth)) return null;
    const w = Math.min(480, Math.max(64, Math.round(im.clientWidth || 480))), h = Math.max(16, Math.round(w * (im.naturalHeight / im.naturalWidth)));
    const [c, x] = rd2(w, h); x.drawImage(im, 0, 0, w, h);   // целиком, без вырезки источника (WebKit + srcset)
    const P = { w, h, data: x.getImageData(0, 0, w, h).data }; PIX.set(im, P); return P;
  }
  /* символы текста — относительно прямоугольника строки (сдвиг выезда сокращается); кэш по размеру окна */
  const TXC = new Map();
  function textCells(i, cs, A) {
    const key = i + '|' + cs + '|' + L.W + '|' + L.H; if (TXC.has(key)) return TXC.get(key);
    const el = lns[i], cs0 = getComputedStyle(el), rowH = cs * 1.25, b0 = el.getBoundingClientRect();
    const fsz = parseFloat(cs0.fontSize) || 16, up = cs0.textTransform === 'uppercase', chars = [];
    const rg = document.createRange(), tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const s = n.nodeValue;
      for (let j = 0; j < s.length; j++) {
        const c = s[j]; if (/\s/.test(c)) continue;
        rg.setStart(n, j); rg.setEnd(n, j + 1); const b = rg.getBoundingClientRect(); if (!b.width) continue;
        chars.push({ c: up ? c.toUpperCase() : c, x: b.left - b0.left, y: b.top - b0.top, w: b.width, h: b.height });
      }
    }
    const out = [];
    if (fsz <= cs * 2.2) {   // мелкий текст: каждая буква — своим символом на своём месте
      const k = clamp(fsz / A.fs, .8, 1.5);
      chars.forEach(ch => { if (GI[ch.c] !== undefined) out.push({ dx: ch.x + (ch.w - A.cw * k) / 2, dy: ch.y + (ch.h - A.ch * k) / 2, g: GI[ch.c], a: .88, k }); });
    } else {   // крупный заголовок: буквы рисуются в скрытый холст, символы — по их форме
      const w = Math.ceil(b0.width) + 2, h = Math.ceil(b0.height) + 2, [c, x] = rd2(w, h);
      x.font = `${cs0.fontStyle} ${cs0.fontWeight} ${fsz}px ${cs0.fontFamily}`; x.textBaseline = 'middle'; x.fillStyle = '#000';
      chars.forEach(ch => x.fillText(ch.c, ch.x, ch.y + ch.h / 2));
      const px = x.getImageData(0, 0, c.width, c.height).data, cols = Math.ceil(w / cs), rows = Math.ceil(h / rowH);
      for (let j = 0; j < rows; j++) for (let i2 = 0; i2 < cols; i2++) {
        let cov = 0, nn = 0;
        for (let yy = Math.floor(j * rowH); yy < Math.min(h, (j + 1) * rowH); yy += 2) for (let xx = i2 * cs; xx < Math.min(w, (i2 + 1) * cs); xx += 2) { cov += px[(yy * c.width + xx) * 4 + 3]; nn++; }
        cov = nn ? cov / nn / 255 : 0; if (cov < .1) continue;
        const dens = clamp(.35 + cov * 1.6);
        out.push({ dx: i2 * cs, dy: j * rowH, g: GI[RAMP[Math.max(2, Math.round(dens * (RAMP.length - 1)))]], a: .55 + .45 * dens, k: 1 });
      }
    }
    TXC.set(key, out); return out;
  }
  let aheadT = 0;
  function textAhead() {   // до касания, вне кадров: по строке за тик
    clearTimeout(aheadT);
    const step = i => { aheadT = setTimeout(() => { try { if (R5.state !== 'idle' || !L.ok) return; const c = cellOf(L.W, L.H); textCells(i, c.cs, atlasFor(c.cs, c.d)); if (i + 1 < lns.length) step(i + 1); } catch (_) {} }, i ? 30 : 800); };
    step(0);
  }
  const rd2 = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return [c, c.getContext('2d', { willReadFrequently: true })]; };

  /* ---------- подготовка при касании: разбита на шаги по кадрам (yield), раскладка читается только в шаге 1 ---------- */
  let G = null, B = null;
  function* build() {
    const W = L.W, H = L.H, mob = L.mob, TOP = L.TOP, pr = pin.getBoundingClientRect();
    const rel = b => ({ left: b.left - pr.left, top: b.top - pr.top, right: b.right - pr.left, bottom: b.bottom - pr.top, width: b.width, height: b.height });
    // --- шаг 1: всё чтение раскладки — подряд, без записей между ними ---
    const sp = rel(spark.getBoundingClientRect()), O = { x: sp.left + sp.width / 2, y: sp.top + sp.height / 2 };   // точка касания — центр волны
    const imgs = [hR, hH].map(im => ({ im, r: rel(im.getBoundingClientRect()), ok: im.complete && im.naturalWidth > 0 }));
    const texts = lns.map(el => {
      const cs0 = getComputedStyle(el), m = /matrix\(([^)]+)\)/.exec(cs0.transform || ''), ty = m ? +m[1].split(',')[5] || 0 : 0;   // строка ещё выезжает — без сдвига
      const r = rel(el.getBoundingClientRect()); r.top -= ty; r.bottom -= ty;
      return { el, r, op0: clamp(parseFloat(cs0.opacity)) };
    });
    const bt = btns.map(b => ({ r: rel(b.getBoundingClientRect()), rad: parseFloat(getComputedStyle(b).borderTopLeftRadius) || 24, lb: (b.querySelector('b') && rel(b.querySelector('b').getBoundingClientRect())) || null }));
    yield;
    // --- шаг 2: клетка, атлас ---
    const { cs, d, low } = cellOf(W, H), rowH = cs * 1.25;
    const A = atlasFor(cs, d), rand = rnd(7);
    const S = [];   // все символы экрана: x,y — левый верх, g — символ, a — яркость, k — масштаб (буквы текста крупнее), t — когда рассыпается
    const dist = (x, y) => Math.hypot(x - O.x, y - O.y);
    yield;
    // --- шаг 3: руки — символы по яркости картинки (как слайд 2: плотность .38 + (1 − яркость), набор ` .:-=+*#%@`) ---
    for (const { im, r, ok } of imgs) {
      if (!ok || r.width < 4) continue;
      const x0 = Math.max(0, r.left), x1 = Math.min(W, r.right), y0 = Math.max(TOP, r.top), y1 = Math.min(H, r.bottom);
      if (x1 - x0 < cs || y1 - y0 < rowH) continue;
      const cols = Math.floor((x1 - x0) / cs), rows = Math.floor((y1 - y0) / rowH), SS = 3;   // 3×3 замера на клетку
      const P = pixOf(im); if (!P) continue;
      const px = P.data, sx = P.w / r.width, sy = P.h / r.height;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        let al = 0, lum = 0;
        for (let v = 0; v < SS; v++) for (let w = 0; w < SS; w++) {
          const ix = Math.floor((x0 + (i + (w + .5) / SS) * cs - r.left) * sx), iy = Math.floor((y0 + (j + (v + .5) / SS) * rowH - r.top) * sy);
          if (ix < 0 || iy < 0 || ix >= P.w || iy >= P.h) continue;
          const k = (iy * P.w + ix) * 4, a = px[k + 3]; al += a; lum += (px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11) * a; }
        if (al < SS * SS * 255 * .22 || !al) continue;
        lum = lum / al / 255; al = al / (SS * SS * 255);
        const dens = clamp(.38 + (1 - lum));
        const X = x0 + i * cs, Y = y0 + j * rowH;
        S.push({ x: X, y: Y, g: GI[RAMP[Math.max(1, Math.round(dens * (RAMP.length - 1)))]], a: al * (.28 + .72 * dens), k: 1, src: 'h' });
      }
    }
    yield;
    // --- шаг 4: текст — символы по реальному положению букв (обычно посчитаны заранее, до касания; иначе — по строке за кадр) ---
    for (let i = 0; i < texts.length; i++) {
      const T = texts[i], C = textCells(i, cs, A);
      const a = Math.max(.5, T.op0);
      C.forEach(q => S.push({ x: T.r.left + q.dx, y: T.r.top + q.dy, g: q.g, a: q.a * a, k: q.k, src: 't' }));
      if (!TXC.has(i + '|' + cs + '|' + L.W + '|' + L.H)) yield;
    }
    yield;
    // --- шаг 5: фон — редкое поле символов на весь экран (под шапкой), гаснет вместе со светом ---
    const GW = Math.ceil(W / cs) + 2, occ = new Uint8Array(GW * (Math.ceil(H / rowH) + 2)), oi = (x, y) => clamp(Math.round(y / rowH), 0, 1e6) * GW + clamp(Math.round(x / cs), 0, GW - 1);
    S.forEach(e => { occ[oi(e.x, e.y)] = 1; });
    const bgP = (mob ? .14 : .12) * (low ? .7 : 1);
    for (let y = TOP + rowH * .5; y < H - rowH * .5; y += rowH) for (let x = cs * .5; x < W - cs; x += cs) {
      if (rand() > bgP || occ[oi(x, y)]) continue;
      S.push({ x, y, g: GI[BGR[Math.floor(rand() * BGR.length)]], a: .14 + rand() * .2, k: 1, src: 'b' });
    }
    // волна: момент рассыпания — по расстоянию от точки касания; хвост — капля, дрожь
    const Rmax = Math.max(dist(0, TOP), dist(W, TOP), dist(0, H), dist(W, H)) || 1;
    S.forEach(e => { e.t = TM.D0 + (TM.D1 - TM.D0 - 160) * Math.pow(dist(e.x, e.y) / Rmax, .9) + rand() * 120; e.sh = Math.floor(rand() * 97);
      const ang = Math.atan2(e.y - O.y, e.x - O.x); e.vx = Math.cos(ang) * (6 + rand() * 14); e.vy = Math.sin(ang) * (6 + rand() * 14) + 8; });
    // когда гасить каждую DOM-часть: по ближней и дальней точке от касания (гаснет вместе с волной)
    const span = r => { const nx = clamp(O.x, r.left, r.right), ny = clamp(O.y, r.top, r.bottom);
      const far = Math.max(dist(r.left, r.top), dist(r.right, r.top), dist(r.left, r.bottom), dist(r.right, r.bottom));
      const tt = v => TM.D0 + (TM.D1 - TM.D0 - 160) * Math.pow(v / Rmax, .9); return [tt(dist(nx, ny)), tt(far) + 160]; };
    const DOMF = texts.map(T => ({ el: T.el, sp: span(T.r), op: T.op0 })).concat(imgs.map(o => ({ el: o.im, sp: span(o.r), op: 1 })));
    yield;
    // --- шаг 6: цели — контур каждой кнопки, её название кодом, редкий «код» внутри; остальной код впитывается в кнопки ---
    const tg = [], step = mob ? 8.5 : 10;
    bt.forEach(({ r, rad: rad0, lb }, bi) => {
      const rad = Math.min(rad0, r.height / 2), w = r.width - 2 * rad, h = r.height - 2 * rad, arc = Math.PI * rad / 2, Lp = 2 * w + 2 * h + 4 * arc, n = Math.max(8, Math.round(Lp / step));
      const segs = [[w, 'h'], [arc, 'a'], [h, 'v'], [arc, 'a'], [w, 'h'], [arc, 'a'], [h, 'v'], [arc, 'a']];
      for (let i = 0; i < n; i++) {
        let s = i * Lp / n, k = 0; while (s > segs[k][0] && k < 7) { s -= segs[k][0]; k++; }
        let x, y; const cx0 = r.left + rad, cx1 = r.right - rad, cy0 = r.top + rad, cy1 = r.bottom - rad;
        const ang = (c, a0) => { const t = a0 + (s / rad); return [c[0] + Math.cos(t) * rad, c[1] + Math.sin(t) * rad]; };
        if (k === 0) { x = cx0 + s; y = r.top; } else if (k === 1) [x, y] = ang([cx1, cy0], -Math.PI / 2);
        else if (k === 2) { x = r.right; y = cy0 + s; } else if (k === 3) [x, y] = ang([cx1, cy1], 0);
        else if (k === 4) { x = cx1 - s; y = r.bottom; } else if (k === 5) [x, y] = ang([cx0, cy1], Math.PI / 2);
        else if (k === 6) { x = r.left; y = cy1 - s; } else [x, y] = ang([cx0, cy0], Math.PI);
        tg.push({ x: x - A.cw / 2, y: y - A.ch / 2, g: GI[segs[k][1] === 'h' ? '-' : segs[k][1] === 'v' ? '|' : '+'], ta: .95, out: 1, bi });
      }
      if (lb) {
        const lh = A.ch * 1.15; let lx = lb.left, ly = lb.top + Math.min(lb.height, lh) / 2 - A.ch / 2;
        LABELS[bi].split(' ').forEach(wd => {
          if (lx > lb.left && lx + wd.length * A.cw > lb.left + Math.max(lb.width, A.cw * 8)) { lx = lb.left; ly += lh; }
          for (const chr of wd) { if (GI[chr] !== undefined) tg.push({ x: lx, y: ly, g: GI[chr], ta: .9, out: 1, bi }); lx += A.cw; }
          lx += A.cw;
        });
      }
      for (let y = r.top + step * 1.2; y < r.bottom - step * 1.2; y += step * 1.3) for (let x = r.left + rad * .7; x < r.right - rad * .7; x += step * 1.1)
        if (rand() < .16) tg.push({ x: x - A.cw / 2, y: y - A.ch / 2, g: GI['.:01'[Math.floor(rand() * 4)]], ta: .42, out: 0, bi });
    });
    if (!S.length) throw new Error('нет символов экрана');
    // кто куда: верх экрана — в верхние кнопки, низ — в нижние (короткие пути); лишний код впитывается внутрь кнопок, нехватка — копии
    const ord = S.map((e, i) => i).sort((a, b) => S[a].y - S[b].y || S[a].x - S[b].x);
    tg.sort((a, b) => a.bi - b.bi || a.y - b.y || a.x - b.x);
    const F = [], nS = ord.length, nT = tg.length, used = new Uint8Array(nS);
    const fly = (e, t, clone) => {
      const st = TM.F0 + clamp(.5 * t.bi / 4 + .5 * rand()) * (TM.F1 - TM.F0);
      const f = { e, clone, tx: t.x, ty: t.y, tg: t.g, ta: t.ta, out: t.out, st, off: (rand() - .5) * .55 };
      if (clone) F.push(f); else e.f = f;
    };
    tg.forEach((t, k) => { const j = Math.min(nS - 1, Math.floor((k + rand() * .9) * nS / nT)); const si = ord[j];
      if (!used[j]) { used[j] = 1; fly(S[si], t, 0); } else fly({ x: S[si].x, y: S[si].y, g: S[si].g, a: S[si].a, k: 1, t: S[si].t, sh: Math.floor(rand() * 97), vx: 0, vy: 0, src: 'c' }, t, 1); });
    for (let j = 0; j < nS; j++) if (!used[j]) {   // впитываются: летят внутрь «своей» кнопки и гаснут на подлёте
      const e = S[ord[j]], bi = Math.min(4, Math.floor(j * 5 / nS)), r = bt[bi].r;
      fly(e, { x: r.left + 10 + rand() * (r.width - 20) - A.cw / 2, y: r.top + 6 + rand() * (r.height - 12) - A.ch / 2, g: e.g, ta: 0, out: 0, bi }, 0);
    }
    yield;
    // --- шаг 7: холст ---
    cv.width = Math.round(W * d); cv.height = Math.round((H - TOP) * d);
    cv.style.top = TOP + 'px'; cv.style.height = (H - TOP) + 'px';
    const ctx = cv.getContext('2d');
    R5.info = { mode: 'screen', cs, d, W, H, TOP, low, sym: S.length, hand: S.filter(e => e.src === 'h').length, text: S.filter(e => e.src === 't').length,
      bg: S.filter(e => e.src === 'b').length, tg: tg.length, clones: F.length, O: { x: Math.round(O.x), y: Math.round(O.y) } };
    return { W, H, TOP, d, ctx, A, S, F, DOMF, blank: true };
  }

  /* ---------- кадр холста (t — мс после касания) ---------- */
  function draw(t) {
    const c = G.ctx, A = G.A, a = A.a, aw = A.aw, ah = A.ah, cw = A.cw, chh = A.ch, n = SCRI.length, t14 = Math.floor(t / 1000 * 14);
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(G.d, 0, 0, G.d, 0, -G.TOP * G.d);
    const fz = smooth(TM.Z0, TM.Z1, t), glint = bell(TM.G0 - 80, TM.G0 + 140, TM.G0 + 420, t);
    const one = (e, f) => {
      if (t < e.t) return;
      const since = t - e.t;
      let x, y, g, al, k = e.k;
      if (!f || t < f.st) {   // рассыпался и чуть «плывёт»: первые 260 мс — бегущие символы, потом свой
        const dt = Math.min(since, 1400) / 1000;
        x = e.x + e.vx * dt; y = e.y + e.vy * dt;
        g = since < 260 || (e.sh & 7) === 0 ? SCRI[(t14 + e.sh) % n] : e.g;
        al = e.a * smooth(0, 140, since) * (f ? 1 : 1 - smooth(0, 500, since - 300));
      } else {
        const kk = clamp((t - f.st) / TM.DU), tt = easeIO(kk), m = 1 - tt;
        const dt0 = Math.min(f.st - e.t, 1400) / 1000, x0 = e.x + e.vx * dt0, y0 = e.y + e.vy * dt0;
        const dx = f.tx - x0, dy = f.ty - y0, len = Math.hypot(dx, dy) || 1, off = f.off * len;
        const cx = (x0 + f.tx) / 2 - dy / len * off, cy = (y0 + f.ty) / 2 + dx / len * off - len * .08;
        x = m * m * x0 + 2 * m * tt * cx + tt * tt * f.tx; y = m * m * y0 + 2 * m * tt * cy + tt * tt * f.ty;
        k = e.k + (1 - e.k) * tt;
        g = kk < 1 ? SCRI[(t14 + e.sh) % n] : f.tg;
        al = (e.a + (f.ta - e.a) * tt) * (f.clone ? smooth(0, .3, kk) : 1) * (1 - fz);
        if (f.out && kk >= 1 && glint > .01) {
          c.globalAlpha = al * (1 - glint); c.drawImage(a, g * aw, 0, aw, ah, x, y, cw, chh);
          c.globalAlpha = Math.min(1, al * glint * 1.3); c.drawImage(a, g * aw, ah, aw, ah, x, y, cw, chh); return;
        }
      }
      if (al < .04) return;
      c.globalAlpha = al;
      if (k === 1) c.drawImage(a, g * aw, 0, aw, ah, Math.round(x * G.d) / G.d, Math.round(y * G.d) / G.d, cw, chh);   // ровно по пикселям — копия без сглаживания
      else c.drawImage(a, g * aw, 0, aw, ah, x, y, cw * k, chh * k);
    };
    const S = G.S; for (let i = 0; i < S.length; i++) one(S[i], S[i].f);
    const F = G.F; for (let i = 0; i < F.length; i++) one(F[i].e, F[i]);
    c.globalAlpha = 1;
  }

  /* ---------- состояние сцены ---------- */
  let last = 0, lastFrame = 0, introAt = 0, tA = 0, tt = 0, speed = 1, touchAt = 0, inView = true;
  R5.hold = null;   // для проверок: R5.hold = мс — сцена стоит в этом моменте после касания
  function setDone(on) {
    if (on) cls(copy, 'r5gone', true); else cls(copy, 'in', false);   // при возврате наверх текст не проступает: спрятан, пока снова не понадобится
    cls(pin, 'dz', false);
    [hcopy, hlead, hcta, cue].forEach(el => { if (el) css(el, 'visibility', on ? 'hidden' : ''); });
    lns.forEach(el => css(el, 'opacity', ''));
    css(hR, 'visibility', on ? 'hidden' : ''); css(hH, 'visibility', on ? 'hidden' : '');
    css(hR, 'opacity', ''); css(hH, 'opacity', '');
    lis.forEach(li => { css(li, 'opacity', on ? '1' : '0'); css(li, 'visibility', on ? '' : 'hidden'); });
    cls(list, 'live', on); cls(go, 'lit', on); cls(go, 'r5vis', on);   /* fix5 */
    css(glow, 'opacity', '0'); css(fl, 'visibility', 'hidden');
  }
  function finish() {   // сразу готовый финал: кнопки видны, текст спрятан (в разметке остаётся)
    R5.state = 'done'; B = null;
    if (G) { G.ctx.setTransform(1, 0, 0, 1, 0, 0); G.ctx.clearRect(0, 0, cv.width, cv.height); }
    cls(cv, 'on', false); if (G) { cv.width = cv.height = 0; G = null; }   /* fix5 */
    setDone(true);
  }
  R5.finish = finish;
  function reset() {   // вернулись к самому верху — первый экран как при загрузке
    R5.state = 'idle'; G = null; B = null; R5.ahead = 0; tt = 0; speed = 1; touchAt = 0;
    cls(cv, 'on', false); setDone(false);
  }

  function frame(now) {
    lastFrame = now;
    // чтение — только scrollY (раскладка считана заранее в measure)
    if (!L.ok) measure();
    const y = scrollY, u = (y - L.secTop) / Math.max(1, L.H), range = (L.secH - L.H) / Math.max(1, L.H);
    const dt = last ? Math.min(500, now - last) : 16; last = now;   // редкие кадры (слабый телефон) — часы всё равно идут почти вровень с реальным временем
    R5.u = u;
    const vis = y + L.VH > L.secTop - 40 && y < L.secTop + L.secH + 40;
    if (!vis) { if (R5.state === 'play' || R5.state === 'prep') finish(); inView = false; return; }
    inView = true;
    if (!R5.run) { R5.run = true; root.classList.add('r5run'); measure(); }   // с r5run меняется раскладка «Рутины» — перемер один раз
    if (!introAt && hands.classList.contains('lit')) introAt = now;
    const intro = introAt ? easeIO(clamp((now - introAt) / 1900)) : 0;
    const st = R5.state;

    // --- до касания: первый экран по прокрутке ---
    if (st === 'idle') {
      const uu = clamp(u, 0, UT);
      const cf = 1 - smooth(0, .1, uu);
      css(hcopy, 'opacity', cf.toFixed(2)); css(hcopy, 'transform', `translateY(${(-smooth(0, .12, uu) * 60).toFixed(0)}px)`); css(hcopy, 'visibility', cf < .01 ? 'hidden' : '');
      css(hlead, 'opacity', (1 - smooth(0, .07, uu)).toFixed(2)); if (hcta) { css(hcta, 'opacity', (1 - smooth(0, .07, uu)).toFixed(2)); css(hcta, 'visibility', uu > .08 ? 'hidden' : ''); }
      if (cue) css(cue, 'visibility', uu > .03 ? 'hidden' : '');
      applyPose(pose(easeIO(smooth(0, UT, uu)), Math.max(intro, smooth(0, .1, uu)), uu));
      placeHands(easeIO(smooth(.04, UT * .9, uu)));
      if (u >= .1) cls(copy, 'r5gone', false);
      cls(copy, 'in', u >= .12); if (u >= .12 && !R5.ahead) { R5.ahead = 1; textAhead(); }
      const idle = intro >= 1 ? .75 + .25 * Math.sin(now / 520) : 0;
      put(spark, '--sp', (idle * (1 - smooth(0, .1, uu)) * .9 + smooth(UT - .1, UT, uu) * .9).toFixed(2), v => spark.style.setProperty('--sp', v));
      css(glow, 'opacity', (smooth(UT - .14, UT, uu) * .85).toFixed(2));
      if (u >= UT) {   // касание: дальше — по часам
        R5.state = 'prep'; tA = now; tt = 0; touchAt = now; speed = u > UT + .25 ? 2 : 1;
        applyPose(pose(1, 1, UT)); placeHands(1); cls(copy, 'in', true);
      }
      return;
    }
    if (st === 'done') {
      if (u < .02) reset();
      return;
    }
    // --- после касания: подготовка (несколько кадров, под вспышкой), потом рассыпание и сборка ---
    if (u > UT + .25 || u > range - .05) speed = Math.max(speed, 2);   // бросок прокрутки далеко вперёд — доигрываем вдвое быстрее
    if (st === 'prep') {
      if (!B) B = build();
      const t0 = performance.now(); let r1 = B.next();
      const bud = dt > 60 ? 40 : 7;   // кадры и так редкие — делаем больше за кадр
      while (!r1.done && performance.now() - t0 < bud) r1 = B.next();   // лёгкие шаги — в одном кадре, тяжёлые — каждый в своём
      R5.bms = (R5.bms || 0) + performance.now() - t0; R5.bmax = Math.max(R5.bmax || 0, performance.now() - t0); (R5.bsteps = R5.bsteps || []).push(Math.round(performance.now() - t0));
      if (r1.done) { G = r1.value; B = null; R5.state = 'play'; cls(cv, 'on', true); cls(pin, 'dz', true); if (R5.info) { R5.info.setup_ms = Math.round(R5.bms); R5.info.setup_max_ms = Math.round(R5.bmax); R5.info.steps = R5.bsteps; } }
    }
    // часы сцены стоят, пока подготовка не закончена и вспышка не прошла (подготовка быстрее вспышки)
    const tmax = R5.state === 'play' ? Infinity : TM.D0 - 1;
    tt = R5.hold != null ? R5.hold : Math.min(tmax, tt + dt * speed);
    const t = tt; R5.t = t;
    // вспышка и свет
    put(spark, '--sp', (1.6 * bell(-1, 60, TM.FL, t) + .9 * (1 - smooth(0, 200, t))).toFixed(2), v => spark.style.setProperty('--sp', v));
    const fv = bell(0, 110, TM.FL, t);
    css(fl, 'visibility', fv > .004 ? 'visible' : 'hidden');
    if (fv > .004) { css(fl, 'opacity', fv.toFixed(2)); css(fl, 'transform', `scale(${(.3 + smooth(0, TM.FL, t) * 2.4).toFixed(2)})`); }
    css(glow, 'opacity', (.85 * (1 - smooth(TM.D0, TM.D1, t))).toFixed(2));
    if (R5.state !== 'play') return;
    // DOM-части гаснут вместе с волной (вместо них — их же символы на холсте)
    for (const o of G.DOMF) css(o.el, 'opacity', (o.op * (1 - smooth(o.sp[0], o.sp[1], t))).toFixed(2));
    if (t >= TM.D1 + 200) { css(hR, 'visibility', 'hidden'); css(hH, 'visibility', 'hidden'); }
    draw(t);
    // кнопки проявляются под своими контурами
    cls(go, 'r5vis', t >= TM.B0 - 40);   /* fix5 */
    lis.forEach((li, i) => { const o = smooth(TM.B0 + i * TM.BS, TM.B0 + i * TM.BS + TM.BR, t); css(li, 'opacity', o.toFixed(2)); css(li, 'visibility', o < .005 ? 'hidden' : ''); });
    cls(list, 'live', t >= TM.B0 + 120);
    cls(go, 'lit', t >= TM.Z0);
    if (t >= TM.END && R5.hold == null) finish();
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    try { const t0 = PROF ? performance.now() : 0; frame(now); if (PROF) PROF.push([+(performance.now() - t0).toFixed(2), R5.state, Math.round(R5.t || 0)]); } catch (e) { fail(e); }
  }
  /* сторож: нет кадров (rAF уснул) — рисуем сами; сцена после касания идёт дольше 4,5 с или не готова через 1,5 с — сразу готовые кнопки */
  dog = setInterval(() => {
    if (R5.failed || document.hidden) return;
    try {
      const now = performance.now();
      if (now - lastFrame > 900) frame(now);
      if (R5.hold == null && touchAt && (R5.state === 'play' || R5.state === 'prep') && (now - touchAt > 4500 || (R5.state === 'prep' && now - touchAt > 1500))) finish();
      if (R5.state === 'idle' && L.ok && (scrollY - L.secTop) / L.H > UT + .05) { if (++R5.stuck >= 2) finish(); } else R5.stuck = 0;
    } catch (e) { fail(e); }
  }, 700);
  R5.stuck = 0;

  /* ---------- размеры: перемер раскладки (не в кадре); подготовленная сцена при смене размера — сразу финал ---------- */
  function onResize() {
    clearTimeout(R5.rt);
    R5.rt = setTimeout(() => { try { const w = pin.clientWidth, h = pin.clientHeight; const ch = w !== L.W || h !== L.H; measure(); if (ch) R5.ahead = 0; if (ch && (R5.state === 'play' || R5.state === 'prep')) finish(); } catch (e) { fail(e); } }, 150);
  }
  addEventListener('resize', onResize); addEventListener('orientationchange', onResize);
  if (window.visualViewport) visualViewport.addEventListener('resize', onResize);
  addEventListener('load', () => { try { measure(); } catch (e) { fail(e); } });
  /* заранее, вне кадров: раскодировать картинки рук (первый drawImage не декодирует синхронно) и нарисовать атлас символов */
  [hR, hH].forEach(im => { try { if (im.decode) im.decode().catch(() => {}); } catch (_) {} });
  const ahead = () => { try { if (L.ok && R5.state === 'idle') { const c = cellOf(L.W, L.H); atlasFor(c.cs, c.d); pixOf(hR); pixOf(hH); } } catch (_) {} };
  setTimeout(ahead, 600); addEventListener('load', () => setTimeout(ahead, 300));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { measure(); } catch (_) {} }).catch(() => {});
  addEventListener('pageshow', e => { if (e.persisted) { last = 0; try { measure(); } catch (_) {} } });

  /* ---------- «Меню», кнопки с клавиатуры и ссылка #go: сразу к готовым кнопкам ---------- */
  function jumpEnd() {
    measure();
    scrollTo(0, Math.round(L.secTop + Math.min(L.secH - L.H, (UT + .2) * L.H)));
    finish();
  }
  addEventListener('keydown', e => { if (e.key === 'Tab' && R5.state !== 'done') cls(go, 'r5vis', true); }, true);   /* fix5 */
  list.addEventListener('focusin', () => { if (R5.state !== 'done') jumpEnd(); });
  document.addEventListener('click', e => { const l = e.target.closest && e.target.closest('a[href="#go"]'); if (l) { e.preventDefault(); jumpEnd(); } });
  addEventListener('load', () => { if (location.hash === '#go') jumpEnd(); });

  try { measure(); frame(performance.now()); raf = requestAnimationFrame(loop); } catch (e) { fail(e); }
})();

/* hotfix 24.11 (Олег MSG 11601): iPhone включает :active (вдавливание клавиш) только при обработчике touchstart — как в pages.js на остальных страницах */
document.addEventListener("touchstart",function(){},{passive:true});
