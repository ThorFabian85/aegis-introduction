(() => {
  'use strict';
  const stage = document.getElementById('shield-stage');
  const canvas = document.getElementById('shield-canvas');
  if (!stage || !canvas) return;
  let ctx;
  try { ctx = canvas.getContext('2d', { alpha: true }); } catch { return; }
  if (!ctx) return;

  const fallback = stage.querySelector('.shield-fallback');
  const controls = document.querySelector('.shield-tools');
  const resetButton = document.getElementById('shield-reset');
  const motionButton = document.getElementById('shield-motion');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2, VIEW = 900;
  const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
  const length = v => Math.hypot(...v);
  const unit = v => { const m = length(v) || 1; return v.map(x => x / m); };
  const identity = () => [0, 0, 0, 1];
  const multiply = (a, b) => [
    a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
    a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
    a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
    a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]
  ];
  const axisAngle = (axis, angle) => { const s = Math.sin(angle / 2); return [...axis.map(v => v*s), Math.cos(angle / 2)]; };
  const turnBetween = (a, b) => {
    const cross = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
    const dot = clamp(a.reduce((sum,v,i) => sum+v*b[i],0), -1, 1);
    if (length(cross) < 1e-7) return { axis: [0,1,0], angle: dot < 0 ? Math.PI : 0 };
    return { axis: unit(cross), angle: Math.acos(dot) };
  };
  const rotate = (p, q) => {
    const tx = 2*(q[1]*p[2]-q[2]*p[1]);
    const ty = 2*(q[2]*p[0]-q[0]*p[2]);
    const tz = 2*(q[0]*p[1]-q[1]*p[0]);
    return [p[0]+q[3]*tx+q[1]*tz-q[2]*ty, p[1]+q[3]*ty+q[2]*tx-q[0]*tz, p[2]+q[3]*tz+q[0]*ty-q[1]*tx];
  };

  // Sample the original shield outline; its nested contours now curve in depth.
  const outline = [];
  const bezier = (a,b,c,d,n=26) => {
    for(let i=0;i<n;i++) {
      const t=i/n,u=1-t;
      outline.push([u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0]-450,
        u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]-450]);
    }
  };
  const line = (a,b,n=15) => { for(let i=0;i<n;i++) outline.push([a[0]+(b[0]-a[0])*i/n-450,a[1]+(b[1]-a[1])*i/n-450]); };
  bezier([450,118],[540,186],[641,200],[733,212]);
  line([733,212],[708,455]);
  bezier([708,455],[694,601],[578,723],[450,788]);
  bezier([450,788],[322,723],[206,601],[192,455]);
  line([192,455],[167,212]);
  bezier([167,212],[259,200],[360,186],[450,118]);
  const shells = Array.from({length:20},(_,i) => {
    const s=1-i*.038,depth=78*(1-s*s);
    return outline.map(p => [p[0]*s,p[1]*s,depth]);
  });
  const back = outline.map(p => [...p,-24]);
  const orbits = [0,1].map(j => Array.from({length:181},(_,i) => {
    const a=i/180*TAU,tilt=j ? .64 : -.48;
    const x=Math.cos(a)*(j ? 377 : 392),y=Math.sin(a)*(j ? 88 : 133);
    return [x*Math.cos(tilt)-y*Math.sin(tilt),x*Math.sin(tilt)+y*Math.cos(tilt),Math.sin(a)*(j ? 113 : -107)];
  }));
  let seed=23;
  const random = () => { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
  const motes=Array.from({length:70},()=>({shell:Math.floor(random()*20),offset:random(),speed:.013+random()*.013,size:.55+random()*.75}));

  let orientation=identity(),drag=null,inertia={axis:[0,1,0],speed:0},resetting=false;
  let frame=0,last=0,time=0,paused=false,inView=true,scale=1;
  const effectivePause = () => paused || reduced.matches;
  const project = (p,q) => {
    const r=rotate(p,q),perspective=1200/(1200-r[2]);
    return { x:450+r[0]*perspective,y:450+r[1]*perspective,z:r[2],scale:perspective };
  };
  const path = (points,close=false) => {
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(close)ctx.closePath();
  };
  const stroke = (points,color,width=1,close=false) => { path(points,close);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(); };
  const dot = (x,y,r,color) => { ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=color;ctx.fill(); };
  const glow = (x,y,r,alpha) => {
    const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,`rgba(128,255,202,${alpha})`);
    gradient.addColorStop(.2,`rgba(63,209,146,${alpha*.43})`);
    gradient.addColorStop(1,'rgba(28,145,99,0)');
    dot(x,y,r,gradient);
  };
  const draw = () => {
    ctx.setTransform(scale,0,0,scale,0,0);
    // Always transparent: no painted rectangle and no selectable image surface.
    ctx.clearRect(0,0,VIEW,VIEW);
    const sway=multiply(axisAngle([0,1,0],Math.sin(time*.21)*.085),axisAngle([1,0,0],Math.sin(time*.17)*.035));
    const q=multiply(sway,orientation);
    const frontFacing=rotate([0,0,1],q)[2]>=0;
    const center=project([0,-2,80],q),outer=shells[0].map(p=>project(p,q)),rear=back.map(p=>project(p,q));
    orbits.forEach(points=>stroke(points.map(p=>project(p,q)),'rgba(78,151,116,.15)',.75));

    // The rim has real thickness; the bowed face remains legible from behind.
    const far=frontFacing?rear:outer,near=frontFacing?outer:rear;
    path(far,true);ctx.fillStyle='rgba(16,57,39,.045)';ctx.fill();
    stroke(far,'rgba(105,180,139,.2)',1,true);
    for(let i=0;i<outline.length;i+=13)stroke([outer[i],rear[i]],'rgba(120,205,157,.17)',.65);
    const face=ctx.createLinearGradient(280,150,670,740);
    face.addColorStop(0,'rgba(94,216,163,.04)');face.addColorStop(.55,'rgba(31,79,52,.015)');face.addColorStop(1,'rgba(119,237,183,.055)');
    path(near,true);ctx.fillStyle=face;ctx.fill();
    for(let i=shells.length-1;i>=0;i--){
      const alpha=(.12+(1-i/20)*.25)*(frontFacing?1:.8);
      const points=shells[i].map(p=>project(frontFacing?p:[p[0],p[1],p[2]-24],q));
      stroke(points,`rgba(117,226,182,${alpha})`,i===0?1.4:.7,true);
    }
    stroke(near,'rgba(162,240,202,.47)',1.35,true);
    // Traveling edge light and motes keep moving even while the shield is held.
    const head=time*.052%1;
    for(let n=0;n<16;n++){
      const a=Math.floor(((head+n/outline.length)%1)*outline.length),b=(a+1)%outline.length;
      stroke([near[a],near[b]],`rgba(205,255,230,${.06+n/16*.59})`,1.75);
    }
    motes.forEach(m=>{
      const ring=shells[m.shell],pos=((m.offset+time*m.speed)%1)*ring.length,j=Math.floor(pos),fraction=pos-j;
      const a=ring[j],b=ring[(j+1)%ring.length],p=a.map((v,i)=>v+(b[i]-v)*fraction);
      if(!frontFacing)p[2]-=24;
      const point=project(p,q);
      dot(point.x,point.y,m.size*point.scale,`rgba(192,255,221,${.21+.25*(20-m.shell)/20})`);
    });
    stroke([project([-106,-2,70],q),project([106,-2,70],q)],'rgba(140,244,194,.33)',1.1);
    stroke([project([0,-120,70],q),project([0,116,70],q)],'rgba(140,244,194,.33)',1.1);
    glow(center.x,center.y,48*center.scale,.42+.035*Math.sin(time*1.1));
    dot(center.x,center.y,4.3*center.scale,'#d9ffe8');
    [0,26,67].forEach(i=>dot(near[i].x,near[i].y,2,'rgba(191,255,222,.82)'));
  };
  const tick = stamp => {
    frame=0;
    const dt=last?clamp((stamp-last)/1000,0,.04):1/60;last=stamp;
    const animate=!effectivePause()&&inView&&!document.hidden;
    if(animate){
      time+=dt;
      if(!drag&&inertia.speed>.007){
        orientation=unit(multiply(axisAngle(inertia.axis,inertia.speed*dt),orientation));
        inertia.speed*=Math.exp(-dt*4.5);
      }
    }
    if(resetting){
      const target=orientation[3]<0?[0,0,0,-1]:identity();
      const mix=effectivePause()?1:1-Math.exp(-dt*9);
      orientation=unit(orientation.map((v,i)=>v+(target[i]-v)*mix));
      if(effectivePause()||length(orientation.slice(0,3))<.001){orientation=identity();resetting=false;}
    }
    draw();
    if((animate||resetting)&&inView&&!document.hidden)frame=requestAnimationFrame(tick);
  };
  const requestDraw = () => { if(!frame&&!document.hidden)frame=requestAnimationFrame(tick); };
  const stop = () => { if(frame)cancelAnimationFrame(frame);frame=0;last=0; };
  const resize = () => {
    const bounds=stage.getBoundingClientRect();
    const pixels=Math.max(1,Math.round(bounds.width*Math.min(window.devicePixelRatio||1,2)));
    canvas.width=pixels;canvas.height=pixels;scale=pixels/VIEW;
    draw();requestDraw();
  };
  const trackball = event => {
    const b=stage.getBoundingClientRect(),r=Math.max(1,b.width*.42);
    const x=(event.clientX-b.left-b.width/2)/r,y=(event.clientY-b.top-b.height/2)/r;
    const d=x*x+y*y;
    return unit([x,y,Math.sqrt(Math.max(0,1-d))]);
  };
  const release = (event,cancel=false) => {
    if(!drag||drag.id!==event.pointerId)return;
    const old=drag;drag=null;stage.classList.remove('is-dragging');
    if(cancel){orientation=old.start;inertia.speed=0;}
    else if(performance.now()-old.stamp>90)inertia.speed=0;
    if(stage.hasPointerCapture(old.id))stage.releasePointerCapture(old.id);
    requestDraw();
  };
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false||drag)return;
    if(event.pointerType!=='touch')event.preventDefault();
    stage.focus({preventScroll:true});resetting=false;inertia.speed=0;
    drag={id:event.pointerId,type:event.pointerType,point:trackball(event),start:[...orientation],startX:event.clientX,startY:event.clientY,stamp:performance.now(),moved:false};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(!drag.moved&&Math.hypot(dx,dy)<4)return;
    if(drag.type==='touch'&&!drag.moved&&Math.abs(dy)>Math.abs(dx))return;
    event.preventDefault();drag.moved=true;stage.classList.add('is-dragging');
    const point=trackball(event),turn=turnBetween(drag.point,point),stamp=performance.now();
    orientation=unit(multiply(axisAngle(turn.axis,turn.angle),orientation));
    inertia={axis:turn.axis,speed:clamp(turn.angle/Math.max((stamp-drag.stamp)/1000,1/60),0,3.2)};
    drag.point=point;drag.stamp=stamp;
    requestDraw();
  });
  stage.addEventListener('pointerup',e=>release(e));
  stage.addEventListener('pointercancel',e=>release(e,true));
  stage.addEventListener('lostpointercapture',e=>release(e,true));
  stage.addEventListener('dragstart',e=>e.preventDefault());
  const reset = () => {
    if(drag)release({pointerId:drag.id},true);
    inertia.speed=0;resetting=true;requestDraw();
  };
  stage.addEventListener('keydown',event=>{
    const steps={ArrowLeft:[[0,1,0],-.14],ArrowRight:[[0,1,0],.14],ArrowUp:[[1,0,0],-.14],ArrowDown:[[1,0,0],.14]};
    if(event.key==='Home'){event.preventDefault();reset();return;}
    if(!steps[event.key])return;
    event.preventDefault();resetting=false;inertia.speed=0;
    const [axis,angle]=steps[event.key];orientation=unit(multiply(axisAngle(axis,angle),orientation));requestDraw();
  });
  if(resetButton)resetButton.addEventListener('click',reset);
  const updateMotion = () => {
    const still=effectivePause();
    if(motionButton){
      motionButton.setAttribute('aria-pressed',String(still));
      motionButton.setAttribute('aria-label',still?'Resume shield motion':'Pause shield motion');
      motionButton.setAttribute('title',still?'Resume motion':'Pause motion');
      // The system preference takes priority; direct rotation remains available.
      motionButton.hidden=reduced.matches;
    }
    inertia.speed=0;stop();requestDraw();
  };
  if(motionButton)motionButton.addEventListener('click',()=>{paused=!paused;updateMotion();});
  reduced.addEventListener('change',updateMotion);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(drag)release({pointerId:drag.id},true);stop();}
    else requestDraw();
  });
  const updateVisibility = visible => {
    inView=visible;
    if(!visible){if(drag)release({pointerId:drag.id},true);stop();}
    else requestDraw();
  };
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>updateVisibility(entries[0].isIntersecting),{rootMargin:'60px'}).observe(stage);
  }else{
    const check=()=>{const b=stage.getBoundingClientRect();updateVisibility(b.bottom>-60&&b.top<window.innerHeight+60);};
    window.addEventListener('scroll',check,{passive:true});check();
  }
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize',resize,{passive:true});
  stage.setAttribute('tabindex','0');stage.setAttribute('role','group');
  stage.setAttribute('aria-label','Interactive Aegis shield');stage.setAttribute('aria-describedby','shield-help');
  stage.classList.add('is-interactive');canvas.hidden=false;if(fallback)fallback.hidden=true;if(controls)controls.hidden=false;
  resize();updateMotion();
})();
