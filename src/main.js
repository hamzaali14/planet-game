import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { createPlanet } from './planet.js';
import { createMoon } from './moon.js';
import { createStars } from './stars.js';
// Game core: later steps register systems (buildings, people, weather, quakes, aliens) via game.addSystem({update(dt){}}).
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.05,500);camera.position.set(0,6,18);
scene.add(new THREE.HemisphereLight('#cfe8ff','#334',0.9));
const sun=new THREE.DirectionalLight('#fff4e0',1.6);sun.position.set(20,10,15);scene.add(sun);
const planet=createPlanet();scene.add(planet.group);
const moon=createMoon();scene.add(moon.group);
scene.add(createStars());
const controls=new OrbitControls(camera,renderer.domElement);
Object.assign(controls,{enableDamping:true,dampingFactor:.08,enablePan:false,minDistance:planet.radius+0.9,maxDistance:40,rotateSpeed:.6,zoomSpeed:.9});
controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};
const systems=[{update:dt=>moon.update(dt)},{update:dt=>{planet.group.rotation.y+=dt*0.02;}}];
export const game={scene,camera,renderer,planet,controls,addSystem:s=>systems.push(s)};
window.game=game;
const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.1);
  // slower rotation when zoomed in
  controls.rotateSpeed=0.15+0.6*Math.min(1,(camera.position.length()-planet.radius)/15);
  systems.forEach(s=>s.update(dt));controls.update();renderer.render(scene,camera);});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
import { createTown } from './town.js';
game.town=createTown(game);
