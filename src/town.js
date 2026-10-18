import * as THREE from '../vendor/three.module.js';
import { BIOMES } from './planet.js';
// Step 2: building, light resource sim, walking people, autosave.
const SAVE_KEY='planetBuilder.v1', MAX_PEOPLE=60, REACH=0.28; // REACH = angular radius (rad) for farm/well service
const TOOLS=[{id:'look',icon:'👀',label:'Look'},{id:'house',icon:'🏠',label:'House'},{id:'farm',icon:'🌾',label:'Farm'},{id:'well',icon:'💧',label:'Well'},{id:'road',icon:'🛣️',label:'Road'}];
const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.7,...o});
const M={walls:['#ffd9c2','#ffe9b8','#d8f0e0','#ffd0dc'].map(c=>mat(c,{emissive:c,emissiveIntensity:.22})),roofs:['#f0645f','#ff8a5c','#e9557a'].map(c=>mat(c)),
  door:mat('#a8603a'),win:mat('#fff3a8',{emissive:'#ffd36b',emissiveIntensity:.5}),trim:mat('#ffffff'),chim:mat('#e7a48f'),
  soil:mat('#c98a52'),crop:mat('#8fd13c'),wheat:mat('#ffd34d'),fence:mat('#b5653f'),stone:mat('#b3a8cc'),water:mat('#49c2ff',{roughness:.2}),wood:mat('#b5653f'),
  road:mat('#e9d3a8'),dash:mat('#ffffff'),flower:mat('#ff7eb6'),bush:mat('#6dbd36'),shadow:new THREE.MeshBasicMaterial({color:'#0a2a40',transparent:true,opacity:.22,depthWrite:false})};
function mk(geo,m,y=0,x=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);return o;}
const G={box:new THREE.BoxGeometry(1,1,1),barrel:new THREE.CylinderGeometry(.5,.5,1,14,1,false,0,Math.PI),cyl:new THREE.CylinderGeometry(.5,.5,1,16),
  ring:new THREE.TorusGeometry(.42,.1,8,18),sph:new THREE.SphereGeometry(.5,12,8),cone:new THREE.ConeGeometry(.6,.5,4),disc:new THREE.CircleGeometry(.5,20)};
