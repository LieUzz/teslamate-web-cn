// 加载车模 (glb, meshopt 压缩)，归一化尺寸与朝向，并找出可动的部件。
// 约定：Y 向上，车头朝 -Z，轮胎接地 y=0，车长 SCENE3D_CAR_LENGTH_M。缺失的节点 / 动画一律为 null。
//
// 两种材质模式 (按模型自带信息判断)：
//  - keep  : 模型带贴图 (Tesla App 导出的官方 PBR 材质)，原样保留，只把车漆材质重上色；
//  - roles : 普通网格 (Sketchfab 等)，按材质名归类后换成 carMaterials 里的统一材质。

import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  Group,
  LoopOnce,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SCENE3D_CAR_LENGTH_M } from '@/lib/constants';
import { PaintSpec } from '@/lib/carPaint';
import { CarMaterials, createCarMaterials, roleForMaterialName } from './carMaterials';

export type Closure = 'frunk' | 'trunk' | 'door_fl' | 'door_fr' | 'door_rl' | 'door_rr' | 'charge_port';
export const CLOSURES: Closure[] = ['frunk', 'trunk', 'door_fl', 'door_fr', 'door_rl', 'door_rr', 'charge_port'];

export interface CarRig {
  root: Group;
  materialMode: 'keep' | 'roles';
  // 车漆材质 (roles 模式只有一个)；充电时发光的尾灯材质
  paintMaterials: MeshStandardMaterial[];
  rearLightMaterials: MeshStandardMaterial[];
  // 开合部件：优先用模型自带的动画片段 (Tesla App 导出)，否则转动铰链节点
  mixer: AnimationMixer | null;
  actions: Partial<Record<Closure, AnimationAction>>;
  hinges: Partial<Record<Closure, Object3D>>;
  wheels: Object3D[];
  // 充电口在车身坐标系里的位置 (充电光效用)
  chargePortPosition: Vector3;
  dispose(): void;
}

// 铰链节点名候选：离线脚本会统一成前者，后者兼容常见的原始命名
const HINGE_NAMES: Record<Closure, readonly string[]> = {
  door_fl: ['door_fl', 'Door_LF_Spatial', 'Door_LF', 'Door_FL'],
  door_fr: ['door_fr', 'Door_RF_Spatial', 'Door_RF', 'Door_FR'],
  door_rl: ['door_rl', 'Door_LR_Spatial', 'Door_LR', 'Door_RL'],
  door_rr: ['door_rr', 'Door_RR_Spatial', 'Door_RR'],
  frunk: ['frunk', 'Hood_Spatial', 'Hood', 'hood', 'bonnet'],
  trunk: ['trunk', 'Trunk_Spatial', 'Trunk', 'tailgate', 'Tailgate', 'liftgate'],
  charge_port: ['charge_port', 'Charge_Cap_Spatial', 'Chargeport', 'ChargePort', 'Charge_Cap', 'charge_port_door'],
};
const CHARGE_PORT_MARKER = ['charge_port_marker', 'ChargePortMarker'];

// Tesla App 导出的动画片段名 → 部件
const CLIP_PATTERNS: [Closure, RegExp][] = [
  ['frunk', /hood|frunk/i],
  ['trunk', /trunk|tailgate/i],
  ['door_fl', /^LF.?Door|door_fl|front.?left.?door/i],
  ['door_fr', /^RF.?Door|door_fr|front.?right.?door/i],
  ['door_rl', /^LR.?Door|door_rl|rear.?left.?door/i],
  ['door_rr', /^RR.?Door|door_rr|rear.?right.?door/i],
  ['charge_port', /charge.?port/i],
];

const PAINT_NAME = /paint|carpaint/i;
const PAINT_EXCLUDE = /fade/i;
const REAR_LIGHT_NAME = /tail|brake|rear.?light|light.?rear|lights?_trunk/i;

function findNode(root: Object3D, names: readonly string[]): Object3D | null {
  for (const n of names) {
    const found = root.getObjectByName(n);
    if (found) return found;
  }
  return null;
}

function materialsOf(mesh: Mesh): Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function hasTextures(root: Object3D): boolean {
  let found = false;
  root.traverse((o) => {
    if (found || !(o as Mesh).isMesh) return;
    for (const m of materialsOf(o as Mesh)) {
      const s = m as MeshStandardMaterial;
      if (s.map || s.normalMap || s.metalnessMap || s.roughnessMap || s.aoMap) found = true;
    }
  });
  return found;
}

function declaredMaterialMode(gltf: GLTF): 'keep' | 'roles' | null {
  const extras = (gltf.parser.json as { asset?: { extras?: { materialMode?: unknown } } }).asset?.extras;
  return extras?.materialMode === 'keep' || extras?.materialMode === 'roles' ? extras.materialMode : null;
}

// keep 模式：保留官方材质，只给车漆上色并保证有清漆层
function applyKeepMaterials(model: Object3D, paint: PaintSpec): { paint: MeshStandardMaterial[]; rear: MeshStandardMaterial[] } {
  const paintMats = new Set<MeshStandardMaterial>();
  const rearMats = new Set<MeshStandardMaterial>();
  model.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    for (const m of materialsOf(mesh)) {
      const name = m.name || '';
      const std = m as MeshStandardMaterial;
      if (PAINT_NAME.test(name) && !PAINT_EXCLUDE.test(name) && std.isMeshStandardMaterial) {
        std.color.setHex(paint.hex);
        std.metalness = paint.metallic;
        std.roughness = paint.roughness;
        std.envMapIntensity = 1.2;
        const phys = std as MeshPhysicalMaterial;
        if (phys.isMeshPhysicalMaterial) {
          phys.clearcoat = 1;
          phys.clearcoatRoughness = 0.08;
        }
        paintMats.add(std);
      } else if (REAR_LIGHT_NAME.test(name) && std.isMeshStandardMaterial) {
        rearMats.add(std);
      }
    }
  });
  return { paint: Array.from(paintMats), rear: Array.from(rearMats) };
}

