import * as THREE from '../vendor/three.module.js';
import { makeNoise, mulberry } from './noise.js';
export const BIOMES={OCEAN:0,BEACH:1,GRASS:2,FOREST:3,DESERT:4,MOUNTAIN:5,SNOW:6};
const C=s=>new THREE.Color(s);
const PAL={deep:C('#1560d4'),mid:C('#1f8cf0'),shallow:C('#49c2ff'),foam:C('#e8fbff'),sand:C('#f2b97c'),grass:C('#a6d83c'),lush:C('#7cc63a'),forest:C('#58b03a'),
  desert:C('#f3c07a'),dune:C('#eaa265'),rock:C('#a99ac2'),rockDark:C('#8a7fae'),snow:C('#fbfbff'),seabed:C('#2a7fe0')};
// smooth normals for non-indexed geometry (shared positions get averaged normals)
export function smoothNormals(g){const p=g.attributes.position,acc=new Map(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),n=new THREE.Vector3();
  const key=i=>p.getX(i).toFixed(4)+','+p.getY(i).toFixed(4)+','+p.getZ(i).toFixed(4);
  for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);n.subVectors(c,b).cross(a.clone().sub(b));
    for(let k=0;k<3;k++){const kk=key(i+k);const v=acc.get(kk);if(v)v.add(n);else acc.set(kk,n.clone());}}
  const nr=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const v=acc.get(key(i)).clone().normalize();nr.set([v.x,v.y,v.z],i*3);}
  g.setAttribute('normal',new THREE.BufferAttribute(nr,3));}
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// Creates the planet. Exposes getSurfaceInfo(dir) for placing buildings/people, and clearAround(dir,ang) to hide scenery under buildings.
export function createPlanet({radius=5,detail=26,seed=7}={}){
  const noise=makeNoise(seed),moist=makeNoise(seed+99),jit=makeNoise(seed+5);
  // A few big chunky continents + small island clusters (domain-warped radial blobs)
  const cr=mulberry(seed*31),conts=[];
  const fib=(i,n)=>{const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),t=i*2.39996+cr()*.6;return new THREE.Vector3(r*Math.cos(t),y,r*Math.sin(t));};
  const rq=new THREE.Quaternion();if(seed!==7)rq.setFromEuler(new THREE.Euler(cr()*6.28,cr()*6.28,cr()*6.28));
  [[0,.6],[1,.48],[2,.55],[3,.42]].forEach(([i,sz])=>conts.push({c:fib(i*2+1,8).applyQuaternion(rq),r:sz}));
  for(let i=0;i<7;i++)conts.push({c:new THREE.Vector3().randomDirection(),r:.16+cr()*.12});
  const wv=new THREE.Vector3();
  const elev=(d)=>{wv.set(d.x+noise(d.x*1.3,d.y*1.3,d.z*1.3+5,3)*.35,d.y+noise(d.x*1.3+7,d.y*1.3,d.z*1.3,3)*.35,d.z+noise(d.x*1.3,d.y*1.3+9,d.z*1.3,3)*.35).normalize();
    let best=-1;for(const k of conts){const a=wv.angleTo(k.c);best=Math.max(best,1-a/k.r);}
    const detail=noise(d.x*2.6+10,d.y*2.6,d.z*2.6,4);
    return best<0?best*.5-.02:Math.min(.62,best*.6+detail*.3*best-.03);};
  const sample=(d)=>{
    const e=elev(d),m=moist(d.x*2,d.y*2,d.z*2);
    let b;if(e<0)b=BIOMES.OCEAN;else if(e<.05)b=BIOMES.BEACH;else if(e>.5)b=BIOMES.SNOW;else if(e>.35)b=BIOMES.MOUNTAIN;
    else if(m<-.12||Math.abs(d.y)<.25&&m<.05)b=BIOMES.DESERT;else b=m>.15?BIOMES.FOREST:BIOMES.GRASS;
    const h=e<0?-0.04+e*0.35:0.03+0.1*ss(0.0,0.06,e)+0.22*ss(0.3,0.38,e)+0.25*ss(0.45,0.55,e); return {biome:b,elevation:e,moisture:m,height:radius+h};
  };
  // smooth, continuous colour from elevation + moisture (no flat patches)
  const tmp=new THREE.Color();
  function landColor(d,e,m,out){
    const dry=Math.max(ss(-.04,-.16,m),Math.abs(d.y)<.25?ss(.08,-.02,m)*ss(.3,.2,Math.abs(d.y)):0);
    out.copy(PAL.grass).lerp(PAL.lush,ss(0,.3,m)).lerp(PAL.forest,ss(.12,.35,m));
    tmp.copy(PAL.desert).lerp(PAL.dune,ss(-.1,-.35,m)*0.8);out.lerp(tmp,dry);
    out.lerp(PAL.sand,1-ss(.015,.065,e));
    out.lerp(PAL.forest,ss(.2,.34,e)*.6);tmp.copy(PAL.rock).lerp(PAL.rockDark,ss(.44,.5,e));out.lerp(tmp,ss(.38,.46,e));
    out.lerp(PAL.snow,ss(.53,.6,e));
    if(e<0)out.copy(PAL.seabed).lerp(PAL.sand,ss(-.12,0,e));
    const j=1+jit(d.x*9,d.y*9,d.z*9,2)*0.06, ao=0.9+0.1*ss(-.05,.3,e);
    out.multiplyScalar(j*ao);return out;
  }
  const geo=new THREE.IcosahedronGeometry(radius,detail);
  const pos=geo.attributes.position,colors=new Float32Array(pos.count*3),v=new THREE.Vector3(),col=new THREE.Color();
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).normalize();const s=sample(v);landColor(v,s.elevation,s.moisture,col);
    v.multiplyScalar(s.height);pos.setXYZ(i,v.x,v.y,v.z);colors.set([col.r,col.g,col.b],i*3);}
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));smoothNormals(geo);
  const group=new THREE.Group();
  const land=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:0}));group.add(land);
  // --- ocean: depth gradient, shoreline foam, gentle animated waves ---
  const wgeo=new THREE.IcosahedronGeometry(radius,22);smoothNormals(wgeo);const wp=wgeo.attributes.position,wc=new Float32Array(wp.count*3),shore=new Float32Array(wp.count);
  for(let i=0;i<wp.count;i++){v.fromBufferAttribute(wp,i).normalize();const e=sample(v).elevation;
    col.copy(PAL.shallow).lerp(PAL.mid,ss(-.03,-.06,e)).lerp(PAL.deep,ss(-.15,-.3,e));wc.set([col.r,col.g,col.b],i*3);shore[i]=ss(-.07,.01,e);}
  wgeo.setAttribute('color',new THREE.BufferAttribute(wc,3));wgeo.setAttribute('aShore',new THREE.BufferAttribute(shore,1));
  const uTime={value:0};
  const wmat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:0,transparent:true,opacity:.95});
  wmat.onBeforeCompile=sh=>{sh.uniforms.uTime=uTime;
    sh.vertexShader='attribute float aShore;varying float vShore;varying vec3 vP;uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       vShore=aShore;vP=position;
       float w=sin(position.x*6.0+uTime*1.3)*sin(position.z*5.0+uTime*1.1)+sin(position.y*7.0-uTime*0.9)*0.6;
       transformed+=normalize(position)*(w*0.006+${(radius+0.012).toFixed(3)}-length(position));`);
    sh.fragmentShader='varying float vShore;varying vec3 vP;uniform float uTime;\n'+sh.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
       float band=0.5+0.5*sin(vShore*18.0-uTime*2.0+vP.x*3.0);
       float foam=smoothstep(0.55,0.95,vShore)*(0.55+0.45*band);
       diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.96,0.99,1.0),foam);`);};
  const water=new THREE.Mesh(wgeo,wmat);group.add(water);
  // --- scenery: instanced low-poly trees & rocks ---
  const rnd=mulberry(seed*13),up=new THREE.Vector3(0,1,0);
  const trunkG=new THREE.CylinderGeometry(.06,.09,.35,5);trunkG.translate(0,.17,0);
  const pineG=new THREE.ConeGeometry(.34,.9,10);pineG.translate(0,.7,0);
  const roundG=new THREE.IcosahedronGeometry(.36,2);roundG.translate(0,.58,0);
  const rockG=new THREE.IcosahedronGeometry(.3,1);rockG.translate(0,.1,0);
  const sm=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.75,...o});
  const N=650,spots=[];
  for(let i=0;i<N*6&&spots.length<N;i++){const d=new THREE.Vector3().randomDirection();const s=sample(d);
    const p=s.biome===BIOMES.FOREST?.9:s.biome===BIOMES.GRASS?.22:s.biome===BIOMES.MOUNTAIN?.35:s.biome===BIOMES.DESERT?.08:0;
    if(rnd()<p)spots.push({d,s,kind:(s.biome===BIOMES.MOUNTAIN||s.biome===BIOMES.DESERT)?'rock':(s.elevation>.22||rnd()<.45?'pine':'round')});}
  const mk=(g,m,n)=>{const im=new THREE.InstancedMesh(g,m,Math.max(1,n));im.count=0;group.add(im);return im;};
  const kinds={pine:spots.filter(s=>s.kind==='pine'),round:spots.filter(s=>s.kind==='round'),rock:spots.filter(s=>s.kind==='rock')};
  const trunks=mk(trunkG,sm('#8a5a3c'),kinds.pine.length+kinds.round.length),pines=mk(pineG,sm('#ffffff'),kinds.pine.length),
    rounds=mk(roundG,sm('#ffffff'),kinds.round.length),rocks=mk(rockG,sm('#ffffff'),kinds.rock.length);
  const greens=['#5fb534','#73c23a','#4fa52e','#86cc3e'].map(C),roundC=['#6dbd36','#86cc3e','#5aae31','#f2a65a','#f7d26a'].map(C),rockC=['#a99ac2','#9b8cb8','#b9acd0','#c4b7d8'].map(C);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),pp=new THREE.Vector3(),qy=new THREE.Quaternion();
  const scenery=[];
  function put(im,sp,scale,c,tr){const k=im.count++;q.setFromUnitVectors(up,sp.d);qy.setFromAxisAngle(up,sp.rot);q.multiply(qy);
    sc.set(scale,scale*sp.stretch,scale);pp.copy(sp.d).multiplyScalar(sp.s.height-0.005);m4.compose(pp,q,sc);im.setMatrixAt(k,m4);if(c)im.setColorAt(k,c);
    scenery.push({im,k,d:sp.d,m:m4.clone()});}
  for(const sp of spots){sp.rot=rnd()*6.28;sp.stretch=.85+rnd()*.4;const s=.12+rnd()*.08;
    if(sp.kind==='rock'){sp.stretch=.6+rnd()*.5;put(rocks,sp,s*.9,rockC[(rnd()*4)|0]);}
    else{put(trunks,sp,s);put(sp.kind==='pine'?pines:rounds,sp,s,sp.kind==='pine'?greens[(rnd()*4)|0]:roundC[(rnd()*(rnd()<.85?3:5))|0]);}}
  [trunks,pines,rounds,rocks].forEach(im=>{im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;});
  const zero=new THREE.Matrix4().makeScale(0,0,0);
  function clearAround(dir,ang){const d=dir.clone().normalize();const touched=new Set();
    for(const s of scenery)if(s.d.angleTo(d)<ang){s.im.setMatrixAt(s.k,zero);touched.add(s.im);}touched.forEach(im=>im.instanceMatrix.needsUpdate=true);}
  // --- atmosphere: soft rim glow (outer halo + inner fresnel rim) ---
  const glow=(r,side,c,p,str)=>new THREE.Mesh(new THREE.SphereGeometry(r,48,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side,blending:THREE.NormalBlending,
    uniforms:{c:{value:C(c)},k:{value:1}},vertexShader:`varying vec3 n;varying vec3 vv;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);vv=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:side===THREE.BackSide?`uniform vec3 c;uniform float k;varying vec3 n;varying vec3 vv;void main(){float d=dot(n,vv);float i=pow(smoothstep(0.0,0.6,-d),${p.toFixed(1)});gl_FragColor=vec4(c,clamp(i*k*${str.toFixed(2)},0.,1.));}`
      :`uniform vec3 c;uniform float k;varying vec3 n;varying vec3 vv;void main(){float f=pow(1.0-clamp(dot(n,vv),0.,1.),${p.toFixed(1)});gl_FragColor=vec4(c,clamp(f*k*${str.toFixed(2)},0.,1.));}`}));
  const halo=glow(radius*1.16,THREE.BackSide,'#5fd8ff',2.0,0.75);halo.raycast=()=>{};group.add(halo);
  const rim=glow(radius*1.03,THREE.FrontSide,'#a8ecff',3.0,0.55);rim.raycast=()=>{};group.add(rim);
  water.raycast=()=>{};[trunks,pines,rounds,rocks].forEach(m=>m.raycast=()=>{});
  return {group,land,water,radius,conts,clearAround,update:(dt,cam)=>{uTime.value+=dt;if(cam){const k=ss(radius+1.2,radius+5,cam.position.length());rim.material.uniforms.k.value=k;halo.material.uniforms.k.value=.3+.7*k;}},
    getSurfaceInfo:(dir)=>{const d=dir.clone().normalize();const s=sample(d);return {...s,point:d.multiplyScalar(Math.max(s.height,radius))};}};
}
