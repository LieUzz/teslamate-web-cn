// 拖动转视角：横向拖动改 yaw、纵向改 pitch，松手带惯性；不缩放。
// canvas 用 touch-action: pan-y，竖向手势仍然滚动页面

import { SCENE3D_HERO_POSE, SCENE3D_PITCH_RANGE_DEG, SCENE3D_YAW_LIMIT_DEG } from '@/lib/constants';
import { Stage } from './createScene';
import { clamp } from './tween';

const YAW_PER_PX = 0.35;
const PITCH_PER_PX = 0.15;
const FRICTION = 0.92;

export function attachOrbit(stage: Stage, canvas: HTMLCanvasElement): () => void {
  let active: number | null = null;
  let lastX = 0;
  let lastY = 0;
  let velocity = 0;
  const pitchMin = SCENE3D_PITCH_RANGE_DEG[0] - SCENE3D_HERO_POSE.pitch;
  const pitchMax = SCENE3D_PITCH_RANGE_DEG[1] - SCENE3D_HERO_POSE.pitch;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    active = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    velocity = 0;
    stage.unregister('orbit-inertia');
    // 用户接管后停止 idle 摆动
    stage.idleOffset.yaw = 0;
    stage.idleOffset.pitch = 0;
    stage.unregister('idle');
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (active !== e.pointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const dYaw = dx * YAW_PER_PX;
    stage.userOffset.yaw = clamp(stage.userOffset.yaw + dYaw, -SCENE3D_YAW_LIMIT_DEG, SCENE3D_YAW_LIMIT_DEG);
    stage.userOffset.pitch = clamp(stage.userOffset.pitch - dy * PITCH_PER_PX, pitchMin, pitchMax);
    velocity = dYaw;
    stage.requestRender();
  };
  const onUp = (e: PointerEvent) => {
    if (active !== e.pointerId) return;
    active = null;
    if (Math.abs(velocity) > 0.05) {
      stage.register('orbit-inertia', () => {
        stage.userOffset.yaw = clamp(stage.userOffset.yaw + velocity, -SCENE3D_YAW_LIMIT_DEG, SCENE3D_YAW_LIMIT_DEG);
        velocity *= FRICTION;
        return Math.abs(velocity) > 0.02;
      });
    }
  };
  const block = (e: Event) => e.preventDefault();

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', block, { passive: false });
  canvas.addEventListener('gesturestart', block);
  canvas.addEventListener('contextmenu', block);

  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('wheel', block);
    canvas.removeEventListener('gesturestart', block);
    canvas.removeEventListener('contextmenu', block);
  };
}
