'use client';

import React from 'react';
import { Car, LifetimeStats, UsageSummary as UsageSummaryData, DayTimeline as DayTimelineData } from '@/types';
import { CarHero } from '@/components/home/CarHero';
import { AlertStrip } from '@/components/home/AlertStrip';
import { BodyStatus } from '@/components/home/BodyStatus';
import { UsageSummary } from '@/components/home/UsageSummary';
import { DayTimeline } from '@/components/home/DayTimeline';
import { deriveAlerts } from '@/lib/alerts';
import { StatCard } from '@/components/common/StatCard';
import { formatOrDash, DASH } from '@/lib/formatters';
import { TrendingUp, Zap, Activity, Gauge } from 'lucide-react';

interface DesktopDashboardProps {
  car: Car;
  stats: LifetimeStats;
  usage: UsageSummaryData[];
  timeline: DayTimelineData;
  updateFailed: boolean;
}

export function DesktopDashboard({ car, stats, usage, timeline, updateFailed }: DesktopDashboardProps) {
  // 每公里电费：只用 TeslaMate 有记录的里程，且费用已知时才计算
  const costPerKm =
    stats.total_charge_cost != null && stats.logged_distance_km != null && stats.logged_distance_km > 0
      ? stats.total_charge_cost / stats.logged_distance_km
      : null;

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

      {/* 今天的行程与充电，按时间排列 */}
      <DayTimeline data={timeline} variant="home" />
    </div>
  );
}
