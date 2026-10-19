'use client';

import React, { useEffect, useRef } from 'react';

const ROOT = 'relative h-full w-full overflow-hidden select-none';
const CANVAS = 'absolute inset-0 block h-full w-full';

const PLACEMENTS = ['full', 'left', 'right', 'center'];

const CAMERA = 4.0;
const DEPTHS = [2.7, 3.9, 5.6, 8.1, 11.6];
const SHARE  = [0.26, 0.23, 0.2, 0.17, 0.14];
const GROWTH = [1.1,  1.4,  1.9, 2.7,  3.7];
const FADE   = [1.0,  0.88, 0.72, 0.56, 0.42];
const LEVELS = DEPTHS.length;
const INTRO_SECONDS = 2.4;
const MAX_RINGS    = 4;
const RING_SECONDS = 2.4;
const SAMPLES = 100;       // ← reduced from 140: path precision vs speed tradeoff

const FULL_SLOPES = [
  [0.2,  -0.78],
  [-0.72,  0.02],
  [0.58, -0.06],
  [-0.24,  0.62],
  [0.8,   0.3]
];
const SIDE_OFFSETS = [0.84, 0.62, 0.44, 0.28, 0.14];
const RING_SIZES   = [
  [0.98, 0.78], [0.9, 0.7], [0.84, 0.64], [0.8, 0.6], [0.76, 0.56]
];
const TAU = Math.PI * 2;

const clamp    = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoother = x => { const t = clamp(x,0,1); return t*t*t*(t*(t*6-15)+10); };

const createSeededRandom = seed => {
  let s = (seed || 1337) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};

const parseHex = (val, fallback) => {
  if (!val || val === 'transparent') return fallback;
  if (val[0] === '#') {
    const h = val.slice(1);
    if (h.length === 3) return [parseInt(h[0]+h[0],16)/255, parseInt(h[1]+h[1],16)/255, parseInt(h[2]+h[2],16)/255];
    if (h.length >= 6)  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
  }
  return fallback;
};

const ribbonPoint = (placement, level, s, aspect, out) => {
  let u, v, d;
  if (placement === 0) {
    u = -1.35 + 2.7 * s;
    const [s0, s1] = FULL_SLOPES[level] || [0,0];
    v = s0 + (s1-s0)*s + 0.12*Math.sin(s*TAU*0.7+level*2.3) + 0.05*Math.sin(s*TAU*1.9+level);
    d = DEPTHS[level] + 0.35*Math.sin(s*Math.PI*1.4+level*1.9);
  } else if (placement === 3) {
    const ang = s*TAU + level*0.9 + Math.PI*0.5;
    const [rw, rh] = RING_SIZES[level] || [0.8, 0.6];
    u = Math.cos(ang)*rw; v = Math.sin(ang)*rh - 0.02;
    d = DEPTHS[level]*1.1 - Math.sin(ang)*(0.5+level*0.25);
  } else {
    const mirror = placement === 1 ? -1 : 1;
    v = 1.35 - 2.7*s;
    u = mirror*(SIDE_OFFSETS[level] + 0.12*Math.sin(s*TAU*0.6+level*1.3) + 0.04*Math.sin(s*TAU*2.1+level) - 0.08*(1-s));
    d = DEPTHS[level] + 0.3*Math.sin(s*Math.PI*1.2+level);
  }
  out[0] = (u*aspect*d)/CAMERA;
  out[1] = (v*d)/CAMERA;
  out[2] = CAMERA - d;
  return out;
};

