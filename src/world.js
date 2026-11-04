import * as THREE from "three";

const mat = (color, roughness=0.9) => new THREE.MeshStandardMaterial({color, roughness});
export function createWorld(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat("#53645a"));
  ground.rotation.x = -Math.PI/2; ground.position.y = -0.08; ground.receiveShadow = true; scene.add(ground);

  const roadMat = mat("#252b30"), sidewalkMat = mat("#92999a"), lineMat = mat("#d6c78d");
  const roadWidth = 18, block = 58, extent = 290;
  for (let i=-5;i<=5;i++) {
    const p=i*block;
    const roadX=new THREE.Mesh(new THREE.PlaneGeometry(roadWidth,extent*2),roadMat);
    roadX.rotation.x=-Math.PI/2;roadX.position.set(p,0,0);roadX.receiveShadow=true;scene.add(roadX);
    const roadZ=new THREE.Mesh(new THREE.PlaneGeometry(extent*2,roadWidth),roadMat);
    roadZ.rotation.x=-Math.PI/2;roadZ.position.set(0,0.005,p);roadZ.receiveShadow=true;scene.add(roadZ);
    for(let side of [-1,1]){
      const sx=new THREE.Mesh(new THREE.PlaneGeometry(3,extent*2),sidewalkMat);sx.rotation.x=-Math.PI/2;sx.position.set(p+side*10.5,.02,0);scene.add(sx);
      const sz=new THREE.Mesh(new THREE.PlaneGeometry(extent*2,3),sidewalkMat);sz.rotation.x=-Math.PI/2;sz.position.set(0,.02,p+side*10.5);scene.add(sz);
    }
    for(let z=-extent;z<extent;z+=16){
      const dash=new THREE.Mesh(new THREE.PlaneGeometry(.22,6),lineMat);dash.rotation.x=-Math.PI/2;dash.position.set(p,.035,z);scene.add(dash);
      const dash2=new THREE.Mesh(new THREE.PlaneGeometry(6,.22),lineMat);dash2.rotation.x=-Math.PI/2;dash2.position.set(z,.035,p);scene.add(dash2);
    }
  }

  const buildingMats=["#78838b","#9b8d7c","#65747b","#a9a49a","#59676d","#b5a58e"].map(c=>mat(c));
  const windowMat=new THREE.MeshStandardMaterial({color:"#9cc5ce",metalness:.25,roughness:.25,emissive:"#243b43",emissiveIntensity:.35});
  for(let gx=-5;gx<5;gx++) for(let gz=-5;gz<5;gz++){
    if(Math.abs(gx)<=1&&Math.abs(gz)<=1) continue;
    const cx=gx*block+block/2, cz=gz*block+block/2;
    const count=1+Math.floor(Math.random()*2);
    for(let b=0;b<count;b++){
      const w=12+Math.random()*18,d=12+Math.random()*18,h=12+Math.random()*65;
      const x=cx+(Math.random()-.5)*25,z=cz+(Math.random()-.5)*25;
      const building=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingMats[Math.floor(Math.random()*buildingMats.length)]);
      building.position.set(x,h/2,z);building.castShadow=true;building.receiveShadow=true;scene.add(building);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(w+.5,.5,d+.5),mat("#3b454a"));roof.position.set(x,h+.25,z);scene.add(roof);
      // Simple lit window bands on the visible front and side faces.
      for(let y=4;y<h-2;y+=4){
        for(let xx=-w/2+2;xx<w/2-1;xx+=4){
          const win=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.5),windowMat);
          win.position.set(x+xx,y,z+d/2+.015);scene.add(win);
        }
      }
    }
  }

  // Central plaza and a small waterfront feature.
  const plaza=new THREE.Mesh(new THREE.BoxGeometry(40,.25,34),mat("#a9aaa1"));plaza.position.set(0,.08,0);scene.add(plaza);
  const fountain=new THREE.Mesh(new THREE.CylinderGeometry(5,5,.8,32),mat("#657e83"));fountain.position.set(0,.6,0);scene.add(fountain);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,.15,32),new THREE.MeshStandardMaterial({color:"#4e9eae",metalness:.45,roughness:.2}));water.position.set(0,1.08,0);scene.add(water);

  // Street lamps.
  const lampMat=mat("#30383b");
  for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++){
    const px=x*block+13,pz=z*block+13;
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,6,8),lampMat);pole.position.set(px,3,pz);scene.add(pole);
    const bulb=new THREE.PointLight("#ffd99a",.45,18);bulb.position.set(px,5.8,pz);scene.add(bulb);
  }
  return { spawn: new THREE.Vector3(0,0,32) };
}

export function createCar(color="#d35b3f") {
  const group=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(3.1,1.05,5.2),mat(color,.45));body.position.y=.85;body.castShadow=true;group.add(body);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(2.55,.95,2.65),new THREE.MeshStandardMaterial({color:"#263b46",metalness:.3,roughness:.25}));cabin.position.set(0,1.75,-.25);cabin.castShadow=true;group.add(cabin);
  const wheelMat=mat("#111416"), wheelGeo=new THREE.CylinderGeometry(.48,.48,.32,16);
  for(const x of [-1.58,1.58])for(const z of [-1.65,1.65]){
    const wheel=new THREE.Mesh(wheelGeo,wheelMat);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.5,z);group.add(wheel);
  }
  const lightMat=new THREE.MeshBasicMaterial({color:"#fff0c2"});
  for(const x of [-.95,.95]){const light=new THREE.Mesh(new THREE.BoxGeometry(.5,.22,.08),lightMat);light.position.set(x,.9,2.65);group.add(light);}
  return group;
}
