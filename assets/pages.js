(function () {
  var d = document, W = window;
  var calm = !W.matchMedia || W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (r, q) { return [].slice.call(r.querySelectorAll(q)); };
  var uk = (d.documentElement.lang || 'uk') === 'uk';
  $$(d, '[data-odclock]').forEach(function (el) {
    var tx = el.querySelector('.oc-tx'), hH = el.querySelector('.oc-h'), hM = el.querySelector('.oc-m');
    var ph = el.getAttribute('data-odclock').split('~').map(function (x) { var i = x.indexOf('|'); return [+x.slice(0, i), x.slice(i + 1)]; });
    var city = el.getAttribute('data-city') || 'Odesa', fmt = null;
    ['Europe/Kyiv', 'Europe/Kiev'].some(function (z) {
      try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit', hour12: false }); fmt.format(new Date()); return true; }
      catch (e) { fmt = null; return false; }
    });
    if (!fmt || !tx) return;
    function tick() {
      var s = fmt.format(new Date()), h = +s.slice(0, 2) % 24, m = +s.slice(3, 5), say = ph[0][1];
      ph.forEach(function (p) { if (h >= p[0]) say = p[1]; });
      tx.textContent = city + ', ' + s + '. ' + say;
      if (hH) hH.setAttribute('transform', 'rotate(' + ((h % 12) * 30 + m / 2) + ' 12 12)');
      if (hM) hM.setAttribute('transform', 'rotate(' + (m * 6 - 90) + ' 12 12)');
    }
    tick(); W.setInterval(tick, 30000);
  });
  var fig = d.querySelector('figure.chat[data-live]'), cmds = $$(d, '.cmd[data-cmd]');
  if (fig && cmds.length) {
    var tabs = $$(fig, '[data-go]');
    var mark = function () {
      var cur = -1; tabs.forEach(function (t, i) { if (t.getAttribute('aria-pressed') === 'true') cur = +t.getAttribute('data-go'); });
      cmds.forEach(function (c) { c.classList.toggle('on', +c.getAttribute('data-cmd') === cur); });
    };
    cmds.forEach(function (c) {
      c.addEventListener('click', function () {
        var t = fig.querySelector('[data-go="' + c.getAttribute('data-cmd') + '"]'); if (!t) return;
        t.click();
        var r = fig.getBoundingClientRect();
        if (r.top < 70 || r.bottom > W.innerHeight) fig.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
        mark();
      });
    });
    if ('MutationObserver' in W) new MutationObserver(mark).observe(fig, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
    mark();
  }
  $$(d, '.tone-r').forEach(function (r) {
    var box = r.closest('.tone'), outs = box ? $$(box, '.tone-a') : [];
    if (!outs.length) return;
    function set() {
      var v = +r.value;
      outs.forEach(function (o) {
        var on = +o.getAttribute('data-tone') === v;
        o.hidden = !on;
        if (on && !calm) { o.classList.remove('in'); void o.offsetWidth; o.classList.add('in'); }
        if (on) r.setAttribute('aria-valuetext', o.querySelector('.tone-n').textContent);
      });
      r.style.setProperty('--v', v / 2);
      box.setAttribute('data-v', v);
    }
    r.addEventListener('input', set); set();
  });
  var want = d.querySelector('.try-want.wait');
  if (want) {
    $$(d, '.try-q').forEach(function (q) {
      q.addEventListener('click', function () { W.setTimeout(function () { want.classList.remove('wait'); }, calm ? 0 : 2600); });
    });
  }
  $$(d, '[data-404]').forEach(function (f) {
    var j = f.getAttribute('data-404').split('|'), ans = f.querySelector('.e404-ans'), t = ans && ans.querySelector('.t'), p = f.querySelector('.e404-path');
    if (p) {
      var path = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
      if (path && !/^404(\.html)?$/.test(path)) p.textContent = path.length > 40 ? path.slice(0, 38) + '…' : path;
    }
    if (t) t.textContent = j[Math.floor(Math.random() * j.length)];
    if (calm || !ans) return;
    ans.classList.add('wait');
    var ty = d.createElement('li'); ty.className = 'e404-ty'; ty.setAttribute('aria-hidden', 'true'); ty.innerHTML = '<span></span><span></span><span></span>';
    W.setTimeout(function () { ans.parentNode.insertBefore(ty, ans); }, 500);
    W.setTimeout(function () { ty.remove(); ans.classList.remove('wait'); ans.classList.add('in'); }, 1900);
  });
  $$(d, '[data-chk]').forEach(function (c) {
    if (calm || !('IntersectionObserver' in W)) { c.classList.add('done'); return; }
    c.classList.add('arm');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { c.classList.add('print'); io.disconnect(); } });
    }, { rootMargin: '0px 0px -20% 0px' });
    io.observe(c);
  });
})();
