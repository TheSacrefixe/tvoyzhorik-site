/* nav.js — fix7 (site-fix7-nav-2411; Олег MSG 11556–11557). Меню страниц: касание кнопки — открыть/закрыть, Esc, касание вне
   (подложка), фокус в меню и обратно на кнопку, aria-expanded. Внутренние страницы (r4): своё меню r4.js + здесь только закрытие
   касанием вне. Без внешних запросов. */
(function () {
  'use strict';
  var d = document, W = window;
  var RM = !W.matchMedia || W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function veil(z) { var v = d.createElement('div'); v.className = 'tzn-veil'; v.hidden = true; if (z) v.style.zIndex = z; d.body.appendChild(v); return v; }

  var btn = d.querySelector('.tzn-btn'), menu = d.getElementById('tzn-menu');
  if (btn && menu) {
    var header = btn.closest('header') || d.body, v = d.querySelector('.tzn-veil') || veil(), open = false, t = 0;
    if (header.classList) header.classList.add('tzn-has');
    /* 404 — одна страница на оба языка */
    var ls = menu.querySelectorAll('[data-l]');
    if (ls.length) {
      var lm = /^\/(en|de|es|ru)(\/|$)/.exec(location.pathname), en = lm ? lm[1] : 'uk';   /* langs-2511 */
      [].forEach.call(ls, function (b) { b.hidden = b.getAttribute('data-l') !== en; });
    }
    var place = function () {
      var r = header.getBoundingClientRect(), top = Math.max(8, Math.round(r.bottom + 8));
      menu.style.top = top + 'px'; menu.style.maxHeight = Math.max(200, W.innerHeight - top - 12) + 'px';
    };
    var set = function (on, back) {
      if (on === open) return;
      open = on; btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      header.classList.toggle('tzn-on', on);
      clearTimeout(t);
      if (on) {
        menu.hidden = false; v.hidden = false; place();
        requestAnimationFrame(function () { menu.classList.add('open'); v.classList.add('open'); });
        var blk = [].filter.call(menu.querySelectorAll('.tzn-menu-in'), function (b) { return !b.hidden; })[0] || menu;
        var a = blk.querySelector('a[aria-current="page"]') || blk.querySelector('a');
        if (a) a.focus({ preventScroll: true });
      } else {
        menu.classList.remove('open'); v.classList.remove('open');
        t = setTimeout(function () { if (!open) { menu.hidden = true; v.hidden = true; } }, RM ? 0 : 320);
        if (back) btn.focus({ preventScroll: true });
      }
    };
    btn.addEventListener('click', function (e) { e.preventDefault(); set(!open, false); });
    v.addEventListener('click', function () { set(false, false); });
    d.addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && open) { e.preventDefault(); set(false, true); } });
    menu.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (a && a.getAttribute('aria-current') === 'page') { e.preventDefault(); set(false, true); W.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); }
    });
    menu.addEventListener('focusout', function (e) {
      var n = e.relatedTarget; if (open && n && !menu.contains(n) && n !== btn) set(false, false);
    });
    W.addEventListener('resize', function () { if (open) place(); });
    W.addEventListener('pageshow', function (e) { if (e.persisted) set(false, false); });
  }

  /* переход между страницами (View Transitions, a.css): если у страницы-цели нет перехода, браузер пропускает его и
     выбрасывает необработанную ошибку «Transition was skipped» — гасим её, переход и так идёт обычный */
  var vt = function (e) { var t = e.viewTransition; if (t) ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) { if (t[k] && t[k].catch) t[k].catch(function () {}); }); };
  W.addEventListener('pageswap', vt); W.addEventListener('pagereveal', vt);

  /* внутренние страницы: меню r4 — закрыть касанием вне */
  var rb = d.querySelector('.r4burger'), rm = d.getElementById('r4menu');
  if (rb && rm) {
    var rv = veil('58');
    var sync = function () {
      var on = rb.getAttribute('aria-expanded') === 'true';
      if (on) { rv.hidden = false; requestAnimationFrame(function () { rv.classList.add('open'); }); }
      else { rv.classList.remove('open'); rv.hidden = true; }
    };
    new MutationObserver(sync).observe(rb, { attributes: true, attributeFilter: ['aria-expanded'] });
    rv.addEventListener('click', function () { if (rb.getAttribute('aria-expanded') === 'true') rb.click(); });
    W.addEventListener('pageshow', function (e) { if (e.persisted && rb.getAttribute('aria-expanded') === 'true') rb.click(); });
  }
})();
