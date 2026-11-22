(function () {
  'use strict';
  var d = document, W = window, h = d.documentElement;
  var calm = !W.matchMedia || W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in W;
  var anim = !!(h.animate);
  var $$ = function (r, q) { return [].slice.call(r.querySelectorAll(q)); };
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var TZ = W.TZ = { calm: calm };
  if (!calm) h.classList.add('mo');
  var HAND = '<svg viewBox="0 0 34 42" aria-hidden="true"><path d="M12 3.5c1.9 0 3.2 1.4 3.2 3.3v11.3l.9-.2c1.6-.4 3.1.4 3.6 1.9l.2.6.8-.2c1.6-.4 3.1.4 3.6 1.9l.2.7.9-.2c1.7-.3 3.2.7 3.5 2.4l1.4 7.4c.6 3.4-.9 6.6-3.9 8.2l-.6.3c-1.2.6-2.6 1-4 1h-5.3c-2.6 0-5-1.3-6.4-3.5L3.6 29.4c-.9-1.4-.5-3.2.9-4.1 1.3-.8 3-.6 4 .6l.3.4V6.8c0-1.9 1.3-3.3 3.2-3.3z" fill="#fbf7ec" fill-opacity=".92" stroke="#123c4a" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  var FG = { on: null, t: 0 };
  var fgBusy = function () { return !!FG.on && Date.now() < FG.t; };
  function finger(root, target, cb, o) {
    o = o || {};
    if (calm || !anim || !root || !target || !root.isConnected) { if (cb) cb(); return true; }
    if (fgBusy() && FG.on !== root) { if (o.hint) return false; if (cb) cb(); return true; }
    var dg = o.drag;
    FG.on = root; FG.t = Date.now() + 1800 + (dg ? 900 + dg.hold : 0);
    var f = root.__mf, rp = root.__mr;
    if (!f) {
      f = root.__mf = d.createElement('span'); f.className = 'mo-fg'; f.setAttribute('aria-hidden', 'true'); f.innerHTML = HAND;
      rp = root.__mr = d.createElement('span'); rp.className = 'mo-rp'; rp.setAttribute('aria-hidden', 'true');
      root.appendChild(rp); root.appendChild(f);
      if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    }
    (f.__a || []).forEach(function (a) { a.cancel(); });
    var R = root.getBoundingClientRect(), T = target.getBoundingClientRect();
    var P = o.pt ? o.pt(T) : [T.left + T.width * 0.5, T.top + T.height * 0.55];
    var x = P[0] - R.left, y = P[1] - R.top;
    var sx = x > R.width - 90 ? -64 : 64;
    var x0 = x + sx, y0 = y + 80;
    var tr = function (a, b, s) { return 'translate(' + a.toFixed(1) + 'px,' + b.toFixed(1) + 'px) scale(' + s + ')'; };
    var m = f.animate([{ transform: tr(x0, y0, 1), opacity: 0 }, { transform: tr(x, y, 1), opacity: 1 }],
      { duration: 620, easing: EASE, fill: 'forwards' });
    f.__a = [m];
    var leave = function (lx) {
      var o2 = f.animate([{ transform: tr(lx, y, 1), opacity: 1 }, { transform: tr(lx + sx * 0.3, y + 26, 1), opacity: 0 }],
        { duration: 380, delay: dg ? 120 : 480, easing: 'ease-in', fill: 'forwards' });
      f.__a.push(o2);
    };
    m.onfinish = function () {
      var p = f.animate([{ transform: tr(x, y, 1), opacity: 1 }, { transform: tr(x, y, 0.84), opacity: 1 }, { transform: tr(x, y, 1), opacity: 1 }],
        { duration: 260, easing: 'ease-out', fill: 'forwards' });
      var r = rp.animate([{ transform: tr(x - 22, y - 22, 0.25), opacity: 0.6 }, { transform: tr(x - 22, y - 22, 1.7), opacity: 0 }],
        { duration: 520, easing: 'ease-out', fill: 'forwards' });
      f.__a = [p, r];
      if (cb) cb();
      if (!dg) { leave(x); return; }
      var x1 = x + dg.dx, gone = false, back = function () { if (!gone) { gone = true; dg.back(); } };
      var a1 = f.animate([{ transform: tr(x, y, 0.84), opacity: 1 }, { transform: tr(x1, y, 0.84), opacity: 1 }],
        { duration: 450, delay: 200, easing: EASE, fill: 'forwards' });
      f.__a.push(a1);
      a1.oncancel = back;
      W.setTimeout(function () { if (!gone) dg.go(); }, 200 + 190);
      a1.onfinish = function () {
        var a2 = f.animate([{ transform: tr(x1, y, 0.84), opacity: 1 }, { transform: tr(x, y, 0.84), opacity: 1 }],
          { duration: 450, delay: dg.hold, easing: EASE, fill: 'forwards' });
        f.__a.push(a2);
        a2.oncancel = back;
        W.setTimeout(back, dg.hold + 190);
        a2.onfinish = function () { back(); leave(x); };
      };
    };
  }
  TZ.finger = finger;
  TZ.fingerStop = function (root) { if (root && root.__mf) (root.__mf.__a || []).forEach(function (a) { a.cancel(); }); if (FG.on === root) FG.t = 0; };
  function odoText(node, min) {
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
  $$(d, '.scn').forEach(function (ol) {
    if (!/звіт|report/i.test(ol.getAttribute('aria-label') || '')) return;
    var first = ol.querySelector('.msg.zh .t');
    if (first) { odoText(first, 2); first.insertAdjacentHTML('beforeend', bars(uk ? 'Продажі за 7 днів' : 'Sales, last 7 days', [.42, .55, .38, .7, .62, .84, 1])); }
  });
  $$(d, '.slot .after .t b, .dl-stop .t b, .inv .t b').forEach(function (b) { odoText(b, 1); });
  var lastStop = d.querySelector('.dl-stop:last-child .msg.zh .t');
  if (lastStop) lastStop.insertAdjacentHTML('beforeend', bars(uk ? 'Відвідування за тиждень' : 'Visits this week', [.5, .62, .45, .8, .7, .92, 1]));
  watchGo(d);
  $$(d, '.voice ~ .tx').forEach(function (tx) {
    if (tx.querySelector('.wd')) return;
    var words = tx.textContent.split(/(\s+)/), k = 0;
    tx.textContent = '';
    words.forEach(function (w) {
      if (/^\s+$/.test(w) || !w) { tx.appendChild(d.createTextNode(w)); return; }
      var s = d.createElement('span'); s.className = 'wd'; s.style.setProperty('--w', k++); s.textContent = w; tx.appendChild(s);
    });
  });
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
    var nx = dy / len * lift, ny = -dx / len * lift;
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
  function invStore(sc, li) {
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
  var scenes = [];
  function Scene(sc) {
    var self = this, els = $$(sc, '[data-s]'), steps = {}, plan = [], i = 0, el = 0, t0 = 0, tm = 0, playing = false;
    this.sc = sc; this.started = false;
    var rp = sc.querySelector('[data-replay]');
    if (!rp && sc.previousElementSibling) rp = sc.previousElementSibling.querySelector('[data-replay]');
    if (calm) { if (rp) rp.hidden = true; return; }
    sc.classList.add('fxp', 'js-chat');
    if (sc.classList.contains('inv')) {
      var ph = sc.querySelector('.phone'), done = sc.querySelector('.pl:last-of-type .t');
      var m = done && done.textContent.match(/\+\d+/);
      if (ph && m) {
        var wh = d.createElement('span'); wh.className = 'mo-wh'; wh.setAttribute('aria-hidden', 'true');
        wh.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 10 12 4l9 6v10H3z" fill="#fbf7ec" stroke="#123c4a" stroke-width="2" stroke-linejoin="round"/><path d="M7 20v-6h10v6M7 17h10" fill="none" stroke="#123c4a" stroke-width="2"/></svg><b>' + m[0] + '</b>';
        ph.parentNode.appendChild(wh); odoText(wh.querySelector('b'), 1); sc.__wh = wh;
        $$(wh, '.odn').forEach(function (o) { o.classList.add('go'); });
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
  if (IO && !calm) {
    var slotN = 0;
    $$(d, '.slot .after').forEach(function (af) {
      var pk = af.querySelector('.chips .pk'); if (!pk) return;
      var own = slotN++ === 0;
      var li = pk.closest('li'), rest = [], n = li.nextElementSibling;
      while (n) { rest.push(n); n = n.nextElementSibling; }
      af.classList.add('js-chat', 'mo-arm');
      rest.forEach(function (r) { r.classList.add('mo-h'); });
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        W.setTimeout(function () {
          var press = function () {
            pk.classList.add('tap');
            rest.forEach(function (r, k) { W.setTimeout(function () { r.classList.remove('mo-h'); }, 700 + k * 900); });
          };
          if (own) finger(af, pk, press); else W.setTimeout(press, 620);
        }, 900);
      }, { rootMargin: '0px 0px -30% 0px' });
      io.observe(af);
    });
  }
  var BASE = (d.querySelector('figure.chat[data-live]') ? 1 : 0) + Math.min(1, $$(d, '.slot .after .chips .pk').length) +
    $$(d, '[data-play]').filter(function (sc) { return !!sc.querySelector('.tp'); }).length;
  var HINTS = 0, lastScroll = 0;
  W.addEventListener('scroll', function () { lastScroll = Date.now(); }, { passive: true });
  var inView = function (el) {
    var r = el.getBoundingClientRect(), vw = W.innerWidth || h.clientWidth, vh = W.innerHeight || h.clientHeight;
    return r.width > 0 && r.top >= 72 && r.bottom <= vh - 24 && r.left >= 0 && r.right <= vw;
  };
  var jolt = function (el, c) { el.classList.remove(c); void el.offsetWidth; el.classList.add(c);
    W.setTimeout(function () { el.classList.remove(c); }, 1400); };
  function hint(box, pick, act, o) {
    o = o || {};
    if (!box || !IO || calm || !anim || BASE + HINTS >= 3) return;
    HINTS++;
    var root = o.root || box, done = false, vis = false, tm = 0, io, ab = false;
    var stop = function (e) {
      if (e && e.isTrusted === false) return;
      if (done) { if (o.abort && !ab) { ab = true; o.abort(); } return; }
      done = true; W.clearTimeout(tm); if (io) io.disconnect();
    };
    var go = function () {
      if (done || !vis) return;
      var b = pick(); if (!b) { stop(); return; }
      if (!inView(b) || Date.now() - lastScroll < 500 || (o.ok && !o.ok())) { tm = W.setTimeout(go, 700); return; }
      var shown = finger(root, b, function () { act(b); }, { hint: true, pt: o.pt && function (T) { return o.pt(b, T); }, drag: o.drag && o.drag(b) });
      if (shown === false) { tm = W.setTimeout(go, 700); return; }
      done = true; io.disconnect();
    };
    io = new IntersectionObserver(function (es) {
      vis = es[0].isIntersecting; W.clearTimeout(tm);
      if (vis && !done) tm = W.setTimeout(go, o.wait || 1400);
    }, { threshold: o.th || 0.6 });
    ['pointerdown', 'keydown', 'focusin', 'input'].forEach(function (ev) { box.addEventListener(ev, stop, true); });
    box.addEventListener('toggle', stop, true);
    io.observe(o.watch || box);
  }
  var tryBox = d.querySelector('[data-try]');
  hint(tryBox, function () { return tryBox.querySelector('.try-q:not(.used)'); }, function (b) { b.click(); });
  var cab = d.querySelector('.cab');
  hint(cab, function () { return cab.querySelector('button'); }, function (b) {
    b.classList.remove('mo-nudge'); void b.offsetWidth; b.classList.add('mo-nudge');
  });
  var cmds = d.querySelector('.cmds');
  hint(cmds, function () { return cmds.querySelector('.cmd'); }, function (b) { jolt(b, 'mo-press'); });
  var tone = d.querySelector('.tone'), tr = tone && tone.querySelector('.tone-r'), tph = tone && tone.querySelector('.tone-ph ol'),
    tout = tone && tone.querySelector('.tone-out');
  if (tr && tph && tout && !calm && IO && anim && BASE + HINTS < 3) {
    var reserved = false, tv0 = 0;
    var thumbX = function (T, v) { var mn = +tr.min || 0, mx = +tr.max || 2, k = (v - mn) / ((mx - mn) || 1); return T.left + 9 + (T.width - 18) * k; };
    var setV = function (v) { tr.value = v; tr.dispatchEvent(new Event('input')); };
    var reserve = function () {
      var r = tph.getBoundingClientRect(), vh = W.innerHeight || h.clientHeight;
      if (r.top < vh) return false;
      var as = $$(tout, '.tone-a'), was = as.map(function (a) { return a.hidden; }), mx = 0;
      tph.style.minHeight = '';
      as.forEach(function (a, k) { as.forEach(function (b, j) { b.hidden = j !== k; }); mx = Math.max(mx, tph.offsetHeight); });
      as.forEach(function (a, k) { a.hidden = was[k]; });
      tph.style.minHeight = mx + 'px'; reserved = true; return true;
    };
    reserve();
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(reserve);
    var rio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) reserve(); }, { rootMargin: '0px 0px 60% 0px' });
    rio.observe(tone);
    var rzt = 0; W.addEventListener('resize', function () { W.clearTimeout(rzt); rzt = W.setTimeout(reserve, 300); });
    hint(tone, function () { return reserved ? tr : null; }, function () { tout.setAttribute('aria-live', 'off'); }, {
      root: tone.querySelector('.tone-ctl'), watch: tone.querySelector('.tone-ctl'), th: 1, wait: 1200,
      ok: function () { return +tr.value < +tr.max; },
      pt: function (b, T) { return [thumbX(T, tv0), T.top + T.height / 2]; },
      drag: function () {
        var T = tr.getBoundingClientRect(); tv0 = +tr.value;
        return { dx: thumbX(T, +tr.max) - thumbX(T, tv0), hold: 1700,
          go: function () { setV(tr.max); },
          back: function () { setV(tv0); tout.setAttribute('aria-live', 'polite'); } };
      },
      abort: function () { TZ.fingerStop(tone.querySelector('.tone-ctl')); }
    });
  }
  var faq = d.querySelector('.pg-faq .faq');
  hint(faq, function () { var s = faq.querySelector('.faq-i:not([open])>summary'); return s; }, function (b) { jolt(b, 'mo-press'); },
    { watch: faq && faq.querySelector('.faq-i>summary'), th: 1 });
  var case1 = d.querySelector('.case');
  hint(case1, function () {
    return $$(case1, '.row .book').filter(function (b) { return !b.classList.contains('dim') && b.getAttribute('aria-pressed') !== 'true' && inView(b); })[0];
  }, function (b) { jolt(b, 'mo-lift'); }, { watch: case1 && case1.querySelector('.row'), th: 0.9 });
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
  $$(d, '.top-doc .pages, .top .topnav, .chat[data-live] .chat-tabs').forEach(function (u) {
    var upd = function () {
      var more = u.scrollWidth - u.clientWidth - u.scrollLeft > 4;
      u.classList.toggle('more-r', more); u.classList.toggle('more-l', u.scrollLeft > 4);
    };
    u.addEventListener('scroll', upd, { passive: true }); W.addEventListener('resize', upd); upd();
  });
})();
