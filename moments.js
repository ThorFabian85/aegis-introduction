(() => {
  'use strict';
  const scene=document.getElementById('scratch-scene'),canvas=document.getElementById('scratch-paint');
  if(!scene||!canvas)return;
  const robot=document.getElementById('scratch-robot'),emblem=document.getElementById('scratch-emblem');
  const cursor=document.getElementById('scratch-cursor'),help=document.getElementById('scratch-help'),status=document.getElementById('scratch-status');
  let ctx;try{ctx=canvas.getContext('2d');}catch{return;}if(!ctx)return;
  const width=640,height=800,radius=24,cols=40,rows=50;
  const outline=[[0.008571428571428572,0.1610738255033557],[0.07714285714285714,0.12080536912751678],[0.16,0.08053691275167785],[0.24285714285714285,0.04697986577181208],[0.33714285714285713,0.02237136465324385],[0.4257142857142857,0.008948545861297539],[0.5142857142857142,0.006711409395973154],[0.6028571428571429,0.011185682326621925],[0.6971428571428572,0.029082774049217],[0.7857142857142857,0.058165548098434],[0.8657142857142858,0.0894854586129754],[0.9742857142857143,0.13646532438478748],[0.9771428571428571,0.24161073825503357],[0.9857142857142858,0.3713646532438479],[0.9942857142857143,0.5011185682326622],[0.9914285714285714,0.610738255033557],[0.9742857142857143,0.7114093959731543],[0.9457142857142857,0.7785234899328859],[0.8942857142857142,0.8344519015659956],[0.8171428571428572,0.8814317673378076],[0.7314285714285714,0.9194630872483222],[0.6285714285714286,0.9552572706935123],[0.5028571428571429,0.9910514541387024],[0.38,0.9552572706935123],[0.26,0.9172259507829977],[0.16,0.8769574944071589],[0.09142857142857143,0.8277404921700223],[0.04285714285714286,0.7628635346756152],[0.017142857142857144,0.6845637583892618],[0.002857142857142857,0.5838926174496645],[0.002857142857142857,0.47651006711409394],[0.005714285714285714,0.36465324384787473],[0.008571428571428572,0.2639821029082774]];
  const inside=(x,y)=>{
    let hit=false;
    for(let i=0,j=outline.length-1;i<outline.length;j=i++){
      const a=outline[i],b=outline[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  };
  const samples=[];
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(inside((x+.5)/cols,(y+.5)/rows))samples.push({x:(x+.5)*width/cols,y:(y+.5)*height/rows,cleared:false});
  let ready=false,active=null,previous=null,cleared=0,announced=0;
  let keyboard={x:width*.5,y:height*.5};
  const moveCursor=p=>{cursor.style.left=`${p.x/width*100}%`;cursor.style.top=`${p.y/height*100}%`;};
  const release=()=>{
    const id=active;active=null;previous=null;scene.classList.remove('is-scratching');
    if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    const progress=Math.floor(cleared/samples.length*4)*25;
    if(progress>announced){announced=progress;status.textContent=`About ${progress}% of the shield has been scratched. The remaining paint stays until you remove it.`;}
  };
  const paintCoating=()=>{
    ctx.globalCompositeOperation='source-over';
    const coat=ctx.createLinearGradient(0,0,width,height);
    coat.addColorStop(0,'#a8b4ae');coat.addColorStop(.32,'#65796f');coat.addColorStop(.72,'#85958b');coat.addColorStop(1,'#455d51');
    ctx.fillStyle=coat;ctx.fillRect(0,0,width,height);
    let seed=19;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<1400;i++){
      ctx.fillStyle=i%2===0?'#eef7ed16':'#182e2218';
      ctx.fillRect(random()*width,random()*height,3+random()*45,.6+random()*.7);
    }
    help.textContent='HOLD + DRAG ON THE SHIELD';
  };
  const position=e=>{
    const b=canvas.getBoundingClientRect();
    return{x:(e.clientX-b.left)*width/Math.max(1,b.width),y:(e.clientY-b.top)*height/Math.max(1,b.height)};
  };
  const erase=(from,to)=>{
    ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='#000';ctx.fillStyle='#000';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=radius*2;
    ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();
    ctx.beginPath();ctx.arc(to.x,to.y,radius,0,Math.PI*2);ctx.fill();
    const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;
    for(const p of samples){
      if(p.cleared)continue;
      const t=length?Math.max(0,Math.min(1,((p.x-from.x)*dx+(p.y-from.y)*dy)/length)):0;
      if((p.x-from.x-t*dx)**2+(p.y-from.y-t*dy)**2<=radius*radius){p.cleared=true;cleared++;}
    }
    // Coverage is for the accessible progress message only. Never clear or
    // fade the remaining coating: every visible scratch comes from input.
  };
  canvas.addEventListener('pointerdown',e=>{
    if(!ready||active!==null||e.isPrimary===false||e.button!==0)return;
    const p=position(e);if(!inside(p.x/width,p.y/height))return;
    e.preventDefault();canvas.focus({preventScroll:true});active=e.pointerId;previous=p;keyboard=p;moveCursor(p);
    canvas.setPointerCapture(active);scene.classList.add('is-scratching');erase(p,p);
  });
  canvas.addEventListener('pointermove',e=>{
    if(active!==e.pointerId)return;
    if(e.pointerType==='mouse'&&(e.buttons&1)===0){release();return;}
    e.preventDefault();
    const batch=e.getCoalescedEvents?.();
    for(const event of batch?.length?batch:[e]){
      if(active===null)break;
      const next=position(event);erase(previous,next);previous=next;
      keyboard={x:Math.max(0,Math.min(width,next.x)),y:Math.max(0,Math.min(height,next.y))};moveCursor(keyboard);
    }
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(active===e.pointerId)release();});
  canvas.addEventListener('keydown',e=>{
    if(!ready)return;
    const offsets={ArrowLeft:[-28,0],ArrowRight:[28,0],ArrowUp:[0,-28],ArrowDown:[0,28]};
    if(!(e.key in offsets)&&e.key!==' '&&e.key!=='Enter')return;
    e.preventDefault();release();const [dx,dy]=offsets[e.key]||[0,0];
    const next={x:Math.max(0,Math.min(width,keyboard.x+dx)),y:Math.max(0,Math.min(height,keyboard.y+dy))};
    erase(keyboard,next);keyboard=next;moveCursor(next);release();
  });
  window.addEventListener('blur',release);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
  const activate=()=>{
    if(ready||!robot.complete||!robot.naturalWidth||!emblem.complete||!emblem.naturalWidth)return;
    ready=true;canvas.width=width;canvas.height=height;paintCoating();canvas.hidden=false;moveCursor(keyboard);
  };
  robot.addEventListener('load',activate);emblem.addEventListener('load',activate);activate();
})();

(() => {
  'use strict';
  const section=document.getElementById('why-aegis'),scene=document.getElementById('cockpit-scene');
  if(!section||!scene)return;
  const cosmos=document.getElementById('voyage-cosmos'),galaxy=document.getElementById('voyage-galaxy');
  const stage=document.getElementById('cockpit-stage'),planet=document.getElementById('cockpit-planet'),cockpit=document.getElementById('cockpit-frame');
  const veil=document.getElementById('voyage-reading-veil'),status=document.getElementById('voyage-status');
  const copy=document.getElementById('voyage-copy'),header=document.querySelector('.site-header');
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const galaxyDuration=9000,cockpitDuration=2500;
  let sectionVisible=false,sceneVisible=false,galaxyTime=0,cockpitTime=0,frame=0,last=0,announced='';
  let aimX=0,aimY=0,viewX=0,viewY=0;
  let readingOpacity=1;
  const loaded=image=>image.complete&&image.naturalWidth>0;
  const cockpitReady=()=>loaded(cockpit)&&loaded(planet);
  const clamp=n=>Math.max(0,Math.min(1,n));
  const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
  const measureReading=()=>{
    const height=Math.max(1,window.innerHeight);
    const headerBottom=Math.max(0,Math.min(height*.25,header?.getBoundingClientRect().bottom||0));
    const remaining=copy.getBoundingClientRect().bottom-headerBottom;
    readingOpacity=smooth(remaining/(height*.28));
  };
  const allowed=()=>!motion.matches&&!document.hidden;
  const timelineActive=()=>allowed()&&((sectionVisible&&loaded(galaxy)&&galaxyTime<galaxyDuration)||(sceneVisible&&galaxyTime>=galaxyDuration&&cockpitReady()&&cockpitTime<cockpitDuration));
  const parallaxActive=()=>allowed()&&sceneVisible&&cockpitTime>0&&(Math.abs(aimX-viewX)>.001||Math.abs(aimY-viewY)>.001);
  const paint=()=>{
    const still=motion.matches;
    cosmos.style.opacity=loaded(galaxy)?String(still?1:smooth(galaxyTime/galaxyDuration)):'0';
    stage.style.opacity=cockpitReady()?String(still?1:smooth(cockpitTime/cockpitDuration)):'0';
    // The text moves with ordinary page scrolling; its reading shade leaves
    // with it. The extra section depth keeps the full cockpit behind us.
    veil.style.opacity=String(readingOpacity*Math.max(Number(cosmos.style.opacity),Number(stage.style.opacity)));
    const x=still?0:viewX,y=still?0:viewY;
    // Restore two depths: the distant planet drifts behind the cleaned
    // foreground, whose columns, monitors and mounts remain fully opaque.
    planet.style.transform=`translate(${-x*11}px,${-y*7}px)`;
    cockpit.style.transform=`translate(${x*5}px,${y*3}px)`;
    const phase=still?'A quiet view from the cockpit.':cockpitTime>=cockpitDuration?'Inside the cockpit.':galaxyTime>=galaxyDuration?'The galaxy surrounds us.':'';
    if(phase&&phase!==announced){announced=phase;status.textContent=phase;}
  };
  const tick=stamp=>{
    frame=0;if(!allowed()){last=0;return;}
    const dt=last?Math.min(80,stamp-last):0;last=stamp;
    if(sectionVisible&&loaded(galaxy)&&galaxyTime<galaxyDuration)galaxyTime=Math.min(galaxyDuration,galaxyTime+dt);
    else if(sceneVisible&&galaxyTime>=galaxyDuration&&cockpitReady()){
      if(cockpitTime<cockpitDuration)cockpitTime=Math.min(cockpitDuration,cockpitTime+dt);
    }
    const ease=1-Math.exp(-dt/95);viewX+=(aimX-viewX)*ease;viewY+=(aimY-viewY)*ease;
    if(Math.abs(aimX-viewX)<.001)viewX=aimX;if(Math.abs(aimY-viewY)<.001)viewY=aimY;
    paint();if(timelineActive()||parallaxActive())frame=requestAnimationFrame(tick);else last=0;
  };
  const kick=()=>{if(!frame&&(timelineActive()||parallaxActive())){last=0;frame=requestAnimationFrame(tick);}};
  const sync=()=>{
    if(frame)cancelAnimationFrame(frame);frame=0;last=0;
    measureReading();
    if(motion.matches){galaxyTime=galaxyDuration;cockpitTime=cockpitDuration;aimX=aimY=viewX=viewY=0;}
    paint();kick();
  };
  const observe=(target,notify)=>{
    if('IntersectionObserver'in window)new IntersectionObserver(entries=>notify(entries[0].isIntersecting),{rootMargin:'-12% 0px -12% 0px',threshold:0}).observe(target);
    else{const check=()=>{const b=target.getBoundingClientRect();notify(b.bottom>window.innerHeight*.12&&b.top<window.innerHeight*.88);};window.addEventListener('scroll',check,{passive:true});window.addEventListener('resize',check,{passive:true});check();}
  };
  observe(section,value=>{if(sectionVisible!==value){sectionVisible=value;sync();}});
  observe(stage,value=>{if(sceneVisible!==value){sceneVisible=value;sync();}});
  section.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'||!allowed()||!sceneVisible)return;
    const b=stage.getBoundingClientRect();aimX=clamp((e.clientX-b.left)/Math.max(1,b.width))*2-1;aimY=clamp((e.clientY-b.top)/Math.max(1,b.height))*2-1;kick();
  },{passive:true});
  section.addEventListener('pointerleave',()=>{aimX=aimY=0;kick();},{passive:true});
  for(const image of [galaxy,planet,cockpit])image.addEventListener('load',sync);
  const refreshLayout=()=>{measureReading();paint();kick();};
  window.addEventListener('scroll',()=>{if(sectionVisible)refreshLayout();},{passive:true});
  document.addEventListener('visibilitychange',sync);window.addEventListener('resize',refreshLayout,{passive:true});motion.addEventListener('change',sync);sync();
})();
