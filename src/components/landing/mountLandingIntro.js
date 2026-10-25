// Approved prototype animation, scoped and cleaned up for React StrictMode.
import { LANDING_CATEGORIES as events } from './landingCategories';
export function mountLandingIntro(root) {
 let disposed=false;
 const removers=[];
 const previousOverflow=document.body.style.overflow;
 const getElement=id=>root.querySelector('#'+id);
 const listen=(target,type,callback)=>{target.addEventListener(type,callback);removers.push(()=>target.removeEventListener(type,callback));};
 const lockScroll=()=>{document.body.style.overflow='hidden';};
 const unlockScroll=()=>{document.body.style.overflow=previousOverflow;};
const site=getElement('site'), intro=getElement('intro'), scene=getElement('introScene');
site.inert=true;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let elapsed=0,last=0,frame=0,playing=false,finished=false;
const playbackSpeed=1.2;
const duration=8500/playbackSpeed;
const cards=events.map(item=>{const el=document.createElement('div');el.className='intro-card';el.innerHTML=`<img src="/teamweave-motion/assets/${item.id}.jpg" alt=""><span class="label"><small>DIFFERENT SKILLS. SHARED AMBITION.</small>${item.name}</span>`;scene.append(el);return el;});
const destinations=[[-.36,-.18,-130,-12],[.34,-.22,-200,12],[-.26,.2,-70,-9],[.37,.19,-90,9],[.02,-.12,100,-4],[.02,.26,-300,7],[-.48,.02,-390,-16],[.49,.03,-420,16],[-.17,-.32,-380,-7],[.18,-.32,-400,8],[-.15,.37,-410,-11],[.24,.36,-430,11]];
const clamp=x=>Math.max(0,Math.min(1,x));const ease=x=>{x=clamp(x);return x*x*(3-2*x)};const mix=(a,b,p)=>a+(b-a)*p;
function paint(ms){
 ms*=playbackSpeed;
 const width=innerWidth,height=innerHeight,mobile=width<700,radius=mobile?150:280;
 const burst=ease((ms-3400)/1700),exit=ease((ms-5600)/2300),arrival=ease(ms/950);
 cards.forEach((card,i)=>{
  const angle=i*Math.PI*2/events.length+ms*.00065, initial=i*Math.PI*2/events.length;
  let x=Math.sin(angle)*radius,y=Math.cos(angle)*18,z=Math.cos(angle)*175,ry=Math.sin(angle)*-32,rz=Math.sin(angle)*5;
  x=mix(Math.sin(initial)*width*.7,x,arrival);y=mix(Math.cos(initial)*height*.5,y,arrival);
  const d=destinations[i];
  x=mix(x,d[0]*width,burst);y=mix(y,d[1]*height,burst);z=mix(z,d[2],burst);ry=mix(ry,-d[3],burst);rz=mix(rz,d[3],burst);
  x-=exit*width*.9;y-=exit*height*.28;z-=exit*180;
  card.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${1-exit*.35})`;
  card.style.opacity=String(arrival*(1-exit));card.style.zIndex=String(Math.round(z+500));
 });
 getElement('progress').style.width=`${ms/8500*100}%`;
 root.querySelector('.intro-marquee').style.transform=`translateX(${-ms*.017}px)`;
 const phase=ms<3400?0:ms<6700?1:2;
 getElement('introTitle').textContent=['Find your people.','Different strengths. One team.','Make something remarkable.'][phase];
 getElement('introEyebrow').textContent=['A WORLD OF POSSIBILITIES','CONNECTED BY WHAT YOU CAN CREATE','YOUR NEXT CHAPTER STARTS HERE'][phase];
 getElement('introPhase').textContent=['01 — FIND YOUR SPARK','02 — FIND YOUR CONNECTION','03 — MAKE YOUR MARK'][phase];
 getElement('introCount').textContent=`0${phase+1} / 03`;
 root.querySelector('.intro-copy').style.transform=`translateY(${-exit*height*.15}px)`;
 // The actual landing page becomes the final floating panel, then fills the
 // viewport. Using the live page avoids a screenshot-to-page visual jump.
 const panel=endingPose(ms,width,height);
 root.querySelector('.intro-copy').style.opacity=String(1-ease((ms-5300)/450));
 root.querySelector('.intro-marquee').style.opacity=String(.12*(1-ease((ms-5300)/700)));
 if(panel.visible){
  site.classList.add('ready','panel-reveal');
  site.style.opacity=String(panel.opacity);
  site.style.transform=`translate3d(${panel.x}px,${panel.y}px,0) scale(${panel.scale})`;
  site.style.borderRadius=`${panel.radius}px`;
  site.style.boxShadow=`0 30px 140px rgba(0,0,0,${.65*(1-panel.zoom)})`;
 }

}
// Reference ending: one gallery panel centers and grows into the website.
function endingPose(ms,width,height){
 const visible=ms>=5300,pan=ease((ms-5300)/1150),zoom=ease((ms-6500)/1850);
 const scale=mix(width<700?.38:.30,1,zoom);
 const centeredX=width*(1-scale)/2,centeredY=height*(1-scale)/2;
 return {visible,zoom,scale,x:mix(width*.61,centeredX,pan),y:mix(height*.48,centeredY,pan),opacity:ease((ms-5300)/400),radius:18*(1-zoom)/scale};
}
function resetEnding(){
 site.classList.remove('panel-reveal');
 for(const prop of ['transform','opacity','border-radius','box-shadow'])site.style.removeProperty(prop);
 root.querySelector('.intro-copy').style.opacity='';
 root.querySelector('.intro-marquee').style.opacity='';
}
function tick(now){if(disposed||!playing)return;const delta=last?Math.min(now-last,100):0;last=now;if(!document.hidden)elapsed+=delta;paint(elapsed);if(elapsed>=duration){finish(false);return;}frame=requestAnimationFrame(tick);}
function finish(focus){cancelAnimationFrame(frame);resetEnding();playing=false;finished=true;intro.classList.add('done');site.classList.add('ready');site.inert=false;unlockScroll();if(focus)getElement('replay').focus({preventScroll:true});}
function start(){if(disposed)return;resetEnding();if(reduced.matches){finish(false);return;}cancelAnimationFrame(frame);window.scrollTo({top:0,behavior:'instant'});elapsed=0;last=0;finished=false;playing=true;intro.style.opacity='';intro.classList.remove('done');site.classList.remove('ready');site.inert=true;lockScroll();paint(0);frame=requestAnimationFrame(tick);}
listen(getElement('replay'),'click',start);
listen(reduced,'change',()=>{if(reduced.matches)finish(false);});

 const hero=getElement('heroArt');
 listen(hero,'pointermove',e=>{if(reduced.matches||e.pointerType==='touch')return;const r=hero.getBoundingClientRect();hero.style.setProperty('--rx',((e.clientY-r.top-r.height/2)/-70)+'deg');hero.style.setProperty('--ry',((e.clientX-r.left-r.width/2)/70)+'deg');});
 listen(hero,'pointerleave',()=>{hero.style.setProperty('--rx','0deg');hero.style.setProperty('--ry','0deg');});
 lockScroll();
 let preloadTimeout;
 const timeout=new Promise(resolve=>{preloadTimeout=setTimeout(resolve,2000);});
 Promise.race([Promise.all(cards.map(c=>c.querySelector('img').decode().catch(()=>{}))),timeout]).then(()=>{clearTimeout(preloadTimeout);if(!disposed&&!finished)start();});
 return ()=>{
  disposed=true;playing=false;cancelAnimationFrame(frame);clearTimeout(preloadTimeout);
  removers.forEach(remove=>remove());resetEnding();unlockScroll();site.inert=false;
  cards.forEach(card=>card.remove());
 };
}

