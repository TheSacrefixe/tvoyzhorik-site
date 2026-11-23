/* Твій Жорик — круг 3b (r3, база r2). Свой JS, без библиотек и CDN.
   r3: загрузка ≤1,8 с, руки — свой 3D-рендер (раскрытие при прокрутке), шапка-стекло, появление блоков, подпись шара.
   Блоки: капля-линза (загрузка), руки (слайд 1), ASCII (слайд 2, выключается), шар частиц (слайд 3),
   панели с переходом-линзой (слайд 4), линия-алгоритм «Як це працює». */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  const root = document.documentElement;
  const ASCII_ON = root.dataset.ascii !== 'off' && !!$('#ascii');

  /* ---------------- капля-линза ---------------- */
  function drawLens(ctx, S, t, k = 1) {
    const c = S / 2, R = S * .34 * k;
    ctx.clearRect(0, 0, S, S);
    const path = new Path2D();
    for (let i = 0; i <= 140; i++) {
      const a = i / 140 * Math.PI * 2;
      const r = R * (1 + .045 * Math.sin(3 * a + t * 1.3) + .03 * Math.sin(5 * a - t * 1.9) + .018 * Math.sin(8 * a + t * 2.6));
      const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
      i ? path.lineTo(x, y) : path.moveTo(x, y);
    }
    path.closePath();
    // мягкая тень-ореол
    ctx.save(); ctx.shadowColor = 'rgba(15,30,45,.35)'; ctx.shadowBlur = S * .08; ctx.shadowOffsetY = S * .03;
    const g = ctx.createRadialGradient(c - R * .12, c - R * .1, R * .05, c, c, R * 1.05);
    g.addColorStop(0, '#02070d'); g.addColorStop(.45, '#0d2234'); g.addColorStop(.72, '#2f4d68');
    g.addColorStop(.9, '#9db3c5'); g.addColorStop(1, '#e4ecf2');
    ctx.fillStyle = g; ctx.fill(path); ctx.restore();
    // преломление по краю — тёплый и холодный ободок
    ctx.save(); ctx.clip(path);
    ctx.lineWidth = R * .09; ctx.strokeStyle = 'rgba(236,214,170,.38)'; ctx.filter = `blur(${S * .012}px)`; ctx.stroke(path);
    ctx.lineWidth = R * .04; ctx.strokeStyle = 'rgba(190,220,255,.55)'; ctx.stroke(path); ctx.filter = 'none';
    // вихрь внутри
    ctx.globalAlpha = .22; ctx.strokeStyle = '#9fc2e0'; ctx.lineWidth = 1.2;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath(); ctx.arc(c, c, R * (.25 + j * .13), t * (.6 + j * .25) + j, t * (.6 + j * .25) + j + 1.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // блик
    const h = ctx.createRadialGradient(c - R * .38, c - R * .42, 0, c - R * .38, c - R * .42, R * .45);
    h.addColorStop(0, 'rgba(255,255,255,.55)'); h.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = h; ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }

  /* ---------------- загрузка ---------------- */
  const loader = $('#loader');
  let introStart = null;
  function startIntro() { introStart = performance.now(); $('.title') && $('.title').classList.add('in'); $('.hands') && $('.hands').classList.add('lit'); }
  (function boot() {
    // разбить заголовок на буквы (текст по буквам, Atomic Motion)
    let n = 0;
    $$('.title .w').forEach(w => {
      const txt = w.textContent; w.textContent = '';
      for (const ch of txt) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.setAttribute('aria-hidden', 'true'); s.style.transitionDelay = (0.15 + n++ * 0.055) + 's'; w.appendChild(s); }
    });
    if (RM || !loader) { loader && loader.classList.add('done'); startIntro(); return; }
    const cv = $('#lens'), ctx = cv.getContext('2d'), pct = $('#pct');
    const waits = [document.fonts ? document.fonts.ready : Promise.resolve()];
    $$('img.hand').forEach(im => waits.push(im.complete ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; })));
    let done = 0; waits.forEach(p => p.then(() => done++));
    const t0 = performance.now(); let shown = 0, finished = false;
    const finish = () => { if (finished) return; finished = true; loader.classList.add('done'); startIntro(); setTimeout(() => loader.remove(), 800); };
    setTimeout(finish, 1800);                       // страница открывается в любом случае
    Promise.all(waits).then(() => setTimeout(finish, 120));   // не зависим от частоты кадров (в WebKit rAF бывает редким)
    (function tick(now) {
      if (finished) return;
      const t = (now - t0) / 1000;
      const target = done / waits.length * 100;
      shown += (target - shown) * .3;
      pct.textContent = Math.round(shown) + '%';
      drawLens(ctx, cv.width, t, 1 + .02 * Math.sin(t * 3));
      if (done >= waits.length && shown > 97) { finish(); return; }
      requestAnimationFrame(tick);
    })(t0);
  })();

  /* ---------------- слайд 1: руки ---------------- */
  if (new URLSearchParams(location.search).get('hands') === 'b') $$('img.hand.human').forEach(im => { im.srcset = im.srcset.replace(/hand-human-/g, 'hand-human-b-'); im.src = im.src.replace('hand-human-', 'hand-human-b-'); });
  const hR = $('#handRobot'), hH = $('#handHuman'), spark = $('#spark'), hello = $('.s-hands');   // r5: первый экран внутри сцены #hello
  const hbox = $('.hbox'), hcopy = $('.s-hands .copy'), hlead = $('.s-hands .lead'), hcta = $('.s-hands .cta');
  let hLast = '';
  function handsFrame(now) {
    if (window.R5 && window.R5.on) return;   // r5fix: сцену «руки → код → кнопки» ведёт свой цикл assets/r5/r5.js
    const vw = innerWidth;
    const intro = RM ? 1 : (introStart ? easeIO(clamp((now - introStart) / 1900)) : 0);
    const r = hello.getBoundingClientRect();
    if (r.bottom < 0) return;
    const sp = clamp(-r.top / (r.height * .9));
    const mob = vw < 820;
    const away = (1 - intro) * (mob ? .7 : .3);               // при старте руки приходят с краёв
    const open = sp * (mob ? .1 : .07);                       // при прокрутке — медленно расходятся
    const key = `${away.toFixed(4)}|${sp.toFixed(4)}|${intro >= 1 ? Math.round(now / 40) : 0}`;
    if (key === hLast) return; hLast = key;
    hR.style.setProperty('--rx', `${(-away - open) * vw}px`);
    hH.style.setProperty('--hx', `${(away + open) * vw}px`);
    hbox.style.setProperty('--hz', (1 + sp * .12).toFixed(4));
    const pulse = intro >= 1 ? .75 + .25 * Math.sin(now / 520) : 0;
    spark.style.setProperty('--sp', (pulse * (1 - sp * 2.5)).toFixed(3));
    const fade = (1 - smooth(.5, 1, sp)).toFixed(3);
    hR.style.opacity = hH.style.opacity = fade;
    const cf = 1 - smooth(.02, .4, sp);
    hcopy.style.opacity = cf.toFixed(3); hcopy.style.transform = `translateY(${(-sp * 60).toFixed(1)}px)`;
    hlead.style.opacity = hcta.style.opacity = (1 - smooth(0, .22, sp)).toFixed(3);
    hcta.style.visibility = sp > .24 ? 'hidden' : '';
  }

  /* ---------------- слайд 2: ASCII ---------------- */
  const A = { cv: $('#asciiCv'), sec: $('#ascii'), copy: $('#aCopy'), cells: [], img: null, rect: null, cs: 10, W: 0, H: 0, last: -1 };
  const RAMP = ' .:-=+*#%@', SCR = '01<>/\\|_=+*#%@$&?ЖTZ';
  function asciiSetup() {
    if (!ASCII_ON || !A.img || !A.img.complete) return;
    const W = A.cv.clientWidth, H = A.cv.clientHeight, d = Math.min(DPR(), 1.5);
    A.W = W; A.H = H; A.cv.width = W * d; A.cv.height = H * d; A.ctx = A.cv.getContext('2d'); A.ctx.setTransform(d, 0, 0, d, 0, 0);
    const mob = W < 820; A.cs = mob ? 7 : 10;
    // кадр рендера: слева предплечье, справа кисть; на телефоне — только кисть (с 44% ширины), на десктопе — с 18%
    const nw = A.img.naturalWidth, nh = A.img.naturalHeight, sx = nw * (mob ? .44 : .18), sw = nw - sx;
    A.src = { sx, sw, nh };
    const iw = mob ? W * .94 : Math.min(W * .46, W - Math.min(620, W * .44) - 120, 900), ih = iw * nh / sw;
    const x = mob ? W * .03 : W * .02, y = mob ? Math.max(70, H * .1) : (H - ih) / 2;
    A.rect = { x, y, w: iw, h: ih };
    const cols = Math.ceil(iw / A.cs), rows = Math.ceil(ih / (A.cs * 1.25));
    const oc = document.createElement('canvas'); oc.width = cols; oc.height = rows;
    const o = oc.getContext('2d'); o.drawImage(A.img, A.src.sx, 0, A.src.sw, A.src.nh, 0, 0, cols, rows);
    const px = o.getImageData(0, 0, cols, rows).data; A.cells = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 4, a = px[k + 3] / 255; if (a < .2) continue;
      const lum = (px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11) / 255;
      const dens = clamp(.38 + (1 - lum) * 1.0);
      A.cells.push({ x: x + i * A.cs, y: y + j * A.cs * 1.25, a, dens, ch: RAMP[Math.max(1, Math.round(dens * (RAMP.length - 1)))], r1: Math.random(), r2: .12 + Math.random() * .88 });
    }
    const sym = getComputedStyle(A.sec).getPropertyValue('--a-sym').trim() || '11,21,32';
    A.sym = sym; A.last = -1;
  }
  function asciiFrame(force) {
    if (!ASCII_ON || !A.ctx) return;
    const r = A.sec.getBoundingClientRect();
    if (!RM && (r.bottom < -50 || r.top > innerHeight + 50)) return;
    let p = RM ? .34 : clamp(-r.top / (r.height - innerHeight));
    if (!force && Math.abs(p - A.last) < .0005 && !(p > .05 && p < .95)) return;
    A.last = p;
    const c = A.ctx, R = A.rect, cs = A.cs;
    c.clearRect(0, 0, A.W, A.H);
    const wipe = smooth(.04, .42, p);
    const front = R.x + R.w - wipe * (R.w + 60);      // рука рассыпается от кончика пальца к запястью
    const melt = clamp((p - .36) / .52);
    // целая часть картинки
    if (front > R.x) {
      c.save(); c.beginPath(); c.rect(R.x - 2, 0, front - R.x + 2, A.H); c.clip();
      c.globalAlpha = 1 - smooth(.3, .44, p); c.drawImage(A.img, A.src.sx, 0, A.src.sw, A.src.nh, R.x, R.y, R.w, R.h); c.restore();
    }
    c.font = `${Math.round(cs * 1.22)}px ui-monospace,Consolas,Menlo,monospace`; c.textBaseline = 'top';
    c.fillStyle = `rgb(${A.sym})`;
    const t = performance.now() / 1000;
    for (const e of A.cells) {
      const edge = e.x - front;
      if (edge < -e.r1 * 26) continue;
      if (melt > e.r2) continue;
      const fa = 1 - smooth(e.r2 - .18, e.r2, melt);
      const dy = smooth(e.r2 - .25, e.r2, melt) * cs * 5;
      let al = e.a * (.28 + .72 * e.dens) * fa;
      if (edge < 22) { // фронт: частицы, а не символы
        c.globalAlpha = al * .9; c.fillRect(e.x + (e.r1 - .5) * 8, e.y + dy + (e.r2 - .5) * 6, 1.6, 1.6); continue;
      }
      let ch = e.ch;
      if (edge < 90 || (melt > e.r2 - .2 && melt > 0)) ch = SCR[(Math.floor(t * 14 + e.r1 * 97)) % SCR.length];
      c.globalAlpha = al; c.fillText(ch, e.x, e.y + dy);
    }
    c.globalAlpha = 1;
    if (p > .05 || r.top < innerHeight * .35) A.copy.classList.add('in');
  }
  if (ASCII_ON) {
    A.img = new Image(); A.img.src = '/assets/r2/hand-robot-820.webp';
    A.img.onload = () => { asciiSetup(); asciiFrame(true); };
  }

  /* ---------------- слайд 3: шар из частиц ---------------- */
  const S = { cv: $('#sphereCv'), sec: $('#sphere'), veil: $('#veil'), cap: $('#sCap'), pts: null, vis: false };
  function sphereSetup() {
    const W = S.cv.clientWidth, H = S.cv.clientHeight, d = DPR();
    S.W = W; S.H = H; S.d = d; S.cv.width = W * d; S.cv.height = H * d; S.ctx = S.cv.getContext('2d');
    const N = W < 820 ? 2800 : 5600; const P = new Float32Array(N * 5);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const inner = Math.random() < .1;
      const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = ga * i;
      const rad = inner ? .55 + Math.random() * .4 : 1 + (Math.random() - .5) * .07;
      P[i * 5] = Math.cos(th) * rr * rad; P[i * 5 + 1] = y * rad; P[i * 5 + 2] = Math.sin(th) * rr * rad;
      P[i * 5 + 3] = Math.random(); P[i * 5 + 4] = Math.random();
    }
    S.pts = P; S.N = N;
  }
  function sphereFrame(now) {
    if (!S.pts) return;
    const r = S.sec.getBoundingClientRect();
    if (!RM && (r.bottom < 0 || r.top > innerHeight)) { S.vis = false; S.dark = false; return; }
    S.vis = true;
    const p = RM ? .5 : clamp(-r.top / (r.height - innerHeight));
    const veil = RM ? 0 : clamp(clamp(r.top / innerHeight) * 1.1 + smooth(.86, 1, p));   // тёмное проявляется, пока секция въезжает в экран — без пустого экрана
    S.sec.style.setProperty('--veil', veil.toFixed(3)); S.sec.style.setProperty('--fe', Math.min(50, veil * 60).toFixed(1) + '%');
    if (S.cap) S.cap.style.setProperty('--cap', (RM ? 1 : smooth(.4, .56, clamp((innerHeight - r.top) / r.height)) * (1 - smooth(.8, .9, clamp((innerHeight - r.top) / r.height)))).toFixed(3));
    S.dark = veil < .5 && r.top < 40 && r.bottom > 60;
    const c = S.ctx, d = S.d, W = S.W * d, H = S.H * d;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * (S.W < 820 ? .36 : .30);
    const p2 = clamp((innerHeight - r.top) / r.height);   // от въезда секции в экран до конца закрепления
    const asm = RM ? 1 : smooth(.12, .5, p2), burst = RM ? 0 : smooth(.84, 1, p2);
    const t = RM ? 0 : now / 1000;
    const ay = t * .16 + p * 1.6, ax = .32;
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    c.globalCompositeOperation = 'lighter';
    const P = S.pts, sz = 1.8 * d;
    for (let i = 0; i < S.N; i++) {
      let x = P[i * 5], y = P[i * 5 + 1], z = P[i * 5 + 2]; const q = P[i * 5 + 3], w = P[i * 5 + 4];
      const spread = (1 - asm) * (2.2 + q * 2.5) + burst * (1.5 + w * 3);
      const k = 1 + spread;
      x *= k; y *= k; z *= k;
      let X = x * cy + z * sy, Z = -x * sy + z * cy; let Y = y * cx - Z * sx; Z = y * sx + Z * cx;
      const pr = 3.2 / (3.2 + Z);
      const px = W / 2 + X * R * pr, py = H * .44 + Y * R * pr;
      const front = (1 - Z) * .5;   // 0 — сзади, 1 — спереди
      const a = Math.min(1, (.5 + 1.1 * front) * (.7 + .5 * q)) * (1 - burst * .9) * (.25 + .75 * asm);
      c.fillStyle = q > .8 ? `rgba(255,255,255,${a})` : `rgba(214,232,250,${a})`;
      c.fillRect(px, py, sz * (q > .97 ? 1.8 : 1), sz * (q > .97 ? 1.8 : 1));
    }
    c.globalCompositeOperation = 'source-over';
  }

  /* ---------------- общий цикл ---------------- */
  let raf = 0;
  function loop(now) {
    handsFrame(now);
    asciiFrame(false);
    sphereFrame(now);
    let dark = !!S.dark;
    if (ASCII_ON && root.dataset.abg === '3') { const ar = A.sec.getBoundingClientRect(); if (ar.top < 40 && ar.bottom > 60) dark = true; }
    const top = $('#top'), y = scrollY;
    top.classList.toggle('on-dark', dark);
    top.classList.toggle('float', y > 24);
    if (innerWidth < 820 && !openPanel) {
      const dy = y - (loop.y || 0);
      if (y > innerHeight * .9 && dy > 6) top.classList.add('hide');
      else if (dy < -6 || y < innerHeight * .5) top.classList.remove('hide');
    } else top.classList.remove('hide');
    loop.y = y;
    if (!RM) raf = requestAnimationFrame(loop);
  }
  function resize() { asciiSetup(); asciiFrame(true); sphereSetup(); if (RM) loop(performance.now()); if (algo.ready) algoLayout(); }
  addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
  if (RM) addEventListener('scroll', () => loop(performance.now()), { passive: true });

  /* ---------------- панели: переход по нажатию ---------------- */
  let openPanel = null, opener = null;
  const ripple = $('#ripple');
  function open(id, from, ev) {
    const pn = document.getElementById(id); if (!pn) return;
    if (openPanel && openPanel !== pn) closePanel(true);
    let x = innerWidth / 2, y = innerHeight / 2;
    if (ev && ev.clientX) { x = ev.clientX; y = ev.clientY; }
    else if (from) { const b = from.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top + b.height / 2; }
    pn.style.setProperty('--cx', x + 'px'); pn.style.setProperty('--cy', y + 'px');
    if (!RM && ripple.animate) {
      ripple.style.left = (x - 5) + 'px'; ripple.style.top = (y - 5) + 'px';
      ripple.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: .9, transform: 'scale(9)', offset: .35 }, { opacity: 0, transform: 'scale(60)' }],
        { duration: 1000, easing: 'cubic-bezier(.22,.8,.2,1)' });
    }
    pn.scrollTop = 0; pn.classList.add('open'); openPanel = pn; opener = from;
    document.body.style.overflow = 'hidden';
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    setTimeout(() => { const b = pn.querySelector('[data-close]'); b && b.focus({ preventScroll: true }); }, 50);
    if (id === 'p-how') setTimeout(() => { algoLayout(); algoGo(0, true); if (!RM) setTimeout(() => algoGo(1), 700); }, RM ? 0 : 450);
  }
  function closePanel(silent) {
    if (!openPanel) return;
    if (opener) { const b = opener.getBoundingClientRect(); openPanel.style.setProperty('--cx', b.left + b.width / 2 + 'px'); openPanel.style.setProperty('--cy', b.top + b.height / 2 + 'px'); }
    openPanel.classList.remove('open'); openPanel = null;
    document.body.style.overflow = '';
    if (!silent && location.hash) history.pushState(null, '', location.pathname + location.search);
    opener && opener.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); open(o.dataset.open, o, e); return; }
    if (e.target.closest('[data-close]')) { e.preventDefault(); closePanel(); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); if (openPanel && openPanel.id === 'p-how') { if (e.key === 'ArrowRight') algoGo(algo.cur + 1); if (e.key === 'ArrowLeft') algoGo(algo.cur - 1); } });
  addEventListener('popstate', () => { const id = location.hash.slice(1); if (id && document.getElementById(id) && document.getElementById(id).classList.contains('panel')) open(id); else closePanel(true); });

  /* ---------------- «Як це працює»: линия-алгоритм ---------------- */
  const algo = { el: $('#algo'), steps: $$('#steps .step'), cur: 0, len: 0, L: [], total: 0, ready: false, anim: 0 };
  const wire = $('#wire');
  function seg(a, b, horiz) {
    // десктоп: вверх на «полосу» над кружками → вправо → вниз в следующий кружок; мобильная: влево → вниз → вправо
    const r = 14;
    if (horiz) {
      const ly = Math.min(a.y, b.y) - 40, sx = Math.sign(b.x - a.x) || 1;
      return `L${a.x},${ly + r} Q${a.x},${ly} ${a.x + sx * r},${ly} L${b.x - sx * r},${ly} Q${b.x},${ly} ${b.x},${ly + r} L${b.x},${b.y}`;
    }
    const lx = Math.min(a.x, b.x) - 40, sy = Math.sign(b.y - a.y) || 1;
    return `L${lx + r},${a.y} Q${lx},${a.y} ${lx},${a.y + sy * r} L${lx},${b.y - sy * r} Q${lx},${b.y} ${lx + r},${b.y} L${b.x},${b.y}`;
  }
  function algoLayout() {
    const box = algo.el.getBoundingClientRect(); if (!box.width) return;
    const pts = algo.steps.map(s => { const b = s.querySelector('.ring').getBoundingClientRect(); return { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top }; });
    const horiz = innerWidth > 820;
    let d = `M${pts[0].x},${pts[0].y}`; const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    wire.appendChild(tmp); algo.L = [0];
    for (let i = 1; i < pts.length; i++) { d += ' ' + seg(pts[i - 1], pts[i], horiz); tmp.setAttribute('d', d); algo.L.push(tmp.getTotalLength()); }
    tmp.remove();
    wire.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    $$('#wire path').forEach(p => p.setAttribute('d', d));
    algo.total = algo.L[algo.L.length - 1];
    const live = wire.querySelector('.live'), glow = wire.querySelector('.glow');
    [live, glow].forEach(p => { p.style.strokeDasharray = algo.total + 1; });
    algo.ready = true; algoDraw(algo.L[algo.cur] || 0);
  }
  function algoDraw(len) {
    algo.len = len;
    const off = algo.total + 1 - len;
    wire.querySelector('.live').style.strokeDashoffset = off; wire.querySelector('.glow').style.strokeDashoffset = off;
    const pt = wire.querySelector('.live').getPointAtLength(Math.max(0, len));
    const dot = wire.querySelector('.dot'); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
  }
  function algoGo(i, instant) {
    if (!algo.ready) algoLayout();
    i = clamp(i, 0, algo.steps.length - 1); const from = algo.len, to = algo.L[i];
    algo.cur = i;
    algo.steps.forEach((s, k) => { s.classList.toggle('cur', k === i); });
    $('#algoCount').textContent = `${i} / ${algo.steps.length - 1}`;
    cancelAnimationFrame(algo.anim);
    const lit = () => algo.steps.forEach((s, k) => s.classList.toggle('on', algo.L[k] <= algo.len + 2));
    if (instant || RM) { algoDraw(to); lit(); return; }
    const t0 = performance.now(), dur = 900 + Math.abs(to - from) * .5;
    (function step(now) {
      const k = clamp((now - t0) / dur); algoDraw(from + (to - from) * easeIO(k)); lit();
      if (k < 1) algo.anim = requestAnimationFrame(step);
    })(t0);
  }
  algo.steps.forEach((s, k) => s.querySelector('.node').addEventListener('click', () => algoGo(k)));
  $('#algoNext').addEventListener('click', () => algoGo(algo.cur >= algo.steps.length - 1 ? 0 : algo.cur + 1));
  $('#algoPrev').addEventListener('click', () => algoGo(algo.cur - 1));

  /* ---------------- появление блоков при прокрутке ---------------- */
  if (!RM && 'IntersectionObserver' in window) {
    const rv = $$('.s-go .head > :not(.key), .go-list li, .foot');
    rv.forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = (el.matches('.go-list li') ? [...el.parentNode.children].indexOf(el) * .07 : 0) + 's'; });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(el => io.observe(el));
  }

  /* ---------------- старт ---------------- */
  sphereSetup();
  if (RM) { loop(performance.now()); addEventListener('load', () => { asciiSetup(); loop(performance.now()); }); } else raf = requestAnimationFrame(loop);
  const h0 = location.hash.slice(1);
  if (h0 && document.getElementById(h0) && document.getElementById(h0).classList.contains('panel')) setTimeout(() => open(h0), RM ? 0 : 1300);
  window.__r2 = { open, closePanel, algoGo };
})();
