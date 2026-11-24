/* Лист очікування /waitlist — форма (site-waitlist-a-2311). Мережа — лише наш ендпоінт stats.tvoyzhorik.com.
   Ім'я + ОДИН контакт (Telegram або e-mail) + згода. Нічого не зберігає в браузері (ні cookies, ні localStorage). */
(function () {
  'use strict';
  var API = 'https://stats.tvoyzhorik.com/api/waitlist';
  var d = document, f = d.getElementById('wq'); if (!f) return;
  var L = JSON.parse(d.getElementById('wq-t').textContent);
  var lang = d.documentElement.lang === 'en' ? 'en' : 'uk';
  var q = new URLSearchParams(location.search);
  var from = (q.get('from') || 'direct').toLowerCase();
  if (!/^[a-z0-9_-]{1,32}$/.test(from)) from = 'direct';
  // пасхалка «Мистецтво війни»: перший, хто прийде за книгою, — місце в бета-тесті
  if (from === 'artofwar') { var egg = d.getElementById('wq-egg'); if (egg) egg.hidden = false; }
  // мітку from зберігаємо й при зміні мови
  var sw = d.querySelector('[data-lang-switch]');
  if (sw && from !== 'direct') sw.href = sw.getAttribute('href') + '?from=' + encodeURIComponent(from);

  var el = function (id) { return d.getElementById(id); };
  var name = el('wq-name'), contact = el('wq-contact'), consent = el('wq-consent'), hp = el('wq-website');
  var btn = el('wq-send'), sum = el('wq-sum'), done = el('wq-done');
  var tok = null, tokAt = 0, busy = false;

  // фокус без прокрутки + поле по центру экрана: иначе WebKit прячет его под липкую шапку
  function show(x) { try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); } if (x.scrollIntoView) x.scrollIntoView({ block: 'center' }); }
  function method() { var r = f.querySelector('input[name="method"]:checked'); return r ? r.value : 'telegram'; }
  function setMethod() {
    var m = method(), c = L.m[m];
    el('wq-contact-lab').textContent = c.lab;
    el('wq-contact-hint').textContent = c.hint;
    contact.type = m === 'email' ? 'email' : 'text';
    contact.inputMode = m === 'email' ? 'email' : 'text';
    contact.autocomplete = m === 'email' ? 'email' : 'off';
    contact.placeholder = c.ph;
    fieldErr(contact, '');
  }
  f.addEventListener('change', function (e) { if (e.target.name === 'method') { setMethod(); show(contact); } });

  function getToken() {
    return fetch(API + '/token', { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(function (r) { if (!r.ok) throw new Error(r.status === 429 ? 'rate' : 'net'); return r.json(); })
      .then(function (j) { tok = j.t; tokAt = Date.now(); return tok; });
  }
  // токен — при першому дотику до форми, не при завантаженні сторінки
  f.addEventListener('focusin', function once() { f.removeEventListener('focusin', once); getToken().catch(function () {}); });

  function fieldErr(input, msg) {
    var e = el(input.id + '-err');
    if (e) e.textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function normNick(v) {
    v = v.trim().replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, '').replace(/\/+$/, '');
    return '@' + v.replace(/^@+/, '');
  }
  function check() {
    var bad = [], n = name.value.replace(/\s+/g, ' ').trim(), m = method(), c = contact.value.trim();
    fieldErr(name, ''); fieldErr(contact, ''); fieldErr(consent, '');
    if (!n || n.length > 60 || !/\p{L}/u.test(n) || /[<>{}\[\]\\|@\/]|https?:|www\./i.test(n)) { fieldErr(name, L.e.name); bad.push(name); }
    if (m === 'telegram') {
      var k = normNick(c);
      if (/^[+0-9(]/.test(c)) { fieldErr(contact, L.e.tgphone); bad.push(contact); }
      else if (!/^@[a-z][a-z0-9_]{3,30}[a-z0-9]$/i.test(k) || k.indexOf('__') > -1) { fieldErr(contact, L.e.tg); bad.push(contact); }
    } else if (!/^[^@\s<>"',;]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}$/i.test(c) || c.indexOf('..') > -1) {
      fieldErr(contact, L.e.email); bad.push(contact);
    }
    if (!consent.checked) { fieldErr(consent, L.e.consent); bad.push(consent); }
    return bad;
  }
  function busyOn(on) { busy = on; btn.setAttribute('aria-busy', on ? 'true' : 'false'); btn.textContent = on ? L.sending : L.send; }

  function send(retry) {
    var body = { name: name.value.replace(/\s+/g, ' ').trim(), method: method(), contact: method() === 'telegram' ? normNick(contact.value) : contact.value.trim(),
      consent: consent.checked === true, lang: lang, from: from, t: tok, website: hp.value };
    return fetch(API, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); })
      .then(function (j) {
        if (j.ok) return success(body.name);
        if (j.err === 'too_fast' && !retry) {   // людина швидша за 3 с — тихо чекаємо й повторюємо раз
          return new Promise(function (ok) { setTimeout(ok, Math.max(0, 3200 - (Date.now() - tokAt))); }).then(function () { return send(true); });
        }
        if (j.err === 'token' && !retry) return getToken().then(function () { return send(true); });
        if (j.status === 429 || j.err === 'rate') throw new Error('rate');
        if (j.err === 'name') { fieldErr(name, L.e.name); show(name); throw new Error('field'); }
        if (j.err === 'contact' || j.err === 'method') { fieldErr(contact, method() === 'email' ? L.e.email : L.e.tg); show(contact); throw new Error('field'); }
        if (j.err === 'consent') { fieldErr(consent, L.e.consent); show(consent); throw new Error('field'); }
        throw new Error('net');
      });
  }
  function success(n) {
    el('wq-done-h').textContent = L.done.replace('{name}', n);
    f.hidden = true; done.hidden = false;
    show(done);
  }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    sum.textContent = '';
    var bad = check();
    if (bad.length) { sum.textContent = L.e.sum; show(bad[0]); return; }
    busyOn(true);
    (tok ? Promise.resolve(tok) : getToken())
      .then(function () { return new Promise(function (ok) { setTimeout(ok, Math.max(0, 3200 - (Date.now() - tokAt))); }); })
      .then(function () { return send(false); })
      .catch(function (err) {
        var k = err && err.message;
        if (k === 'field') return;
        sum.textContent = k === 'rate' ? L.e.rate : L.e.net;
        show(sum);
      })
      .then(function () { busyOn(false); });
  });
  ['input', 'change'].forEach(function (ev) {
    f.addEventListener(ev, function (e) { if (e.target.getAttribute('aria-invalid') === 'true') fieldErr(e.target, ''); });
  });
  setMethod();
})();
