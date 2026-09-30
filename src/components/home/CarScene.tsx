'use client';

import React from 'react';
import { Car } from '@/types';
import { SceneOverlays, sceneFlags, sceneStyle } from './SceneOverlays';

interface CarSceneProps {
  car: Car;
  alt: string;
  onImageError: () => void;
  className?: string;
}

/**
 * 2D 车辆渲染图 + 随状态叠加的动画图层。动画只是装饰，不表达任何数值；
 * 样式与 keyframes 在 globals.css 的 "首页渲染图动画" 一节。渲染图里车头朝左，充电口在右端车尾。
 * 由 CarStage 放置；3D 车模可用时被淡出替换。
 */
export function CarScene({ car, alt, onImageError, className = '' }: CarSceneProps) {
  const src = `/api/cars/${car.id}/image/`;
  const { driving, charging, dimmed, stopped } = sceneFlags(car);

  return (
    <div className={`scene absolute inset-0 overflow-hidden ${className}`} style={sceneStyle(car, src)} data-scene-state={car.state ?? undefined}>
      {/* 深色车身在深色主题下需要浅色衬底才看得清；充电时衬底变成绿色呼吸光 */}
      <div className={`absolute inset-x-6 top-1/4 bottom-[12%] rounded-[50%] blur-2xl pointer-events-none ${charging ? 'scene-breathe bg-emerald-500/40' : 'bg-zinc-400/25'}`} />

      <div className={`relative scale-110 ${driving && !stopped ? 'scene-bob' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`w-full aspect-[2/1] object-cover object-center select-none transition-[filter] duration-700 ${dimmed ? 'scene-dimmed' : ''}`}
          draggable={false}
          onError={onImageError}
        />
        {/* 光波用渲染图自身做遮罩，只亮在车身轮廓内 */}
        {charging && <div className="scene-sweep" aria-hidden />}
      </div>

      <SceneOverlays car={car} />
    </div>
  );
}
