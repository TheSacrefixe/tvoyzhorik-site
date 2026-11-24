/* kat3.js — круг kat3 по замечаниям Кэт 24.11 (личка MSG 11698–11703). Заменяет kat1.js на главной uk/en
   (на остальных страницах kat1.js остаётся — там только клавиша TZ).
   - клавиша TZ в шапке: вдавливание при касании (как kat1, без изменений);
   - Бібліотека: переход «стопка → ряд» по механике образца, без круга; карточка на телефоне целиком в экране;
   - экран 5 кнопок: матрица на весь экран — плотные символы собираются в объёмную голову, она поворачивается,
     переливается и рассыпается (тёмный фон, как в образце).
   Без внешних запросов. Ошибка здесь не ломает остальной сайт (всё в try). */
(function () {
  'use strict';
  var d = document, W = window, root = d.documentElement;
  var RM = !W.matchMedia || W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (q, r) { return (r || d).querySelector(q); };
  var $$ = function (q, r) { return [].slice.call((r || d).querySelectorAll(q)); };

  /* ---------- клавиша TZ ---------- */
  function keyPress() {
    d.addEventListener('touchstart', function () {}, { passive: true });   // iPhone включает :active только с обработчиком
    $$('a.brand, a.r4brand').forEach(function (a) {
      if (!a.querySelector('img.tzk')) return;
      var up = function () { a.classList.remove('tzk-down'); };
      a.addEventListener('pointerdown', function () { a.classList.add('tzk-down'); });
      ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(function (e) { a.addEventListener(e, up); });
    });
  }

  /* ---------- Бібліотека: «стопка → ряд» (kat3, Кэт MSG 11700–11703) ----------
     Механика по образцу (разбор кадров MSG 11206, 12 к/с): карточки лежат стопкой плашмя (наклон ~72° от зрителя),
     поднимаются, по пути поворачиваются боком и расходятся в ряд; в ряду — лёгкие разные наклоны и высоты.
     Время ~1,1 с на карточку, сдвиг между карточками ~70 мс (в образце весь переход ~1,4 с). По кругу НЕ листается:
     на телефоне ряд — обычная лента под палец (родная прокрутка с примагничиванием), карточка по центру целиком в экране;
     на компьютере весь ряд виден сразу. Своя вёрстка и код, ничего из образца не взято. */
  function fan() {
    var panel = $('#p-lib'), box = panel && $('.cards', panel);
    if (!box) return;
    var cards = $$('.card', box), n = cards.length;
    if (n < 2) return;
    var uk = (root.lang || 'uk').indexOf('uk') === 0;
    var wrap = d.createElement('div'); wrap.className = 'kfan-wrap k3wrap';
    var sc = d.createElement('div'); sc.className = 'k3sc';
    box.parentNode.insertBefore(wrap, box); wrap.appendChild(sc); sc.appendChild(box);
    box.classList.add('kfan3');
    /* слот — неподвижная ячейка ленты (к ней примагничивается прокрутка), наклон — у карточки внутри;
       иначе WebKit считает точки примагничивания по повёрнутым карточкам и одно касание «→» уезжает на несколько */
    var slots = cards.map(function (c) { var s = d.createElement('div'); s.className = 'k3slot'; box.insertBefore(s, c); s.appendChild(c); return s; });
    box.setAttribute('aria-roledescription', uk ? 'ряд карток' : 'card row');
    var ctl = d.createElement('div'); ctl.className = 'kfan-ctl';
    var prev = d.createElement('button'); prev.type = 'button'; prev.className = 'metal sm'; prev.textContent = '←'; prev.setAttribute('aria-label', uk ? 'Попередня картка' : 'Previous card');
    var next = d.createElement('button'); next.type = 'button'; next.className = 'metal dark sm'; next.textContent = '→'; next.setAttribute('aria-label', uk ? 'Наступна картка' : 'Next card');
    var dots = d.createElement('div'); dots.className = 'kfan-dots';
    cards.forEach(function (c, i) {
      var b = d.createElement('button'); b.type = 'button';
      b.setAttribute('aria-label', (uk ? 'Картка ' : 'Card ') + (i + 1) + ' / ' + n);
      b.addEventListener('click', function () { go(i); });
      dots.appendChild(b);
    });
    ctl.appendChild(prev); ctl.appendChild(dots); ctl.appendChild(next);
    wrap.appendChild(ctl);
    var TILT = [-4.5, 3.5, -2.5, 4.5, -3.5, 2.5], LIFT = [10, -8, 4, -12, 6, -4];
    var cw = 300, gap = 16, row = false, cur = 0, raf = 0, playing = false, anims = [], tgt = 0, progUntil = 0;
    var M = W.KFAN = { n: n, cur: 0, moves: 0, go: null, mode: '', intro: 0 };
    function rest(i, dist) {
      var a = Math.min(1, Math.abs(dist)), t = TILT[i % 6] * (row ? 1 : 0.25 + 0.75 * a), y = LIFT[i % 6] * (row ? 1 : a);
      var ry = Math.max(-28, Math.min(28, -dist * (row ? 7 : 22))), s = row ? 1 : 1 - 0.04 * a;
      return 'perspective(1000px) translate3d(0,' + y.toFixed(1) + 'px,0) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + t.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
    }
    function dists() {
      var mid = sc.scrollLeft + sc.clientWidth / 2;
      return slots.map(function (c, i) { return row ? (i - (n - 1) / 2) / (n / 2) : (c.offsetLeft + c.offsetWidth / 2 - mid) / (cw + gap); });
    }
    function render() {
      raf = 0;
      var ds = dists(), best = 0;
      cards.forEach(function (c, i) {
        if (!playing) c.style.transform = rest(i, ds[i]);
        slots[i].style.zIndex = String(50 - Math.round(Math.abs(ds[i]) * 10));
        if (Math.abs(ds[i]) < Math.abs(ds[best])) best = i;
      });
      if (!row) {
        cur = performance.now() < progUntil ? tgt : best; M.cur = cur;
        cards.forEach(function (c, i) { c.classList.toggle('kf-cur', i === cur); c.setAttribute('aria-hidden', 'false'); });
        $$('button', dots).forEach(function (b, i) { b.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
      }
    }
    function req() { if (!raf) raf = requestAnimationFrame(render); }
    function layout() {
      var ww = wrap.clientWidth || 360;
      gap = ww < 700 ? 14 : 16;
      var rw = (ww - gap * (n - 1)) / n;
      row = ww >= 900 && rw >= 168;
      wrap.classList.toggle('k3row', row);
      var pw = row ? ww : (sc.clientWidth || ww);                     // лента — на всю ширину экрана
      cw = row ? Math.floor(Math.min(250, rw)) : Math.round(Math.min(310, pw - 88));
      box.style.setProperty('--k3w', cw + 'px'); box.style.setProperty('--k3gap', gap + 'px');
      box.style.setProperty('--k3pad', row ? '0px' : Math.max(0, (pw - cw) / 2) + 'px');
      M.mode = row ? 'row' : 'strip'; M.cw = cw;
      render();
    }
    function go(i) {
      i = Math.max(0, Math.min(n - 1, i)); M.moves++;
      if (row) { cur = i; M.cur = i; return; }
      var c = slots[i];
      tgt = i; progUntil = performance.now() + 750;
      sc.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - sc.clientWidth / 2, behavior: RM ? 'auto' : 'smooth' });
      cur = i; M.cur = i; req();
    }
    M.go = go;
    prev.addEventListener('click', function () { go(cur - 1); });
    next.addEventListener('click', function () { go(cur + 1); });
    cards.forEach(function (c, i) { c.addEventListener('click', function () { if (!dragMoved && !row && i !== cur) go(i); }); });
    sc.addEventListener('scroll', req, { passive: true });
    /* мышь на компьютере (когда ряд не помещается) — тянуть ленту; палец — родная прокрутка */
    var dx0 = 0, sl0 = 0, mdrag = false, dragMoved = false;
    sc.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || row || e.button) return; mdrag = true; dragMoved = false; dx0 = e.clientX; sl0 = sc.scrollLeft; sc.classList.add('drag'); });
    W.addEventListener('pointermove', function (e) { if (!mdrag) return; var dx = e.clientX - dx0; if (Math.abs(dx) > 6) dragMoved = true; sc.scrollLeft = sl0 - dx; });
    W.addEventListener('pointerup', function () {
      if (!mdrag) return; mdrag = false; sc.classList.remove('drag');
      var ds = dists(), b = 0; ds.forEach(function (v, i) { if (Math.abs(v) < Math.abs(ds[b])) b = i; });
      var moved = sc.scrollLeft - sl0; if (b === cur && Math.abs(moved) > 40) b = cur + (moved > 0 ? 1 : -1);
      go(b); setTimeout(function () { dragMoved = false; }, 0);
    });
    d.addEventListener('keydown', function (e) {
      if (!panel.classList.contains('open')) return;
      if (e.key === 'ArrowRight') go(cur + 1);
      if (e.key === 'ArrowLeft') go(cur - 1);
    });
    /* вход: стопка → ряд */
    function intro() {
      if (RM || !cards[0].animate) return;
      anims.forEach(function (a) { try { a.cancel(); } catch (_) {} }); anims = [];
      sc.scrollLeft = 0; layout();
      var mid = sc.scrollLeft + sc.clientWidth / 2, ds = dists(), t0 = performance.now();
      playing = true; M.intro++;
      cards.forEach(function (c, i) {
        var cx = slots[i].offsetLeft + slots[i].offsetWidth / 2, dx = mid - cx, k = i - (n - 1) / 2;
        var end = rest(i, ds[i]);
        var a = c.animate([
          { transform: 'perspective(1000px) translate3d(' + dx.toFixed(1) + 'px,' + (36 + k * 15).toFixed(1) + 'px,0) rotateX(72deg) rotateY(0deg) rotateZ(-9deg) scale(.8)', opacity: 0, offset: 0 },
          { transform: 'perspective(1000px) translate3d(' + dx.toFixed(1) + 'px,' + (30 + k * 15).toFixed(1) + 'px,0) rotateX(70deg) rotateY(0deg) rotateZ(-9deg) scale(.8)', opacity: 1, offset: 0.12 },
          { transform: 'perspective(1000px) translate3d(' + (dx * 0.5).toFixed(1) + 'px,' + (8 + k * 6).toFixed(1) + 'px,0) rotateX(28deg) rotateY(-32deg) rotateZ(9deg) scale(.9)', opacity: 1, offset: 0.55 },
          { transform: end, opacity: 1, offset: 1 }
        ], { duration: 1100, delay: (n - 1 - i) * 70, easing: 'cubic-bezier(.22,.8,.24,1)', fill: 'backwards' });
        anims.push(a);
      });
      var last = anims[0];
      last.onfinish = last.oncancel = function () { playing = false; anims = []; M.introMs = Math.round(performance.now() - t0); render(); };
    }
    function stop() { if (playing) { anims.forEach(function (a) { try { a.finish(); } catch (_) {} }); } }
    sc.addEventListener('touchstart', function () { stop(); progUntil = 0; }, { passive: true });
    sc.addEventListener('pointerdown', stop);
    layout();
    var rt = 0; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(layout);
    var wasOpen = false;
    new MutationObserver(function () {
      var o = panel.classList.contains('open');
      if (o && !wasOpen) setTimeout(function () { layout(); intro(); }, 260);
      wasOpen = o;
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- экран 5 кнопок: матрица-голова на весь экран (kat3, Кэт MSG 11698–11699) ----------
     Образец по виду и механике — видео ASCII (MSG 11239): тёмный фон, плотные светлые символы, крупная объёмная голова,
     символы собираются в голову, она поворачивается и переливается, потом рассыпается — по кругу.
     Голова — своя 3D-модель (head_sdf.py, рендер поворота −60…+60°, лента head-yaw.webp: R — свет, G — глубина).
     Телефон — одна голова на весь экран; широкий экран — две, лицом к кнопкам. canvas + requestAnimationFrame,
     реже рисуем на слабых устройствах, пауза вне экрана и на скрытой вкладке, при prefers-reduced-motion — один неподвижный кадр. */
  function matrix() {
    var pin = $('.r5pin'), go = $('#r5go');
    if (!pin || !go || !root.classList.contains('r5a')) return;
    var cv = d.createElement('canvas'); cv.className = 'kmx3'; cv.setAttribute('aria-hidden', 'true');
    pin.insertBefore(cv, go);
    var cx = cv.getContext('2d');
    if (!cx) return;
    var LV = ['.', ':', '-~', '=+', 'ic', 'ox', 'za', 'nu', 'XZ', 'OQ', '08', '$&', '#%', 'BW', '@M'], NL = LV.length;
    var GL = LV.join('').split(''), GI = [], q = 0;
    LV.forEach(function (s) { GI.push([]); for (var k = 0; k < s.length; k++) GI[GI.length - 1].push(q++); });
    var NG = GL.length, AMB = '01<>{}[]/=+*#:;ЖТZ$%&?ab'.split('');
    var FN = 25, FW = 96, FH = 128, sheet = null;
    var T = 12.0, TA0 = 0.2, TA1 = 2.6, TS0 = 8.6, TS1 = 10.6;
    var Wd = 0, Hd = 0, D = 1, cw = 8, rh = 10, A = null, AA = null, heads = [], amb = [], cols = 0, rows = 0;
    var raf = 0, vis = false, t0 = 0, run = false, built = false;
    var M = W.KMX = { frames: 0, fps: 0, parts: 0, heads: 0, on: false, slow: 0, v: 'kat3' };
    function atlas(px, chars, col) {
      var w = Math.ceil(px * 0.62 * D) + 2, h = Math.ceil(px * 1.2 * D), c = d.createElement('canvas'), x;
      c.width = w * chars.length; c.height = h; x = c.getContext('2d');
      x.fillStyle = col; x.font = '600 ' + (px * D).toFixed(1) + 'px ui-monospace,SFMono-Regular,Menlo,Consolas,"Courier New",monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      chars.forEach(function (g, i) { x.fillText(g, i * w + w / 2, h / 2); });
      return { c: c, w: w, h: h };
    }
    function load() {
      var img = new Image();
      img.onload = function () {
        try {
          var c = d.createElement('canvas'); c.width = img.width; c.height = img.height;
          var x = c.getContext('2d'); x.drawImage(img, 0, 0);
          var px = x.getImageData(0, 0, c.width, c.height).data, L = new Uint8Array(c.width * c.height), Z = new Uint8Array(c.width * c.height);
          for (var i = 0; i < L.length; i++) { L[i] = px[i * 4]; Z[i] = px[i * 4 + 1]; }
          sheet = { w: c.width, L: L, Z: Z };
          if (Wd) build();
        } catch (_) {}
      };
      img.src = '/assets/kat3/head-yaw.webp?v=kat3';
    }
    function size() {
      var r = pin.getBoundingClientRect();
      Wd = Math.round(r.width); Hd = Math.round(r.height);
      if (!Wd || !Hd) return;
      D = Math.min(2, W.devicePixelRatio || 1);
      D = Math.min(D, Math.sqrt(1300000 / (Wd * Hd)));
      cv.width = Math.round(Wd * D); cv.height = Math.round(Hd * D);
      cw = Wd < 700 ? 7.4 : 9.2; rh = Math.round(cw * 1.34 * 10) / 10;
      cols = Math.ceil(Wd / cw); rows = Math.ceil(Hd / rh);
      A = atlas(rh * 0.98, GL, '#e6eef5');
      AA = atlas(rh * 0.9, AMB, '#7f93a6');
      amb = [];
      var na = Math.round(cols * rows * 0.035);
      for (var i = 0; i < na; i++) amb.push({ x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows), g: Math.floor(Math.random() * AMB.length), a: Math.random(), v: 0.15 + Math.random() * 0.5 });
      build();
    }
    function regions() {
      var g = $('.go-list', go) || go, r = g.getBoundingClientRect(), p = pin.getBoundingClientRect();
      var L = r.left - p.left, R = p.right - r.right, Tp = r.top - p.top, B = p.bottom - r.bottom, out = [], hh, hw, ov, ey, cy;
      if (L >= 250 && R >= 250 && Wd >= 1000) {
        ov = Math.min(70, L * 0.16);                                   // голова чуть заходит за кнопки
        hw = Math.min(L + ov, Hd * 1.0 * 0.75); hh = hw / 0.75;
        out.push({ x: L + ov - hw, y: (Hd - hh) / 2 + Hd * 0.03, w: hw, h: hh, flip: false, base: 4, amp: 22 });
        out.push({ x: Wd - R - ov, y: (Hd - hh) / 2 + Hd * 0.03, w: hw, h: hh, flip: true, base: 4, amp: 22 });
      } else {
        /* телефон: лицо на весь экран — глаза в просвете над кнопками, подбородок — под ними, щёки по краям */
        ey = Math.max(40, Tp * 0.6); cy = Tp + r.height + Math.max(20, B * 0.45);
        hh = Math.max(Hd * 0.95, Math.min(Hd * 2.3, (cy - ey) / (0.84 - 0.423))); hw = hh * 0.75;
        out.push({ x: (Wd - hw) / 2, y: ey - 0.423 * hh, w: hw, h: hh, flip: false, base: 0, amp: 26 });
      }
      return out;
    }
    function build() {
      if (!sheet || !Wd) return;
      heads = regions(); var np = 0, pr = pin.getBoundingClientRect(); M.skip = 0;
      var cover = $$('.go', go).map(function (b) { var r = b.getBoundingClientRect(); return [r.left - pr.left + 3, r.top - pr.top + 3, r.right - pr.left - 3, r.bottom - pr.top - 3]; });
      function hidden(x, y) {   // символ целиком под непрозрачной кнопкой — не рисуем (кнопки стоят, пока идёт фон)
        for (var k = 0; k < cover.length; k++) { var c = cover[k]; if (x >= c[0] && y >= c[1] && x + cw <= c[2] && y + rh <= c[3]) return true; }
        return false;
      }
      heads.forEach(function (q, hi) {
        var c0 = Math.max(0, Math.floor(q.x / cw)), c1 = Math.min(cols - 1, Math.ceil((q.x + q.w) / cw));
        var r0 = Math.max(0, Math.floor(q.y / rh)), r1 = Math.min(rows - 1, Math.ceil((q.y + q.h) / rh));
        var P = [], ccx = q.x + q.w / 2, ccy = q.y + q.h * 0.42;
        for (var j = r0; j <= r1; j++) for (var i = c0; i <= c1; i++) {
          var x = Math.round(i * cw), y = Math.round(j * rh), u = (x + cw / 2 - q.x) / q.w, v = (y + rh / 2 - q.y) / q.h;
          if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
          if (hidden(x, y)) { M.skip++; continue; }
          var sx = Math.floor((q.flip ? 1 - u : u) * FW), sy = Math.floor(v * FH);
          var ddx = x - ccx, ddy = y - ccy, dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1, rnd = Math.random();
          P.push({ x: x, y: y, o: sy * sheet.w + sx, g: 0,
            tA: TA0 + (TA1 - TA0 - 0.9) * (0.55 * v + 0.45 * rnd),                     // сборка сверху вниз, с разбросом
            sx: ddx / dl * (60 + Math.random() * Hd * 0.45), sy: ddy / dl * (60 + Math.random() * Hd * 0.45) - 40,
            tS: TS0 + (TS1 - TS0 - 1.2) * (0.6 * Math.random() + 0.4 * (1 - v)),        // рассыпается снизу вверх, «пыль»
            vx: (Math.random() - 0.3) * 80, vy: -30 - Math.random() * 90, r: rnd });
        }
        q.P = P; np += P.length;
      });
      M.parts = np; M.heads = heads.length; M.cw = cw; built = true;
    }
    function lumAt(o, f0, f1, ff) {
      var a = sheet.L[o + f0 * FW], b = sheet.L[o + f1 * FW];
      return (a + (b - a) * ff) / 255;
    }
    function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
    var fpsN = 0, fpsT = 0, lastDraw = 0, nDraw = 0, DI = 33, lowN = 0, highN = 0, tRun = 0, frozenAt = 0;
    function draw(t) {
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
      cx.setTransform(D, 0, 0, D, 0, 0);
      var aw = A.w, ah = A.h, gw = aw / D, gh = ah / D, i, k, p;
      /* фон на весь экран: редкие тусклые символы, медленно мерцают */
      var bw = AA.w, bh = AA.h;
      for (i = 0; i < amb.length; i++) {
        p = amb[i]; p.a += p.v * 0.033;
        var al = 0.07 + 0.11 * (0.5 + 0.5 * Math.sin(p.a * 2.4));
        if (Math.random() < 0.01) p.g = Math.floor(Math.random() * AMB.length);
        cx.globalAlpha = al; cx.drawImage(AA.c, p.g * bw, 0, bw, bh, p.x * cw, p.y * rh, bw / D, bh / D);
      }
      if (!built) { cx.globalAlpha = 1; return; }
      var sweep = ((t * 0.32) % 1.6) - 0.3;                                   // полоса блеска по голове (переливается)
      for (k = 0; k < heads.length; k++) {
        var q = heads[k], P = q.P;
        var yaw = q.base + q.amp * Math.sin(t * 2 * Math.PI / 9.5 + k * 0.6);   // плавный поворот
        var fi = (yaw + 60) / 120 * (FN - 1), f0 = Math.max(0, Math.min(FN - 1, Math.floor(fi))), f1 = Math.min(FN - 1, f0 + 1), ff = fi - f0;
        for (i = 0; i < P.length; i++) {
          p = P[i];
          var lum = lumAt(p.o, f0, f1, ff);
          if (lum < 0.06) continue;
          var x = p.x, y = p.y, a, s = 1;
          if (t < p.tA) continue;
          var e = ease((t - p.tA) / 0.9);
          var nearZ = sheet.Z[p.o + f0 * FW] / 255;
          if (e < 1) { x += p.sx * (1 - e); y += p.sy * (1 - e); s = 1 + (1 - e) * (0.6 + nearZ); a = 0.25 + 0.75 * e; }
          else a = 1;
          if (t > p.tS) {
            var td = t - p.tS; x += p.vx * td + p.sx * 0.15 * td * td; y += p.vy * td + p.sy * 0.15 * td * td; a *= Math.max(0, 1 - td / 1.3);
            if (a < 0.03) continue;
          }
          var v = (p.y - q.y) / q.h, u = (p.x - q.x) / q.w, sw = Math.abs((u * 0.5 + v) - sweep);
          var L2 = Math.pow(lum, 1.15) * (0.85 + 0.2 * nearZ) + (sw < 0.08 ? 0.3 * (1 - sw / 0.08) : 0);
          var lv = Math.max(0, Math.min(NL - 1, Math.floor(L2 * NL)));
          if (Math.random() < 0.06 || p.lv !== lv) { var gs = GI[lv]; p.g = gs[Math.floor(Math.random() * gs.length)]; p.lv = lv; }
          if (s !== 1 || t > p.tS) { x = Math.round(x); y = Math.round(y); }   // по целым пикселям — дешевле
          cx.globalAlpha = Math.min(1, a * (0.28 + 0.8 * L2));
          if (s === 1) cx.drawImage(A.c, p.g * aw, 0, aw, ah, x, y, gw, gh);
          else cx.drawImage(A.c, p.g * aw, 0, aw, ah, x - gw * (s - 1) / 2, y - gh * (s - 1) / 2, gw * s, gh * s);
        }
      }
      cx.globalAlpha = 1;
    }
    function frame(now) {
      raf = 0;
      if (!run) return;
      raf = requestAnimationFrame(frame);
      M.frames++; fpsN++;
      if (now - fpsT >= 1000) {
        M.fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now;
        if (now - tRun > 1500) {   // слабое устройство: фон рисуется реже (30 → 20 → 12 раз/с), страница остаётся плавной
          lowN = M.fps < 48 ? lowN + 1 : 0; highN = M.fps >= 57 ? highN + 1 : 0;
          if (M.fps < 20 && DI < 80) { DI = 83; lowN = 1; highN = 0; }   // сразу видно, что не тянет
          if (lowN >= 2 && DI >= 80 && M.fps < 24) {   // совсем слабое: голова замирает собранной, через 8 с — новая попытка
            M.frozen = true; M.freezes = (M.freezes || 0) + 1; frozenAt = now; draw(5.0); cancelAnimationFrame(raf); raf = 0; return;
          }
          if (lowN >= 2 && DI < 80) { DI = DI < 45 ? 50 : 83; lowN = 0; highN = 0; }
          else if (highN >= 3 && DI > 33) { DI = DI > 60 ? 50 : 33; highN = 0; }
        }
        M.di = DI;
      }
      if (lastDraw && now - lastDraw < DI - 2) return;
      if (!t0) t0 = now;
      var dt = lastDraw ? (now - lastDraw) : 33; lastDraw = now; nDraw++; M.draws = nDraw;
      if (dt > 70) M.slow++;
      var t0d = performance.now();
      draw(((now - t0) / 1000) % T);
      M.ms = Math.round((performance.now() - t0d) * 10) / 10;
    }
    function want() { return vis && !d.hidden && W.R5 && W.R5.state === 'done' && !d.querySelector('.panel.open'); }   // под открытой панелью — пауза
    function check() {
      var w = want();
      if (M.frozen && run && w && performance.now() - frozenAt > 8000 * Math.pow(2, Math.min(3, (M.freezes || 1) - 1))) {   // 8, 16, 32, 64 с
        M.frozen = false; DI = 83; lowN = highN = 0; lastDraw = 0; fpsN = 0; fpsT = tRun = performance.now();
        if (!raf) raf = requestAnimationFrame(frame);
      }
      if (w && !sheet && !M.loading) { M.loading = true; load(); }
      if (w && !run) {
        if (!Wd || Math.abs(pin.getBoundingClientRect().width - Wd) > 1) size();
        else if (!built) build();
        run = true; t0 = 0; lastDraw = 0; fpsT = tRun = performance.now(); fpsN = 0; nDraw = 0; lowN = highN = 0;
        cv.classList.add('on'); pin.classList.add('k3dark'); M.on = true;
        if (RM) { var once = function () { if (built) draw(5.0); else setTimeout(once, 200); }; once(); return; }
        if (!raf) raf = requestAnimationFrame(frame);
      } else if (!w && run) {
        run = false; M.frozen = false; cv.classList.remove('on'); pin.classList.remove('k3dark'); M.on = false;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }
    }
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; check(); }).observe(pin);
    else vis = true;
    setInterval(check, 400);
    d.addEventListener('visibilitychange', check);
    W.addEventListener('load', function () { setTimeout(function () { if (!sheet && !M.loading) { M.loading = true; load(); } }, 2500); });
    var rt = 0; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (Wd) size(); }, 150); });
  }

  function start() {
    try { keyPress(); } catch (e) { if (W.console) console.warn('kat3 key', e); }
    try { fan(); } catch (e) { if (W.console) console.warn('kat3 fan', e); }
    try { matrix(); } catch (e) { if (W.console) console.warn('kat3 matrix', e); }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
