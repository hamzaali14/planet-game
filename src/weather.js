import * as THREE from '../vendor/three.module.js';
// Weather & event panel: rain, earthquake, flood, drought, day/night.
export function createWeather(game){
  const {camera,planet,lights,clouds,stars,env,town}=game,R=planet.radius;
  const css=document.createElement('style');css.textContent=`#wx{left:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px;background:#0b2f5a88;padding:7px;border-radius:22px}
@media (max-width:640px){#wx .big{width:48px;height:48px;font-size:21px}}`;document.head.appendChild(css);
  const pan=document.createElement('div');pan.id='wx';pan.className='ui';document.body.appendChild(pan);const B={};
  for(const [id,ic,lb] of [['rain','🌧️','Rain'],['quake','📳','Quake'],['flood','🌊','Flood'],['drought','☀️','Drought'],['night','🌙','Night']]){
    const b=document.createElement('button');b.className='big';b.innerHTML=`${ic}<span>${lb}</span>`;pan.appendChild(b);B[id]=b;b.onclick=()=>act(id);}
  let quakeT=0,floodT=0,rainT=0;
  function act(id){
    if(id==='rain'){env.rain=!env.rain;rainT=env.rain?40:0;if(env.rain){env.drought=0;town.say('🌧️ Rain! Crops grow faster','#2a7fd8cc');}}
    if(id==='quake'&&quakeT<=0){quakeT=4;town.say('📳 Rumble rumble! Hold on tight!','#c97a1ccc');setTimeout(()=>town.quakeDamage(),1500);}
    if(id==='flood'&&floodT<=0){floodT=10;town.say('🌊 Splash! The sea is rising… it will go back soon','#2a7fd8cc');}
    if(id==='drought'){env.drought=env.drought>0?0:30;if(env.drought){env.rain=false;town.say('☀️ Super sunny and dry. Wells help!','#d9822bcc');}}
    if(id==='night'){env.nightTarget=env.nightTarget>.5?0:1;}
    sync();}
  function sync(){B.rain.classList.toggle('on',env.rain);B.drought.classList.toggle('on',env.drought>0);B.night.innerHTML=env.nightTarget>.5?'☀️<span>Day</span>':'🌙<span>Night</span>';}
  // rain streaks in camera space
  const N=500,rg=new THREE.BufferGeometry(),rp=new Float32Array(N*6),seeds=[];
  for(let i=0;i<N;i++)seeds.push([Math.random()*16-8,Math.random()*10-5,-2-Math.random()*10,Math.random()]);
  rg.setAttribute('position',new THREE.BufferAttribute(rp,3));const rain=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:'#d8ecff',transparent:true,opacity:.55,depthWrite:false}));
  rain.frustumCulled=false;rain.visible=false;camera.add(rain);
  const night=document.getElementById('night'),starMats=[];stars.traverse(o=>{if(o.material)starMats.push(o.material);});
  const dayHemi=new THREE.Color('#d6f1ff'),nightHemi=new THREE.Color('#5a6fd8'),dayGr=new THREE.Color('#4f8aa8'),nightGr=new THREE.Color('#1c2450');
  const cm=clouds.mesh.material,cDay=new THREE.Color('#ffffff'),cRain=new THREE.Color('#8d97ab');let rk=0,t=0;
  const water=planet.water;
  game.addSystem({update(dt){t+=dt;
    if(rainT>0){rainT-=dt;if(rainT<=0){env.rain=false;sync();}}
    if(env.drought>0){env.drought-=dt;if(env.drought<=0){env.drought=0;sync();}}
    rk+=((env.rain?1:0)-rk)*Math.min(1,dt*1.5);cm.color.copy(cDay).lerp(cRain,rk);cm.emissiveIntensity=.35*(1-rk)*(1-env.night*.7);
    rain.visible=rk>.05;rain.material.opacity=.55*rk;
    if(rain.visible){for(let i=0;i<N;i++){const s=seeds[i];s[1]-=dt*9;if(s[1]<-5)s[1]+=10;const o=i*6;rp[o]=s[0];rp[o+1]=s[1];rp[o+2]=s[2];rp[o+3]=s[0]+.05;rp[o+4]=s[1]-.35;rp[o+5]=s[2];}rg.attributes.position.needsUpdate=true;}
    // quake
    if(quakeT>0){quakeT-=dt;env.quake=Math.min(1,quakeT/1.5)*Math.min(1,(4-quakeT)*3);const a=.06*env.quake*Math.min(1,(camera.position.length()-R)/4+.3);
      game.shake.set(Math.sin(t*53)*a,Math.sin(t*61+1)*a,Math.sin(t*47+2)*a);}else{env.quake=0;game.shake.set(0,0,0);}
    // flood: sea rises then recedes
    if(floodT>0){floodT-=dt;const k=floodT>7?(10-floodT)/3:floodT>3?1:floodT/3;env.flood=k*k*(3-2*k);}else env.flood=0;
    water.scale.setScalar(1+env.flood*.011);
    // day / night
    env.night+=(env.nightTarget-env.night)*Math.min(1,dt*.8);const n=env.night;
    lights.sun.intensity=2.6*(1-.88*n)*(1-.35*rk)*(env.drought>0?1.15:1);lights.hemi.intensity=1.6*(1-.6*n)*(1-.25*rk);lights.fill.intensity=.6+.5*n;
    lights.hemi.color.copy(dayHemi).lerp(nightHemi,n);lights.hemi.groundColor.copy(dayGr).lerp(nightGr,n);lights.sun.color.set(env.drought>0?'#ffd9a0':'#fff0dc');
    night.style.opacity=n;starMats.forEach(m=>m.opacity=.5+.5*n);
  }});
  sync();return {act,B};
}
