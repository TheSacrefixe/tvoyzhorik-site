(function () {
  'use strict';
  var fig = document.querySelector('[data-ba]');
  if (!fig || !window.matchMedia) return;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lines = [].slice.call(fig.querySelectorAll('.ba-ln'));
  var steps = [].slice.call(fig.querySelectorAll('[data-s]'));
  var btn = fig.querySelector('.bp-btn');
  var ctls = fig.querySelector('.ba-ctls');
  var bP = fig.querySelector('[data-act="pause"]'), bR = fig.querySelector('[data-act="replay"]');
  var toks = lines.map(function (ln) {
    var out = [], n = ln.firstChild;
    for (; n; n = n.nextSibling) out.push({ el: n, tx: n.textContent });
    return out;
  });
  var car = document.createElement('span'); car.className = 'ba-car';
  var li = 0, ti = 0, ci = 0, timer = 0, state = 'idle', userPaused = false, inView = false;
  fig.baApi = {
    toks: toks,
    running: function () { return state === 'ready' || state === 'play' || state === 'paused'; },
    finish: function () { finalFrame(); userPaused = false; setBtn(); }
  };
  function show(s) { steps.forEach(function (e) { if (+e.getAttribute('data-s') === s) e.classList.add('on'); }); }
  function finalFrame() {
    clearTimeout(timer); timer = 0; state = 'done';
    fig.classList.remove('ba-run', 'ba-fin');
    toks.forEach(function (l) { l.forEach(function (t) { t.el.textContent = t.tx; }); });
    lines.forEach(function (l) { l.classList.remove('cur'); });
    if (car.parentNode) car.parentNode.removeChild(car);
    emit();
  }
  function emit() {
    fig.setAttribute('data-ba-end', '');
    try { fig.dispatchEvent(new CustomEvent('ba:end')); } catch (e) {   }
  }
  function reset() {
    clearTimeout(timer); timer = 0;
    toks.forEach(function (l) { l.forEach(function (t) { t.el.textContent = ''; }); });
    lines.forEach(function (l) { l.classList.remove('cur'); });
    steps.forEach(function (e) { e.classList.remove('on'); });
    btn.classList.remove('rnd', 'col');
    fig.classList.remove('ba-fin');
    fig.classList.add('ba-run');
    li = ti = ci = 0; state = 'ready';
  }
  function setBtn() {
    var p = userPaused;
    bP.classList.toggle('paused', p);
    bP.setAttribute('aria-label', bP.getAttribute(p ? 'data-resume' : 'data-pause'));
    bP.setAttribute('aria-disabled', state === 'end' || state === 'done' ? 'true' : 'false');
  }
  function tick() {
    timer = 0;
    if (state !== 'play') return;
    if (li >= lines.length) {
      lines[lines.length - 1].classList.remove('cur');
      fig.classList.add('ba-fin'); state = 'end'; setBtn(); emit(); return;
    }
    var l = toks[li], ln = lines[li];
    if (ti === 0 && ci === 0) { if (li) lines[li - 1].classList.remove('cur'); ln.classList.add('cur'); }
    if (ti < l.length) {
      var t = l[ti];
      ci = Math.min(t.tx.length, ci + (t.tx.charAt(ci) === ' ' && ti === 0 ? 2 : 1));
      t.el.textContent = t.tx.slice(0, ci);
      t.el.parentNode.insertBefore(car, t.el.nextSibling);
      if (ci >= t.tx.length) { ti++; ci = 0; }
      timer = setTimeout(tick, 17 + (Math.random() * 14 | 0));
      return;
    }
    var fx = lines[li].getAttribute('data-fx');
    if (fx) { if (fx !== 'nop') btn.classList.add(fx); } else show(li);
    li++; ti = 0; ci = 0;
    timer = setTimeout(tick, 230);
  }
  function play() {
    if (state === 'ready' || state === 'paused') { state = 'play'; if (!timer) tick(); }
  }
  function pause() { if (state === 'play') { clearTimeout(timer); timer = 0; state = 'paused'; } }
  function sync() { if (userPaused || !inView || document.hidden) pause(); else play(); }
  function start() {
    if (mq.matches) { finalFrame(); ctls.hidden = true; return; }
    ctls.hidden = false;
    reset(); userPaused = false; setBtn(); sync();
  }
  bP.addEventListener('click', function () {
    if (state === 'end' || state === 'done') return;
    userPaused = !userPaused; setBtn(); sync();
  });
  bR.addEventListener('click', function () { reset(); userPaused = false; setBtn(); sync(); });
  document.addEventListener('visibilitychange', sync);
  if (mq.addEventListener) mq.addEventListener('change', start); else if (mq.addListener) mq.addListener(start);
  if (mq.matches) { finalFrame(); return; }
  reset(); ctls.hidden = false; setBtn();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { inView = e.isIntersecting; });
      sync();
    }, { threshold: 0.35 }).observe(fig);
  } else { inView = true; sync(); }
})();
