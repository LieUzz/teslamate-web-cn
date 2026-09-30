// 把 Car 的实时状态映射到模型：漆色、轮转、开合部件、充电 / 哨兵光效、休眠变暗。
// 未知 (null) 的值不动模型；缺失的部件直接跳过。

import { Color, Object3D, PointLight, Quaternion, Vector3 } from 'three';
import { Car } from '@/types';
import { PaintSpec } from '@/lib/carPaint';
import { SCENE3D_DIM_EXPOSURE, SCENE3D_HINGE_DEG, SCENE3D_HINGE_MS, SCENE3D_WHEEL_RADIUS_M } from '@/lib/constants';
import { Stage } from './createScene';
import { CarRig, Closure } from './loadModel';
import { degToRad, easeInOutCubic, tween } from './tween';

const KEY_LIGHT_COLOR = new Color(0xfff2e0);
const RIM_LIGHT_COLOR = new Color(0xbfd6ff);
const CHARGE_GREEN = new Color(0x34d399);
const SENTRY_RED = new Color(0xf87171);
const REAR_LIGHT_RED = new Color(0xff2a2a);
const WORLD_X = new Vector3(1, 0, 0);

export interface SceneState {
  chargeLight: PointLight;
  reducedMotion: boolean;
  lastPaintHex: number;
  // 尾灯材质原本的自发光，充电结束后恢复
  rearLightDefaults: { emissive: Color; intensity: number }[];
}

export function createSceneState(stage: Stage, rig: CarRig, paint: PaintSpec, reducedMotion: boolean): SceneState {
  const chargeLight = new PointLight(CHARGE_GREEN, 0, 3.5, 2);
  chargeLight.position.copy(rig.chargePortPosition);
  rig.root.add(chargeLight);
  return {
    chargeLight,
    reducedMotion,
    lastPaintHex: paint.hex,
    rearLightDefaults: rig.rearLightMaterials.map((m) => ({ emissive: m.emissive.clone(), intensity: m.emissiveIntensity })),
  };
}

// 铰链方向：左侧门绕 y 轴负向开，右侧正向；前盖 / 尾门绕 x 轴
const HINGE: Record<Closure, { axis: 'x' | 'y'; deg: number }> = {
  door_fl: { axis: 'y', deg: -SCENE3D_HINGE_DEG.door },
  door_rl: { axis: 'y', deg: -SCENE3D_HINGE_DEG.door },
  door_fr: { axis: 'y', deg: SCENE3D_HINGE_DEG.door },
  door_rr: { axis: 'y', deg: SCENE3D_HINGE_DEG.door },
  frunk: { axis: 'x', deg: -SCENE3D_HINGE_DEG.frunk },
  trunk: { axis: 'x', deg: SCENE3D_HINGE_DEG.trunk },
  charge_port: { axis: 'y', deg: SCENE3D_HINGE_DEG.chargePort },
};

function hinge(stage: Stage, node: Object3D, open: boolean, closure: Closure, reducedMotion: boolean) {
  const { axis, deg } = HINGE[closure];
  const target = open ? degToRad(deg) : 0;
  const current = node.rotation[axis];
  if (Math.abs(current - target) < 1e-3) return;
  const key = `hinge:${closure}`;
  if (reducedMotion) {
    node.rotation[axis] = target;
    stage.unregister(key);
    stage.requestRender();
    return;
  }
  stage.register(key, tween(current, target, SCENE3D_HINGE_MS, easeInOutCubic, (v) => {
    node.rotation[axis] = v;
  }));
}

// 模型自带的开合动画：0 = 关，片段末尾 = 开；正放开、倒放关
function playClosure(rig: CarRig, closure: Closure, open: boolean, reducedMotion: boolean): boolean {
  const action = rig.actions[closure];
  if (!action || !rig.mixer) return false;
  const duration = action.getClip().duration;
  const atTarget = open ? action.time >= duration - 1e-3 : action.time <= 1e-3;
  if (atTarget && !action.isRunning()) return false;
  if (reducedMotion) {
    action.play();
    action.time = open ? duration : 0;
    action.paused = true;
    rig.mixer.update(0);
    return false;
  }
  action.enabled = true;
  action.paused = false;
  action.timeScale = open ? 1 : -1;
  if (!action.isRunning()) action.play();
  return true;
}

