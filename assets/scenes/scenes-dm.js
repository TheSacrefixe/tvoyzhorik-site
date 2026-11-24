/* Твій Жорик — /scenes (scenes-2411, Wizard MSG 11798): проигрыватель чата «Директ очима клієнтки».
   chat.js ведёт директ только вместе с главным чатом старой главной (.chat[data-live]); на /scenes его нет — здесь свой.
   Тайминги — как в chat.js. Без JS и при prefers-reduced-motion — все сообщения сразу. Свой JS, без внешних запросов. */
(function () {
  'use strict';
  var fig = document.querySelector('.chat[data-dm]');
  if (!fig || document.querySelector('.chat[data-live]') || !window.matchMedia) return;
  var ol = fig.querySelector('.dmlog'), body = fig.querySelector('.chat-body'), typing = fig.querySelector('.typing'),
      st = fig.querySelector('.st'), bP = fig.querySelector('[data-act="pause"]'), bR = fig.querySelector('[data-act="replay"]');
  if (!ol || !body) return;
  var items = [].slice.call(ol.children), off = st ? st.textContent : '', on = st ? st.getAttribute('data-on') : '';
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var q = [], qi = 0, timer = 0, due = 0, left = 0, paused = false, vis = false, started = false;
  fig.classList.add('js-chat'); document.documentElement.classList.add('js');
  function type(v) {
    if (typing) { typing.hidden = !v; typing.classList.toggle('in', v); }
    if (st) { st.textContent = v ? on : off; st.classList.toggle('on', v); }
    if (v) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  }
  function add(li) { type(false); li.classList.remove('in'); ol.appendChild(li); void li.offsetWidth; li.classList.add('in'); body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }); }
  function clear(all) { while (ol.firstChild) ol.removeChild(ol.firstChild); if (all) items.forEach(function (li) { li.classList.add('in'); ol.appendChild(li); }); type(false); }
  function build() {
    q = [];
    items.forEach(function (d, k) {
      var dl = d.textContent.replace(/\s+/g, ' ').length;
      if (d.classList.contains('dmb')) q.push([k ? 1300 : 600, function () { add(d); }]);
      else { q.push([600, function () { type(true); }]); q.push([Math.max(1100, Math.min(2600, 700 + dl * 12)), function () { add(d); }]); }
    });
    q.push([6000, function () { start(); }]);   // пауза в конце — и по кругу
  }
  function step() { timer = 0; if (qi >= q.length) return; var s = q[qi++]; s[1](); schedule(); }
  function schedule() { if (qi >= q.length || paused || !vis || document.hidden) return; var d = left || q[qi][0]; left = 0; due = Date.now() + d; timer = setTimeout(step, d); }
  function halt() { if (timer) { clearTimeout(timer); timer = 0; left = Math.max(0, due - Date.now()); } }
  function sync() { halt(); if (!paused && vis && !document.hidden) schedule(); fig.classList.toggle('halt', paused); }
  function start() { halt(); left = 0; clear(false); build(); qi = 0; started = true; sync(); }
  function mode() {
    halt();
    if (bP) bP.hidden = mq.matches; if (bR) bR.hidden = mq.matches;
    if (mq.matches) { clear(true); return; }
    started ? sync() : clear(false);
  }
  if (bP) bP.addEventListener('click', function () {
    paused = !paused; bP.classList.toggle('paused', paused);
    bP.setAttribute('aria-label', bP.getAttribute(paused ? 'data-resume' : 'data-pause')); if (!started) start(); else sync();
  });
  if (bR) bR.addEventListener('click', function () { paused = false; if (bP) { bP.classList.remove('paused'); bP.setAttribute('aria-label', bP.getAttribute('data-pause')); } start(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      vis = es[0].isIntersecting;
      if (vis && !started && !mq.matches) start(); else sync();
    }, { threshold: 0.2 }).observe(fig);
  } else { vis = true; start(); }
  if (mq.addEventListener) mq.addEventListener('change', mode); else if (mq.addListener) mq.addListener(mode);
  mode();
})();
