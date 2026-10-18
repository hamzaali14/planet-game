import * as THREE from '../vendor/three.module.js';
export function createStars(n=1500){const a=new Float32Array(n*3);for(let i=0;i<n;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(150+Math.random()*100);a.set([v.x,v.y,v.z],i*3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));
  return new THREE.Points(g,new THREE.PointsMaterial({color:'#fff',size:0.8,sizeAttenuation:true}));}
