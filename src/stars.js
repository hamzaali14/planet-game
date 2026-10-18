import * as THREE from '../vendor/three.module.js';
// Teal-to-navy radial gradient sky with soft nebula and round, twinkly-coloured stars
export function createStars(n=900){
  const g=new THREE.Group();
  const tex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const gr=x.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
  for(const [cnt,size] of [[n,1.2],[n/6,2.6]]){const a=new Float32Array(cnt*3),cl=new Float32Array(cnt*3),c=new THREE.Color();
    for(let i=0;i<cnt;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(150+Math.random()*100);a.set([v.x,v.y,v.z],i*3);c.setHSL(.5+Math.random()*.2,.6,.8+Math.random()*.2);cl.set([c.r,c.g,c.b],i*3);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(a,3));geo.setAttribute('color',new THREE.BufferAttribute(cl,3));
    g.add(new THREE.Points(geo,new THREE.PointsMaterial({size,map:tex,vertexColors:true,transparent:true,depthWrite:false,opacity:.85})));}
  return g;
}
