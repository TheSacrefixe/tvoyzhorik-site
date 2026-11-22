(function () {
  'use strict';
  var d = document, W = window;
  var calm = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in W;
  var $$ = function (r, q) { return [].slice.call(r.querySelectorAll(q)); };
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
  $$(d, '.faq-i').forEach(function (det) {
    var a = det.querySelector('.faq-a'), tm = 0;
    det.addEventListener('toggle', function () {
      clearTimeout(tm);
      if (!det.open || calm) { a.classList.remove('wait'); return; }
      a.classList.add('wait');
      tm = setTimeout(function () { a.classList.remove('wait'); }, 750);
    });
  });
  var day = d.querySelector('[data-day]');
  if (day && IO) {
    var stops = $$(day, '.dl-stop'), tm = day.querySelector('.dl-time'), lb = day.querySelector('.dl-lab'),
        bar = day.querySelector('.dl-bar i'), sun = day.querySelector('.dl-sun'), night = day.querySelector('.dl-night'), cur = -1;
    var set = function (k) {
      if (k === cur) return; cur = k;
      var st = stops[k], h = parseInt(st.getAttribute('data-t'), 10);
      tm.textContent = st.getAttribute('data-t'); lb.textContent = st.getAttribute('data-l');
      var cont = day.classList.contains('mo-day');
      if (sun && !cont) sun.style.transform = 'rotate(' + (-80 + (h - 8) / 14 * 160).toFixed(1) + 'deg)';
      if (night && !cont) night.style.opacity = h >= 22 ? '1' : h >= 17 ? '.25' : '0';
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
