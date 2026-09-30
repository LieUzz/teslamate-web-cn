'use client';

import React, { useEffect, useRef } from 'react';
import { Car } from '@/types';
import { PaintSpec } from '@/lib/carPaint';
import { createStage, Stage } from '@/lib/three/createScene';
import { CarRig, loadCarModel } from '@/lib/three/loadModel';
import { attachOrbit } from '@/lib/three/orbit';
import { playEntrance, playIdle, setHeroPose } from '@/lib/three/entrance';
import { createSceneState, SceneState, syncCarState } from '@/lib/three/stateSync';

interface CarScene3DProps {
  car: Car;
  src: string;
  paint: PaintSpec;
  credit: string | null;
  onReady: () => void;
  onFail: () => void;
}

const ENTRANCE_KEY = 'teslamate_entrance_played';

function entrancePlayed(): boolean {
  try {
    return sessionStorage.getItem(ENTRANCE_KEY) === '1';
  } catch {
    return false;
  }
}
function markEntrancePlayed() {
  try {
    sessionStorage.setItem(ENTRANCE_KEY, '1');
  } catch {
    /* 私密模式等情况下不可用，忽略 */
  }
}

/**
 * 3D 车模画布。所有 three 对象都在 ref 里，React 只负责挂载与传入最新的 car。
 * 加载失败 / WebGL 上下文丢失 → onFail，由 CarStage 回退到 2D。
 */
export function CarScene3D({ car, src, paint, credit, onReady, onFail }: CarScene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const rigRef = useRef<CarRig | null>(null);
  const stateRef = useRef<SceneState | null>(null);
  const carRef = useRef(car);
  const paintRef = useRef(paint);
  const callbacks = useRef({ onReady, onFail });
  carRef.current = car;
  paintRef.current = paint;
  callbacks.current = { onReady, onFail };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let lostTimer: ReturnType<typeof setTimeout> | undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = createStage(canvas);
    stageRef.current = stage;
    stage.resize();

    const detachOrbit = attachOrbit(stage, canvas);
    const ro = new ResizeObserver(() => stage.resize());
    ro.observe(canvas);

    // 不可见时不渲染
    let hidden = document.hidden;
    let offscreen = false;
    const updatePaused = () => stage.setPaused(hidden || offscreen);
    const onVisibility = () => {
      hidden = document.hidden;
      updatePaused();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const io = new IntersectionObserver((entries) => {
      offscreen = entries[0]?.isIntersecting === false;
      updatePaused();
    });
    io.observe(canvas);

    const fail = () => {
      if (disposed) return;
      callbacks.current.onFail();
    };
    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (disposed) return;
      lostTimer = setTimeout(fail, 3000);
    };
    const onContextRestored = () => {
      clearTimeout(lostTimer);
      stage.requestRender();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    loadCarModel(src, paintRef.current)
      .then((rig) => {
        if (disposed) {
          rig.dispose();
          return;
        }
        rigRef.current = rig;
        stage.carRoot.add(rig.root);
        const state = createSceneState(stage, rig, paintRef.current, reducedMotion);
        stateRef.current = state;
        syncCarState(stage, rig, state, carRef.current, paintRef.current);

        if (reducedMotion || entrancePlayed()) {
          setHeroPose(stage);
        } else {
          markEntrancePlayed();
          playEntrance(stage, () => playIdle(stage));
        }
        callbacks.current.onReady();
      })
      .catch((e) => {
        console.warn('car model failed', e instanceof Error ? e.message : e);
        fail();
      });

    return () => {
      disposed = true;
      clearTimeout(lostTimer);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
      ro.disconnect();
      detachOrbit();
      rigRef.current?.dispose();
      rigRef.current = null;
      stateRef.current = null;
      stage.dispose();
      stageRef.current = null;
    };
  }, [src]);

  // 车况变化 → 模型状态
  useEffect(() => {
    const stage = stageRef.current;
    const rig = rigRef.current;
    const state = stateRef.current;
    if (stage && rig && state) syncCarState(stage, rig, state, car, paint);
  }, [car, paint]);

  return <canvas ref={canvasRef} className="stage-canvas" role="img" aria-label={credit ?? undefined} />;
}
