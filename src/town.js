import * as THREE from '../vendor/three.module.js';
import { BIOMES } from './planet.js';
import { buildMesh, FOOT, M, tribeMat } from './buildings.js';
import { createPeople } from './people.js';
export { FOOT };
// God-game sim: tribes build, grow, discover tech and found new villages on their own. The player helps or hinders.
const SAVE_KEY='planetBuilder.v1',MAX_PEOPLE=140,REACH=0.28,STEP=0.03;
export const TECH=[{id:'hut',need:0,name:'Huts 🛖'},{id:'house',need:60,name:'Houses 🏠'},{id:'well',need:140,name:'Wells 💧'},{id:'farm',need:260,name:'Farms 🌾'},
  {id:'road',need:450,name:'Roads 🛣️'},{id:'explore',need:700,name:'Exploring 🧭'},{id:'cinema',need:1000,name:'Cinema 🎬'},{id:'park',need:1500,name:'Amusement & Water Park 🎡'}];
const TRIBES=[{name:'Pink Tribe',color:'#ff4f8b',emoji:'🩷'},{name:'Blue Tribe',color:'#2f8dff',emoji:'💙'}];
const TOOLS=[{id:'look',icon:'👀',label:'Look'},{id:'house',icon:'🏠',label:'House'},{id:'farm',icon:'🌾',label:'Farm'},{id:'well',icon:'💧',label:'Well'},
  {id:'road',icon:'🛣️',label:'Road'},{id:'cinema',icon:'🎬',label:'Cinema'},{id:'park',icon:'🎡',label:'Park'},{id:'bulldoze',icon:'🚜',label:'Remove'}];
