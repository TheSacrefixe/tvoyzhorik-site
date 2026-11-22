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

  /* 3) пасхалка: кнопка-«💬» (SVG) у логотипа — пузырь Жорика со случайной шуткой (Олег MSG 10101).
     Не повторяет подряд одну и ту же; гаснет через 5 с, по повторному нажатию, Esc или клику мимо. */
  var box = d.querySelector('.brandbox');
  if (box) {
    var uk = (h.lang || '').slice(0, 2) !== 'en';
    var J = uk ? [
      'Ви мене клікнули? А я думав, ви тільки рекламу клікаєте.',
      'Спам я принципово не читаю. Його пишуть люди, які теж не читають.',
      'Склад рахую до штуки. Ваші нерви теж рахую, але не списую.',
      'Каву варити не вмію. Зате вмію зробити так, щоб ви встигли її випити.',
      'Чернетку пишу я, а «так» тиснете ви. Це не боягузтво, це етикет.',
      'Звіт — о восьмій ранку. О сьомій ви його все одно не прочитаєте.',
      'Знижку дати? Дам. Після вашого «так». Я щедрий тільки з дозволу.',
      'В Одесі кажуть: не кажи «гоп». А я кажу: не кажи «надіслав», поки не натиснули «так».',
      'Знову тиснете? Таки цікаво, що буде? Ще один жарт. Я ж не жадібний.',
      'Відпустку не прошу, на лікарняний не йду. Мама каже — золото, а не помічник.',
      'Цей сайт зібрав сам Твой Жорик — менше ніж за добу. Каву не пив: не вміє.'
    ] : [
      'You clicked me? And here I thought you only ever clicked ads.',
      'I never read spam, on principle. Its authors don’t read it either.',
      'I count stock down to the last piece. Your nerves I count too, but I don’t write them off.',
      'I can’t brew coffee. But I can make sure you have time to drink it.',
      'I write the draft, you press “yes”. That’s not cowardice, that’s etiquette.',
      'Report at eight a.m. At seven you won’t read it anyway.',
      'A discount? Sure. After your “yes”. I’m generous only with permission.',
      'In Odesa they say: don’t say “hop” before you jump. I say: don’t say “sent” before they press “yes”.',
      'Pressing again? Curious what happens? Here’s another joke. I’m not greedy.',
      'No vacation, no sick days. My mom says I’m gold, not an assistant.',
      'This site was built by Tvii Zhoryk itself — in under a day. No coffee: it can’t drink any.'
    ];
    var btn = d.createElement('button'), bub = d.createElement('div'), last = -1, tm = 0;
    btn.type = 'button'; btn.className = 'joke-btn'; btn.innerHTML = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v11H10l-4 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5" stroke-linecap="round"/></svg>';
    btn.setAttribute('aria-label', uk ? 'Жарт від Жорика' : 'A joke from Zhoryk');
    btn.setAttribute('aria-expanded', 'false');
    bub.className = 'joke'; bub.hidden = true; bub.id = 'joke-bubble';
    bub.setAttribute('role', 'status'); bub.setAttribute('aria-live', 'polite');
    btn.setAttribute('aria-controls', 'joke-bubble');
    var brand = box.querySelector('.brand');
    box.insertBefore(btn, brand ? brand.nextSibling : null);
    box.appendChild(bub);
    var hide = function () { clearTimeout(tm); bub.hidden = true; bub.classList.remove('show'); btn.setAttribute('aria-expanded', 'false'); };
    var show = function () {
      var i; do { i = Math.floor(Math.random() * J.length); } while (i === last && J.length > 1);
      last = i; bub.hidden = true; bub.textContent = '';
      var t = d.createElement('b'); t.textContent = uk ? 'Жорик' : 'Zhoryk'; t.setAttribute('translate', 'no');
      bub.appendChild(t); bub.appendChild(d.createTextNode(J[i]));
      bub.hidden = false; bub.classList.remove('show'); void bub.offsetWidth; bub.classList.add('show');
      btn.setAttribute('aria-expanded', 'true');
      clearTimeout(tm); tm = setTimeout(hide, 5000);
    };
    btn.addEventListener('click', function () { if (bub.hidden) show(); else hide(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !bub.hidden) { hide(); btn.focus(); } });
    d.addEventListener('click', function (e) { if (!bub.hidden && !box.contains(e.target)) hide(); });
  }
})();