const createShards = (count, seed) => {
  const next   = createSeededRandom(seed || 1337);
  const shards = [];
  let made = 0;
  for (let level = 0; level < LEVELS; level++) {
    const amount = level === LEVELS-1 ? count - made : Math.round(count * SHARE[level]);
    made += amount;
    for (let index = 0; index < amount; index++) {
      const flat   = next()*2-1;
      const family = next();
      const outline = [];
      if (family < 0.5) {
        const sp = 0.22 + next()*0.18;
        outline.push([1.2, 0], [0.1, sp], [-0.8-next()*0.3, 0], [0.1, -sp]);
      } else if (family < 0.8) {
        const sp = 0.25 + next()*0.18;
        outline.push([1.0,(next()-0.5)*0.1], [-0.6-next()*0.3, sp], [-0.6-next()*0.3, -sp]);
      } else {
        const sides = 5, stretch = 0.45+next()*0.3, turn = next()*TAU;
        for (let c = 0; c < sides; c++) {
          const a = turn + ((c+(next()-0.5)*0.4)*TAU)/sides;
          outline.push([Math.cos(a)*1.1, Math.sin(a)*stretch]);
        }
      }
      const sides = outline.length;
      let mx = 0, my = 0;
      for (const p of outline) { mx += p[0]/sides; my += p[1]/sides; }
      const shape = outline.map(p => [p[0]-mx, p[1]-my]);
      shards.push({
        level, shape, sides,
        phase: (index+next()) / Math.max(amount,1),
        lane:  Math.sign(flat)*Math.pow(Math.abs(flat), 0.85),
        layer: (next()-0.5)*1.5,
        size:  0.8 + next()*next()*1.35,
        yaw:   (next()-0.5)*0.36,
        bank:  (next()-0.5)*0.5,
        pitch: (next()-0.5)*0.24,
        tint:  next(),
        flutter: [next()*TAU, 0.5+next()*0.5],
        arrive:  next(),
        slot:    [next()*TAU, 0.1+0.35*Math.sqrt(next()), next()-0.5, next()<0.85?1:-1],
        offset:   [0,0,0], velocity: [0,0,0],
        tilt: 0, tiltVelocity: 0, flash: 0, gather: 0, joined: false,
        position: [0,0,0], s: 0
      });
    }
  }
  return shards;
};

