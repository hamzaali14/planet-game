import * as THREE from '../vendor/three.module.js';
import { mergeGeos } from './merge.js';
// Instanced chibi people: legs, body, arms, big head, hair, face. 7 instanced meshes total, light on phones.
const T=(x,y,z)=>new THREE.Matrix4().makeTranslation(x,y,z),S=(x,y,z)=>new THREE.Matrix4().makeScale(x,y,z);
export function createPeople(parent,MAX){
  const lm=new THREE.MeshStandardMaterial({roughness:.65});
  const legG=new THREE.CapsuleGeometry(.075,.2,2,6);legG.translate(0,-.17,0);
  const bodyG=new THREE.CapsuleGeometry(.19,.16,3,8);bodyG.translate(0,.6,0);
  const armG=new THREE.CapsuleGeometry(.05,.2,2,6);armG.translate(0,-.13,0);
  const headG=new THREE.SphereGeometry(.27,14,10);headG.translate(0,1.06,0);
  const hairG=mergeGeos([[new THREE.SphereGeometry(.29,14,8,0,Math.PI*2,0,Math.PI*.52),T(0,1.09,-.02)],[new THREE.SphereGeometry(.13,8,6),T(0,1.3,-.12)]]);
  const faceG=mergeGeos([[new THREE.SphereGeometry(.045,6,5),T(-.09,1.08,.245)],[new THREE.SphereGeometry(.045,6,5),T(.09,1.08,.245)],
    [new THREE.SphereGeometry(.04,6,4),T(-.17,.99,.2).multiply(S(1.2,.6,.5))],[new THREE.SphereGeometry(.04,6,4),T(.17,.99,.2).multiply(S(1.2,.6,.5))]]);
  const parts={};const mkI=(n,g,m,count=MAX)=>{const im=new THREE.InstancedMesh(g,m,count);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.count=0;im.frustumCulled=false;im.raycast=()=>{};parent.add(im);parts[n]=im;return im;};
  mkI('legs',legG,lm.clone(),MAX*2);mkI('body',bodyG,lm.clone());mkI('arms',armG,lm.clone(),MAX*2);mkI('head',headG,lm.clone());mkI('hair',hairG,lm.clone());
  mkI('face',faceG,new THREE.MeshStandardMaterial({color:'#3a2a3a',roughness:.5}));
  // face mesh: eyes dark; blush drawn in same colour is fine at this size
  const skins=['#ffe0c4','#f6c9a0','#e0a878','#c68a5a','#9c6644','#7a4b30'].map(c=>new THREE.Color(c)),hairs=['#3b2a20','#6b4226','#f2c14e','#d9653b','#1f1b2e','#8b5cf6'].map(c=>new THREE.Color(c)),
    shirts=['#ff5e7e','#ffc93d','#9b6bff','#3fa9ff','#ff8a3d','#2ed3a0','#ffffff'].map(c=>new THREE.Color(c)),pants=['#3d5a99','#5a3d2b','#2e7d6b','#7a5bb0','#444b66'].map(c=>new THREE.Color(c));
  const m=new THREE.Matrix4(),b=new THREE.Matrix4(),r=new THREE.Matrix4(),x=new THREE.Vector3(),z=new THREE.Vector3(),tc=new THREE.Color();
  function colorize(i,a){const s=a.seed;parts.head.setColorAt(i,skins[s%6]);parts.face.setColorAt(i,tc.set('#2b2030'));parts.hair.setColorAt(i,hairs[(s>>3)%6]);
    const sh=a.tribeColor?tc.copy(a.tribeColor).lerp(shirts[(s>>5)%7],.25):shirts[(s>>5)%7];parts.body.setColorAt(i,sh);
    parts.arms.setColorAt(i*2,sh);parts.arms.setColorAt(i*2+1,sh);const p=pants[(s>>7)%5];parts.legs.setColorAt(i*2,p);parts.legs.setColorAt(i*2+1,p);}
  // a: {pos(Vector3 world-in-parent), up(unit), fwd(unit tangent), walk(phase), moving, scale}
  function set(i,a){z.copy(a.fwd);x.crossVectors(a.up,z).normalize();b.makeBasis(x,a.up,z).setPosition(a.pos);b.scale(new THREE.Vector3(a.scale,a.scale,a.scale));
    const sw=a.moving?Math.sin(a.walk)*.7:0,bob=a.moving?Math.abs(Math.sin(a.walk))*.06:0;if(bob)b.multiply(T(0,bob,0));
    for(const n of ['body','head','hair','face'])parts[n].setMatrixAt(i,b);
    for(let k=0;k<2;k++){const sg=k?1:-1;m.copy(b).multiply(T(sg*.09,.42,0)).multiply(r.makeRotationX(sw*sg));parts.legs.setMatrixAt(i*2+k,m);
      m.copy(b).multiply(T(sg*.23,.74,0)).multiply(r.makeRotationX(-sw*sg*.9)).multiply(r.makeRotationZ(sg*.25));parts.arms.setMatrixAt(i*2+k,m);}}
  function finish(n){for(const k in parts){const im=parts[k];im.count=(k==='legs'||k==='arms')?n*2:n;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;}}
  return {set,colorize,finish,parts};
}
