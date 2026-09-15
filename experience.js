(() => {
  'use strict';
  const scene=document.getElementById('socrates-scene');
  const actor=document.getElementById('socrates-actor');
  const atlas=document.getElementById('socrates-atlas');
  if(!scene||!actor||!atlas)return;
  const response=document.getElementById('socrates-response');
  const caption=document.getElementById('socrates-caption');
  const returnButton=document.getElementById('socrates-return');
  const viewport=actor.querySelector('.socrates-viewport');
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey='aegis:socrates-left:v1';
  let left=false,annoyance=0,drag=null,settle=0,suppressUntil=0,exitFrame=0,exitStart=0,exitBox=null;
  // A departure belongs only to this visit. Clear the retired saved state so
  // readers always meet a seated Socrates when they open or reload the page.
  try{window.localStorage.removeItem(storageKey);}catch{}
  const pose=n=>{atlas.style.left=`-${n%4*100}%`;atlas.style.top=n<4?'0':'-100%';};
  const finish=()=>{
    if(exitFrame)cancelAnimationFrame(exitFrame);exitFrame=0;
    actor.remove();scene.classList.add('has-left');
    caption.textContent='SOCRATES / OUT FOR A WALK';response.textContent='';
    if(returnButton)returnButton.hidden=false;
  };
  const bringBack=()=>{
    if(!left||exitFrame)return;
    clearTimeout(settle);left=false;annoyance=0;drag=null;suppressUntil=0;exitStart=0;exitBox=null;
    actor.classList.remove('is-departing','is-dragging');
    for(const property of ['width','height','left','top','transform'])actor.style[property]='';
    actor.removeAttribute('aria-hidden');actor.disabled=false;viewport.style.transform='none';pose(0);
    scene.appendChild(actor);scene.classList.remove('has-left');
    caption.textContent='SOCRATES / IN THOUGHT';response.textContent='“Very well. Where were we?”';
    if(returnButton)returnButton.hidden=true;
    actor.classList.add('is-returning');actor.focus({preventScroll:true});
    settle=setTimeout(()=>{response.textContent='';},2800);
  };
  if(returnButton)returnButton.addEventListener('click',bringBack);
  actor.addEventListener('animationend',()=>actor.classList.remove('is-returning'));
  const leave=()=>{
    if(left)return;left=true;clearTimeout(settle);
    response.textContent='“I know one thing: I’m leaving.”';
    actor.disabled=true;actor.classList.remove('is-dragging');viewport.style.transform='none';
    if(document.activeElement===actor){scene.setAttribute('tabindex','-1');scene.focus({preventScroll:true});}
    if(motion.matches){finish();return;}
    exitBox=actor.getBoundingClientRect();
    document.body.appendChild(actor);
    actor.classList.add('is-departing');
    actor.style.width=`${exitBox.width}px`;actor.style.height=`${exitBox.height}px`;
    actor.style.left=`${exitBox.left}px`;actor.style.top=`${exitBox.top}px`;
    actor.setAttribute('aria-hidden','true');exitStart=0;
    const walk=stamp=>{
      exitFrame=0;if(!exitStart)exitStart=stamp;
      const elapsed=stamp-exitStart;
      if(elapsed<450){pose(2);}
      else if(elapsed<900){pose(3);}
      else{
        const progress=Math.min(1,(elapsed-900)/3800);
        pose(4+Math.floor((elapsed-900)/145)%4);
        // Move the real actor all the way beyond the viewport, with walking steps.
        const x=-(exitBox.left+exitBox.width+80)*progress;
        const y=exitBox.height*.05+Math.sin((elapsed-900)/145*Math.PI)*2;
        actor.style.transform=`translate3d(${x}px,${y}px,0)`;
        if(progress===1){finish();return;}
      }
      exitFrame=requestAnimationFrame(walk);
    };
    exitFrame=requestAnimationFrame(walk);
  };
  const bother=amount=>{
    if(left)return;
    annoyance+=amount;clearTimeout(settle);pose(1);
    if(annoyance>=6){leave();return;}
    response.textContent=annoyance<2?'“I was in the middle of knowing nothing.”':annoyance<4?'“Must you keep interrupting? I’m thinking.”':'“Perhaps we should examine your need to do that.”';
    settle=setTimeout(()=>{if(!drag&&!left){pose(0);response.textContent='';}},2800);
  };
  const release=(event,cancel=false)=>{
    if(!drag||drag.id!==event.pointerId)return;
    const old=drag;drag=null;actor.classList.remove('is-dragging');viewport.style.transform='none';
    if(actor.hasPointerCapture(old.id))actor.releasePointerCapture(old.id);
    if(old.moved||cancel)suppressUntil=performance.now()+450;
    if(cancel){pose(0);return;}
    if(old.moved)bother(Math.min(2.2,Math.max(1,old.distance/110)));
  };
  actor.addEventListener('pointerdown',e=>{
    if(left||drag||e.button!==0||e.isPrimary===false)return;
    if(e.pointerType!=='touch')e.preventDefault();
    clearTimeout(settle);
    drag={id:e.pointerId,type:e.pointerType,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,distance:0,moved:false};
    actor.setPointerCapture(e.pointerId);
  });
  actor.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;
    if(drag.type==='touch'&&!drag.moved&&Math.abs(dy)>Math.abs(dx))return;
    e.preventDefault();drag.moved=true;
    drag.distance+=Math.hypot(e.clientX-drag.lastX,e.clientY-drag.lastY);
    drag.lastX=e.clientX;drag.lastY=e.clientY;
    actor.classList.add('is-dragging');pose(1);
    if(!motion.matches){
      const x=Math.max(-26,Math.min(26,dx*.15)),y=Math.max(-10,Math.min(10,dy*.07));
      viewport.style.transform=`translate(${x}px,${y}px) rotate(${x*.18}deg)`;
    }
  });
  actor.addEventListener('pointerup',e=>release(e));
  actor.addEventListener('pointercancel',e=>release(e,true));
  actor.addEventListener('lostpointercapture',e=>release(e,true));
  actor.addEventListener('dragstart',e=>e.preventDefault());
  actor.addEventListener('click',e=>{
    if(left||e.button>0)return;
    if(e.detail!==0&&performance.now()<suppressUntil){e.preventDefault();return;}
    bother(1);
  });
  motion.addEventListener('change',()=>{if(left&&motion.matches)finish();});
  pose(0);actor.disabled=false;
  if(returnButton)returnButton.hidden=true;
})();