G.barrel.rotateZ(Math.PI/2);G.barrel.rotateY(Math.PI/2);G.ring.rotateX(Math.PI/2);G.disc.rotateX(-Math.PI/2);
// Angular footprint radius (radians on the planet) per type, used to prevent overlaps
export const FOOT={house:0.017,farm:0.025,well:0.011,road:0.009};
function house(g,ox,oz,w,h,d,level,seed){
  const wall=M.walls[seed%4],roof=M.roofs[seed%3];
  const b=mk(G.box,wall,h/2,ox,oz);b.scale.set(w,h,d);g.add(b);
  const r=mk(G.barrel,roof,h,ox,oz);r.scale.set(w*1.12,d*0.62,d*1.12);g.add(r); // rounded roof
  const dr=mk(G.box,M.door,.15,ox,oz+d/2+.005);dr.scale.set(.14,.3,.02);g.add(dr);
  const floors=Math.max(1,Math.round(h/.4));
  for(let f=0;f<floors;f++)for(const sx of [-1,1]){const wy=f===0?.22:.22+f*.36;
    const wi=mk(G.box,M.win,wy,ox+sx*w*.3,oz+d/2+.006);wi.scale.set(.12,.12,.02);g.add(wi);
    const ws=mk(G.box,M.win,wy,ox+w/2+.006,oz+sx*d*.22);ws.scale.set(.02,.12,.12);g.add(ws);}
  const ch=mk(G.box,M.chim,h+.25,ox+w*.28,oz-d*.15);ch.scale.set(.1,.25,.1);g.add(ch);
}
function buildMesh(type,level,seed=0){
  const g=new THREE.Group(),s=0.18;
  const sh=mk(G.disc,M.shadow,.012);sh.scale.setScalar(type==='farm'?2.2:type==='road'?0:1.5);if(type!=='road')g.add(sh);
  if(type==='house'){
    if(level===1)house(g,0,0,.62,.42,.5,1,seed);
    else if(level===2)house(g,0,0,.66,.8,.52,2,seed);
    else{house(g,-.08,0,.56,1.15,.5,3,seed);house(g,.3,.15,.34,.42,.32,1,seed+1); // tall house + small annex, same footprint
      const bu=mk(G.sph,M.bush,.08,-.35,.33);bu.scale.set(.2,.16,.2);g.add(bu);}
    if(level>=2){for(const x of [-.25,.25]){const f=mk(G.sph,M.flower,.05,x,.34);f.scale.setScalar(.09);g.add(f);}}}
  else if(type==='farm'){const f=mk(G.box,M.soil,.03);f.scale.set(1.5,.06,1.1);g.add(f);
    for(let i=-2;i<=2;i++){const r=mk(G.box,M.crop,.1,i*.26);r.scale.set(.14,.1,.95);g.add(r);
      for(let j=-1;j<=1;j++){const w=mk(G.sph,i%2?M.wheat:M.crop,.17,i*.26,j*.3);w.scale.set(.13,.12,.13);g.add(w);}}
    for(const z of [-.58,.58])for(let x=-.7;x<=.71;x+=.35){const p=mk(G.box,M.fence,.08,x,z);p.scale.set(.04,.16,.04);g.add(p);}
    for(const z of [-.58,.58]){const rl=mk(G.box,M.fence,.12,0,z);rl.scale.set(1.45,.03,.03);g.add(rl);}}
  else if(type==='well'){const b=mk(G.cyl,M.stone,.14);b.scale.set(.7,.28,.7);g.add(b);const rim=mk(G.ring,M.stone,.28);rim.scale.setScalar(.85);g.add(rim);
    const w=mk(G.cyl,M.water,.27);w.scale.set(.6,.02,.6);g.add(w);
    for(const x of [-.32,.32]){const p=mk(G.box,M.wood,.5,x);p.scale.set(.06,.6,.06);g.add(p);}
    const bar=mk(G.cyl,M.wood,.66);bar.rotation.z=Math.PI/2;bar.scale.set(.05,.7,.05);g.add(bar);
    for(const sg of [-1,1]){const r=mk(G.box,M.roofs[0],.82,0,sg*.15);r.rotation.x=sg*0.6;r.scale.set(.9,.04,.38);g.add(r);}
    const rp=mk(G.box,M.wood,.93);rp.scale.set(.92,.05,.05);g.add(rp);
    const bk=mk(G.cyl,M.wood,.45);bk.scale.set(.12,.12,.12);g.add(bk);}
  else if(type==='road'){const r=mk(G.box,M.road,.02);r.scale.set(1.2,.04,.5);g.add(r);
    for(const x of [-.35,0,.35]){const d=mk(G.box,M.dash,.045,x);d.scale.set(.16,.01,.05);g.add(d);}}
  g.scale.setScalar(s);return g;
}
export function createTown(game){
  const {planet,camera,renderer,controls}=game,root=new THREE.Group();planet.group.add(root);
  const buildings=[];let tool='look',time=0,saveT=0,simT=0;
  const up=new THREE.Vector3(0,1,0);
  // --- HUD / toolbar ---
  const css=document.createElement('style');css.textContent=`#bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:8px;background:#0b2f5aaa;padding:8px;border-radius:24px;box-shadow:0 6px 20px #0004;z-index:5}
#bar button{width:68px;height:68px;border:3px solid transparent;border-radius:16px;background:#ffffffdd;font-size:28px;line-height:1;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation}
#bar button span{font-size:12px;font-weight:bold;color:#333;margin-top:2px}#bar button.on{border-color:#ffd23f;background:#fff8d0;transform:scale(1.08)}
#pop{position:fixed;top:10px;right:10px;color:#fff;background:#0b2f5a99;padding:8px 14px;border-radius:12px;font-size:18px;font-weight:bold}
#toast{position:fixed;top:60px;left:50%;transform:translateX(-50%);color:#fff;background:#c33c;padding:8px 14px;border-radius:12px;font-size:16px;opacity:0;transition:opacity .3s;pointer-events:none}
@media (max-width:420px){#bar button{width:56px;height:56px;font-size:24px}}`;document.head.appendChild(css);
  const bar=document.createElement('div');bar.id='bar';document.body.appendChild(bar);
  const pop=document.createElement('div');pop.id='pop';document.body.appendChild(pop);
  const toast=document.createElement('div');toast.id='toast';document.body.appendChild(toast);let toastT;
  const say=(m,c='#c33c')=>{toast.textContent=m;toast.style.background=c;toast.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>toast.style.opacity=0,1500);};
  const btns={};TOOLS.forEach(t=>{const b=document.createElement('button');b.innerHTML=`${t.icon}<span>${t.label}</span>`;b.onclick=()=>setTool(t.id);bar.appendChild(b);btns[t.id]=b;});
  function setTool(id){tool=id;game.spinPaused=id!=='look';Object.entries(btns).forEach(([k,b])=>b.classList.toggle('on',k===id));}
  setTool('look');
  // --- placement ---
  const tangent=(d)=>{const a=Math.abs(d.y)<.9?up:new THREE.Vector3(1,0,0);return new THREE.Vector3().crossVectors(a,d).normalize();};
  function check(type,d){
    const s=planet.getSurfaceInfo(d);
    if(s.biome===BIOMES.OCEAN)return 'Can\'t build on water! 🌊';
    if(s.biome===BIOMES.SNOW)return 'Too cold and steep up here! 🏔️';
    const t1=tangent(d),t2=new THREE.Vector3().crossVectors(d,t1),e=0.03;let maxDh=0;
    for(const t of [t1,t2]){for(const sg of [1,-1]){const h=planet.getSurfaceInfo(d.clone().addScaledVector(t,e*sg)).height;maxDh=Math.max(maxDh,Math.abs(h-s.height));}}
    if(maxDh/(e*planet.radius)>0.55)return 'Too steep! Try flatter land ⛰️';
    for(const b of buildings)if(b.dir.angleTo(d)<FOOT[type]+FOOT[b.type])return 'Too close to another building';
    return null;
  }
  function place(type,d,level=1,pop=0,silent=false){
    d=d.clone().normalize();
    if(!silent){const err=check(type,d);if(err){say(err);return null;}}
    planet.clearAround&&planet.clearAround(d,FOOT[type]+0.004);
    const b={type,dir:d,level,pop,grow:0,mesh:null,seed:buildings.length*7+((d.x*1000)|0&255),biome:planet.getSurfaceInfo(d).biome};buildings.push(b);setMesh(b);reorientRoads(b);
    if(!silent){say({house:'House built! 🏠',farm:'Farm planted! 🌾',well:'Well dug! 💧',road:'Road laid!'}[type],'#2a9d5ccc');save();}
    return b;
  }
  function setMesh(b){if(b.mesh)root.remove(b.mesh);const m=buildMesh(b.type,b.level,Math.abs(b.seed|0)),s=planet.getSurfaceInfo(b.dir);
    m.position.copy(s.point);m.quaternion.setFromUnitVectors(up,b.dir);
    if(b.type==='road')orientRoad(b,m);
    b.mesh=m;root.add(m);}
  // roads turn to follow neighbouring roads (line through the 1-2 nearest road pieces)
  const X=new THREE.Vector3(1,0,0),Z=new THREE.Vector3(0,0,1);
  function roadNbrs(b){return buildings.filter(o=>o!==b&&o.type==='road'&&o.dir.angleTo(b.dir)<0.07).sort((a,c)=>a.dir.angleTo(b.dir)-c.dir.angleTo(b.dir)).slice(0,2);}
  function orientRoad(b,m){const nb=roadNbrs(b);let t;
    if(nb.length===2)t=nb[0].dir.clone().sub(nb[1].dir);else if(nb.length===1)t=nb[0].dir.clone().sub(b.dir);else{t=tangent(b.dir);}
    t.addScaledVector(b.dir,-t.dot(b.dir));if(t.lengthSq()<1e-12)return;t.normalize();
    const q0=new THREE.Quaternion().setFromUnitVectors(up,b.dir),lx=X.clone().applyQuaternion(q0),lz=Z.clone().applyQuaternion(q0);
    m.quaternion.copy(q0);m.rotateY(Math.atan2(-t.dot(lz),t.dot(lx)));
    const len=nb.length?Math.min(.075,nb[0].dir.angleTo(b.dir))*planet.radius:0;if(len>0)m.children.forEach(c=>{c.scale.x*=Math.max(1,len/(.216*0.8));});}
  function reorientRoads(b){if(b.type!=='road')return;for(const o of roadNbrs(b))setMesh(o);}
  // tap vs drag detection
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),planetMesh=planet.land;let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{if(e.isPrimary)down={x:e.clientX,y:e.clientY,t:performance.now(),multi:false};else if(down)down.multi=true;});
  renderer.domElement.addEventListener('pointerup',e=>{if(!e.isPrimary||!down)return;const d=down;down=null;
    if(tool==='look'||d.multi||Math.hypot(e.clientX-d.x,e.clientY-d.y)>10||performance.now()-d.t>500)return;tapAt(e.clientX,e.clientY);});
  function tapAt(x,y){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);
    const hit=ray.intersectObject(planetMesh,false)[0];if(!hit)return null;
    const local=planet.group.worldToLocal(hit.point.clone()).normalize();return place(tool,local);}
  // --- sim ---
  const near=(b,type)=>buildings.some(o=>o.type===type&&o.dir.angleTo(b.dir)<REACH);
  const waterCache=new Map();
  function nearOcean(b){const k=b.dir.toArray().map(v=>v.toFixed(3)).join();if(waterCache.has(k))return waterCache.get(k);
    let r=false;const t1=tangent(b.dir),t2=new THREE.Vector3().crossVectors(b.dir,t1);
    for(let i=0;i<12&&!r;i++){const a=i/12*Math.PI*2,dd=b.dir.clone().addScaledVector(t1,Math.cos(a)*.12).addScaledVector(t2,Math.sin(a)*.12);if(planet.getSurfaceInfo(dd).biome===BIOMES.OCEAN)r=true;}
    waterCache.set(k,r);return r;}
  function simTick(dt){for(const b of buildings){if(b.type!=='house')continue;
      const food=near(b,'farm'),well=near(b,'well'),water=well||nearOcean(b);b.happy=food&&water;
      if(!b.happy){b.grow=Math.max(0,b.grow-dt*.05);continue;}
      const rate=(b.biome===BIOMES.DESERT&&!well)?0.25:1; // deserts grow slowly without wells
      b.grow+=dt*rate*0.2;
      const cap=b.level*4;if(b.grow>=1){b.grow=0;if(b.pop<cap)b.pop++;else if(b.level<3){b.level++;setMesh(b);say('A house grew bigger! 🎉','#2a9d5ccc');}}}
  }
  const population=()=>buildings.reduce((a,b)=>a+(b.pop||0),0);
  // --- people (instanced) ---
  const pg=new THREE.CapsuleGeometry(.28,.4,3,8);pg.translate(0,.48,0);const hg=new THREE.SphereGeometry(.26,12,8);hg.translate(0,1.1,0);
  const people=new THREE.InstancedMesh(pg,new THREE.MeshStandardMaterial({roughness:.6}),MAX_PEOPLE);
  const heads=new THREE.InstancedMesh(hg,new THREE.MeshStandardMaterial({color:'#ffd2a8',roughness:.6}),MAX_PEOPLE);
  for(const im of [people,heads]){im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.count=0;im.frustumCulled=false;root.add(im);}
  const pal=['#ff5e7e','#ffc93d','#9b6bff','#3fa9ff','#ff8a3d','#2ed3a0'].map(c=>new THREE.Color(c));
  for(let i=0;i<MAX_PEOPLE;i++)people.setColorAt(i,pal[i%pal.length]);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(.055,.055,.055),pos=new THREE.Vector3(),dd=new THREE.Vector3();
  function updatePeople(){let n=0;
    for(let bi=0;bi<buildings.length&&n<MAX_PEOPLE;bi++){const b=buildings[bi];if(b.type!=='house')continue;
      const t1=tangent(b.dir),t2=new THREE.Vector3().crossVectors(b.dir,t1);
      for(let k=0;k<b.pop&&n<MAX_PEOPLE;k++,n++){const ph=time*(0.3+0.07*k)+k*1.7+bi,r=0.03+0.008*(k%3);
        dd.copy(b.dir).addScaledVector(t1,Math.cos(ph)*r).addScaledVector(t2,Math.sin(ph)*r).normalize();
        pos.copy(dd).multiplyScalar(Math.max(planet.getSurfaceInfo(dd).height,planet.radius)+0.004);
        pos.addScaledVector(dd,Math.abs(Math.sin(ph*14))*0.006);q.setFromUnitVectors(up,dd);m4.compose(pos,q,sc);people.setMatrixAt(n,m4);heads.setMatrixAt(n,m4);}}
    people.count=heads.count=n;people.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;}
  // --- save/load ---
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({v:1,b:buildings.map(b=>({t:b.type,d:b.dir.toArray().map(x=>+x.toFixed(4)),l:b.level,p:b.pop}))}));}catch(e){}}
  function load(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!s)return;for(const o of s.b)place(o.t,new THREE.Vector3(...o.d),o.l||1,o.p||0,true);}catch(e){console.warn('save load failed',e);}}
  function reset(){buildings.splice(0).forEach(b=>root.remove(b.mesh));localStorage.removeItem(SAVE_KEY);}
  load();addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
  let peopleT=0;
  game.addSystem({update(dt){time+=dt;simT+=dt;saveT+=dt;peopleT+=dt;
    if(simT>=0.5){simTick(simT);simT=0;pop.textContent=`👥 ${population()}   🏠 ${buildings.filter(b=>b.type==='house').length}`;}
    if(peopleT>=1/30){updatePeople();peopleT=0;}
    if(saveT>5){save();saveT=0;}}});
  return {buildings,place,check,tapAt,setTool,save,load,reset,population,simTick};
}
