import * as THREE from '../vendor/three.module.js';
import { mulberry } from './noise.js';
// Soft puffy clouds (instanced spheres) drifting around the planet
export function createClouds(radius,{count=16,seed=4}={}){
  const r=mulberry(seed),puffs=[];
  const clouds=[...Array(count)].map(()=>{const axis=new THREE.Vector3().randomDirection(),start=new THREE.Vector3().randomDirection();
    start.sub(axis.clone().multiplyScalar(start.dot(axis))).normalize();
    const c={axis,start,ang:r()*6.28,speed:(.02+r()*.03)*(r()<.5?-1:1),alt:radius*(1.13+r()*.12),n:2+((r()*3)|0)};
    for(let k=0;k<c.n;k++)puffs.push({c,off:new THREE.Vector3((k-(c.n-1)/2)*.32+(r()-.5)*.1,(r()-.3)*.15,(r()-.5)*.15),s:.24+r()*.16-(k===0||k===c.n-1?.05:0)});
    return c;});
  const mat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,emissive:'#f2e6ff',emissiveIntensity:.35,transparent:true,opacity:1});
  const im=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,3),mat,puffs.length);im.raycast=()=>{};
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),q2=new THREE.Quaternion(),p=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),sc=new THREE.Vector3();
  function update(dt,cam){if(cam){const t=Math.min(1,Math.max(0,(cam.position.length()-radius-1.6)/2));mat.opacity=t;im.visible=t>0.02;mat.depthWrite=t>0.98;}for(const c of clouds)c.ang+=dt*c.speed;
    puffs.forEach((pf,i)=>{const c=pf.c;q.setFromAxisAngle(c.axis,c.ang);const dir=c.start.clone().applyQuaternion(q);
      q2.setFromUnitVectors(up,dir);p.copy(pf.off).applyQuaternion(q2).addScaledVector(dir,c.alt);sc.setScalar(pf.s);m4.compose(p,q2,sc);im.setMatrixAt(i,m4);});
    im.instanceMatrix.needsUpdate=true;}
  update(0);return {mesh:im,update};
}
