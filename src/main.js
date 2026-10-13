import * as THREE from 'three';

/* ============ RENDERER / SCENE ============ */
const stage = document.getElementById('stage');
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.055);
const camera = new THREE.PerspectiveCamera(55, 9/16, 0.1, 100);
camera.position.set(0, 0.4, 7.2);

/* lights */
scene.add(new THREE.AmbientLight(0x332211, 0.7));
const keyLight = new THREE.PointLight(0xff6a00, 60, 30, 1.8); keyLight.position.set(2.5, 3, 4); scene.add(keyLight);
const rimLight = new THREE.PointLight(0xffb347, 30, 30, 1.8); rimLight.position.set(-3, -1.5, 2.5); scene.add(rimLight);
const topSpot = new THREE.SpotLight(0xffd9a0, 80, 30, 0.5, 0.6, 1.4); topSpot.position.set(0, 8, 2); topSpot.target.position.set(0,0,0); scene.add(topSpot, topSpot.target);

/* glow sprite texture */
function glowTex(){
  const c=document.createElement('canvas'); c.width=c.height=256;
  const g=c.getContext('2d'); const gr=g.createRadialGradient(128,128,0,128,128,128);
  gr.addColorStop(0,'rgba(255,190,120,1)'); gr.addColorStop(0.25,'rgba(255,120,20,0.55)');
  gr.addColorStop(0.6,'rgba(255,80,0,0.14)'); gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr; g.fillRect(0,0,256,256);
  const t=new THREE.CanvasTexture(c); return t;
}
const GLOW = glowTex();
function addGlow(parent,x,y,z,s,op=0.8,color=0xff8a2a){
  const m=new THREE.SpriteMaterial({map:GLOW,color,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false});
  const sp=new THREE.Sprite(m); sp.position.set(x,y,z); sp.scale.setScalar(s); parent.add(sp); return sp;
}

/* ---- core holographic object ---- */
const core = new THREE.Group(); scene.add(core);
const coreInner = new THREE.Group(); core.add(coreInner);
const icoGeo = new THREE.IcosahedronGeometry(1.15, 1);
const wire = new THREE.LineSegments(
  new THREE.EdgesGeometry(icoGeo),
  new THREE.LineBasicMaterial({color:0xff7a1a, transparent:true, opacity:0.95})
);
coreInner.add(wire);
const solid = new THREE.Mesh(icoGeo, new THREE.MeshBasicMaterial({color:0xff5a00, transparent:true, opacity:0.10, blending:THREE.AdditiveBlending, depthWrite:false}));
coreInner.add(solid);
const innerPts = new THREE.Points(icoGeo, new THREE.PointsMaterial({color:0xffc37a,size:0.035,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false}));
coreInner.add(innerPts);
const coreGlow = addGlow(core,0,0,0,5.2,0.55);
addGlow(scene,0,-2.6,-1.5,7,0.28,0xff5a00); // floor bounce