// roles 模式：按材质名归类，全部换成统一材质
function applyRoleMaterials(model: Object3D, paint: PaintSpec): CarMaterials {
  const materials = createCarMaterials(paint);
  let paintCount = 0;
  const old = new Set<Material>();
  model.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const replaced = materialsOf(mesh).map((m) => {
      old.add(m);
      const role = roleForMaterialName(m.name || '');
      if (role === 'paint') paintCount += 1;
      return materials.byRole[role];
    });
    mesh.material = replaced.length === 1 ? replaced[0] : replaced;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
  });
  old.forEach((m) => m.dispose());
  if (paintCount === 0) {
    materials.dispose();
    throw new Error('model has no paint material');
  }
  return materials;
}

// 每个角落优先取轮子本体 (Wheel_LF)，没有再退到轮子枢轴 (Wheel_LF_Spatial)
function findWheels(model: Object3D): Object3D[] {
  const wheels: Object3D[] = [];
  for (const corner of ['LF', 'RF', 'LR', 'RR', 'FL', 'FR', 'RL']) {
    const node =
      model.getObjectByName(`Wheel_${corner}`) ??
      model.getObjectByName(`wheel_${corner.toLowerCase()}`) ??
      model.getObjectByName(`Wheel_${corner}_Spatial`);
    if (node && !wheels.includes(node)) wheels.push(node);
  }
  return wheels;
}

function buildActions(mixer: AnimationMixer, clips: AnimationClip[]): Partial<Record<Closure, AnimationAction>> {
  const actions: Partial<Record<Closure, AnimationAction>> = {};
  for (const clip of clips) {
    const match = CLIP_PATTERNS.find(([, re]) => re.test(clip.name));
    if (!match || actions[match[0]]) continue;
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.enabled = true;
    actions[match[0]] = action;
  }
  return actions;
}

export async function loadCarModel(url: string, paint: PaintSpec): Promise<CarRig> {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  // 导出时标记为不可见的部件 (灯光 "点亮" 网格、地面投影板等) 不显示
  model.traverse((o) => {
    if (o.userData?.visible === false) o.visible = false;
  });

  const materialMode = declaredMaterialMode(gltf) ?? (hasTextures(model) ? 'keep' : 'roles');
  let paintMaterials: MeshStandardMaterial[];
  let rearLightMaterials: MeshStandardMaterial[];
  let roleMaterials: CarMaterials | null = null;
  if (materialMode === 'keep') {
    const found = applyKeepMaterials(model, paint);
    if (found.paint.length === 0) throw new Error('model has no paint material');
    paintMaterials = found.paint;
    rearLightMaterials = found.rear;
  } else {
    roleMaterials = applyRoleMaterials(model, paint);
    paintMaterials = [roleMaterials.paint];
    rearLightMaterials = [roleMaterials.lightRear];
  }

  // 归一化：最长水平边 = 车长，中心归零，轮胎落地
  model.updateMatrixWorld(true);
  let box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const longest = Math.max(size.x, size.z) || 1;
  model.scale.setScalar(SCENE3D_CAR_LENGTH_M / longest);
  // 车长若在 X 轴上，转 90° 让车头朝 -Z (离线脚本已处理的模型这里不会触发)
  if (size.x > size.z) model.rotation.y = -Math.PI / 2;
  model.updateMatrixWorld(true);
  box = new Box3().setFromObject(model);
  const center = box.getCenter(new Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  model.updateMatrixWorld(true);

  const root = new Group();
  root.add(model);

  const hinges: Partial<Record<Closure, Object3D>> = {};
  for (const c of CLOSURES) {
    const node = findNode(model, HINGE_NAMES[c]);
    if (node) hinges[c] = node;
  }

  const mixer = gltf.animations.length > 0 ? new AnimationMixer(model) : null;
  const actions = mixer ? buildActions(mixer, gltf.animations) : {};

  const marker = findNode(model, CHARGE_PORT_MARKER) ?? hinges.charge_port ?? null;
  const chargePortPosition = marker
    ? root.worldToLocal(marker.getWorldPosition(new Vector3()))
    : new Vector3(-size.x * 0.48, 0.75, SCENE3D_CAR_LENGTH_M * 0.3); // 左后翼子板附近的估计位置

  return {
    root,
    materialMode,
    paintMaterials,
    rearLightMaterials,
    mixer,
    actions,
    hinges,
    wheels: findWheels(model),
    chargePortPosition,
    dispose() {
      mixer?.stopAllAction();
      root.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        if (materialMode === 'keep') {
          for (const m of materialsOf(mesh)) {
            const s = m as MeshStandardMaterial;
            [s.map, s.normalMap, s.metalnessMap, s.roughnessMap, s.aoMap, s.emissiveMap].forEach((t) => t?.dispose());
            m.dispose();
          }
        }
      });
      roleMaterials?.dispose();
      root.removeFromParent();
    },
  };
}
