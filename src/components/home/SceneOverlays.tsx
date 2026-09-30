'use client';

import React from 'react';
import { Car } from '@/types';
import {
  SCENE_CHARGE_SECONDS_AT_50_KW,
  SCENE_CHARGE_SECONDS_RANGE,
  SCENE_ROAD_SECONDS_AT_100_KMH,
  SCENE_ROAD_SECONDS_RANGE,
} from '@/lib/constants';

const clamp = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, v));

// 数值越大动画越快；未知时取上下限的中间值匀速播放
function duration(value: number | null, secondsAtReference: number, reference: number, range: readonly [number, number]): number {
  if (value == null || value <= 0) return (range[0] + range[1]) / 2;
  return clamp((secondsAtReference * reference) / value, range);
}

export function sceneFlags(car: Car) {
  const driving = car.state === 'driving';
  const charging = car.state === 'charging';
  const asleep = car.state === 'asleep';
  const dimmed = asleep || car.state === 'offline';
  return {
    driving,
    charging,
    asleep,
    dimmed,
    sentry: car.is_sentry_mode === true && !driving && !dimmed,
    climate: car.is_climate_on === true && !dimmed,
    // 等红灯 (车速为 0) 时路面停住
    stopped: driving && car.speed === 0,
  };
}

// 覆盖层动画用到的 CSS 变量 (2D / 3D 舞台共用)
export function sceneStyle(car: Car, imageSrc: string): React.CSSProperties {
  const { stopped } = sceneFlags(car);
  const roadSeconds = duration(car.speed, SCENE_ROAD_SECONDS_AT_100_KMH, 100, SCENE_ROAD_SECONDS_RANGE);
  const chargeSeconds = duration(car.charging.charger_power_kw, SCENE_CHARGE_SECONDS_AT_50_KW, 50, SCENE_CHARGE_SECONDS_RANGE);
  return {
    '--scene-road-duration': `${roadSeconds}s`,
    '--scene-charge-duration': `${chargeSeconds}s`,
    '--scene-play-state': stopped ? 'paused' : 'running',
    '--scene-mask': `url(${imageSrc})`,
  } as React.CSSProperties;
}

/**
 * 随车辆状态叠加的装饰图层 (雷达 / 路面 / 速度线 / 充电粒子 / 空调气流 / Zzz)。
 * 只动 transform / opacity；样式在 globals.css 的 "首页渲染图动画" 一节。
 */
export function SceneOverlays({ car }: { car: Car }) {
  const { driving, charging, asleep, sentry, climate } = sceneFlags(car);

  // 空调气流颜色：车内比室外冷 = 制冷，热 = 制热；任一温度未知用中性色
  const airTone =
    car.inside_temp == null || car.outside_temp == null || car.inside_temp === car.outside_temp
      ? 'scene-air-neutral'
      : car.inside_temp < car.outside_temp
        ? 'scene-air-cool'
        : 'scene-air-warm';

  return (
    <>
      {sentry && <div className="scene-radar" aria-hidden />}

      {driving && (
        <div className="scene-road" aria-hidden>
          <div className="scene-road-dashes" />
        </div>
      )}

      {driving && (
        <div className="scene-streaks" aria-hidden>
          <span /><span /><span />
        </div>
      )}

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
    </>
  );
}