const rings=[];
[[1.9,0.32,0.012],[2.35,-0.28,0.010],[2.8,0.9,0.008]].forEach(([r,tilt,op],i)=>{
  const g=new THREE.Group();
  const t=new THREE.Mesh(new THREE.TorusGeometry(r,0.008,8,140),
    new THREE.MeshBasicMaterial({color:i===1?0xffc37a:0xff6a00,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false}));
  const tick=new THREE.Mesh(new THREE.TorusGeometry(r,0.02,6,64,0.5),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  g.add(t,tick); g.rotation.x=Math.PI/2+tilt; g.userData.spd=(i%2?-1:1)*(0.25+i*0.14);
  core.add(g); rings.push(g);
});

/* orbiting satellites */
const sats=[];
for(let i=0;i<10;i++){
  const s=new THREE.Mesh(new THREE.OctahedronGeometry(0.06),
    new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  s.userData={a:Math.random()*Math.PI*2, r:1.9+Math.random()*1.3, h:(Math.random()-0.5)*2.2, sp:0.3+Math.random()*0.5};
  addGlow(s,0,0,0,0.5,0.5); core.add(s); sats.push(s);
}

/* ---- particle field ---- */
const P=1700;
const pGeo=new THREE.BufferGeometry();
const pp=new Float32Array(P*3), pv=new Float32Array(P);
for(let i=0;i<P;i++){ pp[i*3]=(Math.random()-0.5)*14; pp[i*3+1]=(Math.random()-0.5)*12; pp[i*3+2]=(Math.random()-0.5)*8-1; pv[i]=0.1+Math.random()*0.5; }
pGeo.setAttribute('position', new THREE.BufferAttribute(pp,3));
const pts=new THREE.Points(pGeo, new THREE.PointsMaterial({color:0xff8a3a,size:0.028,transparent:true,opacity:0.75,blending:THREE.AdditiveBlending,depthWrite:false}));
scene.add(pts);

/* ---- technical grid floor ---- */
const grid=new THREE.GridHelper(30,60,0xff6a00,0x3a1c05);
grid.material.transparent=true; grid.material.opacity=0.22; grid.position.y=-2.9; scene.add(grid);
const grid2=new THREE.GridHelper(30,30,0xffb347,0x2a1503);
grid2.material.transparent=true; grid2.material.opacity=0.10; grid2.position.y=-2.88; scene.add(grid2);

/* ---- data streams (rising curves) ---- */
const streams=new THREE.Group(); scene.add(streams);
const streamLines=[];
for(let i=0;i<22;i++){
  const x=(Math.random()-0.5)*9, z=(Math.random()-0.5)*5-1;
  const ptsArr=[]; for(let k=0;k<=20;k++) ptsArr.push(new THREE.Vector3(x+Math.sin(k*0.5+i)*0.15, -3+k*0.32, z));
  const g=new THREE.BufferGeometry().setFromPoints(ptsArr);
  const m=new THREE.LineBasicMaterial({color:i%4===0?0xffd9a0:0xff6a00,transparent:true,opacity:0.25+Math.random()*0.4,blending:THREE.AdditiveBlending,depthWrite:false});
  const l=new THREE.Line(g,m); l.userData={sp:0.6+Math.random()*1.4, off:Math.random()*10};
  streams.add(l); streamLines.push(l);
}

/* ---- volumetric light cones (fake) ---- */
const cones=new THREE.Group(); scene.add(cones);
function cone(x,z,h,op){
  const geo=new THREE.ConeGeometry(1.6,h,32,1,true);
  const mat=new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:op,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
  const m=new THREE.Mesh(geo,mat); m.position.set(x,h/2-3,z); cones.add(m); return m;
}
cone(-2.2,-1,9,0.05); cone(2.2,-1.2,9,0.05); cone(0,-2,11,0.07);

/* ---- reflection disc ---- */
const disc=new THREE.Mesh(new THREE.CircleGeometry(2.4,64),
  new THREE.MeshBasicMaterial({color:0xff6a00,transparent:true,opacity:0.10,blending:THREE.AdditiveBlending,depthWrite:false}));
disc.rotation.x=-Math.PI/2; disc.position.y=-2.89; scene.add(disc);
const discRing=new THREE.Mesh(new THREE.RingGeometry(2.4,2.46,96),
  new THREE.MeshBasicMaterial({color:0xff8a2a,transparent:true,opacity:0.5,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
discRing.rotation.x=-Math.PI/2; discRing.position.y=-2.88; scene.add(discRing);

/* ---- 3D equalizer bars (dancehall pulse) ---- */
const EQN=24;
const eqGroup=new THREE.Group(); scene.add(eqGroup);
const eqBars=[];
{
  const eqGeo=new THREE.BoxGeometry(0.13,1,0.13);
  const eqMat=new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false});
  for(let i=0;i<EQN;i++){
    const b=new THREE.Mesh(eqGeo,eqMat);
    b.position.set((i-(EQN-1)/2)*0.28, -2.2, -1.4-Math.abs(i-(EQN-1)/2)*0.05);
    b.scale.y=0.15; eqGroup.add(b); eqBars.push(b);
  }
}

/* ============ TIMELINE / SCENES — 10 x 6s = 60s ============ */
const SCENES=[
  { dur:6, tag:'SC 01 / 10', zone:'top', music:false, lyric:'',
    html:`<div class="kicker">01 · ORIGIN</div><div class="headline">MACHINE<br><span class="org">INTELLI</span><br><span class="thin">GENCE</span></div><div class="sub">Every thought begins in darkness. A core of pure mathematics wakes up.</div>`,
    narr:`Every thought begins in <b>darkness</b> — a core of pure mathematics waking up.`,
    cam:{p:[0,0.4,7.2], t:[0,0,0]}, core:0.45, rot:0.25, streams:0.2 },
  { dur:6, tag:'SC 02 / 10', zone:'mid', music:false, lyric:'',
    html:`<div class="kicker">02 · EMERGENCE</div><div class="stat-giant">175<em>B</em></div><div class="stat-label">PARAMETERS · WIREFRAME SYNTHESIS</div><div class="sub">Billions of connections ignite — a holographic brain emerging from the void.</div>`,
    narr:`<b>175 billion</b> parameters ignite — a holographic mind emerging from the void.`,
    cam:{p:[1.6,0.9,5.2], t:[0,0.1,0]}, core:1.0, rot:0.7, streams:0.7 },
  { dur:6, tag:'SC 03 / 10', zone:'bottom', music:false, lyric:'',
    html:`<div class="kicker">03 · DATA STREAMS</div><div class="headline" style="font-size:clamp(30px,9vw,48px)">LEARNING<br><span class="outline">AT LIGHT</span><br><span class="org">SPEED</span></div><div class="holo-card"><svg viewBox="0 0 300 74" preserveAspectRatio="none"><defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#ff6a00"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient></defs><g stroke="rgba(255,150,60,.25)" stroke-width="1"><line x1="0" y1="18" x2="300" y2="18"/><line x1="0" y1="37" x2="300" y2="37"/><line x1="0" y1="56" x2="300" y2="56"/></g><polyline id="graph" points="0,60 30,55 60,48 90,50 120,36 150,38 180,24 210,28 240,14 270,18 300,6" fill="none" stroke="url(#lg)" stroke-width="2.5"/></svg><div class="holo-row"><span>▲ LOSS −94.2%</span><span>40× FASTER</span></div></div>`,
    narr:`Data streams converge. The model learns <b>40× faster</b> with every cycle.`,
    cam:{p:[-2.2,0.2,4.6], t:[0,0.2,0]}, core:0.9, rot:1.1, streams:1.6 },
  { dur:6, tag:'SC 04 / 10', zone:'top', music:false, lyric:'',
    html:`<div class="kicker">04 · PRECISION</div><div class="stat-giant">99<em>.98%</em></div><div class="stat-label">ACCURACY · VERIFIED REASONING</div><div class="sub">Rotating geometry validates every answer. No guessing — only proof.</div>`,
    narr:`Rotating geometry validates each answer — <b>99.98%</b> verified precision.`,
    cam:{p:[0,-1.4,5.4], t:[0,-0.2,0]}, core:1.15, rot:0.5, streams:0.9 },
  { dur:6, tag:'SC 05 / 10', zone:'bottom', music:false, lyric:'',
    html:`<div class="kicker">05 · NEURAL FIELD</div><div class="headline" style="font-size:clamp(30px,9vw,48px)">THOUGHT<br><span class="org">MADE VISIBLE</span></div><div class="sub">Thousands of particles. One mind. Intelligence you can walk through.</div>`,
    narr:`Thousands of signals become <b>one mind</b> — thought, made visible.`,
    cam:{p:[0,2.2,3.4], t:[0,0,0]}, core:0.8, rot:1.4, streams:1.2 },
  { dur:6, tag:'SC 06 / 10 · ♫', zone:'mid', music:true,
    lyric:'Silicon queen rise from the dark — me heart beat inna di circuit spark!',
    html:`<div class="kicker">06 · RIDDIM BREAKDOWN ♫</div><div class="stat-giant">98<em>BPM</em></div><div class="stat-label">DANCEHALL RIDDIM · DEM BOW GROOVE</div><div class="eqbars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="sub">The core finds its groove — every calculation lands on the beat.</div>`,
    narr:`Then the machine finds its <b>rhythm</b> — a 98 BPM dancehall riddim driving every calculation.`,
    cam:{p:[2.0,0.4,4.4], t:[0,0.1,0]}, core:1.0, rot:1.6, streams:1.0 },
  { dur:6, tag:'SC 07 / 10 · ♫', zone:'top', music:true,
    lyric:'Twelve trillion words, me read dem all — forty times round, me never fall!',
    html:`<div class="kicker">07 · TRAINING ♫</div><div class="stat-giant">12<em>T</em></div><div class="stat-label">TOKENS · 40 EPOCHS OF STUDY</div><div class="sub">Twelve trillion words read, forty full passes — homework no human could finish.</div>`,
    narr:`<b>Twelve trillion</b> tokens. Forty full epochs — homework no human could ever finish.`,
    cam:{p:[-1.8,1.2,4.8], t:[0,0,0]}, core:1.1, rot:0.8, streams:1.4 },
  { dur:6, tag:'SC 08 / 10 · ♫', zone:'bottom', music:true,
    lyric:'Me sing di data so di whole world see — technology whine, come dance wid me!',
    html:`<div class="kicker">08 · HER VOICE ♫</div><div class="headline" style="font-size:clamp(30px,9vw,48px)">SHE SINGS<br><span class="outline">THE</span> <span class="org">DATA</span></div><div class="sub">A female voice tuned to the riddim — she sings what the numbers mean.</div>`,
    narr:`And then <b>she sings</b> — a female voice riding the riddim, turning raw data into melody.`,
    cam:{p:[0,-0.6,5.8], t:[0,0,0]}, core:0.95, rot:1.0, streams:1.0 },
  { dur:6, tag:'SC 09 / 10 · ♫', zone:'mid', music:true,
    lyric:'Whine! Neural queen, light up di night — black and gold, we glowing bright!',
    html:`<div class="kicker">09 · CHORUS — SING IT ♫</div><div class="headline">NEURAL<br><span class="org">QUEEN</span> <span class="thin">WHINE</span></div><div class="holo-row" style="margin-top:12px"><span>♫ CHORUS</span><span>24/7 ON REPEAT</span></div><div class="eqbars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>`,
    narr:`The chorus hits — knowledge on <b>repeat</b>, twenty-four seven, and the whole lab is dancing.`,
    cam:{p:[0,1.6,4.2], t:[0,0,0]}, core:1.3, rot:1.8, streams:1.8 },
  { dur:6, tag:'SC 10 / 10', zone:'mid', music:false,
    lyric:'From dark to light, we reach di top — neural queen, she never stop!',
    html:`<div class="kicker">10 · FUTURE</div><div class="headline">THIS IS<br><span class="thin">ONLY THE</span><br><span class="org">BEGINNING</span></div><div class="sub">Sixty seconds. One queen. The future fits in 9:16 — replay and whine again.</div>`,
    narr:`<b>Sixty seconds</b> from darkness to light — and this is only the beginning.`,
    cam:{p:[0,0.5,8.2], t:[0,0.1,0]}, core:1.25, rot:0.35, streams:0.5 },
];
const TOTAL = SCENES.reduce((a,s)=>a+s.dur,0); // 60

let tGlobal=0, playing=false, started=false;
let camPos=new THREE.Vector3(0,0.4,7.2), camTgt=new THREE.Vector3(0,0,0);
const capEl=document.getElementById('caption'), capInner=document.getElementById('caption-inner'),
  narrEl=document.getElementById('narr-text'), lyrEl=document.getElementById('lyrics-text'), lyrWrap=document.getElementById('lyrics'),
  bar=document.getElementById('bar'), tag=document.getElementById('scene-tag'), timeEl=document.getElementById('time');

function sceneAt(t){
  let acc=0;
  for(let i=0;i<SCENES.length;i++){ if(t<acc+SCENES[i].dur) return {i, local:(t-acc)/SCENES[i].dur, start:acc}; acc+=SCENES[i].dur; }
  return {i:SCENES.length-1, local:1, start:acc-SCENES[SCENES.length-1].dur};
}
let curIdx=-1;
function setScene(i){
  curIdx=i; const s=SCENES[i];
  capEl.className='caption-zone '+s.zone;
  capInner.innerHTML=s.html;
  capInner.style.animation='none'; void capInner.offsetWidth; capInner.style.animation='';
  narrEl.innerHTML='❝ '+s.narr;
  tag.textContent=s.tag;
  if(s.lyric){ lyrWrap.classList.add('show'); lyrEl.innerHTML='♫ <b>'+s.lyric+'</b>'; }
  else { lyrWrap.classList.remove('show'); }
  stage.classList.add('glitching'); clearTimeout(setScene._t);
  setScene._t=setTimeout(()=>stage.classList.remove('glitching'),300);
  blip();
  if(songOn && s.lyric && started && playing) singLyric(s.lyric);
  else if(voiceOn && started && playing){ lastSpoken=i; speak(i); }
}
function fmt(t){ t=Math.min(t,TOTAL); const m=Math.floor(t/60), s=Math.floor(t%60); return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }

/* ============ AUDIO: ambient pad + dancehall riddim ============ */
const BPM=98, SPB=60/BPM;
let AC=null, master=null, musicBus=null, delaySend=null, noiseBuf=null, songTimer=null, nextStepT=0, stepIdx=0;
let soundOn=true, songOn=true;
function initAudio(){
  if(AC) return;
  AC=new (window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain(); master.gain.value=0.09; master.connect(AC.destination);
  const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=420; lp.connect(master);
  [[55,'sine',1],[110,'sawtooth',0.18],[164.8,'sawtooth',0.12],[220,'triangle',0.1]].forEach(([f,ty,g])=>{
    const o=AC.createOscillator(), gn=AC.createGain(); o.type=ty; o.frequency.value=f; gn.gain.value=g;
    const lfo=AC.createOscillator(), lg=AC.createGain(); lfo.frequency.value=0.07+Math.random()*0.1; lg.gain.value=f*0.01;
    lfo.connect(lg); lg.connect(o.frequency); o.connect(gn); gn.connect(lp); o.start(); lfo.start();
  });
  const lfo2=AC.createOscillator(), lg2=AC.createGain(); lfo2.frequency.value=0.1; lg2.gain.value=200;
  lfo2.connect(lg2); lg2.connect(lp.frequency); lfo2.start();
  // dancehall bus
  musicBus=AC.createGain(); musicBus.gain.value=0.5; musicBus.connect(AC.destination);
  const delay=AC.createDelay(1); delay.delayTime.value=SPB*0.75;
  const fb=AC.createGain(); fb.gain.value=0.32; delay.connect(fb); fb.connect(delay);
  const wet=AC.createGain(); wet.gain.value=0.25; delay.connect(wet); wet.connect(musicBus);
  delaySend=delay;
  noiseBuf=AC.createBuffer(1, AC.sampleRate*0.5, AC.sampleRate);
  const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  nextStepT=AC.currentTime+0.1; stepIdx=0;
  songTimer=setInterval(scheduleSong, 90);
}
function kick(t){
  const o=AC.createOscillator(), g=AC.createGain();
  o.type='sine'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(42,t+0.11);
  g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.24);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t+0.26);
}
function snare(t){
  const n=AC.createBufferSource(); n.buffer=noiseBuf;
  const f=AC.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1900; f.Q.value=0.8;
  const g=AC.createGain(); g.gain.setValueAtTime(0.55,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.16);
  n.connect(f); f.connect(g); g.connect(musicBus); n.start(t); n.stop(t+0.18);
  const o=AC.createOscillator(), g2=AC.createGain(); o.type='triangle'; o.frequency.value=190;
  g2.gain.setValueAtTime(0.35,t); g2.gain.exponentialRampToValueAtTime(0.001,t+0.1);
  o.connect(g2); g2.connect(musicBus); o.start(t); o.stop(t+0.12);
}
function hat(t,open){
  const n=AC.createBufferSource(); n.buffer=noiseBuf;
  const f=AC.createBiquadFilter(); f.type='highpass'; f.frequency.value=7200;
  const g=AC.createGain(); const dur=open?0.16:0.05;
  g.gain.setValueAtTime(open?0.22:0.16,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  n.connect(f); f.connect(g); g.connect(musicBus); n.start(t); n.stop(t+dur+0.02);
}
function bass(t,fr,dur){
  const o=AC.createOscillator(), g=AC.createGain(), f=AC.createBiquadFilter();
  o.type='sawtooth'; o.frequency.value=fr; f.type='lowpass'; f.frequency.setValueAtTime(420,t); f.frequency.exponentialRampToValueAtTime(120,t+dur);
  g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t+dur+0.02);
}
function skank(t,freqs){
  freqs.forEach(fr=>{
    const o=AC.createOscillator(), g=AC.createGain(); o.type='triangle'; o.frequency.value=fr;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.22,t+0.015); g.gain.exponentialRampToValueAtTime(0.001,t+0.19);
    o.connect(g); g.connect(musicBus); if(delaySend){ g.connect(delaySend); }
    o.start(t); o.stop(t+0.22);
  });
}
function lead(t,fr,dur){
  const o=AC.createOscillator(), g=AC.createGain(), vib=AC.createOscillator(), vg=AC.createGain();
  o.type='square'; o.frequency.value=fr; vib.frequency.value=6; vg.gain.value=fr*0.012;
  vib.connect(vg); vg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.16,t+0.03); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g); g.connect(musicBus); g.connect(delaySend);
  o.start(t); vib.start(t); o.stop(t+dur+0.02); vib.stop(t+dur+0.02);
}
// 2-bar dem-bow-ish loop, 16 eighth-steps
const KICK_STEPS=new Set([0,7,8,14]);
const SNARE_STEPS=new Set([4,12]);
const BASS_ROOTS=[55,55,43.65,49]; // A1 A1 F1 G1 per bar
const SKANK_CHORDS=[[220,261.63,329.63],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];
const LEAD_PHRASE=[440,523.25,587.33,659.25,783.99,880,783.99,659.25];
function scheduleSong(){
  if(!AC) return;
  if(!(playing&&started&&songOn&&soundOn)) { nextStepT=Math.max(nextStepT, AC.currentTime+0.1); return; }
  const stepDur=SPB/2;
  while(nextStepT < AC.currentTime+0.45){
    const pos=stepIdx%16, bar=Math.floor(stepIdx/16)%4;
    const t=nextStepT;
    try{
      if(KICK_STEPS.has(pos)) kick(t);
      if(SNARE_STEPS.has(pos)) snare(t);
      hat(t, pos%4===2);
      if(pos%2===0) bass(t, BASS_ROOTS[bar], stepDur*1.8);
      if(pos%2===1) skank(t, SKANK_CHORDS[bar]);
      const cur=SCENES[curIdx]||{};
      if(cur.music && pos%4===0) lead(t, LEAD_PHRASE[(stepIdx/4|0)%LEAD_PHRASE.length], stepDur*3.2);
    }catch(e){}
    nextStepT+=stepDur; stepIdx++;
  }
}
function blip(){
  if(!AC||!soundOn) return;
  const o=AC.createOscillator(), g=AC.createGain(); o.type='sine';
  o.frequency.setValueAtTime(880,AC.currentTime); o.frequency.exponentialRampToValueAtTime(220,AC.currentTime+0.25);
  g.gain.setValueAtTime(0.25,AC.currentTime); g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.3);
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime+0.32);
}