export function syncCarState(stage: Stage, rig: CarRig, state: SceneState, car: Car, paint: PaintSpec) {
  const driving = car.state === 'driving';
  const charging = car.state === 'charging';
  const dimmed = car.state === 'asleep' || car.state === 'offline';
  const sentry = car.is_sentry_mode === true && !driving && !dimmed;

  // 漆色变化时平滑过渡
  if (paint.hex !== state.lastPaintHex) {
    const from = new Color(state.lastPaintHex);
    const to = new Color(paint.hex);
    state.lastPaintHex = paint.hex;
    for (const m of rig.paintMaterials) {
      m.metalness = paint.metallic;
      m.roughness = paint.roughness;
    }
    stage.register('paint', tween(0, 1, 600, easeInOutCubic, (k) => {
      for (const m of rig.paintMaterials) m.color.copy(from).lerp(to, k);
    }));
  }

  // 开合部件
  const wanted: Record<Closure, boolean | null> = {
    door_fl: car.doors.driver_front,
    door_rl: car.doors.driver_rear,
    door_fr: car.doors.passenger_front,
    door_rr: car.doors.passenger_rear,
    frunk: car.frunk_open,
    trunk: car.trunk_open,
    charge_port: car.charging.charge_port_door_open,
  };
  let animating = false;
  for (const closure of Object.keys(wanted) as Closure[]) {
    const open = wanted[closure];
    if (open == null) continue;
    if (rig.actions[closure]) {
      animating = playClosure(rig, closure, open, state.reducedMotion) || animating;
    } else if (rig.hinges[closure]) {
      hinge(stage, rig.hinges[closure]!, open, closure, state.reducedMotion);
    }
  }
  if (rig.mixer && (animating || !stage.has('mixer'))) {
    const mixer = rig.mixer;
    const actions = Object.values(rig.actions);
    stage.register('mixer', (_now, dt) => {
      mixer.update(dt);
      return actions.some((a) => a?.isRunning());
    });
  }

  // 轮子：绕车身 X 轴 (轮轴) 转，与轮子节点自身的朝向无关；车速未知时慢速转
  if (driving && !state.reducedMotion && rig.wheels.length > 0 && car.speed !== 0) {
    const omega = car.speed != null && car.speed > 0 ? car.speed / 3.6 / SCENE3D_WHEEL_RADIUS_M : 1;
    const q = new Quaternion();
    const axis = new Vector3();
    stage.register('wheels', (_now, dt) => {
      for (const w of rig.wheels) {
        w.getWorldQuaternion(q);
        axis.copy(WORLD_X).applyQuaternion(q.invert());
        w.rotateOnAxis(axis, -omega * dt);
      }
      return true;
    });
  } else {
    stage.unregister('wheels');
  }

  // 充电：充电口点光 + 尾灯绿色脉冲
  if (charging) {
    state.chargeLight.color.copy(CHARGE_GREEN);
    for (const m of rig.rearLightMaterials) m.emissive.copy(CHARGE_GREEN);
    if (state.reducedMotion) {
      state.chargeLight.intensity = 6;
      for (const m of rig.rearLightMaterials) m.emissiveIntensity = 0.8;
      stage.unregister('charge-pulse');
      stage.requestRender();
    } else {
      stage.register('charge-pulse', (now) => {
        const k = 0.5 + 0.5 * Math.sin(now / 420);
        state.chargeLight.intensity = 3 + 6 * k;
        for (const m of rig.rearLightMaterials) m.emissiveIntensity = 0.3 + 0.9 * k;
        return true;
      });
    }
  } else {
    stage.unregister('charge-pulse');
    state.chargeLight.intensity = 0;
    rig.rearLightMaterials.forEach((m, i) => {
      const d = state.rearLightDefaults[i];
      if (d) {
        m.emissive.copy(d.emissive);
        m.emissiveIntensity = d.intensity;
      } else {
        m.emissive.copy(REAR_LIGHT_RED);
        m.emissiveIntensity = 0.25;
      }
    });
  }

  // 哨兵：轮廓光变红并脉冲
  if (sentry) {
    stage.rimLight.color.copy(SENTRY_RED);
    if (state.reducedMotion) {
      stage.rimLight.intensity = 1.8;
      stage.unregister('sentry-pulse');
    } else {
      stage.register('sentry-pulse', (now) => {
        stage.rimLight.intensity = 1.2 + 0.8 * (0.5 + 0.5 * Math.sin(now / 900));
        return true;
      });
    }
  } else {
    stage.unregister('sentry-pulse');
    stage.rimLight.color.copy(RIM_LIGHT_COLOR);
    stage.rimLight.intensity = 1.2;
  }
  stage.keyLight.color.copy(KEY_LIGHT_COLOR);

  // 休眠 / 离线：压暗曝光 (入场动画进行中不抢曝光)
  if (!stage.has('entrance')) {
    const targetExposure = dimmed ? SCENE3D_DIM_EXPOSURE : 1;
    const current = stage.renderer.toneMappingExposure;
    if (Math.abs(current - targetExposure) > 1e-3) {
      if (state.reducedMotion) stage.setExposure(targetExposure);
      else stage.register('exposure', tween(current, targetExposure, 700, easeInOutCubic, (v) => stage.setExposure(v)));
    }
  }

  stage.requestRender();
}
