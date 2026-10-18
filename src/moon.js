import * as THREE from '../vendor/three.module.js';
export function createMoon({distance=11,size=1,speed=0.15}={}){
  const pivot=new THREE.Group();pivot.rotation.z=0.3;
  const geo=new THREE.IcosahedronGeometry(size,2),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const s=1+(Math.sin(p.getX(i)*9)*Math.cos(p.getY(i)*7))*0.05;p.setXYZ(i,p.getX(i)*s,p.getY(i)*s,p.getZ(i)*s);}
  geo.computeVertexNormals();
  const moon=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#d9d6cf',flatShading:true}));
  moon.position.x=distance;pivot.add(moon);
  return {group:pivot,update:(dt)=>{pivot.rotation.y+=dt*speed;moon.rotation.y+=dt*.3;}};
}
