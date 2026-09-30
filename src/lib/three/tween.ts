// 极简补间：返回一个 Animator，由 createScene 的渲染循环驱动，完成后自动注销

export type Animator = (now: number, dt: number) => boolean; // 返回 false 表示结束

export type Easing = (t: number) => number;

export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: Easing = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const linear: Easing = (t) => t;

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const degToRad = (d: number) => (d * Math.PI) / 180;

export function tween(from: number, to: number, ms: number, easing: Easing, onUpdate: (v: number) => void): Animator {
  let start = -1;
  return (now) => {
    if (start < 0) start = now;
    const k = ms <= 0 ? 1 : Math.min(1, (now - start) / ms);
    onUpdate(lerp(from, to, easing(k)));
    return k < 1;
  };
}