/* narration (deep) + female dancehall vocal */
let voiceOn=false, lastSpoken=-1;
function speak(i){
  try{
    const txt=SCENES[i].narr.replace(/<[^>]+>/g,'');
    const u=new SpeechSynthesisUtterance(txt); u.rate=0.92; u.pitch=0.5; u.volume=1;
    const vs=speechSynthesis.getVoices().filter(v=>v.lang.startsWith('en'));
    const deep=vs.find(v=>/daniel|google uk english male|david|alex/i.test(v.name))||vs[0];
    if(deep) u.voice=deep;
    speechSynthesis.speak(u);
  }catch(e){}
}
function pickFemale(){
  try{
    const vs=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('en'));
    return vs.find(v=>/google us english|google uk english female|samantha|zira|karen|moira|tessa|fiona|veena|victoria|serena/i.test(v.name))
      || vs.find(v=>/female/i.test(v.name)) || vs[0] || null;
  }catch(e){ return null; }
}
function singLyric(line){
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(line); u.rate=1.02; u.pitch=1.5; u.volume=1;
    const f=pickFemale(); if(f) u.voice=f;
    speechSynthesis.speak(u);
  }catch(e){}
}
try{ if(typeof speechSynthesis!=='undefined') speechSynthesis.onvoiceschanged=()=>{}; }catch(e){}

