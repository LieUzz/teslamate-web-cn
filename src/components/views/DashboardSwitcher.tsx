'use client';

import React from 'react';
import { useViewModeStore } from '@/store/useViewModeStore';
import { MobileDashboard } from './MobileDashboard';
import { DesktopDashboard } from './DesktopDashboard';
import { Car, LifetimeStats, UsageSummary, DayTimeline } from '@/types';
import { useLiveCar } from '@/lib/useLiveCar';

interface DashboardSwitcherProps {
  car: Car;
  stats: LifetimeStats;
  usage: UsageSummary[];
  timeline: DayTimeline;
}

export function DashboardSwitcher({ car: initialCar, stats, usage, timeline }: DashboardSwitcherProps) {
  // 页面开着时车况自动更新；其余数据仍随整页刷新
  const { car, failed: updateFailed } = useLiveCar(initialCar);
  const { isMobileLayout, mode } = useViewModeStore();

  // 当为 mobile 模式或屏幕宽度小于 lg 且未强制 desktop 时，显示移动端流式卡片
  const showMobile = mode === 'mobile' || (mode === 'auto' && isMobileLayout);

  if (showMobile) {
    return (
      <MobileDashboard
        car={car}
        usage={usage}
        timeline={timeline}
        updateFailed={updateFailed}
      />
    );
  }

  return (
    <DesktopDashboard
      car={car}
      stats={stats}
      usage={usage}
      timeline={timeline}
      updateFailed={updateFailed}
    />
  );
}
