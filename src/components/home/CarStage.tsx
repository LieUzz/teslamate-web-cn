'use client';

// 车辆舞台：先显示 2D 渲染图，若有 3D 车模 (且浏览器能跑) 则在后台加载，就绪后淡入替换。
// 3D 代码经 next/dynamic 按需加载，不进首屏 JS；任何失败都回到 2D。

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Car } from '@/types';
import { paintFor } from '@/lib/carPaint';
import { SCENE3D_FADE_MS } from '@/lib/constants';
import { CarScene } from './CarScene';
import { SceneOverlays, sceneFlags, sceneStyle } from './SceneOverlays';

const CarScene3D = dynamic(() => import('./CarScene3D').then((m) => m.CarScene3D), { ssr: false, loading: () => null });

type Mode = 'probing' | '2d' | 'loading3d' | 'fading' | '3d';

interface CarStageProps {
  car: Car;
  alt: string;
  onImageError: () => void;
}

function canRun3D(): boolean {
  if (typeof window === 'undefined' || !('WebGL2RenderingContext' in window)) return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem != null && mem < 2) return false;
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

export function CarStage({ car, alt, onImageError }: CarStageProps) {
  const [mode, setMode] = useState<Mode>('probing');
  const [credit, setCredit] = useState<string | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();
  const paint = paintFor(car);
  const modelSrc = `/api/cars/${car.id}/model/`;
  const imageSrc = `/api/cars/${car.id}/image/`;

  useEffect(() => {
    if (mode !== 'probing') return;
    if (!paint || !canRun3D()) {
      setMode('2d');
      return;
    }
    let cancelled = false;
    fetch(modelSrc, { method: 'HEAD' })
      .then((r) => {
        if (cancelled) return;
        setCredit(r.headers.get('x-model-credit'));
        setMode(r.ok ? 'loading3d' : '2d');
      })
      .catch(() => !cancelled && setMode('2d'));
    return () => {
      cancelled = true;
    };
  }, [mode, paint, modelSrc]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  const onReady = () => {
    setMode('fading');
    fadeTimer.current = setTimeout(() => setMode('3d'), SCENE3D_FADE_MS);
  };
  const onFail = () => {
    clearTimeout(fadeTimer.current);
    setMode('2d');
  };

  const show3d = paint != null && (mode === 'loading3d' || mode === 'fading' || mode === '3d');
  const { charging, sentry, dimmed } = sceneFlags(car);

  return (
    <div className="relative mt-1 -mx-2 aspect-[2/1]">
      {show3d && (
        <div
          className={`scene stage-3d absolute inset-0 overflow-hidden rounded-2xl ${mode === 'fading' || mode === '3d' ? 'stage-3d-visible' : ''}`}
          style={sceneStyle(car, imageSrc)}
          data-theme="dark"
          data-scene-state={car.state ?? undefined}
        >
          <div className="stage-spot" data-charging={charging || undefined} data-sentry={sentry || undefined} data-dimmed={dimmed || undefined} aria-hidden />
          <CarScene3D car={car} src={modelSrc} paint={paint} credit={credit} onReady={onReady} onFail={onFail} />
          <SceneOverlays car={car} />
        </div>
      )}
      {mode !== '3d' && <CarScene car={car} alt={alt} onImageError={onImageError} className={mode === 'fading' ? 'stage-fade-out' : ''} />}
    </div>
  );
}
