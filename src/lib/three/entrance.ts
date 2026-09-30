// 入场：相机从低正前方推拉旋转到英雄位，曝光由暗到亮；随后一段时间内极慢摆动，然后停止渲染

import { SCENE3D_ENTRANCE_FROM, SCENE3D_ENTRANCE_MS, SCENE3D_HERO_POSE, SCENE3D_IDLE_SECONDS } from '@/lib/constants';
import { Stage } from './createScene';
import { easeOutCubic, lerp } from './tween';

export function playEntrance(stage: Stage, onDone?: () => void) {
  const from = SCENE3D_ENTRANCE_FROM;
  const to = SCENE3D_HERO_POSE;
  let start = -1;
  stage.pose.r = from.r;
  stage.pose.yaw = from.yaw;
  stage.pose.pitch = from.pitch;
  stage.pose.fov = from.fov;
  stage.setExposure(0);
  stage.register('entrance', (now) => {
    if (start < 0) start = now;
    const t = Math.min(1, (now - start) / SCENE3D_ENTRANCE_MS);
    const k = easeOutCubic(t);
    stage.pose.r = lerp(from.r, to.r, k);
    stage.pose.yaw = lerp(from.yaw, to.yaw, k);
    stage.pose.pitch = lerp(from.pitch, to.pitch, k);
    stage.pose.fov = lerp(from.fov, to.fov, k);
    stage.renderer.toneMappingExposure = Math.min(1, t / 0.27);
    if (t >= 1) {
      onDone?.();
      return false;
    }
    return true;
  });
}

export function setHeroPose(stage: Stage) {
  stage.pose.r = SCENE3D_HERO_POSE.r;
  stage.pose.yaw = SCENE3D_HERO_POSE.yaw;
  stage.pose.pitch = SCENE3D_HERO_POSE.pitch;
  stage.pose.fov = SCENE3D_HERO_POSE.fov;
  stage.requestRender();
}

// 入场后的轻微摆动；到时后归零并结束 (之后没有动画就不再渲染)
export function playIdle(stage: Stage) {
  let start = -1;
  stage.register('idle', (now) => {
    if (start < 0) start = now;
    const t = (now - start) / 1000;
    if (t > SCENE3D_IDLE_SECONDS) {
      stage.idleOffset.yaw = 0;
      stage.idleOffset.pitch = 0;
      return false;
    }
    // 最后 2 秒淡出摆动，避免突然停住
    const fade = Math.min(1, (SCENE3D_IDLE_SECONDS - t) / 2);
    stage.idleOffset.yaw = Math.sin(t * 0.25) * 1.2 * fade;
    stage.idleOffset.pitch = Math.sin(t * 0.17) * 0.4 * fade;
    return true;
  });
}
