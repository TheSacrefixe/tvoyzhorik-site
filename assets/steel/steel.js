(function(){
  var h=document.getElementById('h1'); if(!h||!window.matchMedia) return;
  var mq=matchMedia('(prefers-reduced-motion: reduce)'), c=null, x=null, W=0, H=0, T=0, cols=[], raf=0, last=0, onScreen=true;
  var hd=document.querySelector('.hdr'), holes=[], hT=-1e9, PAD=4;
  var SEL='.hdr,.chat-tabs,.chat-win,.hero .pilot,.st-sub,.st-plate,.hero a,.hero button,main a,main button,main summary,main input';
  var FS=15, CH='0123456789TZ', canFilter=false;
  function rnd(a,b){return a+Math.random()*(b-a)}
  function bot(){var y=0,e=h;while(e){y+=e.offsetTop;e=e.offsetParent}return Math.round(y+h.offsetHeight)}
  function top(){return hd?Math.round(hd.offsetTop+hd.offsetHeight):0}
  function rects(e,a){
    if(e===h||e.classList.contains('pilot')||e.classList.contains('st-sub')){var g=document.createRange();g.selectNodeContents(e);var l=g.getClientRects();for(var i=0;i<l.length;i++)a.push(l[i])}
    else a.push(e.getBoundingClientRect())}
  function hole(){
    hT=performance.now(); holes=[]; if(!c) return;
    var cr=c.getBoundingClientRect(), a=[], l=document.querySelectorAll(SEL), i, r;
    rects(h,a); for(i=0;i<l.length;i++) rects(l[i],a);
    for(i=0;i<a.length;i++){r=a[i]; if(!r.width||!r.height) continue;
      var L=r.left-cr.left-PAD, R=r.right-cr.left+PAD, U=r.top-cr.top-PAD, B=r.bottom-cr.top+PAD;
      if(R<=0||B<=0||L>=W||U>=H) continue; holes.push([L,U,R-L,B-U])}
  }
  function col(){return {y:rnd(-14,-2),sp:rnd(.9,2),len:6+Math.floor(Math.random()*8)}}
  function size(){
    var w=innerWidth>=900?420:230, t=top(), hh=bot()-t;
    if(hh<40) return;
    T=t; c.style.top=T+'px';
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
    if(performance.now()-hT>400) hole();
    for(var j=0;j<holes.length;j++) x.clearRect(holes[j][0],holes[j][1],holes[j][2],holes[j][3]);
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
    document.body.insertBefore(c,document.body.firstChild); size(); hole(); draw(); go();
    if('IntersectionObserver' in window) new IntersectionObserver(function(e){onScreen=e[0].isIntersecting; onScreen?go():stop()}).observe(c);
  }
  function off(){ stop(); if(c){c.remove();c=null} }
  var rt=0; addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(c){size();hole();draw()}},150)});
  addEventListener('scroll',function(){hT=-1e9},{passive:true});
  document.addEventListener('visibilitychange',function(){document.hidden?stop():go()});
  (mq.addEventListener?mq.addEventListener('change',function(){mq.matches?off():on()}):mq.addListener(function(){mq.matches?off():on()}));
  function re(){ if(c){ if(Math.abs(bot()-top()-H)>1||top()!==T||W!==(innerWidth>=900?420:230)){size()} hole();draw() } }
  on(); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(re); addEventListener('load',re);
  if('ResizeObserver' in window){var ro=new ResizeObserver(re); ro.observe(h); ro.observe(document.body); if(hd) ro.observe(hd)}
})();
