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
import { formatOrDash } from '@/lib/formatters';
import { TrendingUp, Zap, Activity, Gauge } from 'lucide-react';

interface DesktopDashboardProps {
  car: Car;
  stats: LifetimeStats;
  usage: UsageSummaryData[];
  timeline: DayTimelineData;
  updateFailed: boolean;
}

export function DesktopDashboard({ car, stats, usage, timeline, updateFailed }: DesktopDashboardProps) {
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
          highlight
        />
        <StatCard
          title="平均行驶能耗"
          value={formatOrDash(stats.avg_efficiency_wh_km, { digits: 0 })}
          unit="Wh/km"
          icon={TrendingUp}
        />
        <StatCard
          title="充电累计充入"
          value={formatOrDash(stats.total_charge_energy_added, { digits: 1, locale: true })}
          unit="kWh"
          icon={Zap}
        />
        <StatCard
          title="累计充电总花费"
          value={formatOrDash(stats.total_charge_cost, { digits: 1, locale: true })}
          unit="元"
          icon={Activity}
        />
      </div>

      {/* 今天的行程与充电，按时间排列 */}
      <DayTimeline data={timeline} variant="home" />
    </div>
  );
}
