/* Твой Жорик — общий скрипт всех страниц (Олег MSG 10047, 10049). Без сети, cookies и сбора данных.
   1) .rv — мягкий подъём блока при прокрутке (IntersectionObserver, только transform/opacity);
      без JS, без IntersectionObserver и при prefers-reduced-motion блоки видны сразу.
   2) юр. страницы: тонкая полоса прочитанного и подсветка текущего раздела в оглавлении. */
(function () {
  'use strict';
  var d = document, h = d.documentElement, W = window;
  var calm = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in W;

  if (IO && !calm) {
    var els = [].slice.call(d.querySelectorAll('.rv')), vh = W.innerHeight;
    /* то, что уже на экране, — видно сразу (без мигания); остальное прячем и показываем при подходе */
    els.forEach(function (el) { if (el.getBoundingClientRect().top < vh) el.classList.add('on'); });
    h.classList.add('rv-go');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { if (!el.classList.contains('on')) io.observe(el); });
  }

  /* узкий экран: меню — строка с прокруткой; текущий пункт показываем */
  var curNav = d.querySelector('.pages [aria-current]');
  if (curNav) { var ul = curNav.parentNode.parentNode; if (ul.scrollWidth > ul.clientWidth) ul.scrollLeft = curNav.parentNode.offsetLeft - ul.offsetLeft - 8; }

  var bar = d.querySelector('.readbar i');
  if (bar) {
    var ticking = false;
    var upd = function () {
      ticking = false;
      var max = h.scrollHeight - W.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, W.scrollY / max) : 1).toFixed(4) + ')';
    };
    W.addEventListener('scroll', function () { if (!ticking) { ticking = true; W.requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  var links = [].slice.call(d.querySelectorAll('.toc a[href^="#"]'));
  if (links.length && IO) {
    var map = {}, cur = null;
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var mark = function (id) {
      if (cur) cur.removeAttribute('aria-current');
      cur = map[id] || null;
      if (cur) cur.setAttribute('aria-current', 'location');
    };
    var to = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: '0px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var el = d.getElementById(id); if (el) to.observe(el); });
  }
})();
