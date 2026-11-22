/* Твой Жорик — «режиссёр» движения (Олег MSG 10083, 10179): один маленький общий скрипт на все страницы.
   Модель: не используется (статичный скрипт страницы). Без сети, cookies, сбора данных и внешних библиотек.
   Что здесь:
   1) сцены [data-play] — таймлайн шагов (data-s — порядок, data-w — пауза перед шагом, data-ty — «друкує…» перед шагом);
      сцена стартует, когда видна, и ставится на паузу вне экрана или при скрытой вкладке; кнопка [data-replay] — «Показати ще раз»;
   2) призрачный палец (TZ.finger): подъезжает к кнопке «Так» и «нажимает» (ripple) — только там, где подтверждение кнопкой;
   3) барабан цифр и мини-столбики отчётов — запускаются, когда видны;
   4) голосовые: слова расшифровки по очереди (волну «играет» CSS);
   5) перевод «два телефона»: плашка летит между телефонами, текст «перетекает» с языка на язык (≤ 600 мс);
   6) «День власника»: солнце по дуге и небо секции — плавно от прокрутки;
   7) мелочи: «Спробуй сам» и картотека — палец-подсказка один раз; меню-прокрутка в шапке — затухание у края.
   Анимация — только transform и opacity. prefers-reduced-motion — финальное состояние сразу; без JS всё читается. */
