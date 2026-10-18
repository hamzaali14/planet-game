import * as THREE from '../vendor/three.module.js';
import { mergeGroup } from './merge.js';
// Low-poly building models. All static parts are merged per material; animated parts flagged userData.keep.
const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.7,...o});
export const M={walls:['#ffd9c2','#ffe9b8','#d8f0e0','#ffd0dc'].map(c=>mat(c,{emissive:c,emissiveIntensity:.22})),roofs:['#f0645f','#ff8a5c','#e9557a'].map(c=>mat(c)),
  door:mat('#a8603a'),win:mat('#fff3a8',{emissive:'#ffd36b',emissiveIntensity:.5}),trim:mat('#ffffff'),chim:mat('#e7a48f'),
  soil:mat('#c98a52'),crop:mat('#8fd13c'),wheat:mat('#ffd34d'),fence:mat('#b5653f'),stone:mat('#b3a8cc'),water:mat('#49c2ff',{roughness:.2,emissive:'#1f8cf0',emissiveIntensity:.25}),wood:mat('#b5653f'),
  road:mat('#e9d3a8'),dash:mat('#ffffff'),flower:mat('#ff7eb6'),bush:mat('#6dbd36'),straw:mat('#e2ae4a'),hutwall:mat('#e8c48a',{emissive:'#e8c48a',emissiveIntensity:.15}),
  bulb:mat('#fff6c8',{emissive:'#ffe08a',emissiveIntensity:.3}),pole:mat('#5d6b8a'),
  cine:mat('#b48cff',{emissive:'#b48cff',emissiveIntensity:.2}),cineDark:mat('#5a3d9a'),sign:mat('#ff5e7e',{emissive:'#ff5e7e',emissiveIntensity:.4}),
  grassP:mat('#bfe88a'),path:mat('#f6e2b8'),red:mat('#ff5e7e'),yellow:mat('#ffd23f'),blue:mat('#3fa9ff'),teal:mat('#2ed3a0'),white:mat('#fffaf2'),purple:mat('#9b6bff'),pool:mat('#5fd8ff',{roughness:.15,emissive:'#2ab0e6',emissiveIntensity:.35}),
  shadow:new THREE.MeshBasicMaterial({color:'#0a2a40',transparent:true,opacity:.12,depthWrite:false})};
export const tribeMat=c=>mat(c,{emissive:c,emissiveIntensity:.3});
const G={box:new THREE.BoxGeometry(1,1,1),barrel:new THREE.CylinderGeometry(.5,.5,1,12,1,false,0,Math.PI),cyl:new THREE.CylinderGeometry(.5,.5,1,12),cyl6:new THREE.CylinderGeometry(.5,.5,1,6),
  ring:new THREE.TorusGeometry(.42,.1,6,16),sph:new THREE.SphereGeometry(.5,10,7),cone:new THREE.ConeGeometry(.5,1,10),disc:new THREE.CircleGeometry(.5,20)};
G.barrel.rotateZ(Math.PI/2);G.barrel.rotateY(Math.PI/2);G.ring.rotateX(Math.PI/2);G.disc.rotateX(-Math.PI/2);
function mk(g,geo,m,y=0,x=0,z=0,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);g.add(o);return o;}
export const FOOT={house:0.017,farm:0.025,well:0.011,road:0.009,cinema:0.03,park:0.05};
function house(g,ox,oz,w,h,d,seed){const wall=M.walls[seed%4],roof=M.roofs[seed%3];
  mk(g,G.box,wall,h/2,ox,oz,w,h,d);mk(g,G.barrel,roof,h,ox,oz,w*1.12,d*.62,d*1.12);mk(g,G.box,M.door,.15,ox,oz+d/2+.005,.14,.3,.02);
  const floors=Math.max(1,Math.round(h/.4));
  for(let f=0;f<floors;f++)for(const sx of [-1,1]){const wy=f===0?.22:.22+f*.36;mk(g,G.box,M.win,wy,ox+sx*w*.3,oz+d/2+.006,.12,.12,.02);mk(g,G.box,M.win,wy,ox+w/2+.006,oz+sx*d*.22,.02,.12,.12);}
  mk(g,G.box,M.chim,h+.25,ox+w*.28,oz-d*.15,.1,.25,.1);}
function hut(g,seed){mk(g,G.cyl,M.hutwall,.16,0,0,.6,.32,.6);mk(g,G.cone,M.straw,.5,0,0,.82,.42,.82);mk(g,G.box,M.door,.12,0,.3,.14,.22,.02);
  mk(g,G.box,M.win,.2,.3,.02,.02,.08,.08);if(seed%2)mk(g,G.sph,M.bush,.06,.35,.25,.18,.14,.18);}
