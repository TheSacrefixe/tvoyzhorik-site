/* Твій Жорик — круг 5 (r5, site-r5-2311; Олег MSG 11335–11341). Свой JS, без библиотек и CDN, без внешних запросов.
   Сцена первого экрана по прокрутке (секция закреплена, всё зависит от доли прокрутки p = 0…1):
     0.00–0.12  заголовок уходит, руки сходятся и касаются;
     0.09–0.22  короткий свет в точке касания;
     0.14–0.34  обе руки рассыпаются в символы от точки касания наружу — тот же ASCII-эффект, что был на слайде 2 (Кэт MSG 11237):
                фронт — частицы, у фронта — бегущие символы, дальше — символы по яркости картинки;
     0.34–0.44  руки из кода держатся, проявляется «Рутина — йому, рішення — вам» (на телефоне облако символов уходит ниже текста);
     0.42–0.72  (телефон 0.48–0.72) символы летят и на глазах собираются в контуры 5 металлических кнопок «Куди далі» (по очереди сверху вниз),
                лишние символы стекают и гаснут, как на слайде 2;
     0.72–0.82  контур вспыхивает светом и «застывает» — проявляются настоящие кнопки (DOM, кликабельны), по ним проходит блик металла;
     0.82–1.00  готовые кнопки, потом секция уезжает вверх (дальше шар и подвал).
   Вызывается из общего цикла r2.js (handsFrame → R5.frame). Включено только при html.r5a (строчка в <head>: нет reduced-motion, нет ?r5=off / ?ascii=off).
   Слабый телефон: замер скорости рисования символов → крупнее ячейка, меньше символов (?r5n=low — принудительно). */
