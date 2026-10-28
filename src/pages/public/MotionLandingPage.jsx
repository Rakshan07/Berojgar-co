import { BrandWordmark } from '../../components/ui/BrandMark';
import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LANDING_CATEGORIES } from '../../components/landing/landingCategories';
import { mountLandingIntro } from '../../components/landing/mountLandingIntro';
import '../../components/landing/MotionLanding.css';

const FILTERS=[['all','All worlds'],['tech','Technology'],['creative','Creative'],['academic','Academic'],['business','Entrepreneurship']];
export default function MotionLandingPage(){
 const root=useRef(null),navigate=useNavigate();
 const [filter,setFilter]=useState('all'),[menuOpen,setMenuOpen]=useState(false);
 useLayoutEffect(()=>mountLandingIntro(root.current),[]);
 function handleClick(e){
  const target=e.target.closest('button,a');if(!target)return;
  if(target.dataset.route){e.preventDefault();navigate(target.dataset.route);return;}
  if(target.dataset.filter){setFilter(target.dataset.filter);return;}
  if(target.id==='menu'){setMenuOpen(open=>!open);return;}
  if(target.closest('#navigation'))setMenuOpen(false);
  const routes={login:'/login',signup:'/login?tab=signup',organize:'/organizer/auth?tab=signup',events:'/events'};
  if(routes[target.dataset.action])navigate(routes[target.dataset.action]);
 }
 return <div className="motion-landing" ref={root} onClick={handleClick}><div id="intro" className="intro" role="dialog" aria-label="Animated introduction" aria-modal="true">
  <div className="intro-nav"><span className="brand"><BrandWordmark size={24}/></span></div>
  <div className="intro-marquee" aria-hidden="true">Different skills. Extraordinary together. Different skills.</div>
  <div className="intro-scene" id="introScene" aria-hidden="true"></div>
  <div className="intro-copy"><span id="introEyebrow">A WORLD OF POSSIBILITIES</span><h1 id="introTitle">Find your people.</h1></div>
</div>
<div id="site">
<header className="nav"><a className="brand" href="#home" aria-label="Skillfy home"><BrandWordmark size={24}/></a><nav id="navigation" className={menuOpen ? "open" : ""} aria-label="Main navigation"><a href="#events">Explore worlds</a><a href="#how">How it works</a><a href="#organizers">For organizers</a></nav><div className="nav-right"><button className="login" data-action="login">Log in</button><button className="button small" data-action="signup">Get started <span>↗</span></button><button className="menu" id="menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>{menuOpen ? "×" : "☰"}</button></div></header>
<main>
<section className="hero" id="home"><div className="hero-copy"><p className="eyebrow"><i></i> DIFFERENT SKILLS. SHARED AMBITION.</p><h1>Find your people.<br />Build your team.<br /><em>Make your mark.</em></h1><p className="description">Big ideas need more than one kind of mind. Discover events, show what you can do, and meet the people who bring out your best.</p><div className="hero-actions"><button className="button" data-action="signup">Find your team <span>↗</span></button><a className="text-link" href="/events" data-route="/events">Explore events <span>→</span></a></div><div className="hero-foot"><span className="mini-mark">✳</span><span>Made for the builders, thinkers,<br />creators & the beautifully curious.</span></div></div><div className="hero-art" id="heroArt"><div className="orbit-line"></div><div className="orbit-line second"></div><figure className="hero-photo one"><img src="/teamweave-motion/assets/hackathon.jpg" alt="AWB team collaborating at Wikimedia Hackathon 2024" /><figcaption><span>MAKE THE NEXT BIG THING</span><strong>Build together.</strong></figcaption></figure><figure className="hero-photo two"><img src="/teamweave-motion/assets/music.jpg" alt="Toronto All-Star Big Band performing together at Beaches Jazz Festival 2012" /><figcaption>Find your rhythm. ↗</figcaption></figure><figure className="hero-photo three"><img src="/teamweave-motion/assets/robotics.jpg" alt="FIRST Robotics teammates building with engineer mentors" /><figcaption>Different strengths. One team.</figcaption></figure><span className="floating-tag tag-one"><i></i> Your missing piece is out there.</span><span className="floating-tag tag-two">Code. Create. Connect. <b>✳</b></span><span className="art-index">CONNECTIONS THAT CREATE POSSIBILITIES</span></div><div className="hero-bottom"><span>YOUR SKILLS ARE JUST THE BEGINNING.</span><a href="#events">Scroll to discover ↓</a></div></section>
<section id="events" className="worlds"><div className="section-heading"><div><p className="eyebrow">01 / FIND YOUR WORLD</p><h2>Whatever your spark.<br /><em>There's a team for it.</em></h2></div><p>From a late-night breakthrough to a standing ovation. Start with what moves you.</p></div><div id="filters" className="filters" role="group" aria-label="Filter event categories">{FILTERS.map(([id,label])=><button key={id} data-filter={id} aria-pressed={filter===id} className={filter===id?'active':''}>{label}</button>)}</div><div id="eventGrid" className="event-grid">{LANDING_CATEGORIES.filter(item=>filter==='all'||item.group===filter).map(item=><button key={item.id} className="event-card" data-action="events"><div className="picture"><img src={'/teamweave-motion/assets/'+item.id+'.jpg'} alt={'Team photograph illustrating '+item.name} loading="lazy" /><b aria-hidden="true">↗</b><span>{item.kicker}</span></div><h3>{item.name}</h3><p>{item.text}</p></button>)}</div><p className="photo-note">Real team photography illustrates these categories; some photos come from related events rather than the exact competition type. These are not live event listings. <a href="/teamweave-motion/credits.html">Photo credits ↗</a></p></section>
<section id="how" className="how"><div className="section-heading"><div><p className="eyebrow">02 / GOOD TEAMS DON'T HAPPEN BY CHANCE</p><h2>Your next chapter.<br /><em>In good company.</em></h2></div><p>Find people who complement your strengths—not just people who share your interests.</p></div><div className="steps"><article><span>01</span><h3>Discover your challenge</h3><p>Explore events that connect with your interests and ambitions.</p></article><article><span>02</span><h3>Show how you think</h3><p>Demonstrate your abilities through event-specific case studies.</p></article><article><span>03</span><h3>Find your complement</h3><p>Discover teammates whose strengths fill the gaps in your team.</p></article><article><span>04</span><h3>Make it happen</h3><p>Bring your skills together and turn a shared idea into something real.</p></article></div></section>
<section id="organizers" className="organizers"><span className="eyebrow">FOR THE PEOPLE WHO BRING PEOPLE TOGETHER</span><h2>A great event starts<br />with <em>great connections.</em></h2><p>Define the challenge. Set the roles. Help participants find a team where their abilities belong.</p><button className="button" data-action="organize">Start organizing <span>↗</span></button><small>Organizer capabilities require account verification.</small><span className="giant-mark" aria-hidden="true">✳</span></section>
<section className="closing"><p className="eyebrow">YOUR NEXT GREAT TEAM STARTS HERE</p><h2>You bring the spark.<br /><em>Find your people.</em></h2><button className="button" data-action="signup">Let's make something remarkable <span>↗</span></button></section>
</main><footer><a href="#home" className="brand"><BrandWordmark size={24}/></a><span>Different strengths. Extraordinary together.</span><a href="/teamweave-motion/credits.html">Photography credits ↗</a></footer>
</div>
</div>;
}
