'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 长按触发：按住满 ms 才调用 onComplete，中途松手 / 移出 / 取消都作废。
 * progress 0..1 供界面画进度圈；元素需加 select-none touch-none 以免触发滚动和系统菜单。
 */
export function useLongPress(onComplete: () => void, ms: number, disabled = false) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const complete = useRef(onComplete);
  complete.current = onComplete;

  const cancel = useCallback(() => {
    cancelAnimationFrame(raf.current);
    start.current = 0;
    setProgress(0);
  }, []);

  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = performance.now();
      const tick = (now: number) => {
        if (start.current === 0) return;
        const p = Math.min(1, (now - start.current) / ms);
        setProgress(p);
        if (p >= 1) {
          start.current = 0;
          setProgress(0);
          complete.current();
        } else {
          raf.current = requestAnimationFrame(tick);
        }
      };
      raf.current = requestAnimationFrame(tick);
    },
    [disabled, ms],
  );

  return {
    progress,
    handlers: {
      onPointerDown,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
    },
  };
}
