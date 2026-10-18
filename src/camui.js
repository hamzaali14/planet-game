import * as THREE from '../vendor/three.module.js';
// Big on-screen camera buttons: zoom, rotate arrows (hold to keep moving), home, plus smooth fly-to.
export function createCamUI(game){
  const {camera,controls,planet}=game,R=planet.radius;
  const css=document.createElement('style');css.textContent=`#cam{right:10px;top:50%;transform:translateY(-50%);display:grid;grid-template-columns:repeat(3,54px);grid-template-rows:repeat(5,54px);gap:5px;background:#0b2f5a88;padding:7px;border-radius:22px}
#cam .big{width:54px;height:54px;font-size:24px}#cam .e{visibility:hidden}
@media (max-width:640px){#cam{grid-template-columns:repeat(3,46px);grid-template-rows:repeat(5,46px);gap:4px}#cam .big{width:46px;height:46px;font-size:20px}}`;document.head.appendChild(css);
  const pad=document.createElement('div');pad.id='cam';pad.className='ui';document.body.appendChild(pad);
  const hold={};const layout=[['zin','➕'],['up','⬆️'],['zout','➖'],['left','⬅️'],['home','🏠'],['right','➡️'],['e',''],['down','⬇️'],['e','']];
  for(const [id,ic] of layout){const b=document.createElement('button');b.className='big'+(id==='e'?' e':'');b.textContent=ic;b.dataset.id=id;pad.appendChild(b);
    if(id==='e')continue;if(id==='home'){b.onclick=home;b.title='Reset view';continue;}
    const start=e=>{e.preventDefault();hold[id]=Math.max(hold[id]||0,.25)+1e-3;hold[id+'_on']=true;},stop=()=>{hold[id+'_on']=false;};
    b.addEventListener('pointerdown',start);b.addEventListener('pointerup',stop);b.addEventListener('pointerleave',stop);b.addEventListener('pointercancel',stop);}
  pad.style.gridTemplateRows='repeat(3,auto)';
  let anim=null;const sph=new THREE.Spherical();
  function flyTo(worldPt,dist,dur=.9){const to=worldPt.clone().normalize();anim={from:camera.position.clone().normalize(),to,d0:camera.position.length(),d1:dist,t:0,dur:Math.max(dur,.01)};}
  function home(){flyTo(new THREE.Vector3(0,5,17),17.7);}
  const q=new THREE.Quaternion(),qi=new THREE.Quaternion();
  game.addSystem({update(dt){
    if(anim){anim.t+=dt/anim.dur;const k=Math.min(1,anim.t),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      q.setFromUnitVectors(anim.from,anim.to);qi.identity().slerp(q,e);camera.position.copy(anim.from).applyQuaternion(qi).multiplyScalar(anim.d0+(anim.d1-anim.d0)*e);
      camera.lookAt(0,0,0);if(k>=1)anim=null;}
    const dist=camera.position.length(),sp=(.35+1.2*Math.min(1,(dist-R)/12))*dt;let moved=false;
    for(const id of ['zin','zout','left','right','up','down']){if(!(hold[id+'_on']||hold[id]>0))continue;hold[id]=Math.max(0,(hold[id]||0)-dt);moved=true;anim=null;
      sph.setFromVector3(camera.position);
      if(id==='zin'||id==='zout'){const k=Math.exp((id==='zin'?-1.3:1.3)*dt);sph.radius=Math.min(controls.maxDistance,Math.max(controls.minDistance,R+(sph.radius-R)*k));}
      if(id==='left')sph.theta-=sp*1.6;if(id==='right')sph.theta+=sp*1.6;if(id==='up')sph.phi=Math.max(.15,sph.phi-sp*1.6);if(id==='down')sph.phi=Math.min(Math.PI-.15,sph.phi+sp*1.6);
      camera.position.setFromSpherical(sph);}
    if(moved)camera.lookAt(0,0,0);}});
  return {flyTo,home,hold};
}