(function () {
  'use strict';
  var d = document, W = window, h = d.documentElement;
  var calm = !W.matchMedia || W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in W;
  var anim = !!(h.animate);                       /* Web Animations API — только transform/opacity */
  var $$ = function (r, q) { return [].slice.call(r.querySelectorAll(q)); };
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var TZ = W.TZ = { calm: calm };
  if (!calm) h.classList.add('mo');

  /* ---------- 2. призрачный палец ---------- */
  var HAND = '<svg viewBox="0 0 34 42" aria-hidden="true"><path d="M12 3.5c1.9 0 3.2 1.4 3.2 3.3v11.3l.9-.2c1.6-.4 3.1.4 3.6 1.9l.2.6.8-.2c1.6-.4 3.1.4 3.6 1.9l.2.7.9-.2c1.7-.3 3.2.7 3.5 2.4l1.4 7.4c.6 3.4-.9 6.6-3.9 8.2l-.6.3c-1.2.6-2.6 1-4 1h-5.3c-2.6 0-5-1.3-6.4-3.5L3.6 29.4c-.9-1.4-.5-3.2.9-4.1 1.3-.8 3-.6 4 .6l.3.4V6.8c0-1.9 1.3-3.3 3.2-3.3z" fill="#fbf7ec" fill-opacity=".92" stroke="#123c4a" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  function finger(root, target, cb) {
    if (calm || !anim || !root || !target || !root.isConnected) { if (cb) cb(); return; }
    var f = root.__mf, rp = root.__mr;
    if (!f) {
      f = root.__mf = d.createElement('span'); f.className = 'mo-fg'; f.setAttribute('aria-hidden', 'true'); f.innerHTML = HAND;
      rp = root.__mr = d.createElement('span'); rp.className = 'mo-rp'; rp.setAttribute('aria-hidden', 'true');
      root.appendChild(rp); root.appendChild(f);
      if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    }
    (f.__a || []).forEach(function (a) { a.cancel(); });
    var R = root.getBoundingClientRect(), T = target.getBoundingClientRect();
    var x = T.left - R.left + T.width * 0.5, y = T.top - R.top + T.height * 0.55;
    var sx = x > R.width - 90 ? -64 : 64;          /* заезжаем со стороны, где есть место (без прокрутки вбок) */
    var x0 = x + sx, y0 = y + 80;
    var tr = function (a, b, s) { return 'translate(' + a.toFixed(1) + 'px,' + b.toFixed(1) + 'px) scale(' + s + ')'; };
    var m = f.animate([{ transform: tr(x0, y0, 1), opacity: 0 }, { transform: tr(x, y, 1), opacity: 1 }],
      { duration: 620, easing: EASE, fill: 'forwards' });
    f.__a = [m];
    m.onfinish = function () {
      var p = f.animate([{ transform: tr(x, y, 1), opacity: 1 }, { transform: tr(x, y, 0.84), opacity: 1 }, { transform: tr(x, y, 1), opacity: 1 }],
        { duration: 260, easing: 'ease-out', fill: 'forwards' });
      var r = rp.animate([{ transform: tr(x - 22, y - 22, 0.25), opacity: 0.6 }, { transform: tr(x - 22, y - 22, 1.7), opacity: 0 }],
        { duration: 520, easing: 'ease-out', fill: 'forwards' });
      var o = f.animate([{ transform: tr(x, y, 1), opacity: 1 }, { transform: tr(x + sx * 0.3, y + 26, 1), opacity: 0 }],
        { duration: 380, delay: 480, easing: 'ease-in', fill: 'forwards' });
      f.__a = [p, r, o];
      if (cb) cb();
    };
  }
  TZ.finger = finger;

  /* ---------- 3. барабан цифр и мини-столбики ---------- */
  function odoText(node, min) {                    /* цифры внутри узла → колонки 0–9 (для скринридера — исходное число) */
    $$(node, '*').concat([node]).forEach(function (el) {
      [].slice.call(el.childNodes).forEach(function (t) {
        if (t.nodeType !== 3 || !/\d/.test(t.nodeValue)) return;
        var parts = t.nodeValue.split(/(\d+)/), frag = d.createDocumentFragment(), hit = false;
        parts.forEach(function (s, i) {
          if (i % 2 === 0 || s.length < min) { if (s) frag.appendChild(d.createTextNode(s)); return; }
          hit = true;
          var w = d.createElement('span'); w.className = 'odn';
          var sr = d.createElement('span'); sr.className = 'sr'; sr.textContent = s; w.appendChild(sr);
          var vis = d.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.className = 'odv';
          s.split('').forEach(function (c, k) {
            var col = d.createElement('span'); col.className = 'od';
            col.innerHTML = '<span style="--v:' + c + ';--k:' + k + '">0<br>1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9</span>';
            vis.appendChild(col);
          });
          w.appendChild(vis); frag.appendChild(w);
        });
        if (hit) el.replaceChild(frag, t);
      });
    });
  }
  var goIO = (IO && !calm) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('go', e.isIntersecting || e.target.classList.contains('go')); });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  function watchGo(root) { if (goIO) $$(root, '.odn,.mbars').forEach(function (e) { goIO.observe(e); }); }
  function bars(label, hs) {
    var s = '<span class="mbars" aria-hidden="true"><small>' + label + '</small><span class="mb">';
    hs.forEach(function (v, k) { s += '<i style="--h:' + v + ';--k:' + k + '"></i>'; });
    return s + '</span></span>';
  }
  var uk = (h.lang || '').slice(0, 2) !== 'en';
  /* отчёт в окне чата главной (вкладка «Звіт»), остановки «Дня», часы «Як це працює», накладная, итог команды */
  $$(d, '.scn').forEach(function (ol) {
    if (!/звіт|report/i.test(ol.getAttribute('aria-label') || '')) return;
    var first = ol.querySelector('.msg.zh .t');
    if (first) { odoText(first, 2); first.insertAdjacentHTML('beforeend', bars(uk ? 'Продажі за 7 днів' : 'Sales, last 7 days', [.42, .55, .38, .7, .62, .84, 1])); }
  });
  $$(d, '.slot .after .t b, .dl-stop .t b, .inv .t b').forEach(function (b) { odoText(b, 1); });
  var lastStop = d.querySelector('.dl-stop:last-child .msg.zh .t');
  if (lastStop) lastStop.insertAdjacentHTML('beforeend', bars(uk ? 'Відвідування за тиждень' : 'Visits this week', [.5, .62, .45, .8, .7, .92, 1]));
  watchGo(d);

  /* ---------- 4. голосовые: расшифровка по словам ---------- */
  $$(d, '.voice ~ .tx').forEach(function (tx) {
    if (tx.querySelector('.wd')) return;
    var words = tx.textContent.split(/(\s+)/), k = 0;
    tx.textContent = '';
    words.forEach(function (w) {
      if (/^\s+$/.test(w) || !w) { tx.appendChild(d.createTextNode(w)); return; }
      var s = d.createElement('span'); s.className = 'wd'; s.style.setProperty('--w', k++); s.textContent = w; tx.appendChild(s);
    });
  });

  /* ---------- 5. перевод: перетекание букв и полёт плашки ---------- */
  function scramble(li) {
    var p = li.querySelector('.t'); if (!p || calm) return;
    var fin = p.textContent, src = li.getAttribute('data-scr') || '', L = fin.length;
    var pool = (fin + src).replace(/[\s.,!?«»“”'’:;—()-]/g, '') || 'abc';
    var ov = p.querySelector('.mo-scr');
    if (!ov) { ov = d.createElement('span'); ov.className = 'mo-scr'; ov.setAttribute('aria-hidden', 'true'); p.appendChild(ov); }
    p.classList.add('scr-on');
    var t0 = 0, D = 560;
    function frame(ts) {
      if (!t0) t0 = ts;
      var q = Math.min(1, (ts - t0) / D), edge = q * (L + 6), out = '';
      for (var i = 0; i < L; i++) {
        var c = fin.charAt(i);
        if (i < edge - 6 || /\s/.test(c)) out += c;
        else if (i < edge) out += pool.charAt((Math.random() * pool.length) | 0);
        else out += src.charAt(i) || ' ';
      }
      ov.textContent = out;
      if (q < 1 && li.__scr === frame) W.requestAnimationFrame(frame);
      else { p.classList.remove('scr-on'); ov.textContent = ''; }
    }
    li.__scr = frame; W.requestAnimationFrame(frame);
  }
  /* строка ввода в телефоне перевода (site-pages-2211): исходящее сначала набирается, голосовое — «запись» с таймером */
  function compose(li, ms) {
    var ph = li.closest('.phone'), c = ph && ph.querySelector('.tr-cmp'); if (!c) return;
    var tx = c.querySelector('.cmp-t'), v = li.querySelector('.voice'), t0 = Date.now();
    W.clearInterval(c.__iv); W.clearTimeout(c.__to); c.classList.remove('sent', 'typing', 'rec');
    if (v) {
      var dur = v.querySelector('small'), sec = dur ? +(dur.textContent.split(':')[1] || 5) : 5;
      c.classList.add('rec'); tx.textContent = '0:00';
      c.__iv = W.setInterval(function () { var k = Math.min(sec, Math.floor((Date.now() - t0) / ms * (sec + 1))); tx.textContent = '0:0' + k; }, 100);
    } else {
      var p = li.querySelector('.msg p'), full = p ? p.textContent : '', n = full.length;
      c.classList.add('typing');
      c.__iv = W.setInterval(function () {
        var k = Math.min(n, Math.round((Date.now() - t0) / (ms * 0.8) * n));
        tx.textContent = full.slice(Math.max(0, k - 34), k);
      }, 40);
    }
    c.__to = W.setTimeout(function () { sendCmp(c); }, ms);
  }
  function sendCmp(c) {
    W.clearInterval(c.__iv); c.classList.remove('typing', 'rec');
    c.querySelector('.cmp-t').textContent = ''; c.classList.add('sent');
    c.__to = W.setTimeout(function () { c.classList.remove('sent'); }, 450);
  }
  function chipFly(sc, dir, lab) {
    var chip = sc.querySelector('.tr-chip'); if (!chip || !anim) return;
    var pair = chip.querySelector('.tr-pair'); if (pair) pair.textContent = lab || '';
    var L = sc.querySelector('.tr-l .phone'), Rr = sc.querySelector('.tr-r .phone');
    var A = dir === 'lr' ? L : Rr, B = dir === 'lr' ? Rr : L;
    var r = sc.getAttribute('data-r') || '1';
    var lastIn = function (ph) { var v = $$(ph, '.tr-rounds .r' + r + ' > .pl:not(.w)'); return v.length ? v[v.length - 1] : ph; };
    var a = lastIn(A).getBoundingClientRect(), b = B.getBoundingClientRect();
    chip.style.transform = 'none';
    var c = chip.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    var ax = a.left + a.width / 2 - cx, ay = a.top + a.height / 2 - cy;
    var bx = b.left + b.width / 2 - cx, by = b.top + b.height * 0.62 - cy;
    var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy) || 1, lift = Math.min(70, len * 0.22);
    var nx = dy / len * lift, ny = -dx / len * lift;      /* дуга: смещение поперёк пути */
    if (ny > 0) { nx = -nx; ny = -ny; }
    var t = function (x, y, s) { return 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + s + ')'; };
    if (chip.__a) chip.__a.cancel();
    chip.__a = chip.animate([
      { transform: t(ax, ay, 0.55), opacity: 0 },
      { transform: t(ax + dx * 0.12 + nx * 0.4, ay + dy * 0.12 + ny * 0.4, 1), opacity: 1, offset: 0.15 },
      { transform: t(ax + dx * 0.5 + nx, ay + dy * 0.5 + ny, 1.04), opacity: 1, offset: 0.5 },
      { transform: t(bx - dx * 0.1 + nx * 0.3, by - dy * 0.1 + ny * 0.3, 1), opacity: 1, offset: 0.85 },
      { transform: t(bx, by, 0.6), opacity: 0 }
    ], { duration: 1050, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' });
  }

  /* ---------- дуга карточки задачи (команда) и накладная ---------- */
  function arcFly(sc, li) {
    var src = sc.querySelector('.t-o .phone'), c = li.firstElementChild;
    if (!src || !c || !anim) return;
    var a = src.getBoundingClientRect(), b = c.getBoundingClientRect();
    var dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 3 - (b.top + b.height / 2);
    var len = Math.sqrt(dx * dx + dy * dy) || 1, lift = Math.min(110, len * 0.35);
    var nx = -dy / len * lift, ny = dx / len * lift; if (ny > 0) { nx = -nx; ny = -ny; }
    var t = function (x, y, s, r) { return 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r + 'deg) scale(' + s + ')'; };
    c.animate([
      { transform: t(dx, dy, 0.4, -8), opacity: 0 },
      { transform: t(dx * 0.5 + nx, dy * 0.5 + ny, 0.8, 4), opacity: 1, offset: 0.5 },
      { transform: t(0, 0, 1, 0), opacity: 1 }
    ], { duration: 1050, easing: 'cubic-bezier(.3,.6,.3,1)' });
  }
  function invScan(li) {
    var th = li.querySelector('.thumb'), m = li.querySelector('.msg'); if (!th || !m || !anim) return;
    var s = m.querySelector('.mo-scan');
    if (!s) { s = d.createElement('span'); s.className = 'mo-scan'; s.setAttribute('aria-hidden', 'true'); m.appendChild(s); }
    var a = m.getBoundingClientRect(), b = th.getBoundingClientRect();
    s.style.left = (b.left - a.left) + 'px'; s.style.top = (b.top - a.top) + 'px'; s.style.width = b.width + 'px'; s.style.height = b.height + 'px';
    s.animate([{ transform: 'scaleY(1)', opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: 1500 });
    s.firstChild || s.appendChild(d.createElement('i'));
    s.firstChild.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (b.height - 4) + 'px)' }, { transform: 'translateY(0)' }],
      { duration: 1500, easing: 'ease-in-out' });
  }
  function invStore(sc, li) {                       /* позиции улетают в значок склада, счётчик крутится */
    var wh = sc.__wh; if (!wh || !anim) return;
    var from = sc.querySelector('.tp') ? sc.querySelector('.tp').closest('.msg') : li;
    var a = from.getBoundingClientRect(), b = wh.getBoundingClientRect(), R = sc.getBoundingClientRect();
    wh.classList.add('on');
    for (var k = 0; k < 6; k++) {
      var p = d.createElement('span'); p.className = 'mo-pc'; p.setAttribute('aria-hidden', 'true'); sc.appendChild(p);
      var x0 = a.left - R.left + 20 + k * (a.width - 40) / 5, y0 = a.top - R.top + a.height * 0.4;
      var x1 = b.left - R.left + b.width / 2 - 7, y1 = b.top - R.top + b.height / 2 - 7;
      var an = p.animate([
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.3)', opacity: 0 },
        { transform: 'translate(' + x0 + 'px,' + (y0 - 26) + 'px) scale(1)', opacity: 1, offset: 0.3 },
        { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.5)', opacity: 0.9 }
      ], { duration: 900, delay: k * 90, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      an.onfinish = (function (el) { return function () { el.remove(); }; })(p);
    }
    W.setTimeout(function () { wh.classList.add('hit'); }, 1250);
  }

  /* ---------- 1. сцены [data-play]: таймлайн с паузой вне экрана ---------- */
  var scenes = [];
  function Scene(sc) {
    var self = this, els = $$(sc, '[data-s]'), steps = {}, plan = [], i = 0, el = 0, t0 = 0, tm = 0, playing = false;
    this.sc = sc; this.started = false;
    var rp = sc.querySelector('[data-replay]');
    if (!rp && sc.previousElementSibling) rp = sc.previousElementSibling.querySelector('[data-replay]');
    if (calm) { if (rp) rp.hidden = true; return; }      /* reduced-motion: повторять нечего — финальное состояние уже на экране */
    sc.classList.add('fxp', 'js-chat');
    if (sc.classList.contains('inv')) {
      var ph = sc.querySelector('.phone'), done = sc.querySelector('.pl:last-of-type .t');
      var m = done && done.textContent.match(/\+\d+/);
      if (ph && m) {
        var wh = d.createElement('span'); wh.className = 'mo-wh'; wh.setAttribute('aria-hidden', 'true');
        wh.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 10 12 4l9 6v10H3z" fill="#fbf7ec" stroke="#123c4a" stroke-width="2" stroke-linejoin="round"/><path d="M7 20v-6h10v6M7 17h10" fill="none" stroke="#123c4a" stroke-width="2"/></svg><b>' + m[0] + '</b>';
        ph.parentNode.appendChild(wh); odoText(wh.querySelector('b'), 1); sc.__wh = wh;
        $$(wh, '.odn').forEach(function (o) { o.classList.add('go'); });   /* барабан крутится по классу .hit */
        ph.parentNode.style.position = 'relative';
      }
    }
    els.forEach(function (e) { var k = +e.getAttribute('data-s'); (steps[k] = steps[k] || []).push(e); });
    var keys = Object.keys(steps).map(Number).sort(function (a, b) { return a - b; });
    var num = function (g, at) { return g.reduce(function (mx, e) { return Math.max(mx, +(e.getAttribute(at) || 0)); }, 0); };
    var t = 0;
    keys.forEach(function (k) {
      var g = steps[k], w = num(g, 'data-w') || 500, ty = num(g, 'data-ty'), cm = num(g, 'data-cmp');
      t += w;
      if (cm) { plan.push([t, function () { g.forEach(function (e) { if (e.hasAttribute('data-cmp')) compose(e, +e.getAttribute('data-cmp')); }); }]); t += cm; }
      if (ty) { plan.push([t, function () { g.forEach(function (e) { if (e.hasAttribute('data-ty')) e.classList.add('ty'); }); }]); t += ty; }
      var tp = g.filter(function (e) { return e.classList.contains('tp'); })[0];
      if (tp) plan.push([Math.max(0, t - 900), function () { finger(sc, tp); }]);
      plan.push([t, function () { reveal(g); }]);
    });
    function reset() {
      els.forEach(function (e) {
        if (e.classList.contains('pl')) { e.classList.add('w'); e.classList.remove('ty', 'played'); e.__scr = null; }
        else if (e.classList.contains('stv')) e.classList.remove('cur', 'flash');
        else if (e.classList.contains('tp')) e.classList.remove('tap');
      });
      $$(sc, '.stt').forEach(function (s) { [].forEach.call(s.children, function (x, k) { x.classList.toggle('cur', k === 0); x.classList.remove('flash'); }); });
      $$(sc, '.scr-on').forEach(function (p) { p.classList.remove('scr-on'); });
      if (sc.hasAttribute('data-tr')) sc.setAttribute('data-r', '1');
      $$(sc, '.tr-cmp').forEach(function (c) { W.clearInterval(c.__iv); W.clearTimeout(c.__to); c.classList.remove('typing', 'rec', 'sent'); c.querySelector('.cmp-t').textContent = ''; });
      if (sc.__wh) sc.__wh.classList.remove('on', 'hit');
      $$(sc, '.mo-pc').forEach(function (p) { p.remove(); });
    }
    function reveal(g) {
      g.forEach(function (e) {
        if (e.classList.contains('stv')) {
          [].forEach.call(e.parentNode.children, function (x) { x.classList.remove('cur'); });
          e.classList.add('cur', 'flash');
        } else if (e.classList.contains('tp')) e.classList.add('tap');
        else if (e.classList.contains('trx')) chipFly(sc, e.getAttribute('data-dir'), e.getAttribute('data-lab'));
        else if (e.classList.contains('rd')) sc.setAttribute('data-r', e.getAttribute('data-round'));
        else {
          if (e.classList.contains('fly')) arcFly(sc, e);
          e.classList.remove('w', 'ty');
          if (e.hasAttribute('data-scr')) scramble(e);
          if (e.querySelector('.thumb')) invScan(e);
          if (sc.__wh && e === els[els.length - 1]) invStore(sc, e);
          if (e.querySelector('.voice')) W.setTimeout(function () { e.classList.add('played'); }, 200);
        }
      });
    }
    function now() { return Date.now(); }
    function sched() {
      W.clearTimeout(tm);
      if (i >= plan.length) { playing = false; return; }
      var dt = plan[i][0] - (el + now() - t0);
      tm = W.setTimeout(function () { var s = plan[i++]; s[1](); sched(); }, Math.max(0, dt));
    }
    this.play = function () {
      if (playing || i >= plan.length) return;
      playing = true; t0 = now(); sc.classList.remove('halt'); sched();
    };
    this.pause = function () {
      if (!playing) return;
      playing = false; W.clearTimeout(tm); el += now() - t0; sc.classList.add('halt');
    };
    this.start = function () {
      playing = false; W.clearTimeout(tm); reset(); i = 0; el = 0; self.started = true; self.play();
    };
    reset();
    if (rp) rp.addEventListener('click', function () { self.start(); });
    scenes.push(this);
  }
  $$(d, '[data-play]').forEach(function (sc) { new Scene(sc); });
  if (IO && scenes.length) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var s = e.target.__scene; if (!s) return;
        s.vis = e.isIntersecting;
        if (!e.isIntersecting || d.hidden) s.pause(); else if (!s.started) s.start(); else s.play();
      });
    }, { rootMargin: '0px 0px -30% 0px' });
    scenes.forEach(function (s) { s.sc.__scene = s; sio.observe(s.sc); });
    d.addEventListener('visibilitychange', function () {
      scenes.forEach(function (s) { if (d.hidden) s.pause(); else if (s.vis && s.started) s.play(); });
    });
  } else scenes.forEach(function (s) { s.start(); });

  /* ---------- «Як це працює»: часы дня с кнопкой «Так» — палец нажимает, потом остальное ---------- */
  if (IO && !calm) {
    $$(d, '.slot .after').forEach(function (af) {
      var pk = af.querySelector('.chips .pk'); if (!pk) return;
      var li = pk.closest('li'), rest = [], n = li.nextElementSibling;
      while (n) { rest.push(n); n = n.nextElementSibling; }
      af.classList.add('js-chat', 'mo-arm');
      rest.forEach(function (r) { r.classList.add('mo-h'); });
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        W.setTimeout(function () {
          finger(af, pk, function () {
            pk.classList.add('tap');
            rest.forEach(function (r, k) { W.setTimeout(function () { r.classList.remove('mo-h'); }, 700 + k * 900); });
          });
        }, 900);
      }, { rootMargin: '0px 0px -30% 0px' });
      io.observe(af);
    });
  }

  /* ---------- «Спробуй сам» и картотека: палец-подсказка один раз ---------- */
  function hint(box, pick, act) {
    if (!box || !IO || calm) return;
    var done = false, io = new IntersectionObserver(function (es) {
      if (done || !es[0].isIntersecting) return;
      W.setTimeout(function () {
        if (done) return; done = true; io.disconnect();
        var b = pick(); if (b) finger(box, b, function () { act(b); });
      }, 1400);
    }, { threshold: 0.6 });
    box.addEventListener('pointerdown', function () { done = true; io.disconnect(); }, { once: true });
    box.addEventListener('keydown', function () { done = true; io.disconnect(); }, { once: true });
    io.observe(box);
  }
  var tryBox = d.querySelector('[data-try]');
  hint(tryBox, function () { return tryBox.querySelector('.try-q:not(.used)'); }, function (b) { b.click(); });
  var cab = d.querySelector('.cab');
  hint(cab, function () { return cab.querySelector('button'); }, function (b) {
    /* ящик только «выдвигается» и возвращается: открывать по-настоящему — по нажатию человека (без сдвига вёрстки) */
    b.classList.remove('mo-nudge'); void b.offsetWidth; b.classList.add('mo-nudge');
  });

  /* ---------- 6. «День власника»: солнце и небо от прокрутки ---------- */
  var day = d.querySelector('[data-day]');
  if (day && !calm) {
    day.classList.add('mo-day');
    var list = day.querySelector('.dl-list'), sun = day.querySelector('.dl-sun'), night = day.querySelector('.dl-night');
    var sky = d.createElement('div'); sky.className = 'mo-sky'; sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML = '<i class="s-dawn"></i><i class="s-dusk"></i><i class="s-night"></i>';
    day.insertBefore(sky, day.firstChild);
    var L = sky.children, busy = false, onScreen = false;
    var sm = function (a, b, x) { var q = Math.min(1, Math.max(0, (x - a) / (b - a))); return q * q * (3 - 2 * q); };
    var paint = function () {
      busy = false;
      var r = list.getBoundingClientRect(), vh = W.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * 0.5 - r.top) / Math.max(1, r.height - 40)));
      var hr = 8 + p * 14;
      if (sun) sun.style.transform = 'rotate(' + (-80 + p * 160).toFixed(2) + 'deg)';
      if (night) night.style.opacity = sm(17.5, 21.5, hr).toFixed(3);
      L[0].style.opacity = (1 - sm(8, 11, hr)).toFixed(3);
      L[1].style.opacity = (sm(15, 17.5, hr) * (1 - sm(19, 21, hr))).toFixed(3);
      L[2].style.opacity = sm(18.5, 22, hr).toFixed(3);
    };
    var req = function () { if (!busy && onScreen) { busy = true; W.requestAnimationFrame(paint); } };
    if (IO) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; req(); }).observe(day); else onScreen = true;
    W.addEventListener('scroll', req, { passive: true });
    W.addEventListener('resize', req);
    paint();
  }

  /* ---------- 7. меню-прокрутка в шапке: затухание у края, пока есть что листать ---------- */
  $$(d, '.top-doc .pages, .top .topnav, .chat[data-live] .chat-tabs').forEach(function (u) {
    var upd = function () {
      var more = u.scrollWidth - u.clientWidth - u.scrollLeft > 4;
      u.classList.toggle('more-r', more); u.classList.toggle('more-l', u.scrollLeft > 4);
    };
    u.addEventListener('scroll', upd, { passive: true }); W.addEventListener('resize', upd); upd();
  });
})();
