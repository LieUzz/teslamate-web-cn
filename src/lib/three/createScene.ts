// 3D 舞台：渲染器、相机、灯光、地面与"按需渲染"的循环。
// 有 Animator 在跑才请求下一帧；页面隐藏 / 滚出视口时暂停。所有 three 对象都在这里创建和释放。

import {
  ACESFilmicToneMapping,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SCENE3D_HERO_POSE, SCENE3D_MAX_DPR } from '@/lib/constants';
import { Animator, clamp, degToRad } from './tween';

export interface CameraPose {
  r: number;
  yaw: number;
  pitch: number;
  fov: number;
}

export interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  carRoot: Group;
  keyLight: DirectionalLight;
  rimLight: DirectionalLight;
  // 相机 = 基础位姿 + 用户拖动偏移 + idle 摆动
  pose: CameraPose;
  userOffset: { yaw: number; pitch: number };
  idleOffset: { yaw: number; pitch: number };
  register(key: string, animator: Animator): void;
  unregister(key: string): void;
  has(key: string): boolean;
  requestRender(): void;
  setPaused(paused: boolean): void;
  setExposure(v: number): void;
  resize(): void;
  dispose(): void;
}

const TARGET = new Vector3(0, 0.6, 0);

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.75;

  const camera = new PerspectiveCamera(SCENE3D_HERO_POSE.fov, 2, 0.1, 60);

  const keyLight = new DirectionalLight(new Color(0xfff2e0), 2.4);
  keyLight.position.set(-4, 7, -5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 25;
  keyLight.shadow.camera.left = -4;
  keyLight.shadow.camera.right = 4;
  keyLight.shadow.camera.top = 4;
  keyLight.shadow.camera.bottom = -4;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);

  const rimLight = new DirectionalLight(new Color(0xbfd6ff), 1.2);
  rimLight.position.set(5, 4, 6);
  scene.add(rimLight);

  // 地面：接触阴影 + 极暗的微反射圆盘
  const floorDisc = new Mesh(
    new CircleGeometry(4.2, 72),
    new MeshStandardMaterial({ color: new Color(0x050508), roughness: 0.85, metalness: 0.25, transparent: true, opacity: 0.4 }),
  );
  floorDisc.rotation.x = -Math.PI / 2;
  floorDisc.position.y = -0.005;
  scene.add(floorDisc);

  const shadowCatcher = new Mesh(new CircleGeometry(4.2, 72), new ShadowMaterial({ opacity: 0.6 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const carRoot = new Group();
  scene.add(carRoot);

  const pose: CameraPose = { ...SCENE3D_HERO_POSE };
  const userOffset = { yaw: 0, pitch: 0 };
  const idleOffset = { yaw: 0, pitch: 0 };

  function applyCamera() {
    const yaw = degToRad(pose.yaw + userOffset.yaw + idleOffset.yaw);
    const pitch = degToRad(clamp(pose.pitch + userOffset.pitch + idleOffset.pitch, 1, 60));
    const r = pose.r;
    camera.position.set(
      TARGET.x + r * Math.cos(pitch) * Math.sin(yaw),
      TARGET.y + r * Math.sin(pitch),
      TARGET.z + r * Math.cos(pitch) * Math.cos(yaw),
    );
    if (camera.fov !== pose.fov) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(TARGET);
  }

  const animators = new Map<string, Animator>();
  let raf = 0;
  let paused = false;
  let disposed = false;
  let last = 0;

  function frame(now: number) {
    raf = 0;
    if (disposed) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const done: string[] = [];
    animators.forEach((animator, key) => {
      if (!animator(now, dt)) done.push(key);
    });
    done.forEach((key) => animators.delete(key));
    applyCamera();
    renderer.render(scene, camera);
    if (animators.size > 0 && !paused) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function requestRender() {
    if (disposed || paused || raf) return;
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    // 像素总量过大时降 DPR，照顾 iOS 显存
    let dpr = Math.min(window.devicePixelRatio || 1, SCENE3D_MAX_DPR);
    if (w * h * dpr * dpr > 3_500_000) dpr = Math.min(dpr, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  }

  return {
    renderer,
    scene,
    camera,
    carRoot,
    keyLight,
    rimLight,
    pose,
    userOffset,
    idleOffset,
    register(key, animator) {
      animators.set(key, animator);
      requestRender();
    },
    unregister(key) {
      animators.delete(key);
      requestRender();
    },
    has(key) {
      return animators.has(key);
    },
    requestRender,
    setPaused(p) {
      paused = p;
      if (p) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      } else {
        requestRender();
      }
    },
    setExposure(v) {
      renderer.toneMappingExposure = v;
      requestRender();
    },
    resize,
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      animators.clear();
      scene.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m?.dispose());
        }
      });
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
