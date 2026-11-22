/* Твой Жорик — пакет фишек 2 (Олег MSG 10103, 10104): «Спробуй сам», частые вопросы, сцены [data-play]
   («Один голосовий — три задачі», «Фото накладної → склад»), «День власника» 08:00 → 22:00.
   Разметка и тексты — C:/Zhorik/tools/pack2.py. Без сети, cookies, сбора данных и внешних скриптов.
   Анимация — только transform/opacity; без JS и при prefers-reduced-motion всё видно сразу, статично. */
(function () {
  'use strict';
  var d = document, W = window;
  var calm = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in W;
  var $$ = function (r, q) { return [].slice.call(r.querySelectorAll(q)); };

  /* ---------- 1. «Спробуй сам»: заготовленные ответы, ничего не отправляется ---------- */
  var tr = d.querySelector('[data-try]');
  if (tr) {
    var log = tr.querySelector('.try-log'), box = tr.querySelector('.try-body'), store = {}, busy = false, wait = [];
    $$(log, '[data-a]').forEach(function (li) { (store[li.getAttribute('data-a')] = store[li.getAttribute('data-a')] || []).push(li); li.parentNode.removeChild(li); });
    var ty = d.createElement('li'); ty.className = 'typing'; ty.setAttribute('aria-hidden', 'true'); ty.innerHTML = '<span></span><span></span><span></span>';
    var down = function () { box.scrollTo({ top: box.scrollHeight, behavior: calm ? 'auto' : 'smooth' }); };
    var put = function (li) { var c = li.cloneNode(true); if (!calm) c.classList.add('in'); log.appendChild(c); down(); };
    var ask = function (i) {
      var qa = store[i]; if (!qa) return;
      busy = true; put(qa[0]);
      if (calm) { put(qa[1]); busy = false; return next(); }
      setTimeout(function () {
        log.appendChild(ty); ty.classList.add('in'); down();
        setTimeout(function () {
          if (ty.parentNode) ty.parentNode.removeChild(ty);
          put(qa[1]); busy = false; next();
        }, Math.max(1000, Math.min(2200, 600 + qa[1].textContent.length * 9)));
      }, 450);
    };
    var next = function () { if (wait.length && !busy) ask(wait.shift()); };
    $$(tr, '.try-q').forEach(function (b) {
      b.addEventListener('click', function () {
        b.classList.add('used');
        var i = b.getAttribute('data-q');
        if (busy) wait.push(i); else ask(i);
      });
    });
  }

  /* ---------- 2. частые вопросы: <details> работает и без JS; с JS — «друкує…» перед ответом ---------- */
  $$(d, '.faq-i').forEach(function (det) {
    var a = det.querySelector('.faq-a'), tm = 0;
    det.addEventListener('toggle', function () {
      clearTimeout(tm);
      if (!det.open || calm) { a.classList.remove('wait'); return; }
      a.classList.add('wait');
      tm = setTimeout(function () { a.classList.remove('wait'); }, 750);
    });
  });

  /* ---------- 3. сцены по шагам [data-play]: элементы с data-s появляются по порядку ---------- */
  $$(d, '[data-play]').forEach(function (sc) {
    var rp = sc.querySelector('[data-replay]');
    if (!rp && sc.previousElementSibling) rp = sc.previousElementSibling.querySelector('[data-replay]');
    if (calm || !IO) { if (rp) rp.parentNode.hidden = true; return; }
    sc.classList.add('fxp', 'js-chat');
    var els = $$(sc, '[data-s]'), steps = {}, timers = [], src = sc.querySelector('.t-o .phone');
    els.forEach(function (e) { var k = +e.getAttribute('data-s'); (steps[k] = steps[k] || []).push(e); });
    var keys = Object.keys(steps).map(Number).sort(function (a, b) { return a - b; });
    var num = function (g, at) { return g.reduce(function (m, e) { return Math.max(m, +(e.getAttribute(at) || 0)); }, 0); };

    function reset() {
      timers.forEach(clearTimeout); timers = [];
      els.forEach(function (e) {
        if (e.classList.contains('pl')) { e.classList.add('w'); e.classList.remove('ty', 'played'); }
        else if (e.classList.contains('stv')) e.classList.remove('cur');
        else if (e.classList.contains('tp')) e.classList.remove('tap');
      });
      $$(sc, '.stt').forEach(function (s) { [].forEach.call(s.children, function (i, k) { i.classList.toggle('cur', k === 0); }); });
    }
    function fly(li) {                    /* карточка задачи «прилетает» из телефона владелицы (только transform/opacity) */
      var c = li.firstElementChild; if (!src || !c) return;
      var a = src.getBoundingClientRect(), b = c.getBoundingClientRect();
      var dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 3 - (b.top + b.height / 2);
      c.style.transition = 'none'; c.style.opacity = '0';
      c.style.transform = 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) scale(.45)';
      void c.offsetWidth;
      c.style.transition = 'transform .95s cubic-bezier(.2,.7,.2,1), opacity .35s ease';
      c.style.transform = ''; c.style.opacity = '';
      setTimeout(function () { c.style.transition = ''; }, 1000);
    }
    function reveal(g) {
      g.forEach(function (e) {
        if (e.classList.contains('stv')) {
          [].forEach.call(e.parentNode.children, function (i) { i.classList.remove('cur'); });
          e.classList.add('cur');
        } else if (e.classList.contains('tp')) e.classList.add('tap');
        else {
          if (e.classList.contains('fly')) fly(e);
          e.classList.remove('w', 'ty');
          if (e.querySelector('.voice')) timers.push(setTimeout(function () { e.classList.add('played'); }, 200));
        }
      });
    }
    function run() {
      reset();
      var t = 0;
      keys.forEach(function (k) {
        var g = steps[k], w = num(g, 'data-w') || 500, tyMs = num(g, 'data-ty');
        t += w;
        if (tyMs) {
          timers.push(setTimeout(function () { g.forEach(function (e) { if (e.hasAttribute('data-ty')) e.classList.add('ty'); }); }, t));
          t += tyMs;
        }
        timers.push(setTimeout(function () { reveal(g); }, t));
      });
    }
    reset();
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); run(); }
    }, { rootMargin: '0px 0px -35% 0px' });   /* сцена высокая (на телефоне — 4 экрана): старт, когда её верх прошёл 2/3 экрана */
    io.observe(sc);
    if (rp) rp.addEventListener('click', run);
  });

  /* ---------- 4. «День власника»: прокрутка ведёт часы 08:00 → 22:00 ---------- */
  var day = d.querySelector('[data-day]');
  if (day && IO) {
    var stops = $$(day, '.dl-stop'), tm = day.querySelector('.dl-time'), lb = day.querySelector('.dl-lab'),
        bar = day.querySelector('.dl-bar i'), sun = day.querySelector('.dl-sun'), night = day.querySelector('.dl-night'), cur = -1;
    var set = function (k) {
      if (k === cur) return; cur = k;
      var st = stops[k], h = parseInt(st.getAttribute('data-t'), 10);
      tm.textContent = st.getAttribute('data-t'); lb.textContent = st.getAttribute('data-l');
      if (sun) sun.style.transform = 'rotate(' + (-80 + (h - 8) / 14 * 160).toFixed(1) + 'deg)';
      if (night) night.style.opacity = h >= 22 ? '1' : h >= 17 ? '.25' : '0';
      bar.style.transform = 'scaleX(' + ((k + 1) / stops.length).toFixed(3) + ')';
      stops.forEach(function (s, i) { s.classList.toggle('cur', i === k); });
    };
    set(0);
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) set(stops.indexOf(e.target)); });
    }, { rootMargin: '-40% 0px -50% 0px' });
    stops.forEach(function (s) { io2.observe(s); });
  }
})();
