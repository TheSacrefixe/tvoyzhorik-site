/* Твій Жорик — круг 5, починка под iPhone (r5fix, site-r5fix-2311; Олег MSG 11351, 11353–11354). Свой JS, без библиотек, без внешних запросов.
   Сцена та же (Олег MSG 11335–11341): руки сходятся → касаются (свет) → ОБЕ руки рассыпаются в код по своим силуэтам от точки касания к запястьям
   (ASCII-эффект слайда 2, Кэт MSG 11237) → «Рутина — йому, рішення — вам» → код летит и собирается в 5 кнопок «Куди далі» → кнопки застывают.
   Что изменено против r5 (почему тормозило и застревало на iPhone):
   - свой цикл кадров, каждый кадр в try/catch; ошибка → сцена выключается, страница становится обычной (кнопки видны);
   - в кадре нет clip-path у картинок рук с drop-shadow (Safari пересчитывал тень огромной картинки каждый кадр):
     с момента касания руки рисуются на холсте готовым спрайтом (тень нарисована один раз), стирание — кругом от точки касания;
   - код рук — заранее нарисованный слой (один drawImage), по одному рисуются только символы у фронта и летящие;
   - стили пишутся только при изменении; без filter: blur на кнопках; свет сцены — отдельный слой с opacity, не переменная на всю сцену;
   - фронт рассыпания — круг от точки касания (каждая рука — по своему силуэту), не вертикальная полоса;
   - темп: начатое рассыпание и сборка кнопок доигрывают сами (≈1,1 и ≈1,5 с), даже если прокрутка остановилась; при броске прокрутки — догоняет;
   - страховка: кнопки прячет только этот скрипт (класс r5run); сторож раз в 0,7 с — нет кадров или кнопки должны быть, а их нет → показать.
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

  let sec, pin, cv, hR, hH, spark, hbox, hands, hcopy, hlead, hcta, copy, go, head, list, btns, lis, fl, glow, raf = 0, dog = 0;

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

  /* ---------- шкала сцены (доли прокрутки) ---------- */
  const TL = {
    mob:  { touch: .10, d0: .115, d1: .30, hold0: .23, hold1: .31, cA: .28, cB: .43, head: .44, f0: .40, f1: .62, dur: .13, z0: .62, z1: .70 },
    desk: { touch: .10, d0: .115, d1: .30, hold0: 1, hold1: 1, cA: .46, cB: 2, head: .50, f0: .38, f1: .62, dur: .14, z0: .62, z1: .70 }
  };
  let T = TL.mob;
  const AUTO = () => [[T.d0, T.d1, 1100], [T.f0, T.z1, 1500]];   // начатая фаза доигрывает сама за N мс

  /* ---------- символы: как на слайде 2 (r3) ---------- */
  const RAMP = ' .:-=+*#%@', SCR = '01<>/\\|_=+*#%@$&?ЖTZ';
  const LABELS = btns.map(b => ((b.querySelector('b') || b).textContent || '').replace(/\s+/g, ' ').trim());
  const GL = [...new Set((RAMP.slice(1) + SCR + '|-+.:' + LABELS.join('').replace(/ /g, '')).split(''))];
  const GI = {}; GL.forEach((c, i) => { GI[c] = i; });
  const SCRI = [...SCR].map(c => GI[c]);
  const INK = ['rgb(11,21,32)', 'rgb(255,255,255)', 'rgb(52,74,96)'];   // 0 — рука робота и кнопки, 1 — блик, 2 — рука человека

  const fl0 = document.createElement('div'); fl0.className = 'r5flash'; fl0.setAttribute('aria-hidden', 'true'); hbox.appendChild(fl0); fl = fl0;
  const g0 = document.createElement('div'); g0.className = 'r5glow'; g0.setAttribute('aria-hidden', 'true'); pin.insertBefore(g0, pin.firstChild); glow = g0;

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
    const fs = Math.round(cs * 1.22), cw = Math.ceil(fs * .64) + 1, ch = Math.ceil(fs * 1.25);
    const a = document.createElement('canvas'); a.width = GL.length * cw * d; a.height = ch * d * INK.length;
    const x = a.getContext('2d'); x.font = `${fs * d}px ui-monospace,Menlo,Consolas,monospace`; x.textBaseline = 'top';
    INK.forEach((col, row) => { x.fillStyle = col; GL.forEach((g, i) => x.fillText(g, i * cw * d, row * ch * d + fs * d * .08)); });
    return { a, cw, ch, d, aw: cw * d, ah: ch * d };
  }
  let PER = 0;
  function bench(A) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 360; const x = c.getContext('2d');
    const one = n => { for (let i = 0; i < n; i++) { x.globalAlpha = .1 + (i % 9) / 10; x.drawImage(A.a, (i % GL.length) * A.aw, 0, A.aw, A.ah, (i * 37) % 340, (i * 53) % 340, A.cw, A.ch); } x.getImageData(0, 0, 1, 1); };
    one(60); let t0 = performance.now(); one(100); const a = performance.now() - t0; t0 = performance.now(); one(1600); return Math.max(0, (performance.now() - t0) - a) / 1500;
  }

  /* ---------- клетки руки: по её альфе (силуэт) и яркости (плотность символа); только то, что в кадре ---------- */
  function cells(img, r, side, cs, W, H, tx, ty, rand, out) {
    const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, W), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, H);
    if (x1 <= x0 || y1 <= y0) return;
    const rh = cs * 1.25, cols = Math.ceil((x1 - x0) / cs), rows = Math.ceil((y1 - y0) / rh);
    const oc = document.createElement('canvas'); oc.width = cols; oc.height = rows; const o = oc.getContext('2d');
    // вся картинка целиком со сдвигом: источник не выходит за края (Safari при выходе за край не рисует НИЧЕГО — так пропадала рука)
    o.drawImage(img, (r.left - x0) / cs, (r.top - y0) / rh, r.width / cs, r.height / rh);
    const px = o.getImageData(0, 0, cols, rows).data;
    let lo = 1, hi = 0;
    for (let k = 0; k < px.length; k += 4) if (px[k + 3] > 76) { const l = (px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11) / 255; if (l < lo) lo = l; if (l > hi) hi = l; }
    const span = Math.max(.08, hi - lo);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 4, a = px[k + 3] / 255; if (a < .3) continue;
      // светотень своей руки: яркость растянута на всю шкалу символов (как на слайде 2), край силуэта — светлее
      const lum = ((px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11) / 255 - lo) / span, dens = clamp(.12 + .88 * (1 - lum)) * (.55 + .45 * a);
      const x = x0 + i * cs, y = y0 + j * rh, cx = x + cs / 2, cy = y + rh / 2;
      out.push({ x, y, a: a * (.3 + .7 * dens), g: GI[RAMP[Math.max(1, Math.round(dens * (RAMP.length - 1)))]], ink: side ? 2 : 0, side,
        dg: Math.hypot(cx - tx, cy - ty), r1: rand(), r2: .12 + rand() * .88 });
    }
  }
  /* ---------- цели: контур каждой кнопки + название кодом + редкий «код» внутри ---------- */
  function targets(cs, A, pr, rand) {
    const out = [], step = (pinW < 820 ? 8.5 : 11) * (FORCE_LOW || MEM_LOW || PER > .018 ? 1.25 : 1);   // шаг контура не зависит от размера клетки рук
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
  /* тень картинки рук (drop-shadow из CSS) — для спрайта на холсте */
  function shadowOf(img) {
    const f = getComputedStyle(img).filter || '';
    const m = f.match(/drop-shadow\((rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/);
    return m ? { c: m[1], x: +m[2], y: +m[3], b: +m[4] } : { c: 'rgba(25,40,55,.2)', x: 0, y: 14, b: 16 };
  }

  /* ---------- подготовка: спрайт рук, слой кода, полёты ---------- */
  let G = null, B = null;
  /* подготовка разбита на шаги по кадрам (yield) — без долгой паузы на слабом телефоне */
  function* build() {
    if (!hR.complete || !hH.complete || !hR.naturalWidth || !hH.naturalWidth) return null;
    measure();
    const W = pinW, H = pinH; if (!W || !H) return null;
    const mob = W < 820;
    if (!PER) { const A0 = atlas(mob ? 6 : 9, 1); PER = bench(A0); yield; PER = Math.min(PER, bench(A0)); yield; }   // два замера, берём лучший (шум)
    const tb = $('#top'), TOP = tb ? Math.round(clamp(tb.offsetTop + tb.offsetHeight, 0, Math.min(160, H * .2))) : 0;   // холст не заходит под стеклянную шапку: её размытие не пересчитывается каждый кадр
    const low = FORCE_LOW || MEM_LOW || PER > .018;
    let d = Math.min(window.devicePixelRatio || 1, low ? 1.5 : mob ? 2 : 1.5);
    while (W * H * d * d > 4.2e6 && d > 1) d = Math.max(1, d - .25);   // лимит площади холста iOS — с запасом
    applyPose(pose(1, 1), true);   // геометрия в момент касания
    const pr = pin.getBoundingClientRect();
    const rr = rel(hR.getBoundingClientRect(), pr), rh = rel(hH.getBoundingClientRect(), pr), sr = rel(spark.getBoundingClientRect(), pr);
    const z = 1.06, sh = shadowOf(hR);
    applyPose(pose(pS, introAt ? easeIO(clamp((performance.now() - introAt) / 1900)) : 0), true);
    const tx = sr.left + sr.width / 2, ty = sr.top + sr.height / 2;
    let cs = (mob ? 5 : 7.5) * (low ? 1.3 : 1), A, src, tg, tries = 0;
    // предел — на символы рук (силуэт), цели кнопок считаются отдельно (шаг контура не зависит от клетки)
    const budget = FORCE_LOW || low ? (mob ? 700 : 1400) : Math.round(clamp(9 / Math.max(PER, 1e-4), mob ? 700 : 1400, mob ? 1300 : 3000));
    for (;;) {
      A = atlas(cs, d);
      const rand = rnd(7); src = []; cells(hR, rr, 0, cs, W, H, tx, ty, rand, src); cells(hH, rh, 1, cs, W, H, tx, ty, rand, src);
      tg = targets(cs, A, pr, rnd(11));
      const n = src.length;
      if (n <= budget || tries++ > 3) break;
      cs *= Math.min(1.6, Math.sqrt(n / budget) * 1.04);
      yield;
    }
    yield;
    // спрайт рук в позе касания (с тенью, нарисованной один раз)
    const HS = document.createElement('canvas'); HS.width = Math.round(W * d); HS.height = Math.round(H * d);
    const hx = HS.getContext('2d'); hx.setTransform(d, 0, 0, d, 0, 0);
    hx.shadowColor = sh.c; hx.shadowOffsetX = sh.x * z * d; hx.shadowOffsetY = sh.y * z * d; hx.shadowBlur = sh.b * z * d;
    hx.drawImage(hR, rr.left, rr.top, rr.width, rr.height); hx.drawImage(hH, rh.left, rh.top, rh.width, rh.height);
    yield;
    // слой кода: все символы обеих рук на своих местах (по одному их рисуем только у фронта и в полёте)
    const CL = document.createElement('canvas'); CL.width = HS.width; CL.height = HS.height;
    const cx = CL.getContext('2d'); cx.setTransform(d, 0, 0, d, 0, 0);
    src.forEach(s => { cx.globalAlpha = s.a; cx.drawImage(A.a, s.g * A.aw, s.ink * A.ah, A.aw, A.ah, s.x, s.y, A.cw, A.ch); });
    yield;
    // кто куда летит: сверху вниз (верх рук → верхние кнопки), лишние стекают, нехватку дописывают копии
    const rand = rnd(23);
    const byY = src.map((s, i) => i).sort((a, b) => src[a].y - src[b].y || src[a].x - src[b].x);
    tg.sort((a, b) => a.y - b.y || a.x - b.x);
    const used = new Uint8Array(src.length), F = [];
    // телефон: пока видна «Рутина…», код рук опускается под её текст (по факту текста, не долей экрана — у iPhone экран бывает 660 px)
    let holdY = 0;
    if (mob && src.length) {
      let top = 1e9, bot = 0; src.forEach(s => { if (s.y < top) top = s.y; if (s.y > bot) bot = s.y; }); bot += A.ch;
      const cb = copy.getBoundingClientRect().bottom - pr.top + 14;
      holdY = clamp(cb - top, 0, Math.max(0, H - 6 - bot));
    }
    tg.forEach((t, k) => {
      const si = byY[Math.floor(k * byY.length / tg.length)], s = src[si], clone = used[si] ? 1 : 0; used[si] = 1;
      const sx = s.x, sy = s.y + holdY, dx = t.x - sx, dy = t.y - sy, len = Math.hypot(dx, dy) || 1, off = (rand() - .5) * len * .55;
      const u = clamp(.55 * t.bi / 4 + .45 * rand());
      F.push({ s, clone, tx: t.x, ty: t.y, tg: t.g, ta: t.ta, out: t.out,
        cx: (sx + t.x) / 2 - dy / len * off, cy: (sy + t.y) / 2 + dx / len * off - len * .08, st: T.f0 + u * (T.f1 - T.f0 - T.dur) });
    });
    const M = src.filter((s, i) => !used[i]);           // стекают и гаснут
    const S = src.slice().sort((a, b) => a.dg - b.dg); // фронт: по расстоянию от точки касания
    const SD = new Float32Array(S.map(s => s.dg));
    const Dmax = (SD.length ? SD[SD.length - 1] : 100) + 30;
    cv.width = HS.width; cv.height = Math.round((H - TOP) * d);
    cv.style.top = TOP + 'px'; cv.style.bottom = 'auto'; cv.style.height = (H - TOP) + 'px';
    glow.style.clipPath = glow.style.webkitClipPath = `inset(${Math.round(H * .12 + TOP)}px 0 0 0)`;
    const ctx = cv.getContext('2d');
    R5.info = { cs: +cs.toFixed(2), src: src.length, tg: tg.length, fly: F.length, melt: M.length, per: +PER.toFixed(4), low, d, budget, W, H, TOP, holdY: Math.round(holdY), Dmax: Math.round(Dmax), tx: Math.round(tx), ty: Math.round(ty), hands: [rr, rh].map(o => [o.left, o.top, o.width, o.height].map(Math.round)) };
    return { W, H, TOP, d, mob, ctx, A, HS, CL, S, SD, F, M, tx, ty, Dmax, holdY, cs, blank: true };
  }
  function lower(arr, v) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; }

  /* ---------- кадр холста ---------- */
  const BAND = 90;
  function draw(p, now) {
    const c = G.ctx, A = G.A, a = A.a, aw = A.aw, ah = A.ah;
    if (p < T.d0 || p > T.z1 + .01) { if (!G.blank) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); G.blank = true; } return; }
    G.blank = false;
    c.setTransform(G.d, 0, 0, G.d, 0, -G.TOP * G.d); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, G.TOP, G.W, G.H - G.TOP);
    const tick = Math.floor(now / 1000 * 14), cs = G.cs;
    const fd = smooth(T.d0, T.d1, p) * (G.Dmax + BAND + 30), hold = smooth(T.hold0, T.hold1, p) * G.holdY;
    const melt = clamp((p - (T.f0 - .03)) / .2);
    if (melt <= 0) {
      // 1) руки — спрайт, стёртый кругом от точки касания (каждая рука уходит по своей форме, к запястью)
      if (fd < G.Dmax) {
        c.drawImage(G.HS, 0, 0, G.W, G.H);
        if (fd > 0) {
          c.globalCompositeOperation = 'destination-out';
          const gr = c.createRadialGradient(G.tx, G.ty, Math.max(0, fd - 14), G.tx, G.ty, fd + 6);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = gr; c.beginPath(); c.arc(G.tx, G.ty, fd + 6, 0, Math.PI * 2); c.fill();
          c.globalCompositeOperation = 'source-over';
        }
      }
      // 2) готовый код внутри круга — одним слоем
      const inner = fd - BAND;
      if (inner > 0) {
        if (inner >= G.Dmax) c.drawImage(G.CL, 0, hold, G.W, G.H);
        else { c.save(); c.beginPath(); c.arc(G.tx, G.ty + hold, inner, 0, Math.PI * 2); c.clip(); c.drawImage(G.CL, 0, hold, G.W, G.H); c.restore(); }
      }
      // 3) фронт: частицы и бегущие символы — по одному, только в полосе у фронта
      if (fd > 0 && inner < G.Dmax) {
        const i0 = lower(G.SD, Math.max(0, inner)), i1 = lower(G.SD, fd + 30);
        for (let i = i0; i < i1; i++) {
          const e = G.S[i], edge = fd - e.dg - e.r1 * 16;
          if (edge < 0) continue;
          if (edge < 22) { c.globalAlpha = e.a * .9; c.fillStyle = INK[e.ink]; c.fillRect(e.x + (e.r1 - .5) * 8, e.y + hold + (e.r2 - .5) * 6, 1.6, 1.6); continue; }
          c.globalAlpha = e.a; c.drawImage(a, SCRI[(tick + Math.floor(e.r1 * 97)) % SCRI.length] * aw, e.ink * ah, aw, ah, e.x, e.y + hold, A.cw, A.ch);
        }
      }
      c.globalAlpha = 1; return;
    }
    // 4) лишние символы стекают и гаснут (как на слайде 2)
    const M = G.M;
    for (let i = 0; i < M.length; i++) {
      const e = M[i]; if (melt > e.r2) continue;
      const al = e.a * (1 - smooth(e.r2 - .18, e.r2, melt)); if (al < .02) continue;
      const y = e.y + G.holdY + smooth(e.r2 - .25, e.r2, melt) * cs * 5;
      const g = melt > e.r2 - .2 ? SCRI[(tick + Math.floor(e.r1 * 97)) % SCRI.length] : e.g;
      c.globalAlpha = al; c.drawImage(a, g * aw, e.ink * ah, aw, ah, e.x, y, A.cw, A.ch);
    }
    // 5) полёт в контуры кнопок, вспышка контура, застывание
    const fz = smooth(T.z0 + .012, T.z1, p);
    const glint = smooth(T.z0 - .03, T.z0 + .008, p) * (1 - smooth(T.z0 + .025, T.z1, p));
    const F = G.F;
    for (let i = 0; i < F.length; i++) {
      const f = F[i], e = f.s, k = clamp((p - f.st) / T.dur);
      if (f.clone && k <= 0) continue;
      let x, y, al, g, ink = e.ink;
      if (k <= 0) { x = e.x; y = e.y + G.holdY; al = e.a; g = e.g; }
      else {
        const t = easeIO(k), m = 1 - t, sy = e.y + G.holdY;
        x = m * m * e.x + 2 * m * t * f.cx + t * t * f.tx; y = m * m * sy + 2 * m * t * f.cy + t * t * f.ty;
        al = (e.a + (f.ta - e.a) * t) * (f.clone ? smooth(0, .35, k) : 1) * (1 - fz);
        g = k < 1 ? SCRI[(tick + Math.floor(e.r1 * 97)) % SCRI.length] : f.tg;
        if (k > .5) ink = 0;
      }
      if (al < .02) continue;
      if (f.out && k >= 1 && glint > 0) {
        c.globalAlpha = al * (1 - glint); c.drawImage(a, g * aw, 0, aw, ah, x, y, A.cw, A.ch);
        c.globalAlpha = Math.min(1, al * glint * 1.3); c.drawImage(a, g * aw, ah, aw, ah, x, y, A.cw, A.ch);
      } else { c.globalAlpha = al; c.drawImage(a, g * aw, ink * ah, aw, ah, x, y, A.cw, A.ch); }
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
    css(glow, 'opacity', (smooth(.09, .28, p) * (1 - .45 * smooth(T.z0, T.z1 + .1, p))).toFixed(2));
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
    R5.rt = setTimeout(() => { try { const w = pin.clientWidth, h = pin.clientHeight; measure(); T = w < 820 ? TL.mob : TL.desk; if (G && (w !== G.W || h !== G.H)) G = null; B = null; snap = true; } catch (e) { fail(e); } }, 150);
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

  try { measure(); T = pinW < 820 ? TL.mob : TL.desk; frame(performance.now()); raf = requestAnimationFrame(loop); } catch (e) { fail(e); }
})();