/* ============ CONTROLS ============ */
const bPlay=document.getElementById('b-play'), bR=document.getElementById('b-restart'),
  bS=document.getElementById('b-sound'), bV=document.getElementById('b-voice'), bSong=document.getElementById('b-song'),
  gate=document.getElementById('gate'), toast=document.getElementById('toast');
function showToast(m){ toast.textContent=m; toast.style.opacity=1; clearTimeout(showToast._t); showToast._t=setTimeout(()=>toast.style.opacity=0,1800); }
function startFilm(){
  initAudio(); if(AC&&AC.state==='suspended') AC.resume();
  started=true; playing=true; gate.classList.add('hide'); bPlay.textContent='❚❚ PAUSE';
  const s=SCENES[Math.max(0,curIdx)];
  if(songOn && s.lyric) singLyric(s.lyric); else if(voiceOn) speak(Math.max(0,curIdx));
}
document.getElementById('play-big').addEventListener('click',startFilm);
bPlay.onclick=()=>{ if(!started){startFilm();return;} playing=!playing; bPlay.textContent=playing?'❚❚ PAUSE':'▶ PLAY';
  if(!playing){ try{speechSynthesis.cancel()}catch(e){} }
  else { const s=SCENES[curIdx]; if(songOn&&s.lyric) singLyric(s.lyric); else if(voiceOn) speak(curIdx); } };
