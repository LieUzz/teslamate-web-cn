'use client';

import React from 'react';
import Link from 'next/link';
import { LifetimeStats, EnergyBreakdown, DrivingRecordsByPeriod, SavingsAnalysis, CarMilestonesData } from '@/types';
import { useViewModeStore } from '@/store/useViewModeStore';
import { DrivingRecordsCard } from '@/components/cards/DrivingRecordsCard';
import {
  Zap,
  Moon,
  Wifi,
  WifiOff,
  DollarSign,
  BatteryCharging,
  Clock,
  ChevronRight,
  Activity,
  MapPin,
  Calendar,
  ThermometerSun
} from 'lucide-react';
import { formatCurrency, formatOrDash, formatPercent } from '@/lib/formatters';
import { CarMilestonesCard } from '@/components/cards/CarMilestonesCard';
import { Empty } from '@/components/common/Empty';

interface StatsClientViewProps {
  stats: LifetimeStats;
  savings: SavingsAnalysis;
  energy: EnergyBreakdown;
  records: DrivingRecordsByPeriod;
  milestones: CarMilestonesData;
}

export function StatsClientView({ stats, savings, energy, records, milestones }: StatsClientViewProps) {
  const { isMobileLayout } = useViewModeStore();

  // 只有两个占比都已知时才画对比条
  const hasEnergySplit = energy.driving_percent != null && energy.parking_percent != null;
  const savedCost = savings.saved_cost;

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
              <h1 className="text-lg sm:text-xl font-bold text-white">综合能效与统计大盘</h1>
              <p className="text-xs text-zinc-400 mt-0.5">基于 TeslaMate 有记录数据的电量去向、行车与停车损耗分析</p>
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
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-white">电池健康度</div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">容量推导 · 充电构成</div>
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
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-white">行车足迹热力</div>
            <div className="text-[11px] text-blue-400 mt-0.5 font-medium">行驶轨迹 · 常去地点</div>
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
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-white">月度能耗账单</div>
            <div className="text-[11px] text-purple-400 mt-0.5 font-medium">逐月里程 · 用车开销</div>
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
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-white">气温与能耗关联</div>
            <div className="text-[11px] text-amber-400 mt-0.5 font-medium">不同气温 · 能效分布</div>
          </div>
        </Link>
      </div>

      {/* ⚡ 核心 1：行车耗电 vs 停车漏电全景拆解 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            <span>电量流向与消耗对比</span>
          </h2>
          <span className="text-xs text-zinc-400">累计充入 {formatOrDash(energy.total_energy_added_kwh, { digits: 1, unit: 'kWh' })}</span>
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
            <Empty as="chart" title="暂无数据" hint="还没有足够的行车与停车记录来拆分电量去向" />
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
            <div className="text-base font-bold text-white mt-1">{formatOrDash(stats.avg_efficiency_wh_km, { digits: 0 })} <span className="text-[10px] text-zinc-400 font-normal">Wh/km</span></div>
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
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
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
              <div className="text-sm font-bold text-white mt-0.5">{formatOrDash(energy.online_hours, { digits: 1, unit: '小时', locale: true })}</div>
            </div>
          </div>

          <div className="bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-zinc-400 text-[11px]">睡眠</div>
              <div className="text-sm font-bold text-white mt-0.5">{formatOrDash(energy.asleep_hours, { digits: 1, unit: '小时', locale: true })}</div>
            </div>
          </div>

          <div className="bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-500/10 text-zinc-400 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <div className="text-zinc-400 text-[11px]">离线</div>
              <div className="text-sm font-bold text-white mt-0.5">{formatOrDash(energy.offline_hours, { digits: 1, unit: '小时', locale: true })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 💰 核心 3：对比燃油车 (油价与参照油耗来自配置，未配置则不比较) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>燃油车费用对比</span>
          </h2>
          {savings.configured && savedCost != null && (
            <span className={`text-xs font-semibold ${savedCost >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {savedCost >= 0 ? `已节省 ${formatCurrency(savedCost)}` : `比油车多花 ${formatCurrency(Math.abs(savedCost))}`}
            </span>
          )}
        </div>

        {!savings.configured ? (
          <Empty
            title="未配置油车对比参数"
            hint="请设置环境变量 FUEL_PRICE_CNY_PER_LITRE 与 FUEL_CONSUMPTION_L_PER_100KM"
            icon={DollarSign}
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800">
                <div className="text-[11px] text-zinc-400">有记录的充电费用</div>
                <div className="text-sm font-bold text-amber-400 mt-1">{formatCurrency(savings.ev_cost)}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {savings.ev_cost_per_km != null ? `¥${savings.ev_cost_per_km.toFixed(3)} / km` : '-- / km'}
                </div>
              </div>

              <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800">
                <div className="text-[11px] text-zinc-400">同里程油车油费</div>
                <div className="text-sm font-bold text-zinc-300 mt-1">{formatCurrency(savings.fuel_cost)}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  按 {formatOrDash(savings.fuel_consumption_l_per_100km, { digits: 1 })} L/100km · ¥{formatOrDash(savings.fuel_price_cny_per_litre, { digits: 2 })}/L
                </div>
              </div>

              <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800">
                <div className="text-[11px] text-zinc-400">折合燃油</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">{formatOrDash(savings.fuel_liters_saved, { digits: 1 })} <span className="text-[10px] font-normal">升</span></div>
                <div className="text-[10px] text-emerald-500/80 mt-0.5">折合 {formatOrDash(savings.co2_reduced_kg, { digits: 1 })} kg CO₂</div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed">
              仅统计 TeslaMate 有记录的里程 ({formatOrDash(savings.logged_distance_km, { digits: 1, locale: true })} km)。
              {savings.unpriced_charge_count > 0 && ` 另有 ${savings.unpriced_charge_count} 次充电无费用数据，未计入。`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
