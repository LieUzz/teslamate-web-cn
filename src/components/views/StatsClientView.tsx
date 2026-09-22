'use client';

import React from 'react';
import Link from 'next/link';
import { LifetimeStats, EnergyBreakdown, DrivingRecordsByPeriod, CarMilestonesData } from '@/types';
import { useViewModeStore } from '@/store/useViewModeStore';
import { DrivingRecordsCard } from '@/components/cards/DrivingRecordsCard';
import {
  Zap,
  Moon,
  Wifi,
  WifiOff,
  BatteryCharging,
  Clock,
  ChevronRight,
  Activity,
  MapPin,
  Calendar,
  ThermometerSun
} from 'lucide-react';
import { formatOrDash, formatPercent } from '@/lib/formatters';
import { CarMilestonesCard } from '@/components/cards/CarMilestonesCard';
import { Empty } from '@/components/common/Empty';

interface StatsClientViewProps {
  stats: LifetimeStats;
  energy: EnergyBreakdown;
  records: DrivingRecordsByPeriod;
  milestones: CarMilestonesData;
}

export function StatsClientView({ stats, energy, records, milestones }: StatsClientViewProps) {
  const { isMobileLayout } = useViewModeStore();

  // 只有两个占比都已知时才画对比条
  const hasEnergySplit = energy.driving_percent != null && energy.parking_percent != null;

  return (
    <div className={`space-y-5 pb-24 pt-2 px-3 mx-auto ${isMobileLayout ? 'max-w-lg' : 'max-w-6xl'}`}>
      {/* 🎯 核心 0：爱车里程碑 (纯展示服务端数据) */}
      <CarMilestonesCard data={milestones} />

      {/* 🏆 核心 1：驾驶生涯极值榜单 (支持 月/半年/全年/全部 时间周期切换) */}
      <DrivingRecordsCard records={records} />

      {/* 顶部总览卡片 */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-50">综合能效与统计大盘</h1>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            总里程 {formatOrDash(stats.total_distance_km, { digits: 0, unit: 'km', locale: true })}
          </span>
        </div>
      </div>

      {/* 🌟 4 大二级专属专项入口网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. 电池健康 */}
        <Link
          href="/stats/battery"
          className="bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-2xl p-3.5 shadow-md transition-all active:scale-[0.98] flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-50 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-zinc-50">电池健康度</div>
          </div>
        </Link>

        {/* 2. 行车足迹 */}
        <Link
          href="/stats/footprint"
          className="bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-2xl p-3.5 shadow-md transition-all active:scale-[0.98] flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-50 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-zinc-50">行车足迹热力</div>
          </div>
        </Link>

        {/* 3. 月度账单 */}
        <Link
          href="/stats/reports"
          className="bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-2xl p-3.5 shadow-md transition-all active:scale-[0.98] flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-50 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-zinc-50">月度能耗账单</div>
          </div>
        </Link>

        {/* 4. 气温能耗 */}
        <Link
          href="/stats/temperature"
          className="bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-2xl p-3.5 shadow-md transition-all active:scale-[0.98] flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
              <ThermometerSun className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-50 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-zinc-50">气温与能耗关联</div>
          </div>
        </Link>
      </div>

      {/* ⚡ 核心 1：行车耗电 vs 停车漏电全景拆解 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-zinc-50 flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            <span>电量流向与消耗对比</span>
          </h2>
        </div>

        {/* 双色对比进度条 */}
        <div className="space-y-1.5">
          {hasEnergySplit ? (
            <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
              <div
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${energy.driving_percent}%` }}
                title={`行车耗电: ${formatPercent(energy.driving_percent, 1)}`}
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${energy.parking_percent}%` }}
                title={`停车损耗: ${formatPercent(energy.parking_percent, 1)}`}
              />
            </div>
          ) : (
            <Empty as="chart" title="暂无数据" />
          )}
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-blue-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              行车动力耗电 {formatOrDash(energy.driving_energy_kwh, { digits: 1, unit: 'kWh' })} ({formatPercent(energy.driving_percent, 1)})
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              停车静置损耗 {formatOrDash(energy.parking_drain_kwh, { digits: 1, unit: 'kWh' })} ({formatPercent(energy.parking_percent, 1)})
            </span>
          </div>
        </div>

        {/* 4 维指标网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <div className="text-zinc-400 text-[11px]">行车综合能耗</div>
            <div className="text-base font-bold text-zinc-50 mt-1">{formatOrDash(stats.avg_efficiency_wh_km, { digits: 0 })} <span className="text-[10px] text-zinc-400 font-normal">Wh/km</span></div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <div className="text-zinc-400 text-[11px]">停车静置损耗</div>
            <div className="text-base font-bold text-amber-400 mt-1">{formatOrDash(energy.parking_drain_kwh, { digits: 1 })} <span className="text-[10px] text-zinc-400 font-normal">kWh</span></div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <div className="text-zinc-400 text-[11px]">充电转化效率</div>
            <div className="text-base font-bold text-emerald-400 mt-1">{formatPercent(energy.charging_efficiency_percent, 1)}</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <div className="text-zinc-400 text-[11px]">充电过程损耗</div>
            <div className="text-base font-bold text-blue-400 mt-1">{formatOrDash(energy.charging_loss_kwh, { digits: 1 })} <span className="text-[10px] text-zinc-400 font-normal">kWh</span></div>
          </div>
        </div>
      </div>

      {/* ⏱️ 核心 2：车辆状态时间分布 (TeslaMate 不记录哨兵状态，这里只有 在线/睡眠/离线) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-zinc-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>车辆静置状态与待机分析</span>
          </h2>
          <span className="text-xs text-zinc-400">
            平均停车漏电 {formatOrDash(energy.avg_parking_drain_kwh_per_hour, { digits: 3, unit: 'kWh/h' })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div className="text-zinc-400 text-[11px]">在线 / 唤醒</div>
              <div className="text-sm font-bold text-zinc-50 mt-0.5">{formatOrDash(energy.online_hours, { digits: 1, unit: '小时', locale: true })}</div>
            </div>
          </div>

          <div className="bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-zinc-400 text-[11px]">睡眠</div>
              <div className="text-sm font-bold text-zinc-50 mt-0.5">{formatOrDash(energy.asleep_hours, { digits: 1, unit: '小时', locale: true })}</div>
            </div>
          </div>

          <div className="bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-500/10 text-zinc-400 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <div className="text-zinc-400 text-[11px]">离线</div>
              <div className="text-sm font-bold text-zinc-50 mt-0.5">{formatOrDash(energy.offline_hours, { digits: 1, unit: '小时', locale: true })}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