(() => {
  'use strict';
  const root = document.documentElement;
  const R5 = window.R5 = { on: root.classList.contains('r5a') };
  if (!R5.on) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const bell = (a, m, b, v) => (v <= m ? smooth(a, m, v) : 1 - smooth(m, b, v));

  const sec = $('#hello'), pin = $('.r5pin'), cv = $('#r5cv');
  const hR = $('#handRobot'), hH = $('#handHuman'), spark = $('#spark'), hbox = $('.hbox');
  const hcopy = $('.s-hands .copy'), hlead = $('.s-hands .lead'), hcta = $('.s-hands .cta');
  const copy = $('#r5copy'), go = $('#r5go'), head = go && go.querySelector('.head'), list = go && go.querySelector('.go-list');
  const btns = go ? [...go.querySelectorAll('.go')] : [];
  if (!sec || !pin || !cv || !cv.getContext || !hR || !hH || !hbox || btns.length !== 5) { root.classList.remove('r5a'); R5.on = false; return; }
  const q = new URLSearchParams(location.search);
  const FORCE_LOW = q.get('r5n') === 'low';
  const MEM_LOW = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  const T = { touch: .12, d0: .14, d1: .34, f0: .42, f1: .72, dur: .15, z0: .72, z1: .82 };
  const fl = document.createElement('div'); fl.className = 'r5flash'; fl.setAttribute('aria-hidden', 'true'); hbox.appendChild(fl);

  /* символы: шкала плотности и «бегущие» — как на слайде 2 (r3), плюс знаки контура */
  const RAMP = ' .:-=+*#%@', SCR = '01<>/\\|_=+*#%@$&?ЖTZ';
  const LABELS = btns.map(b => ((b.querySelector('b') || b).textContent || '').replace(/\s+/g, ' ').trim());
  const GL = [...new Set((RAMP.slice(1) + SCR + '|-+.:' + LABELS.join('').replace(/ /g, '')).split(''))];
  const GI = {}; GL.forEach((c, i) => { GI[c] = i; });
  const SCRI = [...SCR].map(c => GI[c]);
  const rnd = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* поза рук: при прокрутке сходятся до касания (кончики пальцев рендера: робот 1557,638 — человек 1640,606 в кадре 3200×1400) */
  function pose(p, intro) {
    const vw = innerWidth, mob = vw < 820, k = hbox.offsetWidth / 3200;
    const a = easeIO(smooth(0, T.touch, p));
    const away = (1 - intro) * (1 - smooth(0, .08, p)) * (mob ? .7 : .3) * vw;   // при старте руки приходят с краёв (как в r3)
    return { rx: -away + a * 41.5 * k, ry: -a * 16 * k, hx: away - a * 41.5 * k, hy: a * 16 * k, z: 1 + a * .06 };
  }
  function applyPose(o) {
    hR.style.transform = `translate3d(${o.rx.toFixed(2)}px,${o.ry.toFixed(2)}px,0)`;
    hH.style.transform = `translate3d(${o.hx.toFixed(2)}px,${o.hy.toFixed(2)}px,0)`;
    hbox.style.setProperty('--hz', o.z.toFixed(4));
  }
  const rel = (b, o) => ({ left: b.left - o.left, top: b.top - o.top, right: b.right - o.left, bottom: b.bottom - o.top, width: b.width, height: b.height });

  /* атлас символов: рисуем символ один раз, дальше — копия картинки (быстрее fillText) */
  function atlas(cs, d) {
    const fs = Math.round(cs * 1.22), cw = Math.ceil(fs * .64) + 1, ch = Math.ceil(fs * 1.25);
    const a = document.createElement('canvas'); a.width = GL.length * cw * d; a.height = ch * d * 2;
    const x = a.getContext('2d'); x.font = `${fs * d}px ui-monospace,Consolas,Menlo,monospace`; x.textBaseline = 'top';
    [['rgb(11,21,32)', 0], ['rgb(255,255,255)', 1]].forEach(([col, row]) => { x.fillStyle = col; GL.forEach((g, i) => x.fillText(g, i * cw * d, row * ch * d + fs * d * .08)); });
    return { a, cw, ch, d };
  }
  let PER = 0;   // мс на один символ на этом устройстве
  function bench(A) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 360; const x = c.getContext('2d');
    const one = n => { for (let i = 0; i < n; i++) { x.globalAlpha = .1 + (i % 9) / 10; x.drawImage(A.a, (i % GL.length) * A.cw * A.d, 0, A.cw * A.d, A.ch * A.d, (i * 37) % 340, (i * 53) % 340, A.cw, A.ch); } x.getImageData(0, 0, 1, 1); };
    one(60); let t0 = performance.now(); one(100); const a = performance.now() - t0; t0 = performance.now(); one(1600); return Math.max(0, (performance.now() - t0) - a) / 1500;   // без постоянной цены чтения пикселя
  }

  /* клетки рук: та же выборка, что на слайде 2 — яркость → плотность символа */
  function cells(img, r, side, cs, W, H, tx, rand, out) {
    const x0 = Math.max(r.left, -cs), x1 = Math.min(r.right, W + cs), y0 = Math.max(r.top, -cs), y1 = Math.min(r.bottom, H + cs);
    if (x1 <= x0 || y1 <= y0) return;
    const rh = cs * 1.25, cols = Math.ceil((x1 - x0) / cs), rows = Math.ceil((y1 - y0) / rh);
    const oc = document.createElement('canvas'); oc.width = cols; oc.height = rows; const o = oc.getContext('2d');
    const nw = img.naturalWidth, nh = img.naturalHeight;
    o.drawImage(img, (x0 - r.left) / r.width * nw, (y0 - r.top) / r.height * nh, cols * cs / r.width * nw, rows * rh / r.height * nh, 0, 0, cols, rows);
    const px = o.getImageData(0, 0, cols, rows).data;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 4, a = px[k + 3] / 255; if (a < .2) continue;
      const lum = (px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11) / 255, dens = clamp(.38 + (1 - lum));
      const x = x0 + i * cs, y = y0 + j * rh;
      out.push({ x, y, a: a * (.28 + .72 * dens), g: GI[RAMP[Math.max(1, Math.round(dens * (RAMP.length - 1)))]], side,
        dist: side ? x + cs / 2 - tx : tx - (x + cs / 2), r1: rand(), r2: .12 + rand() * .88 });
    }
  }
  /* цели: контур каждой кнопки (скруглённый прямоугольник) + редкий «код» внутри */
  function targets(cs, A, pr, rand) {
    const out = [], step = cs * 1.2;
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
      // название кнопки «пишется» кодом на месте настоящего (моноширинно, по словам в ширину надписи)
      const bt = b.querySelector('b');
      if (bt) {
        const br = rel(bt.getBoundingClientRect(), pr), lh = A.ch * 1.15; let lx = br.left, ly = br.top + Math.min(br.height, lh) / 2 - A.ch / 2;
        LABELS[bi].split(' ').forEach(wd => {
          if (lx > br.left && lx + wd.length * A.cw > br.left + Math.max(br.width, A.cw * 8)) { lx = br.left; ly += lh; }
          for (const chr of wd) { if (GI[chr] !== undefined) out.push({ x: lx, y: ly, g: GI[chr], ta: .9, out: 1, bi }); lx += A.cw; }
          lx += A.cw;
        });
      }
      for (let y = r.top + cs * 1.5; y < r.bottom - cs * 1.5; y += cs * 1.6) for (let x = r.left + rad * .7; x < r.right - rad * .7; x += cs * 1.35)
        if (rand() < .2) out.push({ x: x - A.cw / 2, y: y - A.ch / 2, g: GI['.:01'[Math.floor(rand() * 4)]], ta: .42, out: 0, bi });
    });
    return out;
  }

  let G = null;
  function setup(intro) {
    if (!hR.complete || !hH.complete || !hR.naturalWidth || !hH.naturalWidth) return null;
    const W = pin.clientWidth, H = pin.clientHeight; if (!W || !H) return null;
    const mob = W < 820;
    T.f0 = mob ? .48 : .42;   // телефон: код летит, когда «Рутина…» уже прочитана и ушла
    if (!PER) PER = bench(atlas(mob ? 7 : 10, 1));
    const low = FORCE_LOW || MEM_LOW || PER > .018;   // медленное рисование → слабый режим: меньше символов, холст без ретины
    const d = low ? 1 : Math.min(window.devicePixelRatio || 1, mob ? 2 : 1.5);
    // геометрия в момент касания (поза при p=1), потом поза возвращается
    applyPose(pose(1, 1));
    const pr = pin.getBoundingClientRect();
    const rr = rel(hR.getBoundingClientRect(), pr), rh = rel(hH.getBoundingClientRect(), pr), sr = rel(spark.getBoundingClientRect(), pr);
    const tx = sr.left + sr.width / 2, ty = sr.top + sr.height / 2;
    applyPose(pose(G ? G.lastP : 0, intro));
    let cs = (mob ? 7 : 10) * (low ? 1.3 : 1), A, src, tg, tries = 0;
    for (;;) {
      A = atlas(cs, d);
      const rand = rnd(7); src = []; cells(hR, rr, 0, cs, W, H, tx, rand, src); cells(hH, rh, 1, cs, W, H, tx, rand, src);
      tg = targets(cs, A, pr, rnd(11));
      const budget = FORCE_LOW ? 450 : clamp(7 / Math.max(PER, 1e-4) * (low ? 2 : 1), mob ? 420 : 1800, 4200), n = Math.max(src.length, tg.length);
      if (n <= budget || tries++ > 2) break;
      cs *= Math.min(1.8, Math.sqrt(n / budget) * 1.05);
    }
    // кто куда летит: сверху вниз (верх рук → верхние кнопки), лишние символы стекают, нехватку дописывают копии
    const rand = rnd(23);
    src.sort((a, b) => a.y - b.y || a.x - b.x); tg.sort((a, b) => a.y - b.y || a.x - b.x);
    const used = new Uint8Array(src.length), P = [];
    const holdY = mob ? H * .12 : 0;
    tg.forEach((t, k) => {
      const si = Math.floor(k * src.length / tg.length), s = src[si], clone = used[si] ? 1 : 0; used[si] = 1;
      const sx = s.x, sy = s.y + holdY, dx = t.x - sx, dy = t.y - sy, len = Math.hypot(dx, dy) || 1, off = (rand() - .5) * len * .55;
      const u = clamp(.55 * t.bi / 4 + .45 * rand());
      P.push({ ...s, fly: 1, clone, tx: t.x, ty: t.y, tg: t.g, ta: t.ta, out: t.out,
        cx: (sx + t.x) / 2 - dy / len * off, cy: (sy + t.y) / 2 + dx / len * off - len * .08, s: T.f0 + u * (T.f1 - T.f0 - T.dur) });
    });
    src.forEach((s, i) => { if (!used[i]) P.push({ ...s, fly: 0 }); });
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    const ctx = cv.getContext('2d');
    const Dmax = Math.max(tx, W - tx) + 70;
    R5.info = { cs: +cs.toFixed(2), n: P.length, src: src.length, tg: tg.length, per: +PER.toFixed(4), low, d };
    return { W, H, d, mob, ctx, A, P, rr, rh, tx, ty, Dmax, holdY, cs, blank: false, lastP: 0 };
  }

  function draw(p, now) {
    const { ctx: c, A, P, cs } = G;
    if (p < T.d0 - .004 || p > T.z1 + .01) { if (!G.blank) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); G.blank = true; } return; }
    G.blank = false;
    c.setTransform(G.d, 0, 0, G.d, 0, 0); c.clearRect(0, 0, G.W, G.H);
    const fd = smooth(T.d0, T.d1, p) * G.Dmax, hold = smooth(.32, .42, p) * G.holdY;
    const melt = clamp((p - (T.f0 - .04)) / .22), fz = smooth(T.z0 + .015, T.z1, p);
    const glint = smooth(T.z0 - .035, T.z0 + .01, p) * (1 - smooth(T.z0 + .03, T.z1, p));
    const tick = Math.floor(now / 1000 * 14), aw = A.cw * A.d, ah = A.ch * A.d, a = A.a, dot = 1.6;
    c.fillStyle = 'rgb(11,21,32)';
    for (let i = 0; i < P.length; i++) {
      const e = P[i]; let x = e.x, y = e.y + hold, al = e.a, g = e.g;
      const edge = fd - e.dist;
      let k = 0;
      if (e.fly) {
        k = clamp((p - e.s) / T.dur);
        if (e.clone && k <= 0) continue;
      }
      if (k <= 0) {
        if (edge < -e.r1 * 26) continue;                 // ещё целая картинка
        if (edge < 22) { c.globalAlpha = al * .9; c.fillRect(x + (e.r1 - .5) * 8, y + (e.r2 - .5) * 6, dot, dot); continue; }   // фронт: частицы
        if (edge < 90) g = SCRI[(tick + Math.floor(e.r1 * 97)) % SCRI.length];
        if (!e.fly) {                                      // лишние символы стекают и гаснут (как на слайде 2)
          if (melt > e.r2) continue;
          al *= 1 - smooth(e.r2 - .18, e.r2, melt); y += smooth(e.r2 - .25, e.r2, melt) * cs * 5;
          if (melt > e.r2 - .2 && melt > 0) g = SCRI[(tick + Math.floor(e.r1 * 97)) % SCRI.length];
        }
      } else {
        const t = easeIO(k), m = 1 - t;
        const sy = e.y + G.holdY;
        x = m * m * e.x + 2 * m * t * e.cx + t * t * e.tx; y = m * m * sy + 2 * m * t * e.cy + t * t * e.ty;
        al = al + (e.ta - al) * t; if (e.clone) al *= smooth(0, .35, k);
        g = k < 1 ? SCRI[(tick + Math.floor(e.r1 * 97)) % SCRI.length] : e.tg;
        al *= 1 - fz;
      }
      if (al < .02) continue;
      if (e.fly && e.out && k >= 1 && glint > 0) {       // контур вспыхивает светом перед тем, как застыть
        c.globalAlpha = al * (1 - glint); c.drawImage(a, g * aw, 0, aw, ah, x, y, A.cw, A.ch);
        c.globalAlpha = Math.min(1, al * glint * 1.3); c.drawImage(a, g * aw, ah, aw, ah, x, y, A.cw, A.ch);
      } else { c.globalAlpha = al; c.drawImage(a, g * aw, 0, aw, ah, x, y, A.cw, A.ch); }
    }
    c.globalAlpha = 1;
  }

  function clipHands(p) {
    const fd = G ? smooth(T.d0, T.d1, p) * G.Dmax : 0;
    let cr = '', ch = '';
    if (G && fd > 0) {
      cr = `inset(0 ${(clamp((G.rr.right - (G.tx - fd)) / G.rr.width) * 100).toFixed(2)}% 0 0)`;
      ch = `inset(0 0 0 ${(clamp((G.tx + fd - G.rh.left) / G.rh.width) * 100).toFixed(2)}%)`;
    }
    if (hR.style.clipPath !== cr) { hR.style.clipPath = cr; hR.style.webkitClipPath = cr; }
    if (hH.style.clipPath !== ch) { hH.style.clipPath = ch; hH.style.webkitClipPath = ch; }
  }

  let pS = 0, last = 0, snap = true, txtA = null, txtB = null, liveB = null, lit = null;
  R5.snap = () => { snap = true; };
  R5.frame = (now, introStart) => {
    const r = sec.getBoundingClientRect(), H = pin.clientHeight;
    const pT = clamp(-r.top / Math.max(1, r.height - H));
    const dt = last ? Math.min(100, now - last) : 16; last = now;
    if (snap || Math.abs(pT - pS) > .3) { pS = pT; snap = false; } else { pS += (pT - pS) * (1 - Math.pow(.82, dt / 16.7)); if (Math.abs(pT - pS) < 2e-4) pS = pT; }
    const p = pS; R5.p = p;
    if (r.bottom < -40) return;
    const intro = introStart ? easeIO(clamp((now - introStart) / 1900)) : 0;
    if (!G && introStart) G = setup(intro);
    if (G) G.lastP = p;
    const mob = innerWidth < 820;
    // первый экран: заголовок, подпись и кнопка уходят, руки сходятся
    const cf = 1 - smooth(0, .07, p);
    hcopy.style.opacity = cf.toFixed(3); hcopy.style.transform = `translateY(${(-smooth(0, .1, p) * 60).toFixed(1)}px)`;
    hlead.style.opacity = hcta.style.opacity = (1 - smooth(0, .045, p)).toFixed(3);
    hcta.style.visibility = p > .05 ? 'hidden' : '';
    applyPose(pose(p, Math.max(intro, smooth(0, .06, p))));
    const idle = intro >= 1 ? .75 + .25 * Math.sin(now / 520) : 0;
    spark.style.setProperty('--sp', (idle * (1 - smooth(0, .07, p)) * .9 + bell(.085, .125, .2, p) * 1.6).toFixed(3));
    const fv = bell(.105, .13, .22, p);
    fl.style.opacity = fv.toFixed(3); fl.style.transform = `scale(${(.3 + smooth(.105, .22, p) * 2.4).toFixed(3)})`;
    pin.style.setProperty('--lt', (smooth(.1, .3, p) * (1 - .45 * smooth(.74, .9, p))).toFixed(3));
    clipHands(p);
    if (G) draw(p, now);
    // тексты: «Рутина — йому, рішення — вам», потом «Куди далі»
    const a = mob ? p >= .33 && p < .5 : p >= .55, b = p >= (mob ? .52 : .6);
    if (a !== txtA) { copy.classList.toggle('in', a); txtA = a; }
    if (b !== txtB) { head.classList.toggle('in', b); txtB = b; }
    const bv = smooth(T.z0 + .01, T.z0 + .07, p);
    list.style.setProperty('--b', bv.toFixed(3));
    const lv = bv > .6; if (lv !== liveB) { list.classList.toggle('live', lv); liveB = lv; }
    const li = p > T.z0 + .075; if (li !== lit) { go.classList.toggle('lit', li); lit = li; }
  };

  /* кнопки должны работать и с клавиатуры: фокус на ещё не собранной кнопке — сразу к готовым */
  function jumpEnd() {
    const r = sec.getBoundingClientRect();
    scrollTo(0, Math.round(r.top + scrollY + sec.offsetHeight - pin.clientHeight + 2)); snap = true;
  }
  list.addEventListener('focusin', () => { if (pS < T.z1) jumpEnd(); });
  document.addEventListener('click', e => { const l = e.target.closest && e.target.closest('a[href="#go"]'); if (l) { e.preventDefault(); jumpEnd(); } });
  addEventListener('load', () => { if (location.hash === '#go') jumpEnd(); });
  let rw = 0, rhh = 0;
  addEventListener('resize', () => { clearTimeout(R5.rt); R5.rt = setTimeout(() => { if (pin.clientWidth !== rw || pin.clientHeight !== rhh) { rw = pin.clientWidth; rhh = pin.clientHeight; G = null; } }, 150); });
  rw = pin.clientWidth; rhh = pin.clientHeight;
})();