(() => {
  'use strict';
  const section=document.getElementById('conversation'),canvas=document.getElementById('matrix-rain');
  if(!section||!canvas)return;
  let ctx;try{ctx=canvas.getContext('2d',{alpha:true});}catch{return;}if(!ctx)return;
  const button=document.getElementById('rain-toggle'),motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let width=1,height=1,dpr=1,columns=[],frame=0,last=0,lastPaint=0,time=0,visible=false,paused=false;
  let seed=71;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const still=()=>paused||motion.matches;
  const draw=()=>{
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    columns.forEach(c=>{
      const head=(c.start+time*c.speed)%(height+c.length*c.step);
      ctx.font=`${c.front?'500':'400'} ${c.size}px Consolas, 'Liberation Mono', monospace`;
      for(let i=0;i<c.length;i++){
        const y=head-i*c.step;if(y<0||y>height+24)continue;
        const alpha=c.opacity*(1-i/c.length)**1.35;
        ctx.fillStyle=i===0?`rgba(161,255,222,${alpha+.12})`:`rgba(0,224,167,${alpha})`;
        ctx.fillText(c.digits[(i+Math.floor(time*.8))%c.digits.length],c.x,y);
      }
    });
  };
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;lastPaint=0;};
  const tick=stamp=>{
    frame=0;if(!visible||document.hidden||still())return;
    const dt=last?Math.min(.05,(stamp-last)/1000):0;last=stamp;time+=dt;
    if(!lastPaint||stamp-lastPaint>=32){draw();lastPaint=stamp;}
    frame=requestAnimationFrame(tick);
  };
  const sync=()=>{
    stop();draw();
    if(button){button.hidden=motion.matches;button.setAttribute('aria-pressed',String(still()));button.setAttribute('aria-label',still()?'Resume code rain':'Pause code rain');button.querySelector('[aria-hidden]').textContent=still()?'▷':'Ⅱ';}
    if(visible&&!document.hidden&&!still())frame=requestAnimationFrame(tick);
  };
  const resize=()=>{
    width=Math.max(1,section.getBoundingClientRect().width);height=Math.max(1,window.innerHeight);
    dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    seed=71;columns=[];
    for(let x=-10;x<width;x+=19){
      const front=random()>.65,size=front?19+random()*7:11+random()*6;
      columns.push({x:x+random()*8,front,size,step:size*1.16,length:15+Math.floor(random()*14),start:random()*(height+300),speed:front?45+random()*48:20+random()*35,opacity:front?.48+random()*.22:.13+random()*.18,digits:Array.from({length:40},()=>random()>.5?'1':'0')});
    }
    sync();
  };
  if(button)button.addEventListener('click',()=>{paused=!paused;sync();});
  motion.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(section);
  else{
    const check=()=>{const b=section.getBoundingClientRect();const next=b.bottom>0&&b.top<window.innerHeight;if(next!==visible){visible=next;sync();}};
    window.addEventListener('scroll',check,{passive:true});check();
  }
  window.addEventListener('resize',resize,{passive:true});
  resize();
})();

