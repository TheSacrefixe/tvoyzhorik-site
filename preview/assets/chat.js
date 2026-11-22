/* Твой Жорик — «живое» окно чата на главной (Олег MSG 10041; сценарии, «Пошта» — MSG 10087–10094, «Так / Змінити», режим — MSG 10047, 10049).
   Второе окно — директ глазами покупательницы (MSG 10080): его сообщения (data-at) идут в общей очереди сценария «Директ» —
   сначала сообщение в директе, потом копия у владелицы в Telegram. Окно директа видно, а Telegram нет — играет «Директ» по кругу.
   Сценарная анимация: тексты сценариев — в разметке страницы (uk/en), здесь только показ по одному.
   Без внешних скриптов, без сети, без cookies и сбора данных.
   Без JS — виден первый сценарий целиком; prefers-reduced-motion — все сообщения сразу, вкладки работают без анимации. */
(function () {
  'use strict';
  var fig = document.querySelector('.chat[data-live]');
  if (!fig || !window.matchMedia) return;

  var lists = [].slice.call(fig.querySelectorAll('.scn'));
  var items = lists.map(function (ol) { return [].slice.call(ol.children); });
  var tabs = [].slice.call(fig.querySelectorAll('[data-go]'));
  var log = fig.querySelector('.chat-log');
  var body = fig.querySelector('.chat-body');
  var typing = fig.querySelector('.typing');
  var st = fig.querySelector('.st');
  var modeEl = fig.querySelector('.mode');
  var bPause = fig.querySelector('[data-act="pause"]');
  var bReplay = fig.querySelector('[data-act="replay"]');
  var stOff = st.textContent, stOn = st.getAttribute('data-on');
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* второе окно (директ): необязательное — на варианте А его нет */
  var dmFig = document.querySelector('.chat[data-dm]'), dm = null;
  var dmIdx = lists.map(function (ol) { return ol.hasAttribute('data-dm'); }).indexOf(true);
  if (dmFig && dmIdx >= 0) {
    dm = { fig: dmFig, ol: dmFig.querySelector('.dmlog'), body: dmFig.querySelector('.chat-body'), log: dmFig.querySelector('.chat-log'),
           typing: dmFig.querySelector('.typing'), st: dmFig.querySelector('.st'),
           pause: dmFig.querySelector('[data-act="pause"]'), replay: dmFig.querySelector('[data-act="replay"]') };
    dm.items = [].slice.call(dm.ol.children);
    dm.off = dm.st.textContent; dm.on = dm.st.getAttribute('data-on');
    dmFig.classList.add('js-chat');
  }
  var mainVis = true, dmVis = false;

  var cur = 0, queue = [], qi = 0, timer = 0, due = 0, left = 0, running = false;
  var userPaused = false, inView = true, total = 1, done = 0, prog = null;

  document.documentElement.classList.add('js');
  fig.classList.add('js-chat');

  function setTab(n) {
    tabs.forEach(function (t, i) {
      t.setAttribute('aria-pressed', i === n ? 'true' : 'false');
      var p = t.querySelector('i'); p.style.transition = 'none'; p.style.transform = 'scaleX(0)';
    });
    prog = tabs[n].querySelector('i');
  }
  function show(n) { lists.forEach(function (ol, i) { ol.hidden = i !== n; ol.classList.remove('out'); }); }
  function fill(n, all) {
    var ol = lists[n];
    while (ol.firstChild) ol.removeChild(ol.firstChild);
    if (all) items[n].forEach(function (li) {
      li.classList.remove('in'); li.classList.add('read', 'played'); ol.appendChild(li);
      [].forEach.call(li.querySelectorAll('.tap'), function (c) { c.classList.remove('tap'); });
    });
  }
  function down(smooth) {                  /* прокрутка окна к последнему сообщению (скролл не считается сдвигом вёрстки) */
    body.scrollTo({ top: body.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }
  function dmFill(all) {
    if (!dm) return;
    while (dm.ol.firstChild) dm.ol.removeChild(dm.ol.firstChild);
    if (all) dm.items.forEach(function (li) { li.classList.remove('in'); dm.ol.appendChild(li); });
    dmType(false);
  }
  function dmType(on) {
    dm.typing.hidden = !on; dm.typing.classList.toggle('in', on);
    dm.st.textContent = on ? dm.on : dm.off; dm.st.classList.toggle('on', on);
    if (on) dm.body.scrollTo({ top: dm.body.scrollHeight, behavior: 'smooth' });
  }
  function dmAdd(li) {
    dmType(false);
    li.classList.remove('in'); dm.ol.appendChild(li);
    void li.offsetWidth; li.classList.add('in');
    dm.body.scrollTo({ top: dm.body.scrollHeight, behavior: 'smooth' });
  }
  function setMode(t) { if (!modeEl) return; modeEl.textContent = t || ''; modeEl.hidden = !t; }   /* плашка режима («брейншторм») */
  function status(on) { st.textContent = on ? stOn : stOff; st.classList.toggle('on', on); }

  /* ---------- очередь шагов одного сценария ---------- */
  function build(n) {
    var q = [], ol = lists[n], list = items[n];
    function readMine() {
      [].forEach.call(ol.querySelectorAll('.me:not(.read)'), function (li) { li.classList.add('read'); });
    }
    function dmSteps(at) {                 /* сообщения директа перед at-м сообщением Telegram */
      if (!dm || n !== dmIdx) return;
      dm.items.forEach(function (d, k) {
        if (+d.getAttribute('data-at') !== at) return;
        var dl = d.textContent.replace(/\s+/g, ' ').length;
        if (d.classList.contains('dmb')) q.push([k ? 1300 : 600, function () { dmAdd(d); }]);
        else {
          q.push([600, function () { dmType(true); }]);
          q.push([Math.max(1100, Math.min(2600, 700 + dl * 12)), function () { dmAdd(d); }]);
        }
      });
    }
    list.forEach(function (li, i) {
      dmSteps(i);
      var prev = list[i - 1], len = li.textContent.replace(/\s+/g, ' ').length;
      if (li.classList.contains('sys')) {
        q.push([900, function () { add(ol, li); }]);
      } else if (li.classList.contains('zh')) {
        q.push([i ? 500 : 700, function () { readMine(); typing.hidden = false; typing.classList.add('in'); status(true); down(true); }]);
        q.push([Math.max(1100, Math.min(2700, 800 + len * 13)), function () {
          typing.hidden = true; typing.classList.remove('in'); status(false); add(ol, li);
          if (li.hasAttribute('data-mode')) setMode(li.getAttribute('data-mode'));
        }]);
        /* большая карточка (почта): дать дочитать, прежде чем идти дальше */
        /* высокая карточка показана с начала — на середине паузы докручиваем к концу (кнопки «Так / Змінити») */
        if (li.hasAttribute('data-hold')) {
          var h = +li.getAttribute('data-hold'), h1 = Math.round(h * 0.55);
          q.push([h1, function () { down(true); }]);
          q.push([h - h1, function () {}]);
        }
      } else {
        var chip = prev && prev.querySelector('.chips span');
        if (chip) q.push([1300, function () { chip.classList.add('tap'); }]);
        q.push([chip ? 450 : (i ? 1200 : 600), function () { li.classList.remove('read'); add(ol, li); }]);
        if (li.querySelector('.voice')) q.push([0, function () { li.classList.add('played'); }]);
      }
    });
    dmSteps(list.length);
    if (list[list.length - 1].classList.contains('me')) q.push([900, readMine]);
    q.push([4200, function () { ol.classList.add('out'); }]);
    /* смотрят только на директ — повторяем «Директ», иначе следующий сценарий */
    q.push([380, function () { next(dm && cur === dmIdx && dmVis && !mainVis ? dmIdx : (cur + 1) % lists.length, true); }]);
    return q;
  }
  function add(ol, li) {
    li.classList.remove('in', 'played');
    [].forEach.call(li.querySelectorAll('.tap'), function (c) { c.classList.remove('tap'); });
    ol.appendChild(li);
    void li.offsetWidth; li.classList.add('in');
    /* сообщение выше окна (письмо-черновик на телефоне) — показываем его начало, а не хвост */
    if (li.offsetHeight > body.clientHeight - 36) body.scrollTo({ top: li.offsetTop - 30, behavior: 'smooth' });
    else down(true);
  }

  /* ---------- проигрыватель с паузой ---------- */
  function arm(s, ms) {                    /* поставить шаг s через ms; следующий — только если очередь та же */
    var q0 = queue;
    due = Date.now() + ms;
    timer = setTimeout(function () { timer = 0; s[1](); if (running && queue === q0) tick(); }, ms);
  }
  function tick() {
    var s = queue[qi++];
    if (!s) return;
    done += s[0];
    bump(s[0]);
    arm(s, s[0]);
  }
  function bump(ms) {
    if (!prog) return;
    prog.style.transition = ms ? 'transform ' + ms + 'ms linear' : 'none';
    prog.style.transform = 'scaleX(' + Math.min(1, done / total).toFixed(4) + ')';
  }
  function stop() {
    if (!running) return;
    running = false;
    fig.classList.add('halt'); if (dm) dm.fig.classList.add('halt');
    if (timer) { clearTimeout(timer); timer = 0; left = Math.max(0, due - Date.now()); qi--; done -= queue[qi][0]; }
    if (prog) { var m = getComputedStyle(prog).transform; prog.style.transition = 'none'; prog.style.transform = m; }
  }
  function go() {
    if (running || mq.matches) return;
    running = true;
    fig.classList.remove('halt'); if (dm) dm.fig.classList.remove('halt');
    var s = queue[qi];
    if (s && left) {                       /* досидеть остаток прерванного шага */
      qi++; done += s[0];
      if (prog) { prog.style.transition = 'transform ' + left + 'ms linear'; prog.style.transform = 'scaleX(' + Math.min(1, done / total).toFixed(4) + ')'; }
      arm(s, left);
      left = 0;
    } else tick();
  }
  function sync() {
    inView = mainVis || (!!dm && dmVis && cur === dmIdx);
    (userPaused || !inView || document.hidden) ? stop() : go();
  }

  function next(n, auto) {
    stop(); left = 0;
    /* озвучиваем только сценарий, который человек выбрал сам; автопрокрутку по кругу — нет */
    log.setAttribute('aria-live', auto ? 'off' : 'polite');
    if (dm) dm.log.setAttribute('aria-live', auto ? 'off' : 'polite');
    cur = n; setTab(n); show(n); fill(n, false); setMode('');
    dmFill(n !== dmIdx);                   /* не «Директ» — в окне директа вся прошлая переписка */
    typing.hidden = true; status(false); down(false);
    queue = build(n); qi = 0; done = 0;
    total = queue.reduce(function (a, s) { return a + s[0]; }, 0) - queue[queue.length - 1][0];
    sync();
  }

  /* ---------- статичный режим (reduced motion) ---------- */
  function still(n) {
    stop(); left = 0; cur = n; setTab(n); show(n); fill(n, true); dmFill(true);
    var m = lists[n].querySelector('[data-mode]'); setMode(m && m.getAttribute('data-mode'));
    typing.hidden = true; status(false);
  }

  function mode() {
    fig.classList.toggle('static', mq.matches);
    bPause.hidden = bReplay.hidden = mq.matches;
    if (dm) dm.pause.hidden = dm.replay.hidden = mq.matches;
    tabs.forEach(function (t) { t.querySelector('i').hidden = mq.matches; });
    if (mq.matches) still(cur); else next(cur, true);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      if (mq.matches) { still(i); return; }
      userPaused = false; setPause(); next(i, false);
    });
  });
  function setPause() {
    [bPause, dm && dm.pause].forEach(function (b) {
      if (!b) return;
      b.classList.toggle('paused', userPaused);
      b.setAttribute('aria-label', b.getAttribute(userPaused ? 'data-resume' : 'data-pause'));
    });
  }
  bPause.addEventListener('click', function () { userPaused = !userPaused; setPause(); sync(); });
  bReplay.addEventListener('click', function () { userPaused = false; setPause(); next(cur, false); });
  if (dm) {                                 /* кнопки окна директа управляют той же общей очередью */
    dm.pause.addEventListener('click', function () {
      if (cur !== dmIdx) { userPaused = false; setPause(); next(dmIdx, false); return; }
      userPaused = !userPaused; setPause(); sync();
    });
    dm.replay.addEventListener('click', function () { userPaused = false; setPause(); next(dmIdx, false); });
  }
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    /* один наблюдатель на оба окна: флаги обоих обновляются до решения (иначе порядок колбэков решает за нас) */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.target === fig) mainVis = e.isIntersecting; else dmVis = e.isIntersecting; });
      /* окно директа на экране, окно Telegram — нет: показываем «Директ» (его сообщения идут в окно директа) */
      if (dm && dmVis && !mainVis && cur !== dmIdx && !mq.matches && !userPaused) next(dmIdx, true); else sync();
    }, { threshold: 0.2 });
    io.observe(fig); if (dm) io.observe(dm.fig);
  }
  if (mq.addEventListener) mq.addEventListener('change', mode); else if (mq.addListener) mq.addListener(mode);
  mode();
})();