function cinema(g){mk(g,G.box,M.cine,.42,0,-.05,1.3,.84,.95);mk(g,G.box,M.cineDark,.86,0,-.05,1.36,.06,1.0);
  mk(g,G.box,M.sign,.98,0,.44,1.0,.3,.08);for(let i=0;i<7;i++){mk(g,G.sph,M.bulb,.98+(i%2?.11:-.11)*0,-.42+i*.14,.49,.06,.06,.06);}
  mk(g,G.box,M.sign,.62,0,.5,1.1,.04,.22);for(let i=0;i<5;i++)mk(g,G.box,i%2?M.white:M.red,.58,-.44+i*.22,.6,.2,.02,.12);
  mk(g,G.box,M.cineDark,.22,0,.43,.36,.44,.04);mk(g,G.box,M.yellow,.4,-.48,.43,.2,.3,.03);mk(g,G.box,M.blue,.4,.48,.43,.2,.3,.03);
  for(const x of [-.25,.25])mk(g,G.cyl,M.cineDark,1.14,x,-.2,.3,.06,.3).rotation.x=Math.PI/2;// film reels
  for(const x of [-.25,.25])mk(g,G.cyl,M.white,1.14,x,-.17,.1,.07,.1).rotation.x=Math.PI/2;}
function park(g,anim){mk(g,G.disc,M.grassP,.015,0,0,2.7,1,2.7);mk(g,G.box,M.path,.03,0,.2,.25,.02,2.2);mk(g,G.box,M.path,.03,0,.15,2.2,.02,.22);
  // gate
  for(const x of [-.3,.3])mk(g,G.box,M.purple,.3,x,1.2,.08,.6,.08);mk(g,G.box,M.yellow,.62,0,1.2,.75,.12,.1);
  // Ferris wheel
  for(const sx of [-1,1]){const p=mk(g,G.box,M.white,.55,-.6+sx*.18,-.45,.05,1.1,.05);p.rotation.z=sx*.3;}
  const wheel=new THREE.Group();wheel.position.set(-.6,1.05,-.45);wheel.userData.keep=true;g.add(wheel);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.55,.035,5,24),M.red);wheel.add(rim);const hub=new THREE.Mesh(G.cyl,M.yellow);hub.scale.set(.12,.1,.12);hub.rotation.x=Math.PI/2;wheel.add(hub);
  const cabs=[],cc=[M.blue,M.yellow,M.teal,M.purple];
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,s=new THREE.Mesh(G.box,M.white);s.scale.set(.025,.55,.025);s.position.set(Math.cos(a)*.27,Math.sin(a)*.27,0);s.rotation.z=a-Math.PI/2;wheel.add(s);
    const c=new THREE.Mesh(G.box,cc[i%4]);c.scale.set(.13,.12,.13);c.position.set(Math.cos(a)*.55,Math.sin(a)*.55-.07,0);wheel.add(c);cabs.push(c);}
  anim.push({t:'wheel',o:wheel,cabs});
  // roller coaster
  const pts=[];for(let i=0;i<14;i++){const a=i/14*Math.PI*2;pts.push(new THREE.Vector3(.55+Math.cos(a)*.55,.3+.35*Math.max(0,Math.sin(a*2+1))+(i===3?.35:0),-.25+Math.sin(a)*.4));}
  const curve=new THREE.CatmullRomCurve3(pts,true);mk(g,new THREE.TubeGeometry(curve,60,.035,4,true),M.red);
  for(let i=0;i<14;i+=2){const p=pts[i];mk(g,G.cyl6,M.white,p.y/2,p.x,p.z,.03,p.y,.03);}
  const car=new THREE.Group();car.userData.keep=true;g.add(car);const cb=new THREE.Mesh(G.box,M.yellow);cb.scale.set(.18,.1,.11);car.add(cb);
  anim.push({t:'coaster',o:car,curve,u:0});
  // water park: pools + slides
  mk(g,G.cyl,M.white,.04,-.55,.55,1.0,.08,.8);mk(g,G.cyl,M.pool,.07,-.55,.55,.88,.04,.68);
  mk(g,G.cyl,M.white,.04,.55,.65,.6,.08,.6);mk(g,G.cyl,M.pool,.07,.55,.65,.5,.04,.5);
  mk(g,G.box,M.teal,.4,-1.0,.35,.18,.8,.18);mk(g,G.box,M.yellow,.82,-1.0,.35,.24,.04,.24);
  const sl=[];for(let i=0;i<=8;i++){const a=i/8*Math.PI*1.2;sl.push(new THREE.Vector3(-1.0+Math.sin(a)*.32,.82-i*.09,.35+(1-Math.cos(a))*.25));}
  mk(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sl),24,.05,5,false),M.blue);
  mk(g,G.box,M.purple,.3,.95,.85,.12,.6,.12);const s2=[];for(let i=0;i<=6;i++)s2.push(new THREE.Vector3(.95-i*.07,.6-i*.09,.85-i*.03));
  mk(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s2),16,.045,5,false),M.yellow);
  for(const [x,z,m] of [[-.15,.85,M.red],[.2,.95,M.blue],[1.05,.3,M.yellow]]){mk(g,G.cyl6,M.white,.25,x,z,.02,.5,.02);mk(g,G.cone,m,.5,x,z,.3,.12,.3);} // umbrellas
  for(let i=0;i<6;i++)mk(g,G.sph,M.bulb,.12,-1.2+i*.48,1.25,.06,.06,.06);}
