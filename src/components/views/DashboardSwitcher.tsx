'use client';

import React from 'react';
import { useViewModeStore } from '@/store/useViewModeStore';
import { MobileDashboard } from './MobileDashboard';
import { DesktopDashboard } from './DesktopDashboard';
import { Car, DriveSummary, ChargeSummary, LifetimeStats, UsageSummary } from '@/types';
import { useLiveCar } from '@/lib/useLiveCar';

interface DashboardSwitcherProps {
  car: Car;
  drives: DriveSummary[];
  charges: ChargeSummary[];
  stats: LifetimeStats;
  usage: UsageSummary[];
}

export function DashboardSwitcher({ car: initialCar, drives, charges, stats, usage }: DashboardSwitcherProps) {
  // 页面开着时车况自动更新；其余数据仍随整页刷新
  const { car, failed: updateFailed } = useLiveCar(initialCar);
  const { isMobileLayout, mode } = useViewModeStore();

  // 当为 mobile 模式或屏幕宽度小于 lg 且未强制 desktop 时，显示移动端流式卡片
  const showMobile = mode === 'mobile' || (mode === 'auto' && isMobileLayout);

  if (showMobile) {
    return (
      <MobileDashboard
        car={car}
        latestDrive={drives[0]}
        latestCharge={charges[0]}
        usage={usage}
        updateFailed={updateFailed}
      />
    );
  }

  return (
    <DesktopDashboard
      car={car}
      drives={drives}
      charges={charges}
      stats={stats}
      usage={usage}
      updateFailed={updateFailed}
    />
  );
}
