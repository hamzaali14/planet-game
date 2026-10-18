import * as THREE from '../vendor/three.module.js';
import { mulberry } from './noise.js';
import { smoothNormals } from './planet.js';
// Cute moon with soft round craters
export function createMoon({distance=11,size=1,speed=0.15}={}){
  const pivot=new THREE.Group();pivot.rotation.z=0.3;
  const geo=new THREE.IcosahedronGeometry(size,4),p=geo.attributes.position,r=mulberry(3),v=new THREE.Vector3();
  const craters=[...Array(14)].map(()=>({c:new THREE.Vector3().randomDirection(),r:.15+r()*.3}));
  const cols=new Float32Array(p.count*3),base=new THREE.Color('#e9e4f5'),dark=new THREE.Color('#b7add6'),col=new THREE.Color();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();let h=0,shade=0;
    for(const k of craters){const d=v.angleTo(k.c)/k.r;if(d<1.3){h+=d<1?-(1-d*d)*.07:Math.sin((d-1)/.3*Math.PI)*.025;if(d<1)shade=Math.max(shade,1-d*d);}}
    v.multiplyScalar(size*(1+h));p.setXYZ(i,v.x,v.y,v.z);col.copy(base).lerp(dark,shade*.8);cols.set([col.r,col.g,col.b],i*3);}
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));
  smoothNormals(geo);
  const moon=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}));
  moon.position.x=distance;pivot.add(moon);
  return {group:pivot,update:(dt)=>{pivot.rotation.y+=dt*speed;moon.rotation.y+=dt*.3;}};
}