(() => {
  'use strict';
  const video=document.getElementById('safeguard-video'),audio=document.getElementById('piano-audio');
  const button=document.getElementById('piano-play'),label=document.getElementById('piano-play-label'),icon=document.getElementById('piano-play-icon');
  const player=document.getElementById('piano-player'),status=document.getElementById('media-status');
  if(!audio||!button)return;
  const sync=()=>{
    const playing=!audio.paused&&!audio.ended;
    button.setAttribute('aria-pressed',String(playing));label.textContent=playing?'Pause piano':'Play piano version';icon.textContent=playing?'Ⅱ':'▷';player.classList.toggle('is-playing',playing);
  };
  button.hidden=false;
  button.addEventListener('click',async()=>{
    if(!audio.paused){audio.pause();return;}
    status.textContent='';
    try{await audio.play();}catch{status.textContent='Playback couldn’t start. Try the audio controls below.';sync();}
  });
  audio.addEventListener('play',()=>{if(video)video.pause();status.textContent='';sync();});
  ['pause','ended','emptied'].forEach(event=>audio.addEventListener(event,sync));
  audio.addEventListener('error',()=>{status.textContent='The audio could not be loaded. Check that the site’s media folder was extracted with the page.';sync();});
  if(video)video.addEventListener('play',()=>audio.pause());
  sync();
})();

