'use client';

import React from 'react';
import Link from 'next/link';
import { ParkingSummary, EnergyBreakdown, ParkingDrainAnalysis } from '@/types';
import { DrainAnalysis } from '@/components/parking/DrainAnalysis';
import { formatDuration, formatDateTime, formatOrDash, formatPercent, DASH } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { Moon, Home, MapPin, ChevronRight, Zap } from 'lucide-react';
import { sumKnown } from './helpers';

interface DesktopParkingViewProps {
  parkings: ParkingSummary[];
  energy: EnergyBreakdown;
  analysis: ParkingDrainAnalysis;
}

export function DesktopParkingView({ parkings, energy, analysis }: DesktopParkingViewProps) {
  // 列表只含最近若干次停车：时长汇总仅针对所列记录；累计损耗与平均速率取全量统计 (energy)
  const listedMinutes = sumKnown(parkings, (p) => p.duration_min);
  const listedHours = listedMinutes != null ? listedMinutes / 60 : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 顶部统计汇总 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-5 rounded-3xl border border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-400" />
            <span>停车静置与漏电专项大盘</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            每次停车期间的续航与电量变化明细 (下方列出最近 {parkings.length} 次)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-zinc-900 px-3.5 py-2 rounded-2xl border border-zinc-800">
            <div className="text-zinc-400">累计停车损耗</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">{formatOrDash(energy.parking_drain_kwh, { digits: 1, unit: 'kWh' })}</div>
          </div>
          <div className="bg-zinc-900 px-3.5 py-2 rounded-2xl border border-zinc-800">
            <div className="text-zinc-400">平均漏电速率</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatOrDash(energy.avg_parking_drain_kwh_per_hour, { digits: 3, unit: 'kWh/h' })}</div>
          </div>
          <div className="bg-zinc-900 px-3.5 py-2 rounded-2xl border border-zinc-800">
            <div className="text-zinc-400">所列停车时长</div>
            <div className="text-sm font-bold text-zinc-50 mt-0.5">{formatOrDash(listedHours, { digits: 0, unit: '小时', locale: true })}</div>
          </div>
        </div>
      </div>

      {/* 掉电分析：趋势 / 分档 / 状态占比 */}
      <DrainAnalysis data={analysis} />

      {/* 宽表记录 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800/80">
                <th className="pb-3 font-semibold">开始停车时间</th>
                <th className="pb-3 font-semibold">结束停车时间</th>
                <th className="pb-3 font-semibold">停车地点</th>
                <th className="pb-3 font-semibold">停留时长</th>
                <th className="pb-3 font-semibold">掉电量 / 掉续航</th>
                <th className="pb-3 font-semibold">平均漏电速率</th>
                <th className="pb-3 font-semibold">电量变化</th>
                <th className="pb-3 font-semibold text-right">能耗详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
              {parkings.length === 0 && <Empty as="row" colSpan={8} title="暂无停车记录" icon={Moon} />}
              {parkings.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 font-mono text-zinc-400 whitespace-nowrap">
                    {formatDateTime(p.start_date)}
                  </td>
                  <td className="py-3.5 font-mono text-zinc-400 whitespace-nowrap">
                    {p.is_current ? <span className="text-blue-400 font-sans font-medium">当前停车中</span> : formatDateTime(p.end_date)}
                  </td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${
                      p.is_home === true ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {p.is_home === true ? <Home className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      <span>{p.address ?? DASH}</span>
                    </span>
                  </td>
                  <td className="py-3.5 text-zinc-50 font-medium whitespace-nowrap">
                    {formatDuration(p.duration_min)}
                  </td>
                  <td className="py-3.5 whitespace-nowrap font-semibold">
                    {p.has_charge ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> 期间有充电
                      </span>
                    ) : (
                      <span className="text-zinc-200">
                        {formatOrDash(p.energy_lost_kwh, { digits: 2, unit: 'kWh' })}{' '}
                        <span className="text-zinc-500 font-normal">({formatOrDash(p.range_lost_km, { digits: 1, unit: 'km' })})</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-zinc-400 font-mono whitespace-nowrap">
                    {formatOrDash(p.drain_rate_kwh_per_hour, { digits: 3, unit: 'kWh/h' })}
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    {formatPercent(p.start_battery_level)} → {formatPercent(p.end_battery_level)}
                  </td>
                  <td className="py-3.5 text-right whitespace-nowrap">
                    <Link
                      href={`/parking/${p.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-medium transition-colors text-xs border border-purple-500/20"
                    >
                      <span>查看详情</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