export default function AeroShards({
  shardColor     = '#896ABD',
  accentColor    = '#A855F7',
  backgroundColor = 'transparent',
  lightMode      = false,
  placement      = 'full',
  material       = 'glass',
  markers        = 'plus',
  count          = 600,       // ← sensible default for background use
  shardSize      = 1,
  spread         = 1,
  twist          = 1,
  billow         = 1,
  speed          = 1,
  scale          = 1,
  depthOfField   = 0.75,
  glow           = 0.35,
  grain          = 0.06,
  vignette       = 0.3,
  intro          = true,
  mouseInteraction = true,
  mouseStrength  = 0.6,
  pulseOnClick   = true,
  holdToGather   = true,
  parallax       = 0.5,
  paused         = false,
  dpr            = 1,         // ← default 1: biggest single perf gain
  className      = '',
  style          = {},
  onError
}) {
  const containerRef = useRef(null);
  const settingsRef  = useRef(null);

  // Always keep settings ref fresh without re-running the effect
  settingsRef.current = {
    shardColor, accentColor, backgroundColor, lightMode,
    placement, material, markers, count, shardSize, spread,
    twist, billow, speed, scale, depthOfField, glow, grain,
    vignette, intro, mouseInteraction, mouseStrength,
    pulseOnClick, holdToGather, parallax, paused, dpr
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = CANVAS;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) { canvas.remove(); return; }

    let disposed = false, raf = 0;
    const cleanups = [];

    // Path data
    const paths = Array.from({ length: LEVELS }, () => ({
      position: new Float32Array(SAMPLES * 3),
      tangent:  new Float32Array(SAMPLES * 3),
      across:   new Float32Array(SAMPLES * 3),
      lift:     new Float32Array(SAMPLES * 3),
      length: 1
    }));
    const raw     = new Float32Array((SAMPLES+1)*3);
    const lengths = new Float32Array(SAMPLES+1);
    const ptmp    = [0,0,0];
    let pathKey   = '';

    const s0 = settingsRef.current;
    const placementIdx = Math.max(0, PLACEMENTS.indexOf(s0.placement));

    const state = {
      clock: 0, last: 0,
      travel: new Float64Array(LEVELS),
      roll: 0, twist: 0, drift: 0,
      introAt: -1,
      weights: PLACEMENTS.map((_,i) => i===placementIdx ? 1 : 0),
      weightVelocity: [0,0,0,0],
      shards: createShards(s0.count, 1337),
      pointer: [0.5,0.5], inside: false, presence: 0,
      yaw: 0, pitch: 0, yawVelocity: 0, pitchVelocity: 0,
      pressAt: -1, pressPoint: null, holding: false,
      hold: 0, reach: 0, gatherCenter: [0,0,0], rings: []
    };

    const buildPaths = aspect => {
      const closed = state.weights[3] > 0.999;
      const key = `${aspect.toFixed(2)}|${state.weights.map(w=>w.toFixed(2)).join(',')}`;
      if (key === pathKey) return closed;
      pathKey = key;
      for (let level = 0; level < LEVELS; level++) {
        const path = paths[level];
        let total = 0;
        for (let i = 0; i <= SAMPLES; i++) {
          const s = i / SAMPLES;
          let x=0, y=0, z=0;
          for (let k = 0; k < 4; k++) {
            const w = state.weights[k];
            if (w < 0.0001) continue;
            ribbonPoint(k, level, s, aspect, ptmp);
            x += ptmp[0]*w; y += ptmp[1]*w; z += ptmp[2]*w;
          }
          raw[i*3]=x; raw[i*3+1]=y; raw[i*3+2]=z;
          if (i>0) total += Math.hypot(x-raw[i*3-3], y-raw[i*3-2], z-raw[i*3-1]);
          lengths[i] = total;
        }
        path.length = Math.max(total, 1e-3);
        let cursor = 0;
        for (let i = 0; i < SAMPLES; i++) {
          const want = (i/(SAMPLES-1))*total;
          while (cursor < SAMPLES-1 && lengths[cursor+1] < want) cursor++;
          const span = Math.max(lengths[cursor+1]-lengths[cursor], 1e-6);
          const f = clamp((want-lengths[cursor])/span, 0, 1);
          for (let c = 0; c < 3; c++) path.position[i*3+c] = raw[cursor*3+c]+(raw[cursor*3+3+c]-raw[cursor*3+c])*f;
        }
        let px=0, py=1, pz=0;
        for (let i = 0; i < SAMPLES; i++) {
          const a = Math.max(0,i-1), b = Math.min(SAMPLES-1,i+1);
          let tx=path.position[b*3]-path.position[a*3];
          let ty=path.position[b*3+1]-path.position[a*3+1];
          let tz=path.position[b*3+2]-path.position[a*3+2];
          const tl = Math.hypot(tx,ty,tz)||1; tx/=tl; ty/=tl; tz/=tl;
          if (i===0){px=-ty;py=tx;pz=0;}
          const along = px*tx+py*ty+pz*tz;
          px-=tx*along; py-=ty*along; pz-=tz*along;
          const pl = Math.hypot(px,py,pz)||1; px/=pl; py/=pl; pz/=pl;
          path.tangent[i*3]=tx; path.tangent[i*3+1]=ty; path.tangent[i*3+2]=tz;
          path.across[i*3]=px;  path.across[i*3+1]=py;  path.across[i*3+2]=pz;
          path.lift[i*3]=ty*pz-tz*py; path.lift[i*3+1]=tz*px-tx*pz; path.lift[i*3+2]=tx*py-ty*px;
        }
      }
      return closed;
    };

    const cam = { eye:[0,0,CAMERA], forward:[0,0,-1], right:[1,0,0], up:[0,1,0], focal:1 };
    const updateCamera = s => {
      const cy=Math.cos(state.yaw), sy=Math.sin(state.yaw);
      const cp=Math.cos(state.pitch), sp=Math.sin(state.pitch);
      cam.eye[0]=sy*cp*CAMERA; cam.eye[1]=sp*CAMERA; cam.eye[2]=cy*cp*CAMERA;
      cam.forward[0]=-sy*cp; cam.forward[1]=-sp; cam.forward[2]=-cy*cp;
      const rl=Math.hypot(cam.forward[2],cam.forward[0])||1;
      cam.right[0]=-cam.forward[2]/rl; cam.right[1]=0; cam.right[2]=cam.forward[0]/rl;
      cam.up[0]=cam.right[1]*cam.forward[2]-cam.right[2]*cam.forward[1];
      cam.up[1]=cam.right[2]*cam.forward[0]-cam.right[0]*cam.forward[2];
      cam.up[2]=cam.right[0]*cam.forward[1]-cam.right[1]*cam.forward[0];
      cam.focal = canvas.height*0.5*CAMERA*s.scale;
    };

    const resize = () => {
      const s = settingsRef.current;
      const ratio = Math.min(window.devicePixelRatio||1, Math.max(s.dpr, 1));
      const w = Math.max(1, Math.round(container.clientWidth  * ratio));
      const h = Math.max(1, Math.round(container.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; pathKey=''; }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    cleanups.push(() => ro.disconnect());

    // Pre-allocated reuse buffer for rendered shard list
    const rendered = [];

    const tick = now => {
      raf = requestAnimationFrame(tick);
      if (disposed || document.hidden) { state.last = now; return; }
      const s = settingsRef.current;
      const dt = state.last ? Math.min((now-state.last)/1000, 0.05) : 0;
      state.last = now;
      state.clock += dt;
      if (state.introAt < 0) state.introAt = state.clock;

      // Recreate shards only when count changes
      if (state.shards.length !== s.count) state.shards = createShards(s.count, 1337);

      if (!s.paused) {
        for (let level = 0; level < LEVELS; level++)
          state.travel[level] = (state.travel[level] + (dt*s.speed*0.09)/paths[level].length) % 1;
        state.roll  += dt*s.speed;
        state.twist += dt*s.speed*0.08;
        state.drift += dt*s.speed;
      }

      // Placement blend
      const targetP = Math.max(0, PLACEMENTS.indexOf(s.placement));
      const decay = Math.exp(-4*dt);
      for (let i = 0; i < 4; i++) {
        const goal = i===targetP ? 1 : 0;
        const diff = state.weights[i]-goal;
        const mom  = state.weightVelocity[i] + 4*diff;
        state.weights[i] = goal + (diff+mom*dt)*decay;
        state.weightVelocity[i] = (state.weightVelocity[i]-4*mom*dt)*decay;
      }

      // Mouse parallax
      const engaged = s.mouseInteraction && state.inside;
      state.presence += ((engaged?1:0)-state.presence)*(1-Math.exp(-dt/0.25));
      const lean = engaged ? s.parallax : 0;
      state.yawVelocity   += (38*((state.pointer[0]-0.5)*lean*0.16 - state.yaw)   - 11*state.yawVelocity)   * dt;
      state.pitchVelocity += (38*((state.pointer[1]-0.5)*lean*0.10 - state.pitch) - 11*state.pitchVelocity) * dt;
      state.yaw   += state.yawVelocity*dt;
      state.pitch += state.pitchVelocity*dt;

      // Hold-to-gather
      if (state.pressAt >= 0 && state.pressPoint && s.holdToGather && state.clock-state.pressAt > 0.16) {
        if (!state.holding) {
          state.holding = true;
          const rx=(state.pressPoint[0]-0.5)*(canvas.width/canvas.height);
          const ry=0.5-state.pressPoint[1];
          state.gatherCenter=[rx*2.2,ry*2.2,0]; state.reach=0;
        }
        state.hold  = Math.min(1, state.hold + dt/0.4);
        state.reach = Math.min(state.reach + dt*0.6, 0.75);
        const reach = (0.35+state.reach)/s.scale;
        for (const sh of state.shards) {
          if (sh.joined || sh.level > 2) continue;
          const gx=sh.position[0]-state.gatherCenter[0], gy=sh.position[1]-state.gatherCenter[1];
          if (gx*gx+gy*gy < reach*reach) sh.joined=true;
        }
      } else if (state.hold > 0) {
        state.hold = Math.max(0, state.hold - dt/0.3);
        if (state.hold === 0) for (const sh of state.shards) sh.joined=false;
      }

      // Age rings
      for (const r of state.rings) r.age += dt;
      state.rings = state.rings.filter(r => r.age < RING_SECONDS);

      // Build
      const aspect = canvas.width / Math.max(canvas.height,1);
      const closed = buildPaths(aspect);
      updateCamera(s);

      const introOn  = s.intro;
      const introAge = state.introAt < 0 ? 0 : state.clock-state.introAt;
      const hover    = s.mouseInteraction ? state.presence*s.mouseStrength : 0;
      const shards   = state.shards;
      const sRGB     = parseHex(s.shardColor,  [0.54,0.42,0.74]);
      const aRGB     = parseHex(s.accentColor, [0.66,0.33,0.97]);

      // Hover ray
      const hpx=(state.pointer[0]-0.5)*canvas.width;
      const hpy=(0.5-state.pointer[1])*canvas.height;
      let rx=cam.forward[0]*cam.focal+cam.right[0]*hpx+cam.up[0]*hpy;
      let ry=cam.forward[1]*cam.focal+cam.right[1]*hpx+cam.up[1]*hpy;
      let rz=cam.forward[2]*cam.focal+cam.right[2]*hpx+cam.up[2]*hpy;
      const rl=Math.hypot(rx,ry,rz)||1; rx/=rl; ry/=rl; rz/=rl;

      // --- Simulate + collect visible shards ---
      rendered.length = 0;

      for (let index = 0; index < shards.length; index++) {
        const sh    = shards[index];
        const level = sh.level;
        const path  = paths[level];
        let s0 = (sh.phase + state.travel[level]) % 1;
        let appear = 1;
        if (introOn && introAge < INTRO_SECONDS) {
          appear = clamp((introAge - level*0.15 - sh.arrive*0.2)/0.6, 0.15, 1);
        }
        sh.s = s0;

        const f  = (((s0%1)+1)%1)*(SAMPLES-1);
        const i0 = Math.floor(f), i1 = Math.min(i0+1, SAMPLES-1), tf = f-i0;
        const at = (arr,c) => arr[i0*3+c]+(arr[i1*3+c]-arr[i0*3+c])*tf;

        const cx=at(path.position,0), cy=at(path.position,1), cz=at(path.position,2);
        const ttx=at(path.tangent,0), tty=at(path.tangent,1), ttz=at(path.tangent,2);
        const ax0=at(path.across,0),  ay0=at(path.across,1),  az0=at(path.across,2);
        const lx0=at(path.lift,0),    ly0=at(path.lift,1),    lz0=at(path.lift,2);

        const angle = s.twist*(s0*TAU*0.6+state.twist+level*1.7);
        const ca=Math.cos(angle), sa=Math.sin(angle);
        const ax=ax0*ca+lx0*sa, ay=ay0*ca+ly0*sa, az=az0*ca+lz0*sa;
        const bx=lx0*ca-ax0*sa, by=ly0*ca-ay0*sa, bz=lz0*ca-az0*sa;

        const depthScale = DEPTHS[level]/CAMERA;
        const width = s.spread*(0.16+0.04*DEPTHS[level])*(0.85+0.3*Math.sin(s0*TAU*1.3+level*0.8));
        const lane  = sh.lane*width;
        const layer = sh.layer*0.015*depthScale;
        const taper = closed ? 1 : smoother(s0/0.1)*smoother((1-s0)/0.1);
        const bill  = s.billow*0.18*depthScale*Math.sin(s0*TAU*1.3-state.drift*0.5+level*1.1)*(0.4+0.6*taper);
        const sway  = s.billow*0.07*depthScale*Math.sin(s0*TAU*0.8-state.drift*0.35+level*2.4);

        const hx=cx+lx0*bill+ax0*sway+ax*lane+bx*layer;
        const hy=cy+ly0*bill+ay0*sway+ay*lane+by*layer;
        const hz=cz+lz0*bill+az0*sway+az*lane+bz*layer;

        let fx=0, fy=0, fz=0, tiltTarget=0;
        const px=hx+sh.offset[0], py=hy+sh.offset[1], pz=hz+sh.offset[2];

        // Hover deflect (skip if tiny hover)
        if (hover > 0.01) {
          const ex=px-cam.eye[0], ey=py-cam.eye[1], ez=pz-cam.eye[2];
          const along=ex*rx+ey*ry+ez*rz;
          const qx=ex-rx*along, qy=ey-ry*along, qz=ez-rz*along;
          const gap=Math.hypot(qx,qy,qz);
          const reach=(0.28*depthScale)/s.scale;
          const falloff=Math.exp(-(gap*gap)/(reach*reach));
          if (falloff > 0.01 && gap > 1e-5) {
            const nx=qx/gap, ny=qy/gap, nz=qz/gap;
            const sw=(nx*ttx+ny*tty+nz*ttz)*0.7;
            const str=hover*falloff*10*depthScale;
            fx+=(nx-ttx*sw)*str; fy+=(ny-tty*sw)*str; fz+=(nz-ttz*sw)*str;
            tiltTarget+=hover*falloff*1.2*(nx*ax0+ny*ay0+nz*az0);
          }
        }

        // Vortex gather
        if (state.hold > 0.001 && sh.joined) {
          const slot=sh.slot, orbit=slot[0]+state.clock*(0.9/(0.12+slot[1]))*slot[3];
          const radius=slot[1]/s.scale;
          const gx=state.gatherCenter[0]+Math.cos(orbit)*radius;
          const gy=state.gatherCenter[1]+Math.sin(orbit)*radius*0.75;
          const gz=state.gatherCenter[2]+Math.sin(orbit)*radius*0.45;
          sh.gather+=(state.hold-sh.gather)*(1-Math.exp(-dt/0.3));
          const pull=sh.gather*34;
          fx+=(gx-px)*pull; fy+=(gy-py)*pull; fz+=(gz-pz)*pull;
          tiltTarget+=sh.gather*0.7*Math.sin(orbit);
        } else {
          sh.gather+=(0-sh.gather)*(1-Math.exp(-dt/0.2));
        }

        // Rings
        if (state.rings.length) {
          for (const ring of state.rings) {
            const radius=Math.max(0,ring.age-level*0.07)*2.4;
            const dxr=px-ring.x, dyr=py-ring.y, dist=Math.hypot(dxr,dyr);
            const band=Math.exp(-((dist-radius)*(dist-radius))/0.025)*(1-ring.age/RING_SECONDS);
            if (band > 0.02) {
              sh.flash=Math.max(sh.flash,band);
              fx+=(dxr/(dist||1))*band*3.5*depthScale;
              fy+=(dyr/(dist||1))*band*3.5*depthScale;
              tiltTarget+=band*1.6;
            }
          }
        }

        // Spring physics
        const stiff=24*(1-sh.gather*0.95);
        sh.velocity[0]+=(fx-stiff*sh.offset[0]-7.5*sh.velocity[0])*dt;
        sh.velocity[1]+=(fy-stiff*sh.offset[1]-7.5*sh.velocity[1])*dt;
        sh.velocity[2]+=(fz-stiff*sh.offset[2]-7.5*sh.velocity[2])*dt;
        sh.offset[0]+=sh.velocity[0]*dt; sh.offset[1]+=sh.velocity[1]*dt; sh.offset[2]+=sh.velocity[2]*dt;
        sh.tiltVelocity+=(90*(tiltTarget-sh.tilt)-15*sh.tiltVelocity)*dt;
        sh.tilt+=sh.tiltVelocity*dt;
        sh.flash*=Math.exp(-dt/0.45);

        const ox=hx+sh.offset[0], oy=hy+sh.offset[1], oz=hz+sh.offset[2];
        sh.position[0]=ox; sh.position[1]=oy; sh.position[2]=oz;

        // Project
        const ex=ox-cam.eye[0], ey=oy-cam.eye[1], ez=oz-cam.eye[2];
        const vd = ex*cam.forward[0]+ey*cam.forward[1]+ez*cam.forward[2];
        if (vd <= 0.15) continue;

        const scX = canvas.width*0.5  + (ex*cam.right[0]+ey*cam.right[1]+ez*cam.right[2]) * cam.focal/vd;
        const scY = canvas.height*0.5 - (ex*cam.up[0]   +ey*cam.up[1]   +ez*cam.up[2])    * cam.focal/vd;
        if (scX < -80 || scX > canvas.width+80 || scY < -80 || scY > canvas.height+80) continue;

        const core = 1 - 0.45*sh.lane*sh.lane;
        const worldSize = 0.08*s.shardSize*sh.size*GROWTH[level]*appear*Math.sqrt(Math.max(0.1,taper))*core;
        const pixelSize = (worldSize*cam.focal)/vd;
        if (pixelSize < 1.2) continue;

        rendered.push({
          scX, scY, vd, pixelSize,
          yaw:   sh.yaw + 0.06*Math.sin(state.clock*sh.flutter[1]*0.7+sh.flutter[0]),
          bank:  Math.tanh(sh.bank+sh.tilt),
          pitch: sh.pitch + 0.15*Math.sin(s0*TAU*1.1+level*2.1),
          level, tint: sh.tint, flash: sh.flash, shape: sh.shape
        });
      }

      // Depth sort: far first
      rendered.sort((a,b) => b.vd - a.vd);

      // ─── DRAW ─────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (backgroundColor && backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor; ctx.fillRect(0,0,canvas.width,canvas.height);
      }

      const aR=Math.round(aRGB[0]*255), aG=Math.round(aRGB[1]*255), aB=Math.round(aRGB[2]*255);
      const sR=Math.round(sRGB[0]*255), sG=Math.round(sRGB[1]*255), sB=Math.round(sRGB[2]*255);

      // 1. Shockwave rings  (no shadowBlur)
      for (const ring of state.rings) {
        const life = 1-ring.age/RING_SECONDS;
        if (life <= 0.01) continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.screenX, ring.screenY, Math.max(0,ring.age*2.4)*(canvas.height*0.5), 0, TAU);
        ctx.strokeStyle = `rgba(${aR},${aG},${aB},${clamp(life*0.75,0,1)})`;
        ctx.lineWidth   = Math.max(1.5, 3+life*5);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Floating + markers  (draw only every 3rd frame at reduced density for perf)
      if (markers === 'plus' && Math.round(state.clock*60)%3 === 0) {
        ctx.save();
        const step = 110;
        const cols = Math.ceil(canvas.width/step);
        const rows = Math.ceil(canvas.height/step);
        const t    = state.clock;
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const blink = 0.5+0.5*Math.sin(t*1.8+i*2.1+j*3.7);
            if (blink > 0.4) {
              const mx = i*step+55 + Math.sin(j*3+t*0.5)*8;
              const my = j*step+55 + Math.cos(i*3+t*0.5)*8;
              ctx.fillStyle = `rgba(${aR},${aG},${aB},${(blink-0.4)*0.35})`;
              ctx.fillRect(mx-4, my-0.75, 8, 1.5);
              ctx.fillRect(mx-0.75, my-4, 1.5, 8);
            }
          }
        }
        ctx.restore();
      }

      // 3. Shards — NO shadowBlur (was the main lag source)
      const isChrome = material === 'chrome';

      for (const item of rendered) {
        ctx.save();
        ctx.translate(item.scX, item.scY);
        ctx.rotate(item.bank + item.yaw);

        const radX = item.pixelSize;
        const radY = item.pixelSize * Math.max(0.28, Math.abs(Math.cos(item.pitch)));

        ctx.beginPath();
        const shape = item.shape;
        const len   = shape.length;
        ctx.moveTo(shape[0][0]*radX, shape[0][1]*radY);
        for (let k = 1; k < len; k++) ctx.lineTo(shape[k][0]*radX, shape[k][1]*radY);
        ctx.closePath();

        const lf    = FADE[item.level] ?? 0.5;
        const flash = item.flash;
        const tint  = item.tint;

        // Flat color tinted toward accent — no gradient needed for far/small shards
        const br = Math.round(sR*(1-tint*0.3)+aR*tint*0.3);
        const bg = Math.round(sG*(1-tint*0.3)+aG*tint*0.3);
        const bb = Math.round(sB*(1-tint*0.3)+aB*tint*0.3);

        if (radX > 6) {
          // Big close shards: use gradient for crystal look
          const g = ctx.createLinearGradient(-radX*0.6,-radY*0.6, radX*0.6, radY*0.6);
          if (isChrome) {
            const spec = Math.min(255, 220+Math.round(35*flash));
            g.addColorStop(0, `rgb(${spec},${spec},${spec})`);
            g.addColorStop(0.45, `rgb(240,245,255)`);
            g.addColorStop(1, `rgb(${Math.round(br*0.7)},${Math.round(bg*0.65)},${Math.round(bb*0.9)})`);
          } else {
            const tR=Math.min(255,Math.round(br*1.25+55*flash));
            const tG=Math.min(255,Math.round(bg*1.2 +45*flash));
            const tB=Math.min(255,Math.round(bb*1.35+65*flash));
            g.addColorStop(0, `rgba(${tR},${tG},${tB},0.92)`);
            g.addColorStop(0.5, `rgba(${aR},${aG},${aB},0.82)`);
            g.addColorStop(1, `rgba(${Math.round(br*0.7)},${Math.round(bg*0.6)},${Math.round(bb*0.9)},0.72)`);
          }
          ctx.globalAlpha = clamp(lf*(0.88+flash*0.25), 0.3, 1.0);
          ctx.fillStyle   = g;
        } else {
          // Small/far shards: flat fill, much cheaper
          ctx.globalAlpha = clamp(lf*(0.75+flash*0.3), 0.25, 1.0);
          ctx.fillStyle   = `rgb(${br},${bg},${bb})`;
        }

        ctx.fill();

        // Crystalline edge highlight  (skip on smallest shards)
        if (radX > 3) {
          ctx.strokeStyle = flash > 0.07
            ? `rgba(255,255,255,${clamp(0.6+flash*0.4,0,1)})`
            : `rgba(220,200,255,${clamp(lf*0.55,0.2,0.75)})`;
          ctx.lineWidth   = Math.max(0.8, 1.4+flash*1.8);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 4. Vignette  (only draw when vignette > 0)
      if (s.vignette > 0.01) {
        const w=canvas.width, h=canvas.height;
        const vg = ctx.createRadialGradient(w/2,h/2, Math.hypot(w,h)*0.5*(1-s.vignette), w/2,h/2, Math.hypot(w,h)*0.6);
        vg.addColorStop(0, 'rgba(8,12,20,0)');
        vg.addColorStop(1, `rgba(8,12,20,${clamp(s.vignette*0.75,0,0.85)})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0,0,w,h);
      }
    };

    // ─── Pointer events ────────────────────────────────────────────────────
    const local = e => {
      const r = container.getBoundingClientRect();
      return {
        point: [(e.clientX-r.left)/Math.max(r.width,1), (e.clientY-r.top)/Math.max(r.height,1)],
        inside: e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom
      };
    };
    const onMove = e => { const h=local(e); state.inside=h.inside; if(h.inside) state.pointer=h.point; };
    const onLeave = () => { state.inside=false; };
    const onDown  = e => {
      if (e.button!==0 || !settingsRef.current.mouseInteraction) return;
      if (e.target instanceof Element && e.target.closest('a,button,input,textarea,select,[role="button"]')) return;
      const h=local(e);
      if (!h.inside) return;
      state.pointer=h.point; state.pressAt=state.clock; state.pressPoint=h.point;
    };
    const onUp = e => {
      const s=settingsRef.current;
      if (state.pressAt < 0) return;
      if (!state.holding && s.pulseOnClick && state.pressPoint) {
        state.rings.push({ x:(state.pressPoint[0]-0.5)*(canvas.width/canvas.height)*2.2, y:(0.5-state.pressPoint[1])*2.2, screenX:state.pressPoint[0]*canvas.width, screenY:state.pressPoint[1]*canvas.height, age:0 });
        if (state.rings.length > MAX_RINGS) state.rings.shift();
      }
      state.pressAt=-1; state.holding=false;
    };

    window.addEventListener('pointermove', onMove, { passive:true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup',   onUp);
    window.addEventListener('pointercancel', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup',   onUp);
      window.removeEventListener('pointercancel', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    });

    raf = requestAnimationFrame(tick);
    return () => {
      disposed=true;
      cancelAnimationFrame(raf);
      cleanups.forEach(c => c());
      canvas.remove();
    };
  }, []);

  return <div ref={containerRef} className={[ROOT,className].filter(Boolean).join(' ')} style={style} />;
}
