// 把 Car 的实时状态映射到模型：漆色、轮转、铰链开合、充电 / 哨兵光效、休眠变暗。
// 未知 (null) 的值不动模型；缺失的节点直接跳过。

import { Color, Object3D, PointLight } from 'three';
import { Car } from '@/types';
import { PaintSpec } from '@/lib/carPaint';
import { SCENE3D_DIM_EXPOSURE, SCENE3D_HINGE_DEG, SCENE3D_HINGE_MS, SCENE3D_WHEEL_RADIUS_M } from '@/lib/constants';
import { Stage } from './createScene';
import { CarRig } from './loadModel';
import { degToRad, easeInOutCubic, tween } from './tween';

const KEY_LIGHT_COLOR = new Color(0xfff2e0);
const RIM_LIGHT_COLOR = new Color(0xbfd6ff);
const CHARGE_GREEN = new Color(0x34d399);
const SENTRY_RED = new Color(0xf87171);

export interface SceneState {
  chargeLight: PointLight;
  reducedMotion: boolean;
  lastPaintHex: number;
}

export function createSceneState(stage: Stage, rig: CarRig, paint: PaintSpec, reducedMotion: boolean): SceneState {
  const chargeLight = new PointLight(CHARGE_GREEN, 0, 3.5, 2);
  chargeLight.position.copy(rig.chargePortPosition);
  rig.root.add(chargeLight);
  return { chargeLight, reducedMotion, lastPaintHex: paint.hex };
}

function hinge(stage: Stage, node: Object3D | null, open: boolean | null, angleDeg: number, axis: 'x' | 'y', reducedMotion: boolean) {
  if (!node || open == null) return;
  const target = open ? degToRad(angleDeg) : 0;
  const current = node.rotation[axis];
  if (Math.abs(current - target) < 1e-3) return;
  const key = `hinge:${node.uuid}`;
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
    rig.materials.paint.metalness = paint.metallic;
    rig.materials.paint.roughness = paint.roughness;
    stage.register('paint', tween(0, 1, 600, easeInOutCubic, (k) => {
      rig.materials.paint.color.copy(from).lerp(to, k);
    }));
  }

  // 铰链。左侧门绕 y 轴负向开，右侧正向；前盖 / 尾门绕 x 轴
  const d = SCENE3D_HINGE_DEG;
  hinge(stage, rig.doors.fl, car.doors.driver_front, -d.door, 'y', state.reducedMotion);
  hinge(stage, rig.doors.rl, car.doors.driver_rear, -d.door, 'y', state.reducedMotion);
  hinge(stage, rig.doors.fr, car.doors.passenger_front, d.door, 'y', state.reducedMotion);
  hinge(stage, rig.doors.rr, car.doors.passenger_rear, d.door, 'y', state.reducedMotion);
  hinge(stage, rig.frunk, car.frunk_open, -d.frunk, 'x', state.reducedMotion);
  hinge(stage, rig.trunk, car.trunk_open, d.trunk, 'x', state.reducedMotion);
  hinge(stage, rig.chargePort, car.charging.charge_port_door_open, d.chargePort, 'y', state.reducedMotion);

  // 轮子：按车速转；车速未知时慢速转
  if (driving && !state.reducedMotion && rig.wheels.length > 0 && car.speed !== 0) {
    const omega = car.speed != null && car.speed > 0 ? car.speed / 3.6 / SCENE3D_WHEEL_RADIUS_M : 1;
    stage.register('wheels', (_now, dt) => {
      for (const w of rig.wheels) w.rotation.x -= omega * dt;
      return true;
    });
  } else {
    stage.unregister('wheels');
  }

  // 充电：充电口点光 + 尾灯绿色脉冲
  if (charging) {
    state.chargeLight.color.copy(CHARGE_GREEN);
    rig.materials.lightRear.emissive.copy(CHARGE_GREEN);
    if (state.reducedMotion) {
      state.chargeLight.intensity = 6;
      rig.materials.lightRear.emissiveIntensity = 0.8;
      stage.unregister('charge-pulse');
      stage.requestRender();
    } else {
      stage.register('charge-pulse', (now) => {
        const k = 0.5 + 0.5 * Math.sin(now / 420);
        state.chargeLight.intensity = 3 + 6 * k;
        rig.materials.lightRear.emissiveIntensity = 0.3 + 0.9 * k;
        return true;
      });
    }
  } else {
    stage.unregister('charge-pulse');
    state.chargeLight.intensity = 0;
    rig.materials.lightRear.emissive.set(0xff2a2a);
    rig.materials.lightRear.emissiveIntensity = 0.25;
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
