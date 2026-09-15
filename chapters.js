(() => {
  'use strict';
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const observe=(target,notify)=>{
    if('IntersectionObserver'in window){
      new IntersectionObserver(entries=>notify(entries[0].isIntersecting),{rootMargin:'-12% 0px -12% 0px',threshold:0}).observe(target);
    }else{
      const check=()=>{const b=target.getBoundingClientRect(),h=window.innerHeight;notify(b.bottom>h*.12&&b.top<h*.88);};
      window.addEventListener('scroll',check,{passive:true});window.addEventListener('resize',check,{passive:true});check();
    }
  };

  const papers=document.getElementById('papers'),scene=document.getElementById('fountain-scene'),book=document.getElementById('fountain-book');
  if(!papers||!scene||!book)return;
  const tint=document.getElementById('papers-tint');
  const words=[...scene.querySelectorAll('.word-particle')];
  const revealDuration=11000;
  let sectionVisible=false,sceneVisible=false,ready=book.complete&&book.naturalWidth>0,redTime=0,bookTime=0,frame=0,last=0,width=1,height=1;
  const smooth=t=>t*t*(3-2*t);
  const paint=()=>{
    const red=motion.matches?1:smooth(Math.min(1,redTime/revealDuration));
    tint.style.opacity=String(red);
    const appear=motion.matches?1:smooth(Math.min(1,bookTime/1500));
    book.style.opacity=String(appear);book.style.transform=`translateY(${18*(1-appear)}px)`;
    const fountainTime=motion.matches?4000:Math.max(0,bookTime-1600);
    const origin=height-18-width*.98*(1024/1536)*.46;
    words.forEach((word,i)=>{
      const life=5200+(i%7)*210,delay=i*135;
      if(!appear||(!motion.matches&&bookTime<1600)||fountainTime<delay){word.style.opacity='0';return;}
      const age=(fountainTime-delay)%life,t=age/life;
      const spread=((i*37)%101-50)/50;
      const x=width*.49+spread*width*.57*t;
      const y=origin-height*(1.65+(i%3)*.1)*t+height*1.06*t*t;
      const opacity=Math.sin(Math.PI*t)*(.4+(i%5)*.095);
      word.style.opacity=String(opacity);word.style.fontSize=`${i%3===0?12+(i%4)*2:17+(i%5)*6}px`;
      word.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) rotate(${spread*t*(i%3===0?12:80)}deg)`;
    });
  };
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;};
  const active=()=>!motion.matches&&!document.hidden&&((sectionVisible&&redTime<revealDuration)||(sceneVisible&&ready));
  const tick=stamp=>{
    frame=0;if(!active()){last=0;return;}
    const delta=last?Math.min(80,stamp-last):0;last=stamp;
    if(sectionVisible)redTime=Math.min(revealDuration,redTime+delta);
    // A fully red chapter comes first. Mobile readers reach the book afterwards.
    if(redTime>=revealDuration&&sceneVisible&&ready)bookTime+=delta;
    paint();if(active())frame=requestAnimationFrame(tick);
  };
  const sync=()=>{stop();paint();if(active())frame=requestAnimationFrame(tick);};
  const resize=()=>{const b=scene.getBoundingClientRect();width=Math.max(1,b.width);height=Math.max(1,b.height);paint();};
  book.addEventListener('load',()=>{ready=true;sync();});
  observe(papers,next=>{sectionVisible=next;sync();});observe(scene,next=>{sceneVisible=next;sync();});
  document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);window.addEventListener('resize',resize,{passive:true});
  resize();sync();
})();
