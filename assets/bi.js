(function () {
  'use strict';
  var fig = document.querySelector('[data-ba]'), pan = document.querySelector('[data-bi-panel]');
  if (!fig || !pan || !fig.baApi || !window.matchMedia) return;
  var api = fig.baApi, mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var btn = fig.querySelector('.bp-btn'), logo = fig.querySelector('.bp-top b');
  var live = pan.querySelector('[data-bi-live]'), inp = pan.querySelector('#bi-name');
  var defName = pan.getAttribute('data-name'), liveT = 0, flT = 0;
  function tok(key) {
    var el = fig.querySelector('[data-bi="' + key + '"]');
    for (var i = 0; i < api.toks.length; i++)
      for (var j = 0; j < api.toks[i].length; j++)
        if (api.toks[i][j].el === el) return { t: api.toks[i][j], ln: el.parentNode };
    return null;
  }
  var T = { name: tok('name'), col: tok('col'), rad: tok('rad') };
  if (!T.name || !T.col || !T.rad) return;
  pan.hidden = false;
  function flash(el, cls) {
    if (mq.matches) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  }
  function say(key, v, delay) {
    clearTimeout(liveT);
    var msg = pan.getAttribute('data-m-' + key).replace('{v}', v).replace('{n}', pan.getAttribute('data-ln-' + key));
    liveT = setTimeout(function () { live.textContent = msg; }, delay);
  }
  function apply(key, val, target) {
    if (api.running()) api.finish();
    var o = T[key];
    o.t.tx = val; o.t.el.textContent = val;
    [].forEach.call(fig.querySelectorAll('.bi-hl'), function (e) { if (e !== o.ln) e.classList.remove('bi-hl', 'bi-fl'); });
    o.ln.classList.add('bi-hl');
    flash(o.ln, 'bi-fl'); flash(target, 'bi-pop');
  }
  inp.addEventListener('input', function () {
    var v = inp.value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 24);
    var shown = v.replace(/^\s+|\s+$/g, '') || defName;
    logo.textContent = shown;
    apply('name', shown, logo);
    say('name', shown, 900);
  });
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
  [].forEach.call(pan.querySelectorAll('input[name="bi-c"]'), function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      btn.setAttribute('data-c', r.value);
      apply('col', r.getAttribute('data-hex'), btn);
      say('col', r.getAttribute('data-label'), 150);
    });
  });
  [].forEach.call(pan.querySelectorAll('input[name="bi-r"]'), function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      btn.setAttribute('data-r', r.value);
      apply('rad', r.getAttribute('data-val'), btn);
      say('rad', r.getAttribute('data-label'), 150);
    });
  });
})();
