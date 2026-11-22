(function(){
  var h=document.getElementById('h1'); if(!h||!window.matchMedia) return;
  var mq=matchMedia('(prefers-reduced-motion: reduce)'), c=null, x=null, W=0, H=0, cols=[], raf=0, last=0, onScreen=true;
  var FS=15, CH='0123456789TZ', canFilter=false;
  function rnd(a,b){return a+Math.random()*(b-a)}
  function bot(){var y=0,e=h;while(e){y+=e.offsetTop;e=e.offsetParent}return Math.round(y+h.offsetHeight)}
  function col(){return {y:rnd(-14,-2),sp:rnd(.9,2),len:6+Math.floor(Math.random()*8)}}
  function size(){
    var w=innerWidth>=900?420:230, hh=bot();
    if(hh<40) return;
    var dpr=Math.min(devicePixelRatio||1,2);
    W=w; H=hh; c.style.width=W+'px'; c.style.height=H+'px'; c.width=Math.round(W*dpr); c.height=Math.round(H*dpr);
    x=c.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); canFilter=('filter' in x);
    var n=Math.floor(W/FS); while(cols.length<n){var o=col();o.y=rnd(-4,H/FS);cols.push(o)} cols.length=n;
  }
  function draw(){
    x.clearRect(0,0,W,H); x.font='700 '+FS+'px Menlo,Consolas,"Courier New",monospace'; x.shadowOffsetY=1; x.shadowBlur=0;
    for(var i=0;i<cols.length;i++){var o=cols[i];
      for(var k=0;k<o.len;k++){var row=Math.floor(o.y-k), yy=row*FS; if(yy<0||yy>H+FS) continue;
        var a=Math.pow(1-k/o.len,1.5); if(canFilter) x.filter=k<2?'none':'blur('+(k/o.len*1.5).toFixed(1)+'px)';
        x.fillStyle='rgba(12,14,16,'+a.toFixed(3)+')'; x.shadowColor='rgba(255,255,255,'+(a*.6).toFixed(3)+')';
        x.fillText(CH[Math.abs(i*7+row*13)%CH.length],i*FS+3,yy)}
    }
    if(canFilter) x.filter='none';
  }
  function step(t){
    raf=0; if(!c) return;
    var dt=last?Math.min((t-last)/1000,.1):0; if(last&&t-last<33){raf=requestAnimationFrame(step);return}
    last=t;
    for(var i=0;i<cols.length;i++){var o=cols[i]; o.y+=o.sp*dt; if((o.y-o.len)*FS>H){var n=col(); o.y=n.y; o.sp=n.sp; o.len=n.len}}
    draw(); go();
  }
  function go(){ if(c&&!raf&&onScreen&&!document.hidden) raf=requestAnimationFrame(step) }
  function stop(){ if(raf){cancelAnimationFrame(raf);raf=0} last=0 }
  function on(){
    if(c||mq.matches) return;
    c=document.createElement('canvas'); c.className='st-rain'; c.setAttribute('aria-hidden','true');
    document.body.insertBefore(c,document.body.firstChild); size(); draw(); go();
    if('IntersectionObserver' in window) new IntersectionObserver(function(e){onScreen=e[0].isIntersecting; onScreen?go():stop()}).observe(c);
  }
  function off(){ stop(); if(c){c.remove();c=null} }
  var rt=0; addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(c){size();draw()}},150)});
  document.addEventListener('visibilitychange',function(){document.hidden?stop():go()});
  (mq.addEventListener?mq.addEventListener('change',function(){mq.matches?off():on()}):mq.addListener(function(){mq.matches?off():on()}));
  function re(){ if(c){ if(Math.abs(bot()-H)>1||W!==(innerWidth>=900?420:230)){size();draw()} } }
  on(); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(re); addEventListener('load',re);
  if('ResizeObserver' in window){var ro=new ResizeObserver(re); ro.observe(h); ro.observe(document.body)}
})();