bR.onclick=()=>{ tGlobal=0; curIdx=-1; stepIdx=0; if(!started) startFilm(); else {playing=true;bPlay.textContent='❚❚ PAUSE';} showToast('↺ RESTARTING 60S FILM'); };
bS.onclick=()=>{ soundOn=!soundOn; if(master) master.gain.value=soundOn?0.09:0; bS.textContent=soundOn?'♪ AMBIENT: ON':'♪ AMBIENT: OFF'; };
bV.onclick=()=>{ voiceOn=!voiceOn; bV.textContent=voiceOn?'VOICE: ON':'VOICE: OFF';
  if(voiceOn){ initAudio(); showToast('DEEP NARRATION ENABLED'); if(!(songOn&&(SCENES[Math.max(0,curIdx)].lyric))) speak(Math.max(0,curIdx)); } else { try{speechSynthesis.cancel()}catch(e){} } };
bSong.onclick=()=>{ songOn=!songOn; bSong.textContent=songOn?'♫ SONG: ON':'♫ SONG: OFF';
  if(songOn){ initAudio(); showToast('♫ DANCEHALL ANTHEM ON'); const s=SCENES[Math.max(0,curIdx)]; if(s.lyric&&(started&&playing)) singLyric(s.lyric); }
  else { try{speechSynthesis.cancel()}catch(e){} showToast('♫ SONG MUTED'); } };
