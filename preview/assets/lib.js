/* Твой Жорик — «Бібліотека Жорика» (skills.html; Олег MSG 10133–10148, 10195). Собирает C:/Zhorik/tools/library_page.py.
   Без сети, cookies и сбора данных: все тексты — в JSON на странице (#lib-data), поиск идёт только в браузере.
   1) книги — кнопки: наведение/фокус — книга выезжает и показывает формуляр; Enter/клик — летит дугой в телефон (WAAPI, только transform/opacity);
      стрелки ←/→, Home/End — по книгам одной полки (одна остановка Tab на полку); Esc — вернуть книгу и закрыть телефон;
   2) картотека — ящики по группам; карточки рисуются только при открытии ящика; клик по карточке — переворот;
   3) поиск — фильтрует книги на полках и карточки в ящиках, ящик с совпадениями выдвигается сам.
   prefers-reduced-motion: без полёта и набора — телефон сразу показывает результат. Без JS — полки списком (CSS). */
(function () {
  'use strict';
  var d = document, W = window;
  var dataEl = d.getElementById('lib-data');
  if (!dataEl || !d.querySelector('.case')) return;
  var D = JSON.parse(dataEl.textContent), U = D.ui;
  var mq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var narrow = W.matchMedia ? W.matchMedia('(max-width: 900px)') : { matches: false };
  var $$ = function (r, s) { return [].slice.call(r.querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var norm = function (s) { return String(s).toLowerCase().replace(/[’'’`«»"“”]/g, '').replace(/ё/g, 'е').replace(/[-_]+/g, ' ').replace(/\s+/g, ' '); };

  /* ---------- телефон ---------- */
  var ph = d.querySelector('.ph'), log = d.querySelector('.ph-log'), phX = d.querySelector('.ph-x'), st = ph.querySelector('.st');
  var stOff = st ? st.textContent : '', stOn = st ? st.getAttribute('data-on') : '';
  var hello = log.innerHTML, timers = [], curBook = null;
  function clearT() { timers.forEach(clearTimeout); timers = []; }
  function status(on) { if (st) { st.textContent = on ? stOn : stOff; st.classList.toggle('on', on); } }
  function li(html, cls) {
    var e = d.createElement('li'); e.className = cls; e.innerHTML = html; return e;
  }
  function msgEl(m) {
    if (m[0] === 'me') return li('<span class="from">' + esc(U.you) + '</span><p>' + esc(m[1]) + '</p>', 'msg me read');
    return li('<span class="sr">' + esc(U.bot) + ' </span><p class="t">' + esc(m[1]) + '</p>', 'msg zh');
  }
  function put(e, anim) { if (anim) e.classList.add('new'); log.appendChild(e); }
  /* тихая ссылка внизу телефона, когда книжка «прилетела» (site-pages-2211, Олег MSG 10310): готовая — «Хочу такий скіл у себе →»,
     «скоро» — «Хочу першим спробувати →». Ссылку и тексты ставит waitlist_site.py в разметку (.ph-want с data-*). */
  var want = ph.querySelector('.ph-want');
  function wantShow(b) {
    if (!want) return;
    var soon = b.s === 'soon';
    want.href = want.getAttribute(soon ? 'data-soon-href' : 'data-href');
    want.textContent = want.getAttribute(soon ? 'data-soon-t' : 'data-t');
    want.hidden = false; want.classList.remove('in'); void want.offsetWidth; want.classList.add('in');
  }
  function show(k, instant) {
    var b = D.books[k]; if (!b) return;
    clearT(); log.innerHTML = ''; status(false);
    if (want) want.hidden = true;
    var head;
    if (b.s === 'soon') head = li('<span>' + esc(U.soon_h.replace('%s', b.t)) + '</span>', 'msg sys soon');
    else head = li('<span>' + esc(U.ok_h.replace('%s', b.t)) + '</span>' + (b.s === 'tested' ? '<span class="note">' + esc(U.tested) + '</span>' : ''), 'msg sys ok');
    var msgs = b.s === 'soon' ? [['zh', b.l]] : b.c;
    put(head, !instant);
    if (instant) { msgs.forEach(function (m) { put(msgEl(m), false); }); wantShow(b); return; }
    var t = 350;
    msgs.forEach(function (m) {
      if (m[0] === 'zh') {
        var ty;
        timers.push(setTimeout(function () { ty = li('<span></span><span></span><span></span>', 'ty'); ty.setAttribute('aria-hidden', 'true'); put(ty, true); status(true); }, t));
        t += Math.max(800, Math.min(1700, 500 + m[1].length * 9));
        timers.push(setTimeout(function () { if (ty) ty.remove(); status(false); put(msgEl(m), true); }, t));
        t += 350;
      } else {
        t += 250;
        timers.push(setTimeout(function () { put(msgEl(m), true); }, t));
        t += 550;
      }
    });
    timers.push(setTimeout(function () { wantShow(b); }, t + 250));   /* ссылка — когда переписка закончилась */
  }
  function resetPhone() {
    clearT(); status(false); log.innerHTML = hello; if (want) want.hidden = true;
    if (curBook) { curBook.setAttribute('aria-pressed', 'false'); }
    curBook = null; ph.classList.remove('open'); if (phX) phX.setAttribute('aria-expanded', 'false');
  }
  if (phX) phX.addEventListener('click', function () {
    var o = !ph.classList.contains('open'); ph.classList.toggle('open', o); phX.setAttribute('aria-expanded', o ? 'true' : 'false');
  });

  /* ---------- полёт книги ---------- */
  function fly(book, done) {
    if (mq.matches || !book.animate) { done(); return; }
    var tgt = narrow.matches ? ph : (d.querySelector('.ph-screen') || ph);
    var r = book.getBoundingClientRect(), t = tgt.getBoundingClientRect();
    if (narrow.matches) t = { left: t.left, width: t.width, top: Math.min(t.top, W.innerHeight - 74), height: 60 };
    var c = book.cloneNode(true);
    $$(c, '.slip,.bk-txt').forEach(function (e) { e.remove(); });
    c.removeAttribute('aria-pressed'); c.removeAttribute('aria-label'); c.removeAttribute('aria-describedby');
    c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; c.classList.remove('dim', 'hit');
    c.classList.add('fly');
    var pg = d.createElement('span'); pg.className = 'pg'; c.appendChild(pg);
    c.style.left = r.left + 'px'; c.style.top = r.top + 'px'; c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
    d.body.appendChild(c);
    var dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height * 0.55 - (r.top + r.height / 2);
    var lift = Math.min(200, Math.max(90, Math.abs(dx) * 0.25 + 60), Math.max(40, r.top + dy * 0.5 - 24)), kf = [], N = 14;
    for (var i = 0; i <= N; i++) {
      var s = i / N, x = dx * s, y = dy * s - 4 * lift * s * (1 - s);
      kf.push({ transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (-78 * s).toFixed(1) + 'deg) scale(' + (1 - 0.42 * s).toFixed(3) + ')',
                opacity: s > 0.82 ? Math.max(0, 1 - (s - 0.82) / 0.18) : 1 });
    }
    var a = c.animate(kf, { duration: 880, easing: 'cubic-bezier(.42,0,.3,1)' });
    var fin = function () { if (c.parentNode) c.remove(); ph.classList.remove('got'); void ph.offsetWidth; ph.classList.add('got'); done(); };
    a.onfinish = fin; a.oncancel = fin;
  }
  function take(book) {
    var k = book.getAttribute('data-k');
    if (curBook && curBook !== book) curBook.setAttribute('aria-pressed', 'false');
    curBook = book; book.setAttribute('aria-pressed', 'true');
    clearT();
    if (narrow.matches) { ph.classList.add('open'); if (phX) phX.setAttribute('aria-expanded', 'true'); }
    fly(book, function () { show(k, mq.matches); });
  }

  /* ---------- книги: клик, клавиатура (одна остановка Tab на полку) ---------- */
  var rows = $$(d, '.row');
  var booksOf = function (row) { return $$(row, '.book'); };
  function rove(row, target) {
    booksOf(row).forEach(function (b) { b.tabIndex = b === target ? 0 : -1; });
  }
  function firstLive(row) { var bs = booksOf(row); return bs.filter(function (b) { return !b.classList.contains('dim'); })[0] || bs[0]; }
  rows.forEach(function (row) {
    var bs = booksOf(row); if (!bs.length) return;
    rove(row, bs[0]);
    row.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.book'); if (!b || !row.contains(b)) return;
      rove(row, b); take(b);
    });
    row.addEventListener('keydown', function (e) {
      var b = e.target.closest && e.target.closest('.book'); if (!b) return;
      var live = booksOf(row).filter(function (x) { return !x.classList.contains('dim') || x === b; });
      var i = live.indexOf(b), n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = Math.min(live.length - 1, i + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = Math.max(0, i - 1);
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = live.length - 1;
      if (n < 0) return;
      e.preventDefault(); rove(row, live[n]); live[n].focus();
      live[n].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: mq.matches ? 'auto' : 'smooth' });
    });
  });

  /* ---------- картотека ---------- */
  var drws = $$(d, '.drw'), panel = d.getElementById('drw-panel'), openG = -1, autoOpen = false, query = '';
  var cardIdx = D.cards.map(function (c) { var g = D.groups[c[0]]; return norm(c[2] + ' ' + c[4] + ' ' + c[3] + ' ' + g.n + ' ' + (c[1] && g.subs ? g.subs[c[1]] : '')); });
  function matchCards(g) {
    var out = [];
    D.cards.forEach(function (c, i) { if (c[0] === g && (!query || cardIdx[i].indexOf(query) >= 0)) out.push(i); });
    return out;
  }
  function cardHtml(i, n) {
    var c = D.cards[i];
    return '<li class="in" style="--i:' + Math.min(n, 24) + '"><button type="button" class="card" aria-pressed="false"><span class="card-in">' +
      '<span class="card-f"><b>' + esc(c[2]) + '</b><code class="card-n" translate="no">' + esc(c[4]) + '</code><small>' + esc(U.soon) + '</small></span>' +
      '<span class="card-b" aria-hidden="true"><p>' + esc(c[3]) + '</p><small>' + esc(U.soon) + '</small></span></span></button></li>';
  }
  function renderPanel(g) {
    var G = D.groups[g], ids = matchCards(g), html = '', n = 0, lastSub = null;
    ids.forEach(function (i) {
      var sub = D.cards[i][1];
      if (G.subs && sub !== lastSub) {
        if (lastSub !== null) html += '</ul>';
        html += '<h4 class="drw-sub">' + esc(G.subs[sub]) + '</h4><ul class="cards">'; lastSub = sub;
      }
      html += cardHtml(i, n++);
    });
    if (!G.subs) html = '<ul class="cards">' + html + '</ul>'; else if (lastSub !== null) html += '</ul>';
    var found = query ? ' · ' + U.found.replace('%d', ids.length) : '';
    panel.innerHTML = '<div class="drw-in"><div class="drw-top"><h3 id="drw-h">' + esc(G.n) + '</h3><span class="drw-soon">' + esc(U.soon) + found + '</span>' +
      '<button type="button" class="drw-close">' + esc(U.close) + '</button></div>' + html + '</div>';
    panel.setAttribute('aria-labelledby', 'drw-h');
  }
  function openDrawer(g, auto) {
    openG = g; autoOpen = !!auto;
    drws.forEach(function (b, i) { b.setAttribute('aria-expanded', i === g ? 'true' : 'false'); });
    renderPanel(g); panel.hidden = false;
  }
  function closeDrawer(focus) {
    var was = openG; openG = -1; autoOpen = false; panel.hidden = true; panel.innerHTML = '';
    drws.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && was >= 0) drws[was].focus();
  }
  drws.forEach(function (b, i) {
    b.addEventListener('click', function () { if (openG === i) closeDrawer(false); else openDrawer(i, false); });
  });
  panel.addEventListener('click', function (e) {
    if (e.target.closest('.drw-close')) { closeDrawer(true); return; }
    var c = e.target.closest('.card'); if (!c) return;
    var on = c.getAttribute('aria-pressed') !== 'true';
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
    c.querySelector('.card-f').setAttribute('aria-hidden', on ? 'true' : 'false');
    c.querySelector('.card-b').setAttribute('aria-hidden', on ? 'false' : 'true');
  });

  /* ---------- поиск ---------- */
  var inp = d.getElementById('lib-q'), clr = d.querySelector('.find-x'), res = d.querySelector('.find-res');
  var allBooks = $$(d, '.row .book');
  var bookIdx = allBooks.map(function (b) { var tx = b.querySelector('.bk-txt'); var row = b.closest('.row'); return norm((tx ? tx.textContent : '') + ' ' + (b.getAttribute('aria-label') || '') + ' ' + (row ? row.getAttribute('aria-label') : '')); });
  var qt = 0;
  function plural(n, f) { var a = n % 10, h = n % 100; return a === 1 && h !== 11 ? f[0] : (a >= 2 && a <= 4 && (h < 12 || h > 14) ? f[1] : f[2]); }
  function apply() {
    query = norm(inp.value).trim(); if (query.length < 2) query = '';
    clr.hidden = !inp.value;
    var nb = 0;
    allBooks.forEach(function (b, i) {
      var hit = !!query && bookIdx[i].indexOf(query) >= 0;
      b.classList.toggle('dim', !!query && !hit); b.classList.toggle('hit', hit); if (hit) nb++;
    });
    rows.forEach(function (row) { var f = firstLive(row); if (f) rove(row, f); });
    var best = -1, bestN = 0, nc = 0;
    drws.forEach(function (b, g) {
      var n = query ? matchCards(g).length : 0; nc += n;
      b.classList.toggle('has', !!query && n > 0); b.classList.toggle('zero', !!query && n === 0);
      var h = b.querySelector('.hit'); if (h) h.textContent = query ? '· ' + U.found.replace('%d', n) : '';
      if (n > bestN) { bestN = n; best = g; }
    });
    if (!query) { if (autoOpen) closeDrawer(false); else if (openG >= 0) renderPanel(openG); res.textContent = ''; return; }
    if (best >= 0 && (openG < 0 || autoOpen || matchCards(openG).length === 0)) openDrawer(best, true);
    else if (openG >= 0) renderPanel(openG);
    if (best < 0 && autoOpen) closeDrawer(false);
    res.textContent = (nb || nc) ? U.res.replace('%b', nb + ' ' + plural(nb, U.books)).replace('%c', nc + ' ' + plural(nc, U.cards)) : U.none;
  }
  if (inp) {
    inp.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(apply, 110); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(qt); apply(); } });
    clr.addEventListener('click', function () { inp.value = ''; apply(); inp.focus(); });
  }

  /* ---------- Esc ---------- */
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var a = d.activeElement;
    if (a === inp && inp.value) { inp.value = ''; apply(); return; }
    if (a && a.classList && a.classList.contains('card') && a.getAttribute('aria-pressed') === 'true') { a.click(); return; }
    if (openG >= 0 && a && (panel.contains(a) || a.classList.contains('drw'))) { closeDrawer(true); return; }
    if (curBook) { var b = curBook; resetPhone(); b.focus(); return; }
    if (openG >= 0) closeDrawer(true);
  });
})();