(() => {
  'use strict';
  const section=document.getElementById('beyond-today');
  const field=document.getElementById('cosmic-field'),universe=document.getElementById('cosmic-universe');
  const traveler=document.getElementById('cosmic-traveler'),rocket=document.getElementById('rocket-man');
  const button=document.getElementById('cosmic-toggle');
  const rocketAudio=document.getElementById('rocket-audio');
  if(!section||!field||!universe||!traveler||!rocket)return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const exhaust=traveler.querySelector('.rocket-exhaust');
  const revealDuration=11000,launchAt=12200,flightDuration=7200,endAt=launchAt+flightDuration;
  let visible=false,paused=false,elapsed=0,frame=0,last=0;
  let universeReady=universe.complete&&universe.naturalWidth>0;
  let rocketReady=rocket.complete&&rocket.naturalWidth>0,rocketFailed=false;
  const otherMedia=['safeguard-video','piano-audio'].map(id=>document.getElementById(id));
  let soundBlocked=false,soundPending=false;
  // The source file is already attenuated by 20 dB, including on devices that
  // ignore scripted volume. Playback remains subject to browser sound policy.
  if(rocketAudio)rocketAudio.volume=.7;
  const wantsSound=()=>!!rocketAudio&&!soundBlocked&&visible&&!document.hidden&&!paused&&!motion.matches&&rocketReady&&elapsed>=launchAt&&elapsed<endAt&&!otherMedia.some(media=>media&&!media.paused&&!media.ended);
  const syncSound=()=>{
    if(!rocketAudio)return;
    if(!wantsSound()){if(!rocketAudio.paused)rocketAudio.pause();return;}
    const target=(elapsed-launchAt)/1000;
    if(Math.abs((rocketAudio.currentTime||0)-target)>.3){try{rocketAudio.currentTime=target;}catch{}}
    if(rocketAudio.paused&&!soundPending){
      soundPending=true;
      const failed=error=>{soundPending=false;if(error?.name!=='AbortError')soundBlocked=true;};
      try{
        Promise.resolve(rocketAudio.play()).then(()=>{
          soundPending=false;
          // Loading must never leave sound playing after the visitor moves on.
          if(!wantsSound())rocketAudio.pause();
        },failed);
      }catch(error){failed(error);}
    }
  };
  const smooth=t=>t*t*(3-2*t);
  const draw=()=>{
    const progress=motion.matches?1:Math.min(1,elapsed/revealDuration);
    field.style.opacity=String(smooth(progress));
    universe.style.transform=`scale(${1.045-.045*smooth(progress)})`;
    const flying=!motion.matches&&rocketReady&&elapsed>=launchAt&&elapsed<endAt;
    traveler.hidden=!flying;
    if(flying){
      const p=(elapsed-launchAt)/flightDuration;
      const box=section.getBoundingClientRect(),size=traveler.getBoundingClientRect().width;
      // The left-facing fist and rocket nose lead; exhaust trails to the right.
      const start=box.width+size*.6+40,end=-size*1.6-40;
      traveler.style.transform=`translate3d(${start+(end-start)*p}px,${18-64*p+Math.sin(p*Math.PI*2)*4}px,0) rotate(2deg)`;
      if(exhaust)exhaust.style.transform=`scaleX(${.94+.09*Math.sin(elapsed*.03)})`;
    }
    if(button){
      button.hidden=motion.matches||elapsed>=endAt;
      button.setAttribute('aria-pressed',String(paused));
      button.setAttribute('aria-label',paused?'Resume universe animation':'Pause universe animation');
      button.querySelector('[aria-hidden]').textContent=paused?'▷':'Ⅱ';
    }
    syncSound();
  };
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;};
  const canRun=()=>visible&&!document.hidden&&!paused&&!motion.matches&&universeReady&&elapsed<endAt;
  const tick=stamp=>{
    frame=0;if(!canRun()){last=0;return;}
    const delta=last?Math.min(100,stamp-last):0;last=stamp;
    // Never let a slow image download consume the visitor's flyby.
    if(elapsed<launchAt||rocketReady||rocketFailed)elapsed=Math.min(endAt,elapsed+delta);
    if(!rocketReady&&!rocketFailed&&elapsed>launchAt)elapsed=launchAt;
    draw();if(elapsed<endAt)frame=requestAnimationFrame(tick);
  };
  const sync=()=>{stop();draw();if(canRun())frame=requestAnimationFrame(tick);};
  universe.addEventListener('load',()=>{universeReady=true;sync();});
  rocket.addEventListener('load',()=>{rocketReady=true;sync();});
  rocket.addEventListener('error',()=>{rocketFailed=true;sync();});
  if(button)button.addEventListener('click',()=>{paused=!paused;soundBlocked=false;sync();});
  const retrySound=()=>{if(soundBlocked){soundBlocked=false;syncSound();}};
  document.addEventListener('pointerdown',retrySound,{passive:true});
  document.addEventListener('keydown',retrySound);
  otherMedia.forEach(media=>{if(media)['play','pause','ended'].forEach(event=>media.addEventListener(event,syncSound));});
  motion.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('resize',draw,{passive:true});
  if('IntersectionObserver'in window){
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'-18% 0px -18% 0px',threshold:0}).observe(section);
  }else{
    const check=()=>{const b=section.getBoundingClientRect(),h=window.innerHeight;const next=b.bottom>h*.18&&b.top<h*.82;if(next!==visible){visible=next;sync();}};
    window.addEventListener('scroll',check,{passive:true});check();
  }
  sync();
})();