stage.addEventListener('dblclick',()=>{ // tap-friendly fullscreen feel: cinematic punch-in
  camera.fov=Math.max(32,camera.fov-8); camera.updateProjectionMatrix();
  setTimeout(()=>{camera.fov=55;camera.updateProjectionMatrix();},600);
});

/* ============ RESIZE ============ */
function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;
  renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();

/* ============ ANIMATE ============ */
const clock=new THREE.Clock();
let coreScale=0.15;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05);
  const time=clock.elapsedTime;

  if(playing&&started){
    tGlobal+=dt;
    if(tGlobal>=TOTAL){ tGlobal=0; curIdx=-1; stepIdx=0; } // loop
  }
  const {i}=sceneAt(tGlobal);
  if(i!==curIdx&&(started)){ setScene(i); }
  if(!started&&curIdx===-1){ // idle preview behind gate
    coreInner.rotation.y+=dt*0.3; coreInner.rotation.x+=dt*0.1;
  }
  const S=SCENES[i];
  const beatT=time*BPM/60, beatPhase=beatT%1;
  const pulse=Math.pow(1-beatPhase,2); // 1 on the downbeat
  const grooving=(playing&&started&&songOn&&soundOn&&S.music)?1:0;
  // ease core scale + beat bounce on music scenes
  coreScale += ((S.core||1)-coreScale)*Math.min(1,dt*1.6);
  core.scale.setScalar(Math.max(0.001,coreScale*(1+pulse*0.08*grooving)));
  // rotation
  coreInner.rotation.y+=dt*(S.rot||0.5);
  coreInner.rotation.x+=dt*(S.rot||0.5)*0.35;
  rings.forEach((r)=>{ r.rotation.z+=dt*r.userData.spd*(S.rot+0.4+pulse*grooving*0.8); });
  sats.forEach(s=>{ const u=s.userData; u.a+=dt*u.sp*(0.5+S.rot); s.position.set(Math.cos(u.a)*u.r, u.h+Math.sin(time*0.8+u.a)*0.3, Math.sin(u.a)*u.r*0.6); });
  // particles drift
  const pos=pGeo.attributes.position.array;
  for(let k=0;k<P;k++){ pos[k*3+1]+=dt*pv[k]*(0.3+S.streams); if(pos[k*3+1]>6) pos[k*3+1]=-6; }
  pGeo.attributes.position.needsUpdate=true;
  pts.rotation.y+=dt*0.02;
  // streams
  streamLines.forEach((l)=>{ l.position.y=Math.sin(time*l.userData.sp+l.userData.off)*0.4; l.material.opacity=0.15+0.35*Math.abs(Math.sin(time*0.7+l.userData.off))*(0.4+S.streams*0.5); });
  // glow pulse (extra thump on groove)
  coreGlow.material.opacity=0.45+Math.sin(time*2.2)*0.12+pulse*0.15*grooving;
  disc.material.opacity=0.08+Math.sin(time*1.6)*0.03;
  grid.position.z=Math.sin(time*0.2)*0.3;
  // EQ bars dance to the beat
  for(let k=0;k<EQN;k++){
    const e=(0.25+0.75*Math.abs(Math.sin(time*2.1+k*0.65)*Math.sin(time*0.9+k*1.7)));
    const target=grooving? (0.15+e*(0.9+pulse*1.6)) : 0.12+e*0.25;
    const b=eqBars[k]; b.scale.y+=(target-b.scale.y)*Math.min(1,dt*10);
    b.position.y=-2.2+b.scale.y/2;
  }
  eqGroup.visible=(playing&&started)?true:true;

  // camera cinematic move: lerp to target + slow drift
  const target=new THREE.Vector3(...S.cam.p);
  const look=new THREE.Vector3(...S.cam.t);
  const ease=1-Math.pow(0.0018,dt); // smooth
  camPos.lerp(target,ease*0.9); camTgt.lerp(look,ease*0.9);
  const driftAmp=0.12;
  camera.position.set(camPos.x+Math.sin(time*0.4)*driftAmp, camPos.y+Math.cos(time*0.33)*driftAmp*0.6, camPos.z);
  camera.lookAt(camTgt);

  // UI
  bar.style.width=(tGlobal/TOTAL*100)+'%';
  timeEl.textContent=fmt(tGlobal)+' / '+fmt(TOTAL);

  renderer.render(scene,camera);
}
// initial caption so first screenshot is never blank
setScene(0); curIdx=0; tGlobal=0.01; playing=false;
animate();

// test/scrub hook (harmless in production)
window.__film={ get t(){return tGlobal;}, set t(v){ tGlobal=Math.max(0,Math.min(TOTAL-0.01,v)); curIdx=-1; }, get total(){return TOTAL;} };
