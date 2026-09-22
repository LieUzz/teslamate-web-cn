'use client';

import React from 'react';
import { Car, UsageSummary as UsageSummaryData, DayTimeline as DayTimelineData } from '@/types';
import { CarHero } from '@/components/home/CarHero';
import { AlertStrip } from '@/components/home/AlertStrip';
import { BodyStatus } from '@/components/home/BodyStatus';
import { UsageSummary } from '@/components/home/UsageSummary';
import { DayTimeline } from '@/components/home/DayTimeline';
import { deriveAlerts } from '@/lib/alerts';
import { formatOrDash, DASH } from '@/lib/formatters';

interface MobileDashboardProps {
  car: Car;
  usage: UsageSummaryData[];
  timeline: DayTimelineData;
  updateFailed: boolean;
}

export function MobileDashboard({ car, usage, timeline, updateFailed }: MobileDashboardProps) {
  return (
    <div className="space-y-3.5 pb-20 pt-1 px-2.5 max-w-lg mx-auto">
      <AlertStrip alerts={deriveAlerts(car)} />

      {/* 渲染图 + 电量 + 随状态切换的状态卡 */}
      <CarHero car={car} updateFailed={updateFailed} />

      <BodyStatus car={car} />

      <UsageSummary summaries={usage} />

      {/* 今天的行程与充电，按时间排列 */}
      <DayTimeline data={timeline} variant="home" />

      <div className="flex items-center justify-between rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-3.5 py-3 text-[11px] text-zinc-400">
        <span>总里程 <strong className="text-zinc-50">{formatOrDash(car.odometer, { digits: 1, unit: 'km', locale: true })}</strong></span>
        <span>软件版本 <strong className="text-zinc-50">{car.version ?? DASH}</strong></span>
      </div>
    </div>
  );
}
