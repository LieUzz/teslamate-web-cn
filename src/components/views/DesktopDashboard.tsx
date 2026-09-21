'use client';

import React from 'react';
import Link from 'next/link';
import { Car, DriveSummary, ChargeSummary, LifetimeStats, UsageSummary as UsageSummaryData } from '@/types';
import { CarHero } from '@/components/home/CarHero';
import { AlertStrip } from '@/components/home/AlertStrip';
import { BodyStatus } from '@/components/home/BodyStatus';
import { UsageSummary } from '@/components/home/UsageSummary';
import { deriveAlerts } from '@/lib/alerts';
import { StatCard } from '@/components/common/StatCard';
import { formatDistance, formatDuration, formatEnergy, formatEfficiency, formatCurrency, formatDateTime, formatOrDash, formatPercent, DASH } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import {
  Route,
  TrendingUp,
  Zap,
  Activity,
  Gauge,
  ChevronRight
} from 'lucide-react';

interface DesktopDashboardProps {
  car: Car;
  drives: DriveSummary[];
  charges: ChargeSummary[];
  stats: LifetimeStats;
  usage: UsageSummaryData[];
  updateFailed: boolean;
}

export function DesktopDashboard({ car, drives, charges, stats, usage, updateFailed }: DesktopDashboardProps) {
  // 每公里电费：只用 TeslaMate 有记录的里程，且费用已知时才计算
  const costPerKm =
    stats.total_charge_cost != null && stats.logged_distance_km != null && stats.logged_distance_km > 0
      ? stats.total_charge_cost / stats.logged_distance_km
      : null;
  const recentDrives = drives.slice(0, 5);
  const recentCharges = charges.slice(0, 4);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AlertStrip alerts={deriveAlerts(car)} />

      {/* 左：渲染图 + 状态卡；右：车身一览 + 用车小结 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <CarHero car={car} updateFailed={updateFailed} />
        <div className="space-y-6">
          <BodyStatus car={car} />
          <UsageSummary summaries={usage} />
        </div>
      </div>

      {/* 四大核心汇总指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="车辆总里程"
          value={formatOrDash(stats.total_distance_km, { digits: 0, locale: true })}
          unit="km"
          icon={Gauge}
          subtext={`已记录 ${formatOrDash(stats.logged_distance_km, { digits: 1, locale: true })} km · ${stats.total_drives} 段连贯行程`}
          highlight
        />
        <StatCard
          title="平均行驶能耗"
          value={formatOrDash(stats.avg_efficiency_wh_km, { digits: 0 })}
          unit="Wh/km"
          icon={TrendingUp}
          subtext={`累计消耗 ${formatOrDash(stats.total_energy_kwh, { digits: 1, locale: true })} kWh`}
        />
        <StatCard
          title="充电累计充入"
          value={formatOrDash(stats.total_charge_energy_added, { digits: 1, locale: true })}
          unit="kWh"
          icon={Zap}
          subtext={`充电 ${stats.total_charges} 次`}
        />
        <StatCard
          title="累计充电总花费"
          value={formatOrDash(stats.total_charge_cost, { digits: 1, locale: true })}
          unit="元"
          icon={Activity}
          subtext={[
            `按已记录里程 ${costPerKm != null ? `¥${costPerKm.toFixed(3)}` : DASH} / km`,
            stats.unpriced_charge_count > 0 ? `${stats.unpriced_charge_count} 次充电无费用数据，未计入` : null,
          ].filter(Boolean).join(' · ')}
        />
      </div>

      {/* 主体两列布局：左侧最近行程宽表 + 右侧充电大盘 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近行程宽表 (占 2 列) */}
        <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-50">最近行程记录</h3>
                <p className="text-xs text-zinc-400">最新完成的车辆驾驶轨迹与能耗详情</p>
              </div>
            </div>
            <Link
              href="/drives"
              className="text-xs text-zinc-400 hover:text-zinc-50 flex items-center gap-1 font-medium bg-zinc-800/60 hover:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700/50 transition-colors"
            >
              <span>查看全部行程</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800/80">
                  <th className="pb-3 font-semibold">开始时间</th>
                  <th className="pb-3 font-semibold">行程起止点</th>
                  <th className="pb-3 font-semibold">里程 / 耗时</th>
                  <th className="pb-3 font-semibold">电量消耗</th>
                  <th className="pb-3 font-semibold">能耗 (Wh/km)</th>
                  <th className="pb-3 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                {recentDrives.length === 0 && <Empty as="row" colSpan={6} title="暂无行程记录" />}
                {recentDrives.map((drive) => (
                  <tr key={drive.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="py-3 font-mono text-zinc-400">
                      {formatDateTime(drive.start_date)}
                    </td>
                    <td className="py-3 max-w-xs truncate">
                      <div className="font-medium text-zinc-50 truncate">{drive.end_address ?? DASH}</div>
                      <div className="text-[11px] text-zinc-500 truncate">从 {drive.start_address ?? DASH}</div>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-zinc-50">{formatDistance(drive.distance)}</span>
                      <span className="text-zinc-500 ml-1">({formatDuration(drive.duration_min)})</span>
                    </td>
                    <td className="py-3 font-medium text-emerald-400">
                      {formatPercent(drive.start_battery_level)} → {formatPercent(drive.end_battery_level)}
                      <span className="text-zinc-500 text-[11px] ml-1">({formatEnergy(drive.consumption_kwh)})</span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-200">
                        {formatEfficiency(drive.efficiency_wh_km)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/drives/${drive.id}`}
                        className="text-tesla-blue hover:text-blue-400 font-medium hover:underline inline-flex items-center gap-0.5"
                      >
                        轨迹详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 最近充电卡片大盘 (占 1 列) */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-50">充电速览</h3>
                <p className="text-xs text-zinc-400">补能记录与花费</p>
              </div>
            </div>
            <Link
              href="/charges"
              className="text-xs text-zinc-400 hover:text-zinc-50 flex items-center gap-1 font-medium"
            >
              <span>更多</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {recentCharges.length === 0 && <Empty title="暂无充电记录" icon={Zap} />}
            {recentCharges.map((charge) => (
              <div
                key={charge.id}
                className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 hover:border-zinc-700 transition-all text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-50 truncate max-w-[180px]">
                    {charge.address ?? DASH}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {charge.charge_energy_added != null ? `+${formatEnergy(charge.charge_energy_added)}` : DASH}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>{formatDateTime(charge.start_date)}</span>
                  <span className="text-amber-400 font-medium">
                    {formatCurrency(charge.cost)}
                    {charge.cost != null && charge.cost_source === 'configured' && <span className="text-zinc-500 font-normal ml-1">(估算)</span>}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-zinc-500 text-[10px]">
                  <span>电量: {formatPercent(charge.start_battery_level)} → {formatPercent(charge.end_battery_level)}</span>
                  <span>耗时 {formatDuration(charge.duration_min)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
