// 加载车模 (glb, meshopt 压缩)，归一化尺寸与朝向，按材质名换成统一材质，并找出可动的节点。
// 约定：Y 向上，车头朝 -Z，轮胎接地 y=0，车长 SCENE3D_CAR_LENGTH_M。缺失的节点一律为 null。

import { Box3, Group, Material, Mesh, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SCENE3D_CAR_LENGTH_M } from '@/lib/constants';
import { PaintSpec } from '@/lib/carPaint';
import { CarMaterials, createCarMaterials, roleForMaterialName } from './carMaterials';

export interface CarRig {
  root: Group;
  materials: CarMaterials;
  doors: { fl: Object3D | null; fr: Object3D | null; rl: Object3D | null; rr: Object3D | null };
  frunk: Object3D | null;
  trunk: Object3D | null;
  chargePort: Object3D | null;
  wheels: Object3D[];
  // 充电口在车身坐标系里的位置 (充电光效用)
  chargePortPosition: Vector3;
}

// 节点名候选：离线脚本会统一成前者，后者兼容常见的原始命名
const NODE_NAMES = {
  door_fl: ['door_fl', 'Door_LF', 'Door_FL', 'door_front_left'],
  door_fr: ['door_fr', 'Door_RF', 'Door_FR', 'door_front_right'],
  door_rl: ['door_rl', 'Door_LR', 'Door_RL', 'door_rear_left'],
  door_rr: ['door_rr', 'Door_RR', 'door_rear_right'],
  frunk: ['frunk', 'Hood', 'hood', 'bonnet'],
  trunk: ['trunk', 'Trunk', 'tailgate', 'Tailgate', 'liftgate'],
  charge_port: ['charge_port', 'Chargeport', 'ChargePort', 'Charge_Cap', 'charge_port_door'],
  charge_port_marker: ['charge_port_marker', 'ChargePortMarker'],
} as const;

const WHEEL_NAMES = /^(wheel_(fl|fr|rl|rr)|Wheel_(LF|RF|LR|RR)(_Spatial)?)$/i;

function findNode(root: Object3D, names: readonly string[]): Object3D | null {
  for (const n of names) {
    const found = root.getObjectByName(n);
    if (found) return found;
  }
  return null;
}

export async function loadCarModel(url: string, paint: PaintSpec): Promise<CarRig> {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  // 材质替换：按原材质名归类；原材质与贴图随后释放
  const materials = createCarMaterials(paint);
  let paintCount = 0;
  const old = new Set<Material>();
  model.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const replaced = mats.map((m) => {
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

  const wheels: Object3D[] = [];
  model.traverse((o) => {
    if (WHEEL_NAMES.test(o.name)) wheels.push(o);
  });

  const marker = findNode(model, NODE_NAMES.charge_port_marker) ?? findNode(model, NODE_NAMES.charge_port);
  const chargePortPosition = marker
    ? root.worldToLocal(marker.getWorldPosition(new Vector3()))
    : new Vector3(-size.x * 0.48, 0.75, SCENE3D_CAR_LENGTH_M * 0.3); // 左后翼子板附近的估计位置

  return {
    root,
    materials,
    doors: {
      fl: findNode(model, NODE_NAMES.door_fl),
      fr: findNode(model, NODE_NAMES.door_fr),
      rl: findNode(model, NODE_NAMES.door_rl),
      rr: findNode(model, NODE_NAMES.door_rr),
    },
    frunk: findNode(model, NODE_NAMES.frunk),
    trunk: findNode(model, NODE_NAMES.trunk),
    chargePort: findNode(model, NODE_NAMES.charge_port),
    wheels,
    chargePortPosition,
  };
}

export function disposeRig(rig: CarRig) {
  rig.root.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh) mesh.geometry?.dispose();
  });
  rig.materials.dispose();
  rig.root.removeFromParent();
}
