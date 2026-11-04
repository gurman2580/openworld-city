import * as THREE from "three";
import "./style.css";
import { createWorld, createCar } from "./world.js";
import { NetworkClient } from "./network.js";

const root=document.querySelector("#game");
const loading=document.querySelector("#loading");
const startScreen=document.querySelector("#start-screen");
const playButton=document.querySelector("#play");
const nameInput=document.querySelector("#player-name");
const connection=document.querySelector("#connection");
const playerCount=document.querySelector("#player-count");
const toastEl=document.querySelector("#toast");

const scene=new THREE.Scene();
scene.background=new THREE.Color("#9ab6c4");
scene.fog=new THREE.Fog("#9ab6c4",120,430);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
root.insertBefore(renderer.domElement,root.firstChild);

scene.add(new THREE.HemisphereLight("#dcecff","#53604f",2));
const sun=new THREE.DirectionalLight("#fff1d5",2.3);sun.position.set(-100,150,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-180;sun.shadow.camera.right=180;sun.shadow.camera.top=180;sun.shadow.camera.bottom=-180;scene.add(sun);

const {spawn}=createWorld(scene);
const player=new THREE.Group();
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.55,.9,5,10),new THREE.MeshStandardMaterial({color:"#d9a36f",roughness:.8}));
torso.position.y=1.25;torso.castShadow=true;player.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(.36,16,12),new THREE.MeshStandardMaterial({color:"#c98f65"}));head.position.y=2.1;head.castShadow=true;player.add(head);
const shirt=new THREE.Mesh(new THREE.BoxGeometry(.9,.7,.5),new THREE.MeshStandardMaterial({color:"#263c53"}));shirt.position.y=1.25;shirt.castShadow=true;player.add(shirt);
player.position.copy(spawn);scene.add(player);

const cars=[];
const carSpots=[[-13,0,32],[18,0,-32],[95,0,90],[-90,0,-90],[150,0,-145]];
carSpots.forEach((p,i)=>{const car=createCar(["#d35b3f","#3f82b9","#d4b14e","#4c9878","#777b86"][i]);car.position.set(...p);car.rotation.y=i%2?Math.PI/2:0;scene.add(car);cars.push(car);});
let activeCar=null, carSpeed=0, yaw=0, pitch=.18, cameraDistance=9;
const keys={};let pointerDown=false,lastPointer={x:0,y:0},started=false;
const remoteMeshes=new Map();
const clock=new THREE.Clock();
let toastTimer;
function toast(msg){toastEl.textContent=msg;toastEl.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove("show"),2400);}
function makeRemote(){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.55,.9,5,10),new THREE.MeshStandardMaterial({color:"#54b9b1"}));body.position.y=1.25;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.36,12,10),new THREE.MeshStandardMaterial({color:"#bd8b69"}));head.position.y=2.1;g.add(head);return g;}

const network=new NetworkClient((players)=>{
  const alive=new Set();
  for(const data of players){
    alive.add(data.id);
    let mesh=remoteMeshes.get(data.id);
    if(!mesh){mesh=makeRemote();scene.add(mesh);remoteMeshes.set(data.id,mesh);}
    mesh.position.set(data.x||0,0,data.z||0);mesh.rotation.y=data.rotation||0;
  }
  for(const [id,mesh] of remoteMeshes){if(!alive.has(id)){scene.remove(mesh);remoteMeshes.delete(id);}}
  playerCount.textContent=String(remoteMeshes.size+1);
},(status)=>{
  connection.classList.toggle("online",status==="online");
  connection.innerHTML=`<i></i> ${status==="online"?"ONLINE":"OFFLINE"}`;
  if(status==="online")toast("Connected to multiplayer room");
  else toast("Multiplayer offline — local free roam still works");
});

function enterGame(){
  if(started)return;started=true;
  const name=(nameInput.value.trim()||"Player").slice(0,18);
  network.connect(name);
  startScreen.style.display="none";
  toast("Explore the city. Find a car.");
}
playButton.addEventListener("click",enterGame);
nameInput.addEventListener("keydown",e=>{if(e.key==="Enter")enterGame();});
window.addEventListener("keydown",e=>{keys[e.code]=true;if(["Space","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault();if(e.code==="KeyE"&&started)toggleCar();});
window.addEventListener("keyup",e=>keys[e.code]=false);
renderer.domElement.addEventListener("pointerdown",e=>{pointerDown=true;lastPointer={x:e.clientX,y:e.clientY};});
window.addEventListener("pointerup",()=>pointerDown=false);
window.addEventListener("pointermove",e=>{if(!pointerDown||!started)return;const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;lastPointer={x:e.clientX,y:e.clientY};yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch+dy*.003,-.15,.8);});
function toggleCar(){
  if(activeCar){player.position.copy(activeCar.position);player.position.x+=Math.sin(activeCar.rotation.y)*-4;player.position.z+=Math.cos(activeCar.rotation.y)*-4;activeCar=null;carSpeed=0;player.visible=true;toast("You left the vehicle");return;}
  let nearest=null,dist=6;
  for(const car of cars){const d=car.position.distanceTo(player.position);if(d<dist){dist=d;nearest=car;}}
  if(nearest){activeCar=nearest;player.visible=false;toast("Vehicle entered — WASD to drive");}
  else toast("Move closer to a car to enter");
}
function update(dt){
  if(!started)return;
  const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
  const side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  if(activeCar){
    carSpeed+=(forward*22*dt);carSpeed*=Math.pow(.975,dt*60);carSpeed=THREE.MathUtils.clamp(carSpeed,-10,25);
    activeCar.rotation.y-=side*dt*(.7+Math.abs(carSpeed)*.035)*(carSpeed<0?-1:1);
    activeCar.translateZ(-carSpeed*dt);
    activeCar.position.x=THREE.MathUtils.clamp(activeCar.position.x,-310,310);
    activeCar.position.z=THREE.MathUtils.clamp(activeCar.position.z,-310,310);
    player.position.copy(activeCar.position);
  }else{
    const moving=forward!==0||side!==0;
    if(moving){
      const speed=keys.ShiftLeft||keys.ShiftRight?17:9;
      const direction=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
      const right=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
      const velocity=direction.multiplyScalar(forward).add(right.multiplyScalar(side)).normalize().multiplyScalar(speed*dt);
      player.position.add(velocity);
      player.rotation.y=Math.atan2(velocity.x,velocity.z);
    }
    if(keys.Space&&player.position.y<.03)player.userData.jump=7;
    if(player.userData.jump){player.position.y+=player.userData.jump*dt;player.userData.jump-=22*dt;if(player.position.y<0){player.position.y=0;player.userData.jump=0;}}
    player.position.x=THREE.MathUtils.clamp(player.position.x,-310,310);
    player.position.z=THREE.MathUtils.clamp(player.position.z,-310,310);
  }
  const target=activeCar?activeCar.position:player.position;
  const focus=target.clone().add(new THREE.Vector3(0,1.3,0));
  const horizontal=cameraDistance*Math.cos(pitch);
  const offset=new THREE.Vector3(Math.sin(yaw)*horizontal,3+Math.sin(pitch)*cameraDistance,Math.cos(yaw)*horizontal);
  camera.position.lerp(focus.clone().add(offset),1-Math.pow(.001,dt));
  camera.lookAt(focus);
  network.sendPosition(target,activeCar?activeCar.rotation.y:player.rotation.y,!!activeCar,nameInput.value.trim()||"Player");
}
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.04);
  update(dt);
  renderer.render(scene,camera);
}
animate();
loading.style.display="none";
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
window.addEventListener("beforeunload",()=>network.close());