const cache=new Map();
// level: house 1=hut 2=house 3=big house
export function buildMesh(type,level,seed=0,flagMat=null){
  const key=type+level+'|'+(seed%12)+(flagMat?flagMat.uuid:'');const animated=type==='park';
  if(!animated&&cache.has(key)){const o=cache.get(key).clone();o.userData={anim:[]};return o;}
  const g=new THREE.Group(),anim=[];
  if(type!=='road')mk(g,G.disc,M.shadow,.012,0,0,...(type==='farm'?[2.2,1,2.2]:type==='park'?[0,0,0]:type==='cinema'?[1.9,1,1.9]:[1.5,1,1.5]));
  if(type==='house'){if(level<=1)hut(g,seed);else if(level===2)house(g,0,0,.66,.8,.52,seed);
    else{house(g,-.08,0,.56,1.15,.5,seed);house(g,.3,.15,.34,.42,.32,seed+1);mk(g,G.sph,M.bush,.08,-.35,.33,.2,.16,.2);}
    if(level>=2)for(const x of [-.25,.25])mk(g,G.sph,M.flower,.05,x,.34,.09,.09,.09);}
  else if(type==='farm'){mk(g,G.box,M.soil,.03,0,0,1.5,.06,1.1);
    for(let i=-2;i<=2;i++){mk(g,G.box,M.crop,.1,i*.26,0,.14,.1,.95);for(let j=-1;j<=1;j++)mk(g,G.sph,i%2?M.wheat:M.crop,.17,i*.26,j*.3,.13,.12,.13);}
    for(const z of [-.58,.58]){for(let x=-.7;x<=.71;x+=.35)mk(g,G.box,M.fence,.08,x,z,.04,.16,.04);mk(g,G.box,M.fence,.12,0,z,1.45,.03,.03);}}
  else if(type==='well'){mk(g,G.cyl,M.stone,.14,0,0,.7,.28,.7);mk(g,G.ring,M.stone,.28,0,0,.85,.85,.85);mk(g,G.cyl,M.water,.27,0,0,.6,.02,.6);
    for(const x of [-.32,.32])mk(g,G.box,M.wood,.5,x,0,.06,.6,.06);mk(g,G.cyl,M.wood,.66,0,0,.05,.7,.05).rotation.z=Math.PI/2;
    for(const sg of [-1,1])mk(g,G.box,M.roofs[0],.82,0,sg*.15,.9,.04,.38).rotation.x=sg*.6;mk(g,G.box,M.wood,.93,0,0,.92,.05,.05);}
  else if(type==='road'){mk(g,G.box,M.road,.02,0,0,1.2,.04,.5);mk(g,G.box,M.dash,.045,0,0,.3,.01,.05);
    if(seed%3===0){mk(g,G.cyl6,M.pole,.35,0,.32,.04,.7,.04);mk(g,G.sph,M.bulb,.72,0,.32,.12,.12,.12);}}
  else if(type==='cinema')cinema(g);
  else if(type==='park')park(g,anim);
  if(flagMat){mk(g,G.cyl6,M.pole,.55,-.42,-.3,.03,1.1,.03);mk(g,G.box,flagMat,.95,-.3,-.3,.24,.16,.02);}
  const {out,keep}=mergeGroup(g);keep.forEach(k=>out.add(k));out.userData={anim};out.scale.setScalar(.18);
  if(!animated)cache.set(key,out.clone());return out;
}
