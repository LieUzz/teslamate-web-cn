'use client';

import React from 'react';
import Link from 'next/link';
import { Car, DriveSummary, ChargeSummary, UsageSummary as UsageSummaryData } from '@/types';
import { CarHero } from '@/components/home/CarHero';
import { AlertStrip } from '@/components/home/AlertStrip';
import { BodyStatus } from '@/components/home/BodyStatus';
import { UsageSummary } from '@/components/home/UsageSummary';
import { deriveAlerts } from '@/lib/alerts';
import { formatDistance, formatDuration, formatEnergy, formatEfficiency, formatCurrency, formatOrDash, formatPercent, DASH } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { Route, Zap, ChevronRight } from 'lucide-react';

interface MobileDashboardProps {
  car: Car;
  latestDrive?: DriveSummary;
  latestCharge?: ChargeSummary;
  usage: UsageSummaryData[];
  updateFailed: boolean;
}

export function MobileDashboard({ car, latestDrive, latestCharge, usage, updateFailed }: MobileDashboardProps) {
  return (
    <div className="space-y-3.5 pb-20 pt-1 px-2.5 max-w-lg mx-auto">
      <AlertStrip alerts={deriveAlerts(car)} />

      {/* 渲染图 + 电量 + 随状态切换的状态卡 */}
      <CarHero car={car} updateFailed={updateFailed} />

      <BodyStatus car={car} />

      <UsageSummary summaries={usage} />

      {/* 最近一次行程卡片 */}
      {!latestDrive && <Empty title="暂无行程记录" icon={Route} />}
      {latestDrive && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Route className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-50">最近行程</span>
            </div>
            <Link
              href={`/drives/${latestDrive.id}`}
              className="text-[11px] text-zinc-400 hover:text-zinc-50 flex items-center gap-0.5"
            >
              <span>查看轨迹</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">行驶里程 / 耗时</span>
              <span className="font-semibold text-zinc-50">
                {formatDistance(latestDrive.distance)} · {formatDuration(latestDrive.duration_min)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">消耗电量 / 能效</span>
              <span className="font-semibold text-emerald-400">
                {formatEnergy(latestDrive.consumption_kwh)} ({formatEfficiency(latestDrive.efficiency_wh_km)})
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-800/40 text-[11px] text-zinc-400 truncate">
              📍 {latestDrive.end_address ?? DASH}
            </div>
          </div>
        </div>
      )}

      {/* 最近一次充电卡片 */}
      {!latestCharge && <Empty title="暂无充电记录" icon={Zap} />}
      {latestCharge && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-50">最近充电</span>
            </div>
            <Link
              href={`/charges`}
              className="text-[11px] text-zinc-400 hover:text-zinc-50 flex items-center gap-0.5"
            >
              <span>充电明细</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">充入电量</span>
              <span className="font-semibold text-emerald-400">
                {latestCharge.charge_energy_added != null ? `+${formatEnergy(latestCharge.charge_energy_added)}` : DASH}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">电量与时长</span>
              <span className="font-semibold text-zinc-50">
                {formatPercent(latestCharge.start_battery_level)} → {formatPercent(latestCharge.end_battery_level)} ({formatDuration(latestCharge.duration_min)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">{latestCharge.cost != null && latestCharge.cost_source === 'configured' ? '充电费用 (估算)' : '充电费用'}</span>
              <span className="font-semibold text-amber-400">
                {formatCurrency(latestCharge.cost)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-3.5 py-3 text-[11px] text-zinc-400">
        <span>总里程 <strong className="text-zinc-50">{formatOrDash(car.odometer, { digits: 1, unit: 'km', locale: true })}</strong></span>
        <span>软件版本 <strong className="text-zinc-50">{car.version ?? DASH}</strong></span>
      </div>
    </div>
  );
}
