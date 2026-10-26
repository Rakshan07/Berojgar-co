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
let elapsed=0,last=0,frame=0,handoffTimer=0,playing=false,finished=false;
const playbackSpeed=1.2;
const duration=8500/playbackSpeed;
const cards=events.map(item=>{const el=document.createElement('div');el.className='intro-card';el.innerHTML=`<img src="/teamweave-motion/assets/${item.id}.jpg" alt="" decoding="async"><span class="label"><small>DIFFERENT SKILLS. SHARED AMBITION.</small>${item.name}</span>`;scene.append(el);return el;});
const destinations=[[-.36,-.18,-130,-12],[.34,-.22,-200,12],[-.26,.2,-70,-9],[.37,.19,-90,9],[.02,-.12,100,-4],[.02,.26,-300,7],[-.48,.02,-390,-16],[.49,.03,-420,16],[-.17,-.32,-380,-7],[.18,-.32,-400,8],[-.15,.37,-410,-11],[.24,.36,-430,11]];
const marquee=root.querySelector('.intro-marquee'),copy=root.querySelector('.intro-copy');
const title=getElement('introTitle'),eyebrow=getElement('introEyebrow');
let currentPhase=-1;
const clamp=x=>Math.max(0,Math.min(1,x));const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};const mix=(a,b,p)=>a+(b-a)*p;
function paint(ms){
 ms*=playbackSpeed;
 const width=innerWidth,height=innerHeight,mobile=width<700,radius=mobile?150:280;
 const burst=ease((ms-3400)/1800),exit=ease((ms-5100)/2250),arrival=ease(ms/1100);
 cards.forEach((card,i)=>{
  const angle=i*Math.PI*2/events.length+ms*.0006,initial=i*Math.PI*2/events.length;
  let x=Math.sin(angle)*radius,y=Math.cos(angle)*18,z=Math.cos(angle)*175,ry=Math.sin(angle)*-32,rz=Math.sin(angle)*5;
  x=mix(Math.sin(initial)*width*.7,x,arrival);y=mix(Math.cos(initial)*height*.5,y,arrival);
  const destination=destinations[i];
  x=mix(x,destination[0]*width,burst);y=mix(y,destination[1]*height,burst);z=mix(z,destination[2],burst);ry=mix(ry,-destination[3],burst);rz=mix(rz,destination[3],burst);
  x-=exit*width*.9;y-=exit*height*.28;z-=exit*180;
  card.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${1-exit*.35})`;
  card.style.opacity=String(arrival*(1-exit));card.style.zIndex=String(Math.round(z+500));
 });
 marquee.style.transform=`translate3d(${-ms*.017}px,0,0)`;
 const phase=ms<3400?0:ms<6700?1:2;
 if(phase!==currentPhase){
  currentPhase=phase;
  title.textContent=['Find your people.','Different strengths. One team.','Make something remarkable.'][phase];
  eyebrow.textContent=['A WORLD OF POSSIBILITIES','CONNECTED BY WHAT YOU CAN CREATE','YOUR NEXT CHAPTER STARTS HERE'][phase];
 }
 copy.style.transform=`translate3d(0,${-exit*height*.15}px,0)`;
 const panel=endingPose(ms,width,height);
 copy.style.opacity=String(1-ease((ms-5250)/650));
 marquee.style.opacity=String(.12*(1-ease((ms-5200)/850)));
 if(panel.visible){
  site.classList.add('ready','panel-reveal');
  site.style.opacity=String(panel.opacity);
  site.style.transform=`translate3d(${panel.x}px,${panel.y}px,0) scale(${panel.scale})`;
  site.style.borderRadius=`${panel.radius}px`;
  site.style.boxShadow=`0 30px 120px rgba(0,0,0,${.58*(1-panel.zoom)})`;
 }

}
// Reference ending: one gallery panel centers and grows into the website.
function endingPose(ms,width,height){
 const visible=ms>=4750,reveal=ease((ms-5200)/3000);
 const scale=mix(width<700?.38:.30,1,reveal);
 const centeredX=width*(1-scale)/2,centeredY=height*(1-scale)/2;
 return {visible,zoom:reveal,scale,x:mix(width*.61,centeredX,reveal),y:mix(height*.48,centeredY,reveal),opacity:ease((ms-5150)/700),radius:18*(1-reveal)/scale};
}
function resetEnding(){
 site.classList.remove('panel-reveal');
 for(const prop of ['transform','opacity','border-radius','box-shadow'])site.style.removeProperty(prop);
 root.querySelector('.intro-copy').style.opacity='';
 root.querySelector('.intro-marquee').style.opacity='';
}
function tick(now){if(disposed||!playing)return;const delta=last?Math.min(now-last,34):0;last=now;if(!document.hidden)elapsed+=delta;paint(elapsed);if(elapsed>=duration){finish(false);return;}frame=requestAnimationFrame(tick);}
function finish(focus){
 cancelAnimationFrame(frame);clearTimeout(handoffTimer);playing=false;finished=true;
 paint(duration);intro.classList.add('done');site.classList.add('ready');site.inert=false;unlockScroll();
 handoffTimer=setTimeout(resetEnding,850);
 if(focus)getElement('replay').focus({preventScroll:true});
}
function start(){if(disposed)return;clearTimeout(handoffTimer);resetEnding();if(reduced.matches){intro.classList.add('done');site.classList.add('ready');site.inert=false;unlockScroll();finished=true;return;}cancelAnimationFrame(frame);window.scrollTo({top:0,behavior:'instant'});elapsed=0;last=0;currentPhase=-1;finished=false;playing=true;intro.style.opacity='';intro.classList.remove('done');site.classList.remove('ready');site.inert=true;lockScroll();paint(0);frame=requestAnimationFrame(tick);}
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
  disposed=true;playing=false;cancelAnimationFrame(frame);clearTimeout(handoffTimer);clearTimeout(preloadTimeout);
  removers.forEach(remove=>remove());resetEnding();unlockScroll();site.inert=false;
  cards.forEach(card=>card.remove());
 };
}

