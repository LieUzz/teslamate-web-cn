'use client';

import React from 'react';
import Link from 'next/link';
import { ParkingSummary, EnergyBreakdown, ParkingDrainAnalysis } from '@/types';
import { DrainAnalysis } from '@/components/parking/DrainAnalysis';
import { formatDuration, formatDateTime, formatOrDash, formatPercent, DASH } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { Moon, ChevronRight, Zap, Home, MapPin } from 'lucide-react';
import { sumKnown } from './helpers';

interface MobileParkingViewProps {
  parkings: ParkingSummary[];
  energy: EnergyBreakdown;
  analysis: ParkingDrainAnalysis;
}

export function MobileParkingView({ parkings, energy, analysis }: MobileParkingViewProps) {
  // 列表只含最近若干次停车：时长汇总仅针对所列记录；累计损耗与平均速率取全量统计 (energy)
  const listedMinutes = sumKnown(parkings, (p) => p.duration_min);
  const listedHours = listedMinutes != null ? listedMinutes / 60 : null;

  return (
    <div className="space-y-3 pb-24 pt-2 px-2.5 max-w-lg mx-auto">
      {/* 顶部统计汇总 */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-50">停车静置与漏电分析</h1>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {parkings.length} 次停车
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-zinc-950/60 p-2.5 rounded-2xl border border-zinc-800/60">
            <div className="text-[10px] text-zinc-400">累计静置损耗</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">{formatOrDash(energy.parking_drain_kwh, { digits: 1, unit: 'kWh' })}</div>
          </div>
          <div className="bg-zinc-950/60 p-2.5 rounded-2xl border border-zinc-800/60">
            <div className="text-[10px] text-zinc-400">平均漏电速率</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatOrDash(energy.avg_parking_drain_kwh_per_hour, { digits: 3, unit: 'kWh/h' })}</div>
          </div>
          <div className="bg-zinc-950/60 p-2.5 rounded-2xl border border-zinc-800/60">
            <div className="text-[10px] text-zinc-400">所列停车时长</div>
            <div className="text-sm font-bold text-zinc-50 mt-0.5">{formatOrDash(listedHours, { digits: 0, unit: '小时', locale: true })}</div>
          </div>
        </div>
      </div>

      {/* 掉电分析：趋势 / 分档 / 状态占比 */}
      <DrainAnalysis data={analysis} />

      {parkings.length === 0 && <Empty title="暂无停车记录" icon={Moon} />}

      {/* 停车流水列表 */}
      <div className="space-y-2.5">
        {parkings.map((p) => {
          return (
            <Link
              key={p.id}
              href={`/parking/${p.id}`}
              className="block bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-2xl p-3.5 shadow-md transition-all active:scale-[0.99]"
            >
              {/* 头部：时间与地点 */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/60">
                <span className="font-mono text-zinc-400">{formatDateTime(p.start_date)}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                  p.is_home === true
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                    : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {p.is_home === true ? <Home className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                  <span>{p.address ?? DASH}</span>
                </span>
              </div>

              {/* 中部：时长、掉电量、速率 */}
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-center bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/40 text-xs">
                <div>
                  <div className="text-[10px] text-zinc-400">停放时长</div>
                  <div className="font-semibold text-zinc-50 mt-0.5 whitespace-nowrap">
                    {formatDuration(p.duration_min)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-400">续航损失</div>
                  <div className={`font-semibold mt-0.5 whitespace-nowrap ${p.has_charge ? 'text-emerald-400' : 'text-zinc-200'}`}>
                    {p.has_charge ? '期间有充电' : formatOrDash(p.range_lost_km, { digits: 1, unit: 'km' })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-400">漏电速率</div>
                  <div className="font-semibold text-zinc-300 mt-0.5 whitespace-nowrap">
                    {formatOrDash(p.drain_rate_kwh_per_hour, { digits: 3, unit: 'kWh/h' })}
                  </div>
                </div>
              </div>

              {/* 底部：实测电量变化与下钻提示 */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5 truncate">
                  {p.is_current && (
                    <span className="text-blue-400 font-medium shrink-0">当前停车中</span>
                  )}
                  {p.has_charge && (
                    <span className="text-emerald-400 flex items-center gap-1 shrink-0">
                      <Zap className="w-3 h-3" /> 期间有充电
                    </span>
                  )}
                  <span className="truncate">
                    电量 {formatPercent(p.start_battery_level)} → {formatPercent(p.end_battery_level)}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 text-purple-400 shrink-0 font-medium">
                  <span>能耗详情</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
