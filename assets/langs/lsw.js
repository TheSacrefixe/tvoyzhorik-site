/* langs-2511: переключатель языка — закрыть по клику вне и Esc; метка from на листе ожидания. Генерирует langs_site.py. */
(function(){var d=document;var all=function(){return [].slice.call(d.querySelectorAll('details.lsw[open]'))};
d.addEventListener('click',function(e){all().forEach(function(x){if(!x.contains(e.target))x.open=false})});
d.addEventListener('keydown',function(e){if(e.key==='Escape')all().forEach(function(x){x.open=false;var s=x.querySelector('summary');if(s)s.focus()})});
try{var f=new URLSearchParams(location.search).get('from');if(f&&/^[a-z0-9_-]{1,32}$/i.test(f)&&/\/waitlist$/.test(location.pathname)){
[].forEach.call(d.querySelectorAll('[data-lsw] a[href$="/waitlist"]'),function(a){a.href=a.getAttribute('href')+'?from='+encodeURIComponent(f)})}}catch(e){}
})();
