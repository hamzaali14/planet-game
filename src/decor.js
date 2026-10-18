import * as THREE from '../vendor/three.module.js';
import { BIOMES } from './planet.js';
import { mulberry } from './noise.js';
// v3 decor: lighthouse, wooden piers, sailing boats (instanced), a little plane looping the planet.
const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.7,...o});
const up=new THREE.Vector3(0,1,0);
function frame(d){const a=Math.abs(d.y)<.9?up:new THREE.Vector3(1,0,0);const t1=new THREE.Vector3().crossVectors(a,d).normalize();return [t1,new THREE.Vector3().crossVectors(d,t1)];}
function orient(obj,d,fwd){// local +y = d, local +x = fwd (tangent)
  const f=fwd.clone().addScaledVector(d,-fwd.dot(d)).normalize(),z=new THREE.Vector3().crossVectors(f,d);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f,d,z));}
export function createDecor(game){
  const P=game.planet,R=P.radius,g=new THREE.Group();P.group.add(g);const rnd=mulberry(21);
  const info=d=>P.getSurfaceInfo(d),isSea=d=>info(d).biome===BIOMES.OCEAN;
  // coast spots: land (beach) cells with ocean a short step away in direction `out`
  const coasts=[];
  for(let i=0;i<3000;i++){const y=1-2*(i+.5)/3000,r=Math.sqrt(1-y*y),th=i*2.39996,d=new THREE.Vector3(r*Math.cos(th),y,r*Math.sin(th));
    const s=info(d);if(s.biome!==BIOMES.BEACH&&s.biome!==BIOMES.GRASS)continue;const [t1,t2]=frame(d);
    for(let k=0;k<8;k++){const a=k/8*6.283,o=t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2,Math.sin(a));
      if(isSea(d.clone().addScaledVector(o,.03))&&isSea(d.clone().addScaledVector(o,.07))&&!isSea(d.clone().addScaledVector(o,-.03))){coasts.push({d,o,s});break;}}}
  const used=[];const far=(d,a)=>used.every(u=>u.angleTo(d)>a);
  // --- lighthouse ---
  const LH=new THREE.Group(),red=mat('#ef4f5a'),white=mat('#fff7f0'),glass=mat('#fff3a8',{emissive:'#ffd36b',emissiveIntensity:1.2});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.5,.55,.25,16),mat('#b3a8cc'));base.position.y=.12;LH.add(base);
  for(let i=0;i<5;i++){const r0=.4-i*.045,c=new THREE.Mesh(new THREE.CylinderGeometry(r0-.045,r0,.4,16),i%2?white:red);c.position.y=.45+i*.4;LH.add(c);}
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.3,12),glass);lamp.position.y=2.4;LH.add(lamp);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.32,.35,12),red);cap.position.y=2.72;LH.add(cap);
  const deck=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.05,16),white);deck.position.y=2.25;LH.add(deck);
  const lh=coasts.find(c=>c.s.biome===BIOMES.BEACH)||coasts[0];
  if(lh){LH.scale.setScalar(.13);LH.position.copy(lh.d).multiplyScalar(info(lh.d).height-.01);orient(LH,lh.d,lh.o);g.add(LH);used.push(lh.d);P.clearAround(lh.d,.03);}
  // --- piers (instanced planks + posts) ---
  const piers=[];for(const c of coasts){if(piers.length>=5)break;if(far(c.d,.5)&&rnd()<.5){piers.push(c);used.push(c.d);}}
  const plankG=new THREE.BoxGeometry(1,1,1),wood=mat('#c07a48'),post=mat('#8a5236');
  const planks=new THREE.InstancedMesh(plankG,wood,piers.length*7||1),posts=new THREE.InstancedMesh(plankG,post,piers.length*6||1);
  let np=0,nq=0;const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),o3=new THREE.Object3D();
  for(const c of piers){P.clearAround(c.d,.02);for(let k=0;k<7;k++){const d=c.d.clone().addScaledVector(c.o,.004+k*.0075).normalize();
      o3.position.copy(d).multiplyScalar(R+.025);orient(o3,d,c.o);o3.scale.set(.032,.012,.075);o3.updateMatrix();planks.setMatrixAt(np++,o3.matrix);
      if(k%3===2)for(const sg of [-1,1]){const pd=d.clone();const [,]=[];const side=new THREE.Vector3().crossVectors(c.o,d).normalize();
        pd.addScaledVector(side,sg*.0065).normalize();o3.position.copy(pd).multiplyScalar(R+.005);orient(o3,pd,c.o);o3.scale.set(.012,.05,.012);o3.updateMatrix();posts.setMatrixAt(nq++,o3.matrix);}}}
  planks.count=np;posts.count=nq;g.add(planks,posts);
  // --- boats: few small rowboats/sailboats, instanced hull + sail ---
  const NB=6,hullG=new THREE.SphereGeometry(.5,12,8);hullG.scale(1.8,.5,.8);hullG.translate(0,.12,0);
  const sailG=new THREE.ConeGeometry(.35,.9,3);sailG.translate(0,.75,0);
  const hulls=new THREE.InstancedMesh(hullG,mat('#ffffff',{side:THREE.DoubleSide}),NB),sails=new THREE.InstancedMesh(sailG,mat('#ffffff',{emissive:'#ffffff',emissiveIntensity:.2}),NB);
  const hullC=['#ef6a5a','#ff9a4d','#f7c948','#5aa9ef'].map(c=>new THREE.Color(c)),sailC=['#fff7f0','#ffd0dc','#e8fbff'].map(c=>new THREE.Color(c));
  const boats=[];for(let i=0;i<4000&&boats.length<NB;i++){const d=new THREE.Vector3().randomDirection();if(info(d).elevation<-.12){const ax=new THREE.Vector3().randomDirection().cross(d).normalize();boats.push({d,ax,sp:(.02+rnd()*.02)*(rnd()<.5?1:-1)});}}
  boats.forEach((b,i)=>{hulls.setColorAt(i,hullC[i%4]);sails.setColorAt(i,sailC[i%3]);});hulls.count=sails.count=boats.length;
  [hulls,sails].forEach(m=>{m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;g.add(m);});
  // --- plane ---
  const plane=new THREE.Group(),pb=mat('#ff8fb0'),pw=mat('#fff3e8'),po=mat('#ff9a4d');
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.8,4,10),pb);body.rotation.z=Math.PI/2;plane.add(body);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(.38,.05,1.6),pw);wing.position.set(.12,.05,0);plane.add(wing);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.2,.04,.6),pw);tail.position.set(-.5,.08,0);plane.add(tail);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.22,.3,.04),po);fin.position.set(-.52,.22,0);plane.add(fin);
  const prop=new THREE.Mesh(new THREE.BoxGeometry(.03,.6,.08),mat('#555'));prop.position.x=.62;plane.add(prop);
  plane.scale.setScalar(.35);g.add(plane);const pAx=new THREE.Vector3(.15,1,.6).normalize(),pStart=new THREE.Vector3(1,0,0).addScaledVector(pAx,-pAx.x).normalize();
  let pa=0,pCycle=0;
  [planks,posts,hulls,sails,LH,plane].forEach(o=>o.traverse(x=>x.raycast=()=>{}));
  const tmp=new THREE.Vector3(),qq=new THREE.Quaternion();
  game.addSystem({update(dt){
    boats.forEach((b,i)=>{qq.setFromAxisAngle(b.ax,b.sp*dt);const nd=b.d.clone().applyQuaternion(qq);
      const ahead=b.d.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(b.ax,Math.sign(b.sp)*.05));
      if(info(ahead).elevation>-.05||info(nd).elevation>-.05){b.sp*=-1;}else b.d.copy(nd);
      const fwd=new THREE.Vector3().crossVectors(b.ax,b.d).multiplyScalar(Math.sign(b.sp));
      o3.position.copy(b.d).multiplyScalar(R+.012+Math.sin(performance.now()*.002+i)*.003);orient(o3,b.d,fwd);o3.scale.setScalar(.15);o3.updateMatrix();
      hulls.setMatrixAt(i,o3.matrix);sails.setMatrixAt(i,o3.matrix);});
    hulls.instanceMatrix.needsUpdate=sails.instanceMatrix.needsUpdate=true;
    // plane: flies a lap, then rests a bit (occasional visitor)
    pCycle+=dt;const flying=pCycle%40<22;plane.visible=flying;
    if(flying){pa+=dt*.3;qq.setFromAxisAngle(pAx,pa);const d=pStart.clone().applyQuaternion(qq);tmp.crossVectors(pAx,d);
      plane.position.copy(d).multiplyScalar(R*1.22);orient(plane,d,tmp);plane.rotateX(Math.sin(pa*2)*.25);prop.rotation.x+=dt*40;}
  }});
  return {lighthouse:LH,piers,boats,plane};
}
