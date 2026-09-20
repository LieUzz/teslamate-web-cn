'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { DASH, formatOrDash } from '@/lib/formatters';

interface BatteryRingProps {
  level: number | null;
  rangeKm: number | null;
  isCharging?: boolean;
}

export function BatteryRing({ level, rangeKm, isCharging }: BatteryRingProps) {
  const radius = 64;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // 电量未知：进度环留空
  const hasLevel = level != null && Number.isFinite(level);
  const pct = hasLevel ? Math.min(100, Math.max(0, level)) : null;
  const strokeDashoffset = pct == null ? circumference : circumference - (pct / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct <= 20) return '#EF4444'; // red-500
    if (pct <= 50) return '#F59E0B'; // amber-500
    return '#10B981'; // emerald-500
  };

  const strokeColor = pct == null ? 'transparent' : isCharging ? '#10B981' : getColor(pct);

  return (
    <div className="flex flex-col items-center justify-center relative p-2">
      <div className="relative flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          {/* 背景环 */}
          <circle
            stroke="#27272A"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* 进度环 */}
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* 内部电量数字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline">
            <span className="text-2xl font-extrabold tracking-tight text-white">{hasLevel ? level : DASH}</span>
            {hasLevel && <span className="text-xs font-bold text-zinc-400 ml-0.5">%</span>}
          </div>
          {isCharging ? (
            <div className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold animate-pulse mt-0.5">
              <Zap className="w-3 h-3 fill-emerald-400" />
              <span>充电中</span>
            </div>
          ) : (
            <span className="text-[10px] text-zinc-400 font-medium">剩余电量</span>
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        <div className="text-xs font-semibold text-zinc-200">{formatOrDash(rangeKm, { digits: 0, unit: 'km' })}</div>
        <div className="text-[10px] text-zinc-500">表显续航</div>
      </div>
    </div>
  );
}
