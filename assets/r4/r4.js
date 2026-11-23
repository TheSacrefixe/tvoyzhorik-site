/* Твій Жорик — круг 4 (r4): общий слой для внутренних страниц и главной.
   1) шапка-стекло: плашка после 24px, на телефоне прячется при прокрутке вниз (как на главной r3);
   2) мобильное меню — стеклянный лист с металлическими кнопками;
   3) переход между страницами: линза раскрывается от точки нажатия (как панели главной), на новой странице — туман уходит, текст проявляется из размытия;
   4) «Як це працює»: непрерывная линия-алгоритм (Кэт MSG 11230), код из главной r3.
   Без внешних запросов. Без анимации при prefers-reduced-motion. */
(function () {
  'use strict';
  var d = document, h = d.documentElement, W = window;
  var RM = !W.matchMedia || W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (q, r) { return (r || d).querySelector(q); };
  var $$ = function (q, r) { return [].slice.call((r || d).querySelectorAll(q)); };
  var clamp = function (v, a, b) { a = a || 0; b = b === undefined ? 1 : b; return Math.max(a, Math.min(b, v)); };

  /* ---------- шапка ---------- */
  var top = $('#r4top'), menu = $('#r4menu'), burger = $('.r4burger'), menuOpen = false, ly = 0;
  function onScroll() {
    if (!top) return;
    var y = W.scrollY || 0;
    top.classList.toggle('float', y > 24);
    if (W.innerWidth < 820 && !menuOpen) {
      var dy = y - ly;
      if (y > W.innerHeight * .9 && dy > 6) top.classList.add('hide');
      else if (dy < -6 || y < W.innerHeight * .5) top.classList.remove('hide');
    } else top.classList.remove('hide');
    ly = y;
  }
  if (top) { W.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* ---------- мобильное меню ---------- */
  function setMenu(on) {
    if (!menu || !burger) return;
    menuOpen = on;
    burger.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) { menu.hidden = false; requestAnimationFrame(function () { menu.classList.add('open'); }); top.classList.remove('hide'); top.classList.add('menu-on'); }
    else { menu.classList.remove('open'); top.classList.remove('menu-on'); setTimeout(function () { if (!menuOpen) menu.hidden = true; }, RM ? 0 : 450); }
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!menuOpen); if (menuOpen) { var a = $('a', menu); a && a.focus({ preventScroll: true }); } });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

  /* ---------- переход между страницами ---------- */
  function leave(url, x, y) {
    var lens = d.createElement('div'); lens.className = 'r4lens'; lens.setAttribute('aria-hidden', 'true');
    lens.style.setProperty('--cx', x + 'px'); lens.style.setProperty('--cy', y + 'px');
    var rip = d.createElement('div'); rip.className = 'r4rip'; rip.style.left = (x - 5) + 'px'; rip.style.top = (y - 5) + 'px';
    d.body.appendChild(lens); d.body.appendChild(rip);
    try { sessionStorage.setItem('r4t', '1'); } catch (e) {}
    if (rip.animate) rip.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: .9, transform: 'scale(9)', offset: .35 }, { opacity: 0, transform: 'scale(60)' }],
      { duration: 900, easing: 'cubic-bezier(.22,.8,.2,1)' });
    requestAnimationFrame(function () { requestAnimationFrame(function () { lens.classList.add('on'); }); });
    var go = function () { W.location.href = url; };
    setTimeout(go, 560);
  }
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || RM) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-open')) return;
    var u; try { u = new URL(a.href, W.location.href); } catch (x) { return; }
    if (u.origin !== W.location.origin || !/^https?:$/.test(u.protocol)) return;
    if (u.pathname === W.location.pathname && u.search === W.location.search) return;   // якорь на этой же странице
    if (/\.(pdf|zip|png|jpe?g|webp|txt)$/i.test(u.pathname)) return;
    e.preventDefault();
    var x = e.clientX, y = e.clientY;
    if (!x && !y) { var b = a.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top + b.height / 2; }
    if (menuOpen) setMenu(false);
    leave(u.href, x, y);
  });
  W.addEventListener('pageshow', function (e) {   // назад из кэша: убрать линзу
    if (e.persisted) $$('.r4lens,.r4rip').forEach(function (n) { n.remove(); });
    h.classList.remove('r4-from');
  });
  if (h.classList.contains('r4-from')) setTimeout(function () { h.classList.remove('r4-from'); }, 1200);

  /* ---------- «Як це працює»: линия-алгоритм (из главной r3) ---------- */
  var box = $('#r4algo');
  if (box) {
    var steps = $$('.step', box), wire = $('svg.wire', box), cnt = $('.count', box.parentNode);
    var A = { cur: 0, len: 0, L: [], total: 0, ready: false, anim: 0 };
    var easeIO = function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    var seg = function (a, b, horiz) {
      var r = 14;
      if (horiz) {
        var ly2 = Math.min(a.y, b.y) - 40, sx = Math.sign(b.x - a.x) || 1;
        return 'L' + a.x + ',' + (ly2 + r) + ' Q' + a.x + ',' + ly2 + ' ' + (a.x + sx * r) + ',' + ly2 + ' L' + (b.x - sx * r) + ',' + ly2 + ' Q' + b.x + ',' + ly2 + ' ' + b.x + ',' + (ly2 + r) + ' L' + b.x + ',' + b.y;
      }
      var lx = Math.min(a.x, b.x) - 40, sy = Math.sign(b.y - a.y) || 1;
      return 'L' + (lx + r) + ',' + a.y + ' Q' + lx + ',' + a.y + ' ' + lx + ',' + (a.y + sy * r) + ' L' + lx + ',' + (b.y - sy * r) + ' Q' + lx + ',' + b.y + ' ' + (lx + r) + ',' + b.y + ' L' + b.x + ',' + b.y;
    };
    var layout = function () {
      var bx = box.getBoundingClientRect(); if (!bx.width) return;
      var pts = steps.map(function (s) { var b = $('.ring', s).getBoundingClientRect(); return { x: b.left + b.width / 2 - bx.left, y: b.top + b.height / 2 - bx.top }; });
      var horiz = W.innerWidth > 820, dd = 'M' + pts[0].x + ',' + pts[0].y;
      var tmp = d.createElementNS('http://www.w3.org/2000/svg', 'path'); wire.appendChild(tmp); A.L = [0];
      for (var i = 1; i < pts.length; i++) { dd += ' ' + seg(pts[i - 1], pts[i], horiz); tmp.setAttribute('d', dd); A.L.push(tmp.getTotalLength()); }
      tmp.remove();
      wire.setAttribute('viewBox', '0 0 ' + bx.width + ' ' + bx.height);
      $$('path', wire).forEach(function (p) { p.setAttribute('d', dd); });
      A.total = A.L[A.L.length - 1];
      [$('.live', wire), $('.glow', wire)].forEach(function (p) { p.style.strokeDasharray = A.total + 1; });
      A.ready = true; draw(A.L[A.cur] || 0);
    };
    var draw = function (len) {
      A.len = len; var off = A.total + 1 - len, live = $('.live', wire);
      live.style.strokeDashoffset = off; $('.glow', wire).style.strokeDashoffset = off;
      var pt = live.getPointAtLength(Math.max(0, len)), dot = $('.dot', wire); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    };
    var lit = function () { steps.forEach(function (s, k) { s.classList.toggle('on', A.L[k] <= A.len + 2); }); };
    var goTo = function (i, instant) {
      if (!A.ready) layout();
      i = clamp(i, 0, steps.length - 1); var from = A.len, to = A.L[i]; A.cur = i;
      steps.forEach(function (s, k) { s.classList.toggle('cur', k === i); });
      if (cnt) cnt.textContent = i + ' / ' + (steps.length - 1);
      cancelAnimationFrame(A.anim);
      if (instant || RM) { draw(to); lit(); return; }
      var t0 = performance.now(), dur = 900 + Math.abs(to - from) * .5;
      (function st(now) { var k = clamp((now - t0) / dur); draw(from + (to - from) * easeIO(k)); lit(); if (k < 1) A.anim = requestAnimationFrame(st); })(t0);
    };
    steps.forEach(function (s, k) { $('.node', s).addEventListener('click', function () { goTo(k); }); });
    var nx = $('.r4-next', box.parentNode), pv = $('.r4-prev', box.parentNode);
    nx && nx.addEventListener('click', function () { goTo(A.cur >= steps.length - 1 ? 0 : A.cur + 1); });
    pv && pv.addEventListener('click', function () { goTo(A.cur - 1); });
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') goTo(A.cur + 1); if (e.key === 'ArrowLeft') goTo(A.cur - 1); });
    W.addEventListener('resize', function () { clearTimeout(layout.t); layout.t = setTimeout(layout, 120); });
    var started = false, start = function () { if (started) return; started = true; layout(); goTo(0, true); if (!RM) setTimeout(function () { goTo(1); }, 600); };
    if ('IntersectionObserver' in W && !RM) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { start(); io.disconnect(); } }); }, { rootMargin: '0px 0px -25% 0px' });
      io.observe(box);
    } else start();
    W.addEventListener('load', function () { if (started) layout(); });

    /* прокрутка ведёт линию (Олег MSG 11361–11362: на iPhone «дальше не двигается»): текущий шаг — последний, чей кружок выше 60% экрана; раскладка пересчитывается, если блок поменял размер (адресная строка iOS) */
    var lastH = 0, sTick = false;
    var onScroll = function () {
      if (sTick || !started) return; sTick = true;
      requestAnimationFrame(function () {
        sTick = false;
        var bh = box.getBoundingClientRect().height; if (Math.abs(bh - lastH) > 2) { lastH = bh; layout(); }
        var lim = W.innerHeight * 0.6, k = 0;
        steps.forEach(function (s, i) { if ($('.ring', s).getBoundingClientRect().top < lim) k = i; });
        if (k !== A.cur) goTo(k);
      });
    };
    W.addEventListener('scroll', onScroll, { passive: true });
    if (W.visualViewport) W.visualViewport.addEventListener('resize', function () { lastH = 0; onScroll(); });
    W.__r4algo = goTo;
  }
})();