const NAMES={house:'House',farm:'Farm',well:'Well',road:'Road',cinema:'Cinema',park:'Fun Park'};
export function createTown(game){
  const {planet,camera,renderer,controls}=game,R=planet.radius,root=new THREE.Group();planet.group.add(root);
  const up=new THREE.Vector3(0,1,0),env=game.env;
  const buildings=[],tribes=[],undo=[];let tool='look',time=0,saveT=0,simT=0,aiT=0,nextId=1;
  const info=d=>planet.getSurfaceInfo(d);
  const tangent=d=>{const a=Math.abs(d.y)<.9?up:new THREE.Vector3(1,0,0);return new THREE.Vector3().crossVectors(a,d).normalize();};
  const rndDirNear=(c,minA,maxA)=>{const t1=tangent(c),t2=new THREE.Vector3().crossVectors(c,t1),a=Math.random()*6.283,r=minA+Math.random()*(maxA-minA);
    const q=new THREE.Quaternion().setFromAxisAngle(t1.multiplyScalar(Math.cos(a)).addScaledVector(t2,Math.sin(a)).normalize(),r);return c.clone().applyQuaternion(q).normalize();};
  // ---------- UI ----------
  const css=document.createElement('style');css.textContent=`
.ui{position:fixed;z-index:5;font-weight:bold}
#bar{left:50%;bottom:10px;transform:translateX(-50%);display:none;gap:6px;background:#0b2f5acc;padding:7px;border-radius:22px;box-shadow:0 6px 20px #0004;max-width:calc(100vw - 110px);overflow-x:auto}
#bar.open{display:flex}.big{width:64px;height:64px;flex:0 0 auto;border:3px solid transparent;border-radius:18px;background:#ffffffee;font-size:27px;line-height:1;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation;padding:0;font-family:inherit;box-shadow:0 3px 0 #0003}
.big span{font-size:11px;font-weight:bold;color:#333;margin-top:2px}.big.on{border-color:#ffd23f;background:#fff4b8;transform:scale(1.06)}.big:active{transform:scale(.92)}
#helper{left:10px;bottom:10px}#menuB{left:10px;top:10px;width:52px;height:52px}
.tribe{top:10px;background:#0b2f5acc;color:#fff;border-radius:20px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;min-width:150px;box-shadow:0 4px 14px #0004}
.tribe .hd{font-size:17px;display:flex;align-items:center;gap:6px}.tribe .dot{width:16px;height:16px;border-radius:50%;border:2px solid #fff}
.tribe .tech{font-size:12px;opacity:.9}.tribe .row{display:flex;gap:6px}.tribe .big{width:52px;height:52px;font-size:23px}.tribe .big span{font-size:10px}
.tribe .bar2{height:6px;background:#ffffff33;border-radius:3px;overflow:hidden}.tribe .bar2 i{display:block;height:100%;background:#ffd23f;width:0}
#t0{left:70px}#t1{right:10px}
#toast{left:50%;top:12px;transform:translateX(-50%);color:#fff;background:#2a9d5ccc;padding:9px 16px;border-radius:14px;font-size:17px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:9;text-align:center;max-width:70vw}
@media (max-width:640px){.big{width:54px;height:54px;font-size:23px}.tribe{min-width:0;padding:6px}.tribe .big{width:44px;height:44px;font-size:20px}.tribe .tech{display:none}#t0{left:66px}}`;
  document.head.appendChild(css);
  const el=(tag,cls,html,parent=document.body)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;parent.appendChild(e);return e;};
  const toast=el('div','ui');toast.id='toast';let toastT,toastQ=[];
  const say=(m,c='#2a9d5ccc')=>{toast.textContent=m;toast.style.background=c;toast.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>toast.style.opacity=0,2200);};
  const menuB=el('button','ui big','☰');menuB.id='menuB';menuB.onclick=()=>{save();location.reload();};
  const bar=el('div','ui');bar.id='bar';
  const helper=el('button','ui big','🛠️<span>Helper</span>');helper.id='helper';helper.onclick=()=>{bar.classList.toggle('open');helper.classList.toggle('on');if(!bar.classList.contains('open'))setTool('look');};
  const btns={};TOOLS.forEach(t=>{const b=el('button','big',`${t.icon}<span>${t.label}</span>`,bar);b.onclick=()=>setTool(t.id);btns[t.id]=b;});
  const ub=el('button','big','↩️<span>Undo</span>',bar);ub.onclick=()=>doUndo();
  function setTool(id){tool=id;pending=null;marker.visible=false;game.spinPaused=id!=='look';controls.enableRotate=id!=='road';
    Object.entries(btns).forEach(([k,b])=>b.classList.toggle('on',k===id));
    if(id==='road')say('Draw with your finger, or tap two spots 🛣️');if(id==='bulldoze')say('Tap something to remove it 🚜','#c97a1ccc');}
  // ---------- tribes ----------
  function makeTribe(i,data={}){const T={id:i,...TRIBES[i],food:data.food??20,progress:data.progress??0,tech:data.tech??0,bless:0,water:0,col:new THREE.Color(TRIBES[i].color),flagMat:tribeMat(TRIBES[i].color),settlements:(data.s||[]).map(a=>new THREE.Vector3(...a))};
    const card=el('div','ui tribe',`<div class="hd"><div class="dot" style="background:${T.color}"></div><span class="nm">${T.name}</span></div><div>👥 <b class="pp">0</b> &nbsp;🏠 <b class="hh">0</b></div>
      <div class="tech">Next: <span class="nx"></span></div><div class="bar2"><i></i></div><div class="row"></div>`);card.id='t'+i;T.card=card;
    const row=card.querySelector('.row');
    for(const [ic,lb,fn] of [['🍎','Food',()=>giftFood(T)],['💧','Water',()=>giftWater(T)],['✨','Bless',()=>giftBless(T)]]){const b=el('button','big',`${ic}<span>${lb}</span>`,row);b.onclick=fn;}
    tribes.push(T);return T;}
  const tribeOf=d=>{let best=tribes[0],ba=9;for(const b of buildings)if(b.type!=='road'){const a=b.dir.angleTo(d);if(a<ba){ba=a;best=tribes[b.tribe]||tribes[0];}}return best;};
  const tPop=T=>buildings.reduce((a,b)=>a+(b.tribe===T.id?b.pop||0:0),0);
  function center(T){const s=T.settlements[0];return s||buildings.find(b=>b.tribe===T.id)?.dir;}
  function giftFood(T){T.food+=30;const hs=buildings.filter(b=>b.tribe===T.id&&b.type==='house');for(let i=0;i<3&&hs.length;i++){const h=hs[(Math.random()*hs.length)|0];h.grow+=.9;}
    say(`🍎 ${T.name} got a big basket of food!`);fx(center(T),'#ff6b6b');}
  function giftWater(T){T.water=40;say(`💧 ${T.name} has fresh water for a while!`,'#2a7fd8cc');fx(center(T),'#5fd8ff');}
  function giftBless(T){T.bless=30;T.progress+=60;say(`✨ ${T.name} is blessed! Everything grows faster`,'#9b6bffcc');fx(center(T),'#ffe066');}
  // sparkle burst effect
  const sparkG=new THREE.BufferGeometry(),SPN=60;sparkG.setAttribute('position',new THREE.BufferAttribute(new Float32Array(SPN*3),3));
  const sparkM=new THREE.PointsMaterial({size:.12,color:'#ffe066',transparent:true,depthWrite:false});const spark=new THREE.Points(sparkG,sparkM);spark.visible=false;spark.frustumCulled=false;root.add(spark);
  let sparkT=0,sparkV=[];
  function fx(d,c){if(!d)return;sparkM.color.set(c);sparkT=2;spark.visible=true;const p=sparkG.attributes.position;sparkV=[];
    for(let i=0;i<SPN;i++){const o=rndDirNear(d,0,.06).multiplyScalar(R+.08);p.setXYZ(i,o.x,o.y,o.z);sparkV.push(d.clone().multiplyScalar(.15+Math.random()*.25).add(new THREE.Vector3().randomDirection().multiplyScalar(.05)));}p.needsUpdate=true;}
  // ---------- placement ----------
  function check(type,d,ignoreRoads=false){const s=info(d);
    if(s.biome===BIOMES.OCEAN)return 'Can\'t build on water! 🌊';if(s.biome===BIOMES.SNOW)return 'Too cold up here! 🏔️';
    if(type!=='road'){const t1=tangent(d),t2=new THREE.Vector3().crossVectors(d,t1),e=0.03;let mx=0;const span=type==='park'?.05:e;
      for(const t of [t1,t2])for(const sg of [1,-1]){const q=info(d.clone().addScaledVector(t,span*sg));if(q.biome===BIOMES.OCEAN&&FOOT[type]>.02)return 'Needs more land here';mx=Math.max(mx,Math.abs(q.height-s.height));}
      if(mx/(span*R)>0.55)return 'Too steep! Try flatter land ⛰️';}
    for(const b of buildings){if(type==='road'&&b.type==='road'){if(b.dir.angleTo(d)<STEP*.6)return 'road';continue;}
      if(ignoreRoads&&b.type==='road')continue;if(b.dir.angleTo(d)<FOOT[type]+FOOT[b.type])return 'Too close to another building';}
    return null;}
  function place(type,d,o={}){d=d.clone().normalize();if(!FOOT[type])return null;
    if(!o.silent){const err=check(type,d,o.ignoreRoads);if(err)return o.quiet?null:(say(err,'#c33c'),null);}
    if(o.ignoreRoads)for(const r of buildings.filter(b=>b.type==='road'&&b.dir.angleTo(d)<FOOT[type]+FOOT.road))remove(r);
    planet.clearAround(d,FOOT[type]+0.004);
    const b={id:nextId++,type,dir:d,level:o.level||1,pop:o.pop||0,grow:0,tribe:o.tribe??0,fwd:o.fwd||null,flag:!!o.flag,seed:(Math.random()*1e6)|0,biome:info(d).biome,linked:!!o.linked,mesh:null};
    buildings.push(b);setMesh(b);if(type==='road'&&!b.fwd)for(const n of roadNbrs(b))setMesh(n);
    if(type==='well'||type==='farm')waterCache.clear();
    return b;}
  function remove(b){const i=buildings.indexOf(b);if(i<0)return;buildings.splice(i,1);root.remove(b.mesh);}
  const X=new THREE.Vector3(1,0,0),Z=new THREE.Vector3(0,0,1);
  function setMesh(b){if(b.mesh)root.remove(b.mesh);const T=tribes[b.tribe];const m=buildMesh(b.type,b.level,b.seed,b.flag&&T?T.flagMat:null),s=info(b.dir);
    m.position.copy(s.point);m.quaternion.setFromUnitVectors(up,b.dir);
    if(b.type==='road'){let t=b.fwd;if(!t){const nb=roadNbrs(b);t=nb.length===2?nb[0].dir.clone().sub(nb[1].dir):nb.length?nb[0].dir.clone().sub(b.dir):tangent(b.dir);}
      t=t.clone().addScaledVector(b.dir,-t.dot(b.dir));if(t.lengthSq()>1e-12){t.normalize();const q0=m.quaternion.clone(),lx=X.clone().applyQuaternion(q0),lz=Z.clone().applyQuaternion(q0);m.rotateY(Math.atan2(-t.dot(lz),t.dot(lx)));}
      m.scale.x*=STEP*R*1.25/.216;}
    else m.rotateY((b.seed%628)/100);
    b.q0=m.quaternion.clone();b.mesh=m;root.add(m);}
  function roadNbrs(b){return buildings.filter(o=>o!==b&&o.type==='road'&&o.dir.angleTo(b.dir)<0.07).sort((a,c)=>a.dir.angleTo(b.dir)-c.dir.angleTo(b.dir)).slice(0,2);}
  // lay road pieces along the great circle a->b; returns pieces placed
  function layRoad(a,b,tribe,stopAtObstacle=false){const out=[],ang=a.angleTo(b);if(ang<1e-4)return out;const n=Math.max(1,Math.round(ang/STEP));
    const ax=new THREE.Vector3().crossVectors(a,b).normalize();
    for(let i=0;i<=n;i++){const p=a.clone().applyAxisAngle(ax,ang*i/n),f=new THREE.Vector3().crossVectors(ax,p);
      const err=check('road',p);if(err){if(stopAtObstacle&&err!=='road'&&i>0&&i<n)break;continue;}
      out.push(place('road',p,{silent:true,fwd:f,tribe}));}
    return out;}
  // ---------- input: tap, double tap, road drawing, bulldoze ----------
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let down=null,pointers=0,stroke=null,pending=null,lastTap=null;
  const marker=new THREE.Mesh(new THREE.TorusGeometry(.05,.012,6,20),new THREE.MeshBasicMaterial({color:'#ffd23f'}));marker.visible=false;root.add(marker);
  function hitDir(x,y){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);const h=ray.intersectObject(planet.land,false)[0];
    return h?planet.group.worldToLocal(h.point.clone()).normalize():null;}
  const snapRoad=d=>{let best=null,ba=.035;for(const b of buildings)if(b.type==='road'){const a=b.dir.angleTo(d);if(a<ba){ba=a;best=b.dir.clone();}}return best||d;};
  const cv=renderer.domElement;
  cv.addEventListener('pointerdown',e=>{pointers++;if(pointers>1){if(down)down.multi=true;stroke=null;return;}
    down={x:e.clientX,y:e.clientY,t:performance.now(),multi:false};
    if(tool==='road'){const d=hitDir(e.clientX,e.clientY);if(d)stroke={last:snapRoad(d),pieces:[],moved:false};}});
  cv.addEventListener('pointermove',e=>{if(!stroke||pointers>1)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)<12&&!stroke.moved)return;
    const d=hitDir(e.clientX,e.clientY);if(!d)return;stroke.moved=true;
    if(stroke.last.angleTo(d)>=STEP){stroke.pieces.push(...layRoad(stroke.last,d,tribeOf(d).id));stroke.last=d;}});
  const endPtr=e=>{pointers=Math.max(0,pointers-1);if(!down||!e.isPrimary)return;const d0=down;down=null;
    if(stroke){const s=stroke;stroke=null;if(s.moved){const end=hitDir(e.clientX,e.clientY);if(end){const sn=snapRoad(end);s.pieces.push(...layRoad(s.last,sn,tribeOf(sn).id));}
      if(s.pieces.length){undo.push({add:s.pieces});say('Road built! 🛣️');save();}return;}}
    if(d0.multi||Math.hypot(e.clientX-d0.x,e.clientY-d0.y)>12||performance.now()-d0.t>450)return;
    tap(e.clientX,e.clientY);};
  cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',e=>{pointers=Math.max(0,pointers-1);down=null;stroke=null;});
  function tap(x,y){const d=hitDir(x,y);if(!d)return;const now=performance.now();
    if(tool==='look'){if(lastTap&&now-lastTap.t<350&&Math.hypot(x-lastTap.x,y-lastTap.y)<40){lastTap=null;game.camui&&game.camui.flyTo(planet.group.localToWorld(d.clone()),R+2.2);}else lastTap={t:now,x,y};return;}
    if(tool==='bulldoze'){let best=null,ba=.04;for(const b of buildings){const a=b.dir.angleTo(d)-FOOT[b.type]*.5;if(a<ba){ba=a;best=b;}}
      if(best){remove(best);undo.push({del:[snap(best)]});say(`${NAMES[best.type]} removed 🚜`,'#c97a1ccc');save();}else say('Nothing here to remove','#c33c');return;}
    if(tool==='road'){const sn=snapRoad(d);if(!pending){pending=sn;marker.visible=true;marker.position.copy(sn).multiplyScalar(info(sn).point.length()+.01);marker.quaternion.setFromUnitVectors(Z,sn);say('Now tap where the road should end');}
      else{const ps=layRoad(pending,sn,tribeOf(sn).id);pending=null;marker.visible=false;if(ps.length){undo.push({add:ps});say('Road built! 🛣️');save();}else say('Can\'t build a road there','#c33c');}return;}
    const T=tribeOf(d);const b=place(tool,d,{tribe:T.id,level:tool==='house'?2:1,pop:tool==='house'?1:0});
    if(b){undo.push({add:[b]});say(`${NAMES[tool]} built! 🎉`);save();}}
  const snap=b=>({type:b.type,dir:b.dir.clone(),level:b.level,pop:b.pop,tribe:b.tribe,fwd:b.fwd,flag:b.flag,seed:b.seed});
  function doUndo(){const a=undo.pop();if(!a){say('Nothing to undo','#c33c');return;}
    if(a.add)a.add.forEach(remove);if(a.del)a.del.forEach(s=>{const b=place(s.type,s.dir,{...s,silent:true});if(b){b.seed=s.seed;setMesh(b);}});say('Undone ↩️','#555c');save();}
  // ---------- simulation ----------
  const near=(b,type,r=REACH)=>buildings.some(o=>o.type===type&&o.dir.angleTo(b.dir)<r);
  const waterCache=new Map();
  function nearOcean(d){const k=d.toArray().map(v=>v.toFixed(3)).join();if(waterCache.has('o'+k))return waterCache.get('o'+k);
    let r=false;const t1=tangent(d),t2=new THREE.Vector3().crossVectors(d,t1);
    for(let i=0;i<12&&!r;i++){const a=i/12*6.283;if(info(d.clone().addScaledVector(t1,Math.cos(a)*.12).addScaledVector(t2,Math.sin(a)*.12)).biome===BIOMES.OCEAN)r=true;}
    waterCache.set('o'+k,r);return r;}
  const capOf=b=>[0,3,6,10][b.level]+(near(b,'cinema',REACH*1.3)?2:0)+(near(b,'park',REACH*1.4)?3:0);
  function simTick(dt){
    for(const T of tribes){T.bless=Math.max(0,T.bless-dt);T.water=Math.max(0,T.water-dt);const p=tPop(T);
      T.progress+=dt*(0.5+p*0.12)*(T.bless?3:1);while(T.tech<TECH.length-1&&T.progress>=TECH[T.tech+1].need){T.tech++;
        say(`${T.emoji} ${T.name} discovered ${TECH[T.tech].name}!`,'#9b6bffcc');fx(center(T),'#ffe066');}}
    for(const b of buildings){if(b.type!=='house')continue;const T=tribes[b.tribe]||tribes[0];
      const farm=near(b,'farm'),well=near(b,'well'),water=well||T.water>0||env.rain||nearOcean(b.dir),food=farm||T.food>0;
      b.happy=food&&water;
      let rate=0.12*(food?1:.25)*(water?1:.35);if(b.biome===BIOMES.DESERT&&!well)rate*=.4;
      if(env.rain&&farm)rate*=1.8;if(env.drought>0)rate*=well?.6:.15;if(T.bless)rate*=3;
      if(near(b,'cinema',REACH*1.3))rate*=1.4;if(near(b,'park',REACH*1.4))rate*=1.7;
      b.grow+=dt*rate;if(b.grow>=1){b.grow=0;if(!farm&&T.food>0)T.food=Math.max(0,T.food-1);const cap=capOf(b);if(b.pop<cap)b.pop++;}}
  }
  // ---------- tribe AI ----------
  const has=(T,id)=>T.tech>=TECH.findIndex(t=>t.id===id);
  function spot(c,type,minA,maxA,tries=30){for(let i=0;i<tries;i++){const d=rndDirNear(c,minA,maxA);if(!check(type,d))return d;}return null;}
  function link(T,b){if(!has(T,'road')||b.linked||b.type==='road')return false;b.linked=true;
    let best=null,ba=.16;for(const o of buildings)if(o!==b&&o.tribe===b.tribe&&o.type!=='road'){const a=o.dir.angleTo(b.dir);if(a<ba){ba=a;best=o;}}
    if(!best)return false;layRoad(b.dir,best.dir,T.id,true);return true;}
  function aiTick(T){if(!T.settlements.length){const c=center(T);if(c)T.settlements.push(c.clone());else return;}
    const totalB=buildings.length;if(totalB>420)return;
    const si=(T.turn=(T.turn||0)+1)%T.settlements.length,c=T.settlements[si];
    const mine=buildings.filter(b=>b.tribe===T.id&&b.type!=='road'&&b.dir.angleTo(c)<.2),houses=mine.filter(b=>b.type==='house');
    const pop=houses.reduce((a,b)=>a+b.pop,0),cap=houses.reduce((a,b)=>a+capOf(b),0),spread=.035+Math.sqrt(houses.length)*.02;
    const build=(type,o={})=>{const d=spot(c,type,type==='house'?.03:.04,spread+.04);if(!d)return null;const b=place(type,d,{silent:true,tribe:T.id,...o});if(b)link(T,b);return b;};
    if(pop>=cap*.7&&houses.length<16){if(build('house',{level:has(T,'house')&&Math.random()<.5?2:1,pop:1}))return;}
    if(has(T,'well')&&!mine.some(b=>b.type==='well')&&!nearOcean(c)){if(build('well')){say(`${T.emoji} ${T.name} dug a well 💧`);return;}}
    if(has(T,'farm')&&mine.filter(b=>b.type==='farm').length<Math.ceil(houses.length/3)){if(build('farm')){if(mine.every(b=>b.type!=='farm'))say(`${T.emoji} ${T.name} planted a farm 🌾`);return;}}
    const up2=houses.find(h=>h.level<2&&h.pop>=capOf(h)&&has(T,'house'))||houses.find(h=>h.level===2&&h.pop>=capOf(h)&&has(T,'road')&&houses.length>=5);
    if(up2){up2.level++;setMesh(up2);return;}
    const un=mine.find(b=>!b.linked);if(un&&link(T,un))return;
    if(has(T,'cinema')&&houses.length>=5&&!mine.some(b=>b.type==='cinema')){if(build('cinema')){say(`${T.emoji} ${T.name} opened a cinema! 🎬🍿`);return;}}
    if(has(T,'park')&&houses.length>=7&&!mine.some(b=>b.type==='park')){if(build('park')){say(`${T.emoji} ${T.name} built a fun park! 🎡🎢💦`);return;}}
    if(has(T,'explore')&&houses.length>=6&&T.settlements.length<6&&Math.random()<.35){
      for(let i=0;i<25;i++){const d=rndDirNear(c,.25,.6);if(check('house',d)||tribes.some(o=>o.settlements.some(s=>s.angleTo(d)<.2)))continue;
        T.settlements.push(d);place('house',d,{silent:true,tribe:T.id,pop:2,flag:true});
        say(`🧭 Explorers from the ${T.name} found a new village!`);fx(d,'#7cff9b');return;}}
  }
  // ---------- people ----------
  const P=createPeople(root,MAX_PEOPLE);const agents=new Map();let roads=[];
  const tq=new THREE.Quaternion(),tv=new THREE.Vector3();
  function syncAgents(){const total=buildings.reduce((a,b)=>a+(b.type==='house'?b.pop:0),0),f=Math.min(1,MAX_PEOPLE/Math.max(1,total));const want=new Set();
    for(const b of buildings){if(b.type!=='house'||!b.pop)continue;const n=Math.max(1,Math.round(b.pop*f));
      for(let k=0;k<n;k++){const key=b.id+':'+k;want.add(key);if(!agents.has(key)){const dir=rndDirNear(b.dir,.005,.02);
        agents.set(key,{home:b,dir,target:dir.clone(),final:null,wait:Math.random()*2,fwd:tangent(dir),walk:0,seed:(Math.random()*1e6)|0,moving:false,speed:.018+Math.random()*.01,scale:.05,tribeColor:tribes.length>1?tribes[b.tribe]?.col:null,pos:new THREE.Vector3(),up:new THREE.Vector3()});}}}
    for(const k of agents.keys())if(!want.has(k)||!buildings.includes(agents.get(k).home))agents.delete(k);
    let i=0;for(const a of agents.values()){if(i>=MAX_PEOPLE)break;P.colorize(i++,a);}roads=buildings.filter(b=>b.type==='road');}
  const W={cinema:5,park:6,farm:2,well:1.2,house:1};
  function pickTarget(a){const h=a.home;if(Math.random()<.3){a.target=rndDirNear(a.dir,.01,.05);a.final=null;return;}
    const opts=buildings.filter(b=>b.type!=='road'&&b.dir.angleTo(h.dir)<.35);let sum=0;opts.forEach(o=>sum+=W[o.type]*(o===h?2:1));let r=Math.random()*sum,pick=h;
    for(const o of opts){r-=W[o.type]*(o===h?2:1);if(r<=0){pick=o;break;}}
    const dest=rndDirNear(pick.dir,FOOT[pick.type]*.7,FOOT[pick.type]*1.2);a.final=dest;nextWaypoint(a);}
  function nextWaypoint(a){const f=a.final;if(!f)return;const cur=a.dir.angleTo(f);let best=null,bp=.012;
    if(cur>.06)for(const r of roads){const d=r.dir.angleTo(a.dir);if(d>.06)continue;const prog=cur-r.dir.angleTo(f)-d*.4;if(prog>bp){bp=prog;best=r;}}
    if(best){a.target=best.dir.clone();a.onRoad=true;}else{a.target=f;a.final=null;a.onRoad=false;}}
  function updatePeople(dt){let i=0;
    for(const a of agents.values()){if(i>=MAX_PEOPLE)break;
      if(a.wait>0){a.wait-=dt;a.moving=false;}
      else{const ang=a.dir.angleTo(a.target);
        if(ang<.004){if(a.final)nextWaypoint(a);else{a.wait=.8+Math.random()*3;pickTarget(a);}}
        else{const st=Math.min(ang,a.speed*(a.onRoad?1.5:1)*dt*(env.quake>0?2:1));tv.crossVectors(a.dir,a.target).normalize();tq.setFromAxisAngle(tv,st);
          const nd=a.dir.clone().applyQuaternion(tq);
          if(info(nd).height<R+.005){a.wait=.5;a.target=a.home.dir.clone();a.final=null;}
          else{a.fwd.crossVectors(tv,nd).normalize();a.dir.copy(nd);a.moving=true;a.walk+=dt*12;}}}
      const h=Math.max(info(a.dir).height,R+.012+(env.flood||0)*.05);a.up.copy(a.dir);a.pos.copy(a.dir).multiplyScalar(h);
      a.fwd.addScaledVector(a.dir,-a.fwd.dot(a.dir)).normalize();P.set(i++,a);}
    P.finish(i);}
  // ---------- save / load ----------
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({v:2,seed:game.opts.seed,players:tribes.length,
    tribes:tribes.map(T=>({food:+T.food.toFixed(1),progress:+T.progress.toFixed(1),tech:T.tech,s:T.settlements.map(s=>s.toArray().map(x=>+x.toFixed(4)))})),
    b:buildings.map(b=>{const o={t:b.type,d:b.dir.toArray().map(x=>+x.toFixed(4)),l:b.level,p:b.pop,tr:b.tribe};if(b.fwd)o.f=b.fwd.toArray().map(x=>+x.toFixed(4));if(b.flag)o.g=1;if(b.linked)o.k=1;return o;})}));}catch(e){}}
  function load(){let s=null;try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){}if(!s||!s.b)return false;
    const old=!s.v||s.v<2;const ts=s.tribes||[{food:30,progress:old?TECH[TECH.length-1].need:0,tech:old?TECH.length-1:0}];
    ts.forEach((t,i)=>makeTribe(i,t));
    for(const o of s.b){if(!FOOT[o.t])continue;try{place(o.t,new THREE.Vector3(...o.d),{silent:true,level:old&&o.t==='house'?Math.min(3,(o.l||1)+1):o.l||1,pop:o.p||0,tribe:Math.min(o.tr||0,tribes.length-1),fwd:o.f?new THREE.Vector3(...o.f):null,flag:!!o.g,linked:old||!!o.k});}catch(e){}}
    return true;}
  // ---------- start ----------
  function begin(){const o=game.opts;let ok=!o.fresh&&load();
    if(!ok){const n=o.players||1;const conts=planet.conts.slice(0,4).sort(()=>Math.random()-.5);
      for(let i=0;i<n;i++){const T=makeTribe(i);let d=null;
        for(const c of conts){if(tribes.some(t=>t.settlements[0]&&t.settlements[0].angleTo(c.c)<1))continue;d=spot(c.c.clone().normalize(),'house',0,.25,80);if(d)break;}
        if(!d)for(let k=0;k<3000&&!d;k++){const r=new THREE.Vector3().randomDirection();if(!check('house',r)&&!tribes.some(t=>t.settlements[0]&&t.settlements[0].angleTo(r)<.8))d=r;}
        T.settlements.push(d);place('house',d,{silent:true,tribe:i,pop:2,flag:true});const d2=spot(d,'house',.03,.06);if(d2)place('house',d2,{silent:true,tribe:i,pop:1});}
      save();say(n>1?'Two tribes are waking up! Help yours grow 🩷💙':'A little tribe is waking up! Watch them grow 🌱');}
    if(tribes.length<2)document.getElementById('t1')?.remove();
    syncAgents();updateCards();
    const c=center(tribes[0]);if(c&&game.camui)game.camui.flyTo(planet.group.localToWorld(c.clone()),R+5,0.01);}
  function updateCards(){for(const T of tribes){const c=T.card;c.querySelector('.pp').textContent=tPop(T);c.querySelector('.hh').textContent=buildings.filter(b=>b.tribe===T.id&&b.type==='house').length;
    const nx=TECH[T.tech+1];c.querySelector('.nx').textContent=nx?nx.name:'All discovered! 🏆';
    c.querySelector('.bar2 i').style.width=(nx?Math.min(100,(T.progress-TECH[T.tech].need)/(nx.need-TECH[T.tech].need)*100):100)+'%';}}
  addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
  let peopleT=0,quakeWas=false;
  game.addSystem({update(dt){time+=dt;simT+=dt;saveT+=dt;peopleT+=dt;aiT+=dt;
    if(simT>=.5){simTick(simT);simT=0;syncAgents();updateCards();}
    if(aiT>=2.2){aiT=0;tribes.forEach(aiTick);}
    if(peopleT>=1/30){updatePeople(peopleT);peopleT=0;}
    if(saveT>8){save();saveT=0;}
    for(const b of buildings){const an=b.mesh.userData.anim;if(an&&an.length)for(const a of an){
      if(a.t==='wheel'){a.o.rotation.z+=dt*.5;a.cabs.forEach(c=>c.rotation.z=-a.o.rotation.z);}
      else if(a.t==='coaster'){a.u=(a.u+dt*.12)%1;a.o.position.copy(a.curve.getPointAt(a.u)).y+=.06;a.o.lookAt(tv.copy(a.curve.getPointAt((a.u+.01)%1)).applyMatrix4(b.mesh.matrixWorld));}}}
    // quake wobble
    if(env.quake>0){quakeWas=true;for(const b of buildings){if(b.type==='road')continue;const k=env.quake*.12;b.mesh.quaternion.copy(b.q0).multiply(tq.setFromEuler(new THREE.Euler(Math.sin(time*31+b.seed)*k,0,Math.cos(time*27+b.seed)*k)));}}
    else if(quakeWas){quakeWas=false;buildings.forEach(b=>{if(!b.damaged)b.mesh.quaternion.copy(b.q0);});}
    for(const b of buildings)if(b.damaged){b.damaged-=dt;if(b.damaged<=0){b.damaged=0;b.mesh.quaternion.copy(b.q0);say('The builders fixed a wobbly house 🔧');}}
    // night lighting on building materials
    const n=env.night;M.win.emissiveIntensity=.5+2.6*n;M.bulb.emissiveIntensity=.3+3.5*n;M.sign.emissiveIntensity=.4+1.6*n;M.pool.emissiveIntensity=.35+.8*n;
    M.walls.forEach(w=>w.emissiveIntensity=.22*(1-.6*n));
    if(sparkT>0){sparkT-=dt;sparkM.opacity=Math.min(1,sparkT);const p=sparkG.attributes.position;for(let i=0;i<SPN;i++){p.setXYZ(i,p.getX(i)+sparkV[i].x*dt,p.getY(i)+sparkV[i].y*dt,p.getZ(i)+sparkV[i].z*dt);}p.needsUpdate=true;if(sparkT<=0)spark.visible=false;}
  }});
  function quakeDamage(){const hs=buildings.filter(b=>b.type==='house');for(let i=0;i<Math.min(2,hs.length);i++){const b=hs[(Math.random()*hs.length)|0];b.damaged=8;
    b.mesh.quaternion.copy(b.q0).multiply(tq.setFromEuler(new THREE.Euler(.22,0,.12)));b.pop=Math.max(0,b.pop-1);}}
  return {buildings,tribes,place,remove,check,setTool,save,load,population:()=>tribes.reduce((a,T)=>a+tPop(T),0),simTick,aiTick,begin,say,quakeDamage,layRoad,doUndo,tap,syncAgents,TECH,agents,fx,center};
}
