/* kat1.js — правки по замечаниям Кэт 24.11 (личка MSG 11559–11571; Wizard, переговорная MSG 763–765).
   - клавиша TZ в шапке: вдавливание при касании и на iPhone (класс tzk-down, :active);
   - Бібліотека в панели главной: карточки веером, активная впереди; свайп, кнопки, точки, стрелки, касание боковой;
   - экран 5 кнопок: фон-матрица — символы падают столбцами, собираются в голову человека, мигают и рассыпаются, по кругу.
     canvas + requestAnimationFrame, пауза вне экрана и на скрытой вкладке, при prefers-reduced-motion не включается.
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

  /* ---------- Бібліотека: веер ---------- */
  function fan() {
    var panel = $('#p-lib'), box = panel && $('.cards', panel);
    if (!box) return;
    var cards = $$('.card', box), n = cards.length;
    if (n < 2) return;
    var uk = (root.lang || 'uk').indexOf('uk') === 0;
    var wrap = d.createElement('div'); wrap.className = 'kfan-wrap';
    box.parentNode.insertBefore(wrap, box); wrap.appendChild(box);
    box.classList.add('kfan');
    box.setAttribute('aria-roledescription', uk ? 'карусель' : 'carousel');
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
    var cur = 0, pos = 0, cw = 320, spread = 130;
    function off(i, p) { var x = ((i - p) % n + n) % n; if (x >= n / 2) x -= n; return x; }
    function render(p) {
      cards.forEach(function (c, i) {
        var o = off(i, p), a = Math.abs(o), s = o < 0 ? -1 : 1;
        var x = s * (Math.min(a, 2) * spread + Math.max(0, a - 2) * spread * 0.25);
        var y = a * 10 + a * a * 5, r = Math.max(-22, Math.min(22, o * 7)), k = 1 - Math.min(a, 3) * 0.075;
        c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + r.toFixed(2) + 'deg) scale(' + k.toFixed(3) + ')';
        c.style.zIndex = String(100 - Math.round(a * 10));
        c.style.opacity = a > 2.6 ? String(Math.max(0, 1 - (a - 2.6) * 2.5)) : '1';
        c.classList.toggle('kf-cur', a < 0.5);
        c.setAttribute('aria-hidden', a < 0.5 ? 'false' : 'true');
      });
      var ci = ((Math.round(p) % n) + n) % n;
      $$('button', dots).forEach(function (b, i) { b.setAttribute('aria-current', i === ci ? 'true' : 'false'); });
    }
    function layout() {
      var pw = wrap.clientWidth || 360;
      cw = Math.round(Math.min(340, Math.max(220, pw < 700 ? pw * 0.74 : 320)));
      spread = pw < 700 ? cw * 0.34 : Math.min(cw * 0.66, (pw - cw) / 4.2);
      box.style.setProperty('--kfan-w', cw + 'px');
      box.style.setProperty('--kfan-ch', '0px');
      var mh = 0; cards.forEach(function (c) { mh = Math.max(mh, c.offsetHeight); });
      box.style.setProperty('--kfan-ch', mh + 'px');
      box.style.setProperty('--kfan-h', (mh + 18 + 2 * 10 + 4 * 5 + 30) + 'px');
      render(pos);
    }
    function go(i) { cur = ((i % n) + n) % n; var o = off(cur, pos); pos = pos + o; render(pos); W.KFAN.cur = cur; W.KFAN.moves++; }
    prev.addEventListener('click', function () { go(cur - 1); });
    next.addEventListener('click', function () { go(cur + 1); });
    cards.forEach(function (c, i) { c.addEventListener('click', function () { if (!moved && i !== cur) go(i); }); });
    /* свайп: по горизонтали карточки едут за пальцем, отпустил — к ближайшей; по вертикали — обычная прокрутка панели */
    var sx = 0, sy = 0, sp = 0, dragging = false, moved = false, pid = null, st = 0;
    box.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      sx = e.clientX; sy = e.clientY; sp = pos; dragging = false; moved = false; pid = e.pointerId; st = performance.now();
    });
    box.addEventListener('pointermove', function (e) {
      if (pid !== e.pointerId) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragging) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) { dragging = true; moved = true; box.classList.add('drag'); try { box.setPointerCapture(pid); } catch (_) {} }
        else if (Math.abs(dy) > 12) { pid = null; return; }
        else return;
      }
      pos = sp - dx / (spread * 1.25); render(pos);
    });
    function end(e) {
      if (pid !== e.pointerId) return; pid = null;
      if (!dragging) return;
      dragging = false; box.classList.remove('drag');
      var dx = e.clientX - sx, v = dx / Math.max(1, performance.now() - st);
      var tgt = Math.round(pos);
      if (tgt === Math.round(sp) && (Math.abs(dx) > 36 || Math.abs(v) > 0.4)) tgt = Math.round(sp) + (dx < 0 ? 1 : -1);
      tgt = Math.max(Math.round(sp) - 1, Math.min(Math.round(sp) + 1, tgt));   // один свайп — одна карточка
      go(tgt);
      setTimeout(function () { moved = false; }, 0);
    }
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    d.addEventListener('keydown', function (e) {
      if (!panel.classList.contains('open')) return;
      if (e.key === 'ArrowRight') go(cur + 1);
      if (e.key === 'ArrowLeft') go(cur - 1);
    });
    W.KFAN = { n: n, cur: 0, moves: 0, go: go };
    layout();
    var rt = 0; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(layout);
    new MutationObserver(function () { if (panel.classList.contains('open')) setTimeout(layout, 60); }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- экран 5 кнопок: фон-матрица → голова → рассыпается ---------- */
  function matrix() {
    var pin = $('.r5pin'), go = $('#r5go');
    if (!pin || !go || RM || !root.classList.contains('r5a')) return;
    var cv = d.createElement('canvas'); cv.className = 'kmx'; cv.setAttribute('aria-hidden', 'true');
    pin.insertBefore(cv, go);
    var cx = cv.getContext('2d');
    if (!cx) return;
    var GL = '01<>{}[]/=+*#:;ЖТZ$%&?ab'.split(''), NG = GL.length;
    var T = 11.0, TG0 = 1.2, TG1 = 4.0, TD0 = 7.0, TD1 = 8.8;
    var Wd = 0, Hd = 0, D = 1, cs = 14, rh = 17, cols = 0, drops = [], parts = [], A = null, AH = null, map = null;
    var raf = 0, vis = false, t0 = 0, run = false, built = false;
    var M = W.KMX = { frames: 0, fps: 0, parts: 0, heads: 0, on: false, slow: 0 };
    function atlas(px, col) {
      var w = Math.ceil(px * D), h = Math.ceil(px * 1.3 * D), c = d.createElement('canvas'), x;
      c.width = w * NG; c.height = h; x = c.getContext('2d');
      x.fillStyle = col; x.font = '500 ' + (px * D).toFixed(1) + 'px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      GL.forEach(function (g, i) { x.fillText(g, i * w + w / 2, h / 2); });
      return { c: c, w: w, h: h, px: px };
    }
    var img = new Image();
    img.onload = function () {
      try {
        var c = d.createElement('canvas'); c.width = img.width; c.height = img.height;
        var x = c.getContext('2d'); x.drawImage(img, 0, 0);
        var px = x.getImageData(0, 0, c.width, c.height).data, v = new Float32Array(c.width * c.height);
        for (var i = 0; i < v.length; i++) v[i] = px[i * 4] / 255;
        map = { w: c.width, h: c.height, v: v };
        if (Wd) build();
      } catch (_) {}
    };
    img.src = '/assets/kat1/head-map.png';
    function sample(u, v) {
      if (u < 0 || v < 0 || u >= 1 || v >= 1) return 0;
      return map.v[Math.floor(v * map.h) * map.w + Math.floor(u * map.w)];
    }
    function size() {
      var r = pin.getBoundingClientRect();
      Wd = Math.round(r.width); Hd = Math.round(r.height);
      if (!Wd || !Hd) return;
      D = Math.min(2, W.devicePixelRatio || 1);
      D = Math.min(D, Math.sqrt(900000 / (Wd * Hd)));   // большой экран: холст ≤ 0,9 Мп (символы бледные, растяжение не видно)
      cv.width = Math.round(Wd * D); cv.height = Math.round(Hd * D);
      cs = Wd < 700 ? 13 : 15; rh = Math.round(cs * 1.25);
      A = atlas(cs * 0.82, '#25394b');
      cols = Math.ceil(Wd / cs);
      drops = [];
      for (var i = 0; i < cols; i++) drops.push({ y: Math.random() * (Hd / rh + 20) - 20, v: 5 + Math.random() * 9, len: 6 + Math.floor(Math.random() * 10), g: Math.floor(Math.random() * NG), s: 0.6 + Math.random() * 0.4 });
      build();
    }
    function regions() {
      var g = $('.go-list', go) || go, r = g.getBoundingClientRect(), p = pin.getBoundingClientRect();
      var L = r.left - p.left, R = p.right - r.right, Tp = r.top - p.top, B = p.bottom - r.bottom, ar = map.w / map.h, out = [], hh, hw;
      if (L >= 200 && R >= 200) {
        hh = Math.min(Hd * 0.8, (Math.min(L, R) - 40) / ar); hw = hh * ar;
        out.push({ x: L / 2 - hw / 2, y: Hd / 2 - hh / 2, w: hw, h: hh, flip: false });
        out.push({ x: Wd - R / 2 - hw / 2, y: Hd / 2 - hh / 2, w: hw, h: hh, flip: true });
      } else {
        var top = Tp >= B, reg = top ? Tp : B;
        hh = reg - 22;
        if (hh < 130) { hh = Hd * 0.86; hw = hh * ar; out.push({ x: Wd / 2 - hw / 2, y: Hd / 2 - hh / 2, w: hw, h: hh, flip: false, behind: true }); }
        else {
          hh = Math.min(hh, Wd * 0.8 / ar); hw = hh * ar;
          out.push({ x: Wd / 2 - hw / 2, y: top ? Math.max(8, Tp - hh - 10) : (r.bottom - p.top) + (B - hh) / 2, w: hw, h: hh, flip: false });
        }
      }
      return out;
    }
    function build() {
      if (!map || !Wd) return;
      var rs = regions(), area = 0;
      rs.forEach(function (q) { area += q.w * q.h; });
      var hc = Math.max(5.5, Math.min(11, Math.sqrt(area * 0.62 / 1300)));   // ≤ ~1300 символов на обе головы
      parts = [];
      rs.forEach(function (q) {
        var rows = Math.floor(q.h / (hc * 1.2)), cl = Math.floor(q.w / hc);
        for (var i = 0; i < rows; i++) for (var j = 0; j < cl; j++) {
          var u = (j + 0.5) / cl, v = (i + 0.5) / rows, dn = sample(q.flip ? 1 - u : u, v);
          if (dn < 0.08) continue;
          var tx = q.x + j * hc, ty = q.y + i * hc * 1.2, rf = i / rows;
          var tA = TG0 + (TG1 - TG0 - 0.4) * (0.6 * rf + 0.4 * Math.random());
          var y0 = -20 - Math.random() * Hd * 0.5;
          var tD = TD0 + (TD1 - TD0) * (0.55 * (1 - rf) + 0.45 * Math.random());
          parts.push({ x: tx, ty: ty, y0: y0, tA: tA, v: (ty - y0) / tA, dn: dn * (q.behind ? 0.55 : 1), g: Math.floor(Math.random() * NG), tD: tD, vx: (Math.random() - 0.5) * 30, rf: rf });
        }
      });
      AH = atlas(hc * 1.05, '#13212e');
      M.parts = parts.length; M.heads = rs.length; M.hc = hc; built = true;
    }
    var fpsN = 0, fpsT = 0, lastNow = 0, lastDraw = 0, nDraw = 0, RL = null, rlx = null;
    /* слой дождя: символы стоят по целым строкам, поэтому его хватает перерисовывать ~16 раз/с; холст — не чаще ~30 раз/с,
       страница при этом идёт с полной частотой (замер: без этого программный Chromium 1440 терял до половины кадров) */
    function rain(dt) {
      if (!RL || RL.width !== cv.width || RL.height !== cv.height) { RL = d.createElement('canvas'); RL.width = cv.width; RL.height = cv.height; rlx = RL.getContext('2d'); }
      rlx.setTransform(D, 0, 0, D, 0, 0); rlx.clearRect(0, 0, Wd, Hd);
      var aw = A.w, ah = A.h, gw = aw / D, gh = ah / D, i, k, dr, row, y, al;
      for (i = 0; i < cols; i++) {
        dr = drops[i]; dr.y += dr.v * dt;
        if ((dr.y - dr.len) * rh > Hd) { dr.y = -Math.random() * 12; dr.v = 5 + Math.random() * 9; dr.len = 6 + Math.floor(Math.random() * 10); }
        if (Math.random() < 0.1) dr.g = (dr.g + 1 + Math.floor(Math.random() * 5)) % NG;
        for (k = 0; k < dr.len; k++) {
          row = Math.floor(dr.y) - k; y = row * rh;
          if (y < -rh || y > Hd) continue;
          al = k === 0 ? 0.42 : 0.24 * Math.pow(1 - k / dr.len, 1.5) * dr.s;
          if (al < 0.02) continue;
          rlx.globalAlpha = al;
          rlx.drawImage(A.c, ((((dr.g + row * 7 + i * 3) % NG) + NG) % NG) * aw, 0, aw, ah, i * cs, y, gw, gh);
        }
      }
      rlx.globalAlpha = 1;
    }
    var rainAcc = 0, DI = 30, lowN = 0, highN = 0, tRun = 0, freezeAt = -1, frozenAt = 0;
    function frame(now) {
      raf = 0;
      if (!run) return;
      raf = requestAnimationFrame(frame);
      M.frames++; fpsN++;
      if (now - fpsT >= 1000) {
        M.fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now;
        /* слабое устройство: страница проседает — фон обновляется реже (15, потом 10 раз/с), страница остаётся плавной */
        if (now - tRun > 1500) {
          lowN = M.fps < 48 ? lowN + 1 : 0; highN = M.fps >= 57 ? highN + 1 : 0;
          if (lowN >= 2 && DI >= 95 && M.fps < 24) { M.frozen = true; freezeAt = 4.0; frozenAt = now; M.freezes = (M.freezes || 0) + 1; }   // совсем слабое: голова замирает собранной, через 8 с — новая попытка
          else if (lowN >= 1 && M.fps < 30 && DI < 95) { DI = 95; lowN = 0; highN = 0; }
          else if (lowN >= 2 && DI < 95) { DI = DI < 60 ? 62 : 95; lowN = 0; highN = 0; }
          else if (highN >= 3 && DI > 30) { DI = DI > 90 ? 62 : 30; highN = 0; }
        }
        M.di = DI;
      }
      if (lastDraw && now - lastDraw < DI) return;
      if (!t0) t0 = now;
      var dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : 0.033; lastDraw = now; nDraw++; M.draws = nDraw;
      if (dt > 0.07) M.slow++;
      var t = freezeAt >= 0 ? freezeAt : ((now - t0) / 1000) % T;
      rainAcc += dt;
      if (DI > 50 || nDraw % 2 === 1 || !RL) { rain(rainAcc); rainAcc = 0; }
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, cv.width, cv.height);
      cx.drawImage(RL, 0, 0);
      cx.setTransform(D, 0, 0, D, 0, 0);
      var i;
      /* голова */
      if (built && AH) {
        var hw = AH.w, hh2 = AH.h, hgw = hw / D, hgh = hh2 / D, p, py, a, scan = (t - TG1) / (TD0 - TG1);
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          if (t < p.tA) { py = p.y0 + p.v * t; a = 0.30; }
          else if (t < p.tD) {
            py = p.ty;
            var land = Math.max(0, 1 - (t - p.tA) / 0.35);
            a = 0.30 + 0.75 * p.dn + 0.25 * land;
            if (scan > 0 && scan < 1) { var w = Math.abs(p.rf - scan); if (w < 0.08) a += 0.25 * (1 - w / 0.08); }
            if (Math.random() < 0.03) p.g = Math.floor(Math.random() * NG);
          } else {
            var td = t - p.tD; py = p.ty + 40 * td + 0.5 * Hd * 1.4 * td * td;
            a = (0.30 + 0.75 * p.dn) * Math.max(0, 1 - td / 1.8);
          }
          if (py < -hgh || py > Hd || a < 0.02) continue;
          cx.globalAlpha = Math.min(1, a);
          cx.drawImage(AH.c, p.g * hw, 0, hw, hh2, p.x + (t > p.tD ? p.vx * (t - p.tD) : 0), py, hgw, hgh);
        }
      }
      cx.globalAlpha = 1;
      if (freezeAt >= 0) { cancelAnimationFrame(raf); raf = 0; }
    }
    function want() { return vis && !d.hidden && W.R5 && W.R5.state === 'done'; }
    function check() {
      var w = want();
      if (freezeAt >= 0 && performance.now() - frozenAt > 8000) {   // пробуем ожить (временный всплеск нагрузки не замораживает фон навсегда)
        freezeAt = -1; M.frozen = false; DI = 95; lowN = highN = 0; tRun = fpsT = performance.now(); fpsN = 0; lastDraw = 0;
        if (run && !raf) raf = requestAnimationFrame(frame);
      }
      if (w && !run) {
        if (!Wd || Math.abs(pin.getBoundingClientRect().width - Wd) > 1) size();
        else if (!built) build();
        run = true; t0 = 0; lastDraw = 0; fpsT = tRun = performance.now(); fpsN = 0; nDraw = 0; lowN = highN = 0; cv.classList.add('on'); M.on = true;
        if (!raf && freezeAt < 0) raf = requestAnimationFrame(frame);
        else if (freezeAt >= 0) { lastDraw = 0; raf = requestAnimationFrame(frame); }
      } else if (!w && run) {
        run = false; cv.classList.remove('on'); M.on = false;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }
    }
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; check(); }).observe(pin);
    else vis = true;
    setInterval(check, 400);
    d.addEventListener('visibilitychange', check);
    var rt = 0; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (Wd) size(); }, 150); });
  }

  function start() {
    try { keyPress(); } catch (e) { if (W.console) console.warn('kat1 key', e); }
    try { fan(); } catch (e) { if (W.console) console.warn('kat1 fan', e); }
    try { matrix(); } catch (e) { if (W.console) console.warn('kat1 matrix', e); }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
