'use client';

import React from 'react';
import { Car } from '@/types';
import {
  SCENE_CHARGE_SECONDS_AT_50_KW,
  SCENE_CHARGE_SECONDS_RANGE,
  SCENE_ROAD_SECONDS_AT_100_KMH,
  SCENE_ROAD_SECONDS_RANGE,
} from '@/lib/constants';

interface CarSceneProps {
  car: Car;
  alt: string;
  onImageError: () => void;
}

const clamp = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, v));

// 数值越大动画越快；未知时取上下限的中间值匀速播放
function duration(value: number | null, secondsAtReference: number, reference: number, range: readonly [number, number]): number {
  if (value == null || value <= 0) return (range[0] + range[1]) / 2;
  return clamp((secondsAtReference * reference) / value, range);
}

/**
 * 车辆渲染图 + 随状态叠加的动画图层。动画只是装饰，不表达任何数值；
 * 样式与 keyframes 在 globals.css 的 "首页渲染图动画" 一节。渲染图里车头朝左，充电口在右端车尾。
 */
export function CarScene({ car, alt, onImageError }: CarSceneProps) {
  const src = `/api/cars/${car.id}/image/`;
  const driving = car.state === 'driving';
  const charging = car.state === 'charging';
  const asleep = car.state === 'asleep';
  const dimmed = asleep || car.state === 'offline';
  const sentry = car.is_sentry_mode === true && !driving && !dimmed;
  const climate = car.is_climate_on === true && !dimmed;

  // 等红灯 (车速为 0) 时路面停住；车速未知时匀速
  const stopped = driving && car.speed === 0;
  const roadSeconds = duration(car.speed, SCENE_ROAD_SECONDS_AT_100_KMH, 100, SCENE_ROAD_SECONDS_RANGE);
  const chargeSeconds = duration(car.charging.charger_power_kw, SCENE_CHARGE_SECONDS_AT_50_KW, 50, SCENE_CHARGE_SECONDS_RANGE);

  // 空调气流颜色：车内比室外冷 = 制冷，热 = 制热；任一温度未知用中性色
  const airTone =
    car.inside_temp == null || car.outside_temp == null || car.inside_temp === car.outside_temp
      ? 'scene-air-neutral'
      : car.inside_temp < car.outside_temp
        ? 'scene-air-cool'
        : 'scene-air-warm';

  const sceneStyle = {
    '--scene-road-duration': `${roadSeconds}s`,
    '--scene-charge-duration': `${chargeSeconds}s`,
    '--scene-play-state': stopped ? 'paused' : 'running',
    '--scene-mask': `url(${src})`,
  } as React.CSSProperties;

  return (
    <div className="scene relative mt-1 -mx-2 overflow-hidden" style={sceneStyle} data-scene-state={car.state ?? undefined}>
      {/* 深色车身在深色主题下需要浅色衬底才看得清；充电时衬底变成绿色呼吸光 */}
      <div className={`absolute inset-x-6 top-1/4 bottom-[12%] rounded-[50%] blur-2xl pointer-events-none ${charging ? 'scene-breathe bg-emerald-500/40' : 'bg-zinc-400/25'}`} />

      {sentry && <div className="scene-radar" aria-hidden />}

      {driving && (
        <div className="scene-road" aria-hidden>
          <div className="scene-road-dashes" />
        </div>
      )}

      {/* 速度线在车身后面 */}
      {driving && (
        <div className="scene-streaks" aria-hidden>
          <span /><span /><span />
        </div>
      )}

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

      {charging && (
        <div className="scene-particles" aria-hidden>
          <span /><span /><span /><span />
        </div>
      )}

      {climate && (
        <svg className={`scene-air ${airTone}`} viewBox="0 0 120 30" fill="none" aria-hidden>
          <path d="M5 8 q10 -6 20 0 t20 0 t20 0" />
          <path d="M30 16 q10 -6 20 0 t20 0 t20 0" />
          <path d="M12 24 q10 -6 20 0 t20 0 t20 0" />
        </svg>
      )}

      {asleep && (
        <div className="scene-zzz text-indigo-400" aria-hidden>
          <span>Z</span><span>z</span><span>z</span>
        </div>
      )}
    </div>
  );
}
