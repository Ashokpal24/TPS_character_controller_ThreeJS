import { Clock } from "../node_modules/three/build/three.module.js";
import * as THREE from "../node_modules/three/build/three.module.js";
// import * as THREE from 'three'
import { OrbitControls } from "../node_modules/three/examples/jsm/controls/OrbitControls.js"
import {FBXLoader} from "../node_modules/three/examples/jsm/loaders/FBXLoader.js"

const clock=new Clock()
let delta=clock.getDelta();

const scene=new THREE.Scene();
var innerCamNode = new THREE.Group();
var outerCamNode = new THREE.Group();

scene.add(outerCamNode);

const camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,200);
camera.rotation.set(0,THREE.MathUtils.degToRad(-180),0)
camera.rotateX(THREE.MathUtils.degToRad(-15))
camera.position.set(5, 20, -25);
innerCamNode.add(camera);
outerCamNode.add(innerCamNode);

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

let light=new THREE.DirectionalLight(0xFFFFFF,1.0);
light.position.set(20,100,-100);
light.target.position.set(0,0,0);
light.castShadow=true;
light.shadow.bias=-0.001;
light.shadow.mapSize.width=4096;
light.shadow.mapSize.height=4096;
light.shadow.camera.near=0.1;
light.shadow.camera.far=200.0;
light.shadow.camera.left=200.0;
light.shadow.camera.right=-200.0;
light.shadow.camera.top=50.0;
light.shadow.camera.bottom=-50.0;
scene.add(light)

light=new THREE.AmbientLight(0x404040);
scene.add(light);

const plane=new THREE.Mesh(
    new THREE.PlaneGeometry(100,100,1,1),
    new THREE.MeshStandardMaterial({
        color:0xFFFFFF
    })
)
plane.castShadow=false;
plane.receiveShadow=true;
plane.rotation.x=-Math.PI/2;
scene.add(plane);

const direction = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
let translation;
let rotationAngle = 0;
let keys = {
  KeyW: 0,
  KeyS: 0,
  KeyD: 0,
  KeyA: 0
};
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

function onKeyDown(event) {
  keys[event.code] = 1;
}

function onKeyUp(event) {
  keys[event.code] = 0;
}
const mouseSensitivity = 0.002;
document.body.addEventListener(
"mousedown",
  function () {
    renderer.domElement.requestPointerLock();
    document.body.style.cursor = "none";
  },
  false
);
window.addEventListener("mousemove", onMouseMove);

function onMouseMove(event) {
  if (document.pointerLockElement === renderer.domElement) {
    var movementX =event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    var movementY =event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    outerCamNode.rotation.y -= movementX * mouseSensitivity;
    innerCamNode.rotation.x -= movementY * mouseSensitivity;
  }
}
let model;
let res;
let loadedCount=0;

const modelTree=new THREE.Group();
// Movement variables
const moveSpeed=1.0
const rotationSpeed = 0.05;

const animationsFiles=[
    'Idle.fbx',
    'Running.fbx',
    'Dancing.fbx'
]
const animationPath='./resources/swat/animations/';
const characterPath='./resources/swat/';
const actions={};
const loader=new FBXLoader();
let mixer=new THREE.AnimationMixer(scene);

const renderer=new THREE.WebGLRenderer({antialias: true});
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);



RAF();

const CharState={
    IDLE:'Idle',
    RUN:'Running',
    DANCE:'Dancing'
}
let currentMotionState=CharState.IDLE;
let newMotionState;

function updateState(newState){
    if(currentMotionState===newState)return;
    const preAction=res[currentMotionState];
    const nextAction=res[newState];
    nextAction.enabled=true;
    nextAction.crossFadeFrom(preAction,0.3,true)
    nextAction.play()
    currentMotionState=newState;
}
RAF();

let loadAnimations=new Promise(function(res,rej){
    loader.setPath(characterPath);
    loader.load('Swat.fbx',(fbx)=>{
        model=fbx
        model.scale.setScalar(0.1);
        model.traverse(c=>{
            c.castShadow=true;
        })
        scene.add(model)
        loader.setPath(animationPath);
        animationsFiles.forEach((animationsFile)=>{
            loader.load(animationsFile,function(object){
                const animName=animationsFile.split('.')[0];
                const animData=object.animations[0];
                const action=mixer.clipAction(animData);
                actions[animName]=action
                loadedCount++
                if (loadedCount===animationsFiles.length){
                    modelTree.add(model)
                    scene.add(modelTree)
                    res(actions);
                }
            })
        })
        
    })
})
async function loadAsyncAnim()
{
    try{
        res=await loadAnimations
        console.log(res)
        newMotionState=CharState.IDLE
        updateState(newMotionState);
        res[newMotionState].play()
    }
    catch(error){
        console.log(error)
    }
}
loadAsyncAnim();

function RAF(){

    if (model)  {
        let Zstrength = keys["KeyW"] - keys["KeyS"];
        let Xstrength = keys["KeyA"] - keys["KeyD"];
        direction.set(Xstrength, 0, Zstrength);
        targetQuaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          direction.equals(new THREE.Vector3(0, 0, 0))
            ? new THREE.Vector3(0, 0, 1)
            : direction
        );
        rotationAngle = Math.atan2(Xstrength, Zstrength);
        translation = direction.clone().multiplyScalar(moveSpeed);
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);
        modelTree.position.add(translation);
        model.quaternion.slerp(targetQuaternion, 0.05);
        outerCamNode.position.copy(modelTree.position);

        // camera.rotation.y+=0.01
        const isMoving=direction.equals(new THREE.Vector3(0,0,0));
        if (!isMoving){
            newMotionState=CharState.RUN
        }
        else{
            newMotionState=CharState.IDLE
        }
        updateState(newMotionState)
        
    }

    requestAnimationFrame(()=>{
        renderer.render(scene,camera);
        delta=clock.getDelta();
        if(mixer)mixer.update(delta);
        RAF()
    })
}