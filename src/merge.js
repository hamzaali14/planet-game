import * as THREE from '../vendor/three.module.js';
// Bake a building group's static child meshes into one mesh per material (few draw calls on phones).
// Children flagged userData.keep stay as live objects (animated parts).
export function mergeGroup(g){
  g.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(g.matrixWorld).invert(),byMat=new Map(),keep=[];
  g.traverse(o=>{if(o===g)return;if(o.userData.keep){keep.push(o);return;}if(!o.isMesh||hasKeepAncestor(o,g))return;
    const m=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(m);
    (byMat.get(o.material)||byMat.set(o.material,[]).get(o.material)).push(geo);});
  const out=new THREE.Group();
  for(const [mat,geos] of byMat){let n=0;geos.forEach(x=>n+=x.attributes.position.count);
    const P=new Float32Array(n*3),N=new Float32Array(n*3);let o=0;
    for(const x of geos){P.set(x.attributes.position.array,o*3);N.set(x.attributes.normal.array,o*3);o+=x.attributes.position.count;x.dispose();}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));
    const mesh=new THREE.Mesh(geo,mat);mesh.raycast=()=>{};out.add(mesh);}
  return {out,keep};
}
function hasKeepAncestor(o,g){for(let p=o.parent;p&&p!==g;p=p.parent)if(p.userData.keep)return true;return false;}
export function mergeGeos(list){let n=0;const gs=list.map(([g,m])=>{const x=(g.index?g.toNonIndexed():g.clone());x.applyMatrix4(m);n+=x.attributes.position.count;return x;});
  const P=new Float32Array(n*3),N=new Float32Array(n*3);let o=0;for(const x of gs){P.set(x.attributes.position.array,o*3);N.set(x.attributes.normal.array,o*3);o+=x.attributes.position.count;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));return geo;}
