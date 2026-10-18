import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { createPlanet } from './planet.js';
import { createMoon } from './moon.js';
import { createStars } from './stars.js';
import { createClouds } from './clouds.js';
import { mulberry } from './noise.js';
import { createTown } from './town.js';
import { createDecor } from './decor.js';
import { createCamUI } from './camui.js';
import { createWeather } from './weather.js';
export function start(opts){
const seed=opts.seed;const _rnd=Math.random;Math.random=mulberry(seed*977+1);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);renderer.domElement.style.cssText='position:fixed;inset:0;z-index:1';document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.05,600);camera.position.set(0,5,17);scene.add(camera);
const hemi=new THREE.HemisphereLight('#d6f1ff','#4f8aa8',1.6);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0dc',2.6);sun.position.set(14,16,18);scene.add(sun);
const fill=new THREE.DirectionalLight('#7fd6ff',0.6);fill.position.set(-15,-4,-8);scene.add(fill);
const planet=createPlanet({seed});scene.add(planet.group);
const clouds=createClouds(planet.radius);planet.group.add(clouds.mesh);
const moon=createMoon();scene.add(moon.group);
const stars=createStars();scene.add(stars);
const controls=new OrbitControls(camera,renderer.domElement);
Object.assign(controls,{enableDamping:true,dampingFactor:.12,enablePan:false,minDistance:planet.radius+0.6,maxDistance:40,rotateSpeed:.6,zoomSpeed:1.1});
controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};
const systems=[];
const game={scene,camera,renderer,planet,controls,clouds,stars,lights:{hemi,sun,fill},spinPaused:false,shake:new THREE.Vector3(),
  opts,env:{drought:0,rain:false,night:0,nightTarget:0,quake:0,flood:0},addSystem:s=>systems.push(s)};
systems.push({update:dt=>moon.update(dt)},{update:dt=>{planet.update(dt,camera);clouds.update(dt,camera);}},
  {update:dt=>{const close=camera.position.length()<planet.radius+4;if(!game.spinPaused&&!close)planet.group.rotation.y+=dt*0.02;}});
window.game=game;
const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.1);
  controls.rotateSpeed=0.12+0.55*Math.min(1,(camera.position.length()-planet.radius)/15);
  systems.forEach(s=>s.update(dt));controls.update();
  camera.position.add(game.shake);renderer.render(scene,camera);camera.position.sub(game.shake);});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
game.decor=createDecor(game);Math.random=_rnd;
game.town=createTown(game);
game.camui=createCamUI(game);
game.weather=createWeather(game);
game.town.begin();
return game;}
