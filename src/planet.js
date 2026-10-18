import * as THREE from '../vendor/three.module.js';
import { makeNoise } from './noise.js';
export const BIOMES={OCEAN:0,BEACH:1,GRASS:2,FOREST:3,DESERT:4,MOUNTAIN:5,SNOW:6};
const COLORS=['#2f8fd8','#f2dd9a','#7ccf5a','#3f9a48','#e8b860','#8d7f72','#ffffff'].map(c=>new THREE.Color(c));
// Creates the planet mesh. Exposes getSurfaceInfo(dir) for later steps (placing buildings/people).
export function createPlanet({radius=5,detail=24,seed=7}={}){
  const noise=makeNoise(seed),moist=makeNoise(seed+99);
  const geo=new THREE.IcosahedronGeometry(radius,detail);
  const pos=geo.attributes.position,colors=new Float32Array(pos.count*3),v=new THREE.Vector3();
  const sample=(d)=>{
    const e=noise(d.x*1.6+10,d.y*1.6,d.z*1.6)*1.4,m=moist(d.x*2,d.y*2,d.z*2);
    let b;if(e<0)b=BIOMES.OCEAN;else if(e<.05)b=BIOMES.BEACH;else if(e>.5)b=BIOMES.SNOW;else if(e>.35)b=BIOMES.MOUNTAIN;
    else if(m<-.12||Math.abs(d.y)<.25&&m<.05)b=BIOMES.DESERT;else b=m>.15?BIOMES.FOREST:BIOMES.GRASS;
    const h=e<0?-0.02:e*0.6; return {biome:b,elevation:e,height:radius+h};
  };
  // per-face flat shading: compute biome at face centroid
  for(let i=0;i<pos.count;i+=3){
    const c=new THREE.Vector3();for(let k=0;k<3;k++)c.add(v.fromBufferAttribute(pos,i+k));c.normalize();
    const col=COLORS[sample(c).biome];
    for(let k=0;k<3;k++){v.fromBufferAttribute(pos,i+k).normalize();const s=sample(v);v.multiplyScalar(Math.max(s.height,radius));pos.setXYZ(i+k,v.x,v.y,v.z);colors.set([col.r,col.g,col.b],(i+k)*3);}
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.computeVertexNormals();
  const group=new THREE.Group();
  group.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9})));
  const water=new THREE.Mesh(new THREE.IcosahedronGeometry(radius+0.03,12),new THREE.MeshStandardMaterial({color:'#3aa6ff',transparent:true,opacity:.75,flatShading:true,roughness:.3}));
  group.add(water);
  const atmo=new THREE.Mesh(new THREE.SphereGeometry(radius*1.12,32,32),new THREE.MeshBasicMaterial({color:'#88ccff',transparent:true,opacity:.15,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  group.add(atmo);
  return {group,radius,getSurfaceInfo:(dir)=>{const d=dir.clone().normalize();const s=sample(d);return {...s,point:d.multiplyScalar(Math.max(s.height,radius))};}};
}
