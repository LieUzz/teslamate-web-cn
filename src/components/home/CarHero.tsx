'use client';

import React, { useState } from 'react';
import { Car } from '@/types';
import { BatteryRing } from '@/components/car/BatteryRing';
import { StateCard } from './StateCard';
import { DASH, formatOrDash, formatTimeAgo, getCarStateInfo } from '@/lib/formatters';
import { useNow } from '@/lib/useNow';

interface CarHeroProps {
  car: Car;
  // 最近一次轮询失败
  updateFailed: boolean;
}

function levelColor(level: number, charging: boolean): string {
  if (charging) return 'bg-emerald-500';
  if (level <= 20) return 'bg-red-500';
  if (level <= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function CarHero({ car, updateFailed }: CarHeroProps) {
  const now = useNow(30_000);
  // 渲染图取不到 (车型 / 颜色 / 轮毂不在对照表里，或特斯拉图片服务不可用) 时退回电量环
  const [imageFailed, setImageFailed] = useState(false);

  // state 为 null 表示还没有任何状态记录，不能当作"离线"
  const stateInfo =
    car.state == null
      ? { text: '状态未知', color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' }
      : getCarStateInfo(car.state);

  // 车型标签：优先 TeslaMate 的 marketing_name，其次 model 代号
  const modelLabel = car.marketing_name ?? (car.model ? `Model ${car.model}` : null);
  const title = car.name ?? modelLabel ?? DASH;
  const badge = [modelLabel, car.trim_badging ? `(${car.trim_badging})` : null].filter(Boolean).join(' ');
  const isCharging = car.state === 'charging';
  const level = car.battery_level;
  const asleepOrOffline = car.state === 'asleep' || car.state === 'offline';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/95 via-zinc-900/80 to-zinc-950/95 border border-zinc-800/80 p-4 sm:p-6 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-50 truncate">{title}</h1>
          {badge && badge !== title && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              {badge}
            </span>
          )}
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${stateInfo.bg} ${stateInfo.color} ${stateInfo.border}`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
          </span>
          <span className="whitespace-nowrap">{stateInfo.text}</span>
        </div>
      </div>

      {imageFailed ? (
        <div className="flex justify-center py-3">
          <BatteryRing level={level} rangeKm={car.range_km} isCharging={isCharging} />
        </div>
      ) : (
        <>
          <div className="relative mt-1 -mx-2 overflow-hidden">
            {/* 深色车身在深色主题下需要浅色衬底才看得清 */}
            <div className="absolute inset-x-6 top-1/4 bottom-[12%] rounded-[50%] bg-zinc-400/25 blur-2xl pointer-events-none" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/cars/${car.id}/image/`}
              alt={modelLabel ?? ''}
              className="relative w-full aspect-[2/1] object-cover object-center scale-110 select-none"
              draggable={false}
              onError={() => setImageFailed(true)}
            />
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-zinc-50">{level ?? DASH}</span>
              {level != null && <span className="text-base font-bold text-zinc-400">%</span>}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-zinc-50">{formatOrDash(car.range_km, { digits: 0, unit: 'km' })}</div>
              <div className="text-[10px] text-zinc-400">表显续航</div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 mt-2">
            {level != null && (
              <div
                className={`h-full rounded-full transition-all duration-700 ${levelColor(level, isCharging)}`}
                style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
              />
            )}
          </div>
        </>
      )}

      <div className="mt-3">
        <StateCard car={car} now={now} />
      </div>

      {/* 休眠 / 离线时状态卡已说明数据是此前的，这里不再显示同步时间 */}
      {!asleepOrOffline && (
        <div className="mt-2.5 text-[10px] text-zinc-500 text-right">
          {car.live_updated_at ? `最近同步 ${now == null ? DASH : formatTimeAgo(car.live_updated_at)}` : '尚未收到实时数据'}
          {updateFailed && <span className="text-amber-400"> · 更新失败，稍后重试</span>}
        </div>
      )}
    </div>
  );
}
