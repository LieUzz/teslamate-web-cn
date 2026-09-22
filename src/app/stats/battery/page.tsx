import React from 'react';
import Link from 'next/link';
import { fetchBatteryHealth, fetchCars } from '@/lib/queries';
import { formatOrDash, formatPercent } from '@/lib/formatters';
import { ArrowLeft, Activity, BatteryCharging, Award } from 'lucide-react';
import { BatteryHealthCharts } from '@/components/charts/BatteryHealthCharts';

export const dynamic = 'force-dynamic';

export default async function BatteryHealthPage() {
  // 先取默认车辆，再按同一辆车查电池健康，保证页面上的车辆信息与数据对应
  const cars = await fetchCars();
  const car = cars[0] ?? null;
  const health = await fetchBatteryHealth(car?.id);

  const carLabel = [car?.name, car?.marketing_name ?? (car?.model ? `Model ${car.model}` : null)]
    .filter(Boolean)
    .join(' · ');
  const chemistry = health.is_lfp == null ? null : health.is_lfp ? '磷酸铁锂 (LFP) 电池' : '三元锂电池';

  const totalCharges =
    health.slow_charge_count != null && health.fast_charge_count != null
      ? health.slow_charge_count + health.fast_charge_count
      : null;
  const slowPercent =
    totalCharges != null && totalCharges > 0 && health.slow_charge_count != null
      ? (health.slow_charge_count / totalCharges) * 100
      : null;

  return (
    <div className="space-y-4 pb-24 pt-2 px-3 max-w-4xl mx-auto">
      {/* 返回统计大盘 */}
      <div className="flex items-center justify-between">
        <Link
          href="/stats"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 transition-colors bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回统计大盘</span>
        </Link>
        {carLabel && <span className="text-xs text-zinc-400 font-mono truncate ml-2">{carLabel}</span>}
      </div>

      {/* 核心卡片 */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-zinc-50 whitespace-nowrap truncate">
                电池健康度与衰减
              </h1>
              {chemistry && <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{chemistry}</p>}
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 shrink-0 whitespace-nowrap ${
              health.health_percent != null
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> 健康度 {formatPercent(health.health_percent, 1)}
          </span>
        </div>

        {/* 4 维核心指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-zinc-950/60 p-2.5 sm:p-3 rounded-2xl border border-zinc-800/60 flex flex-col justify-center">
            <div className="text-[11px] text-zinc-400 whitespace-nowrap truncate">满电推算续航</div>
            <div className="text-sm sm:text-base font-bold text-zinc-50 mt-1 whitespace-nowrap">
              {formatOrDash(health.estimated_full_range_km, { digits: 1 })}
              {health.estimated_full_range_km != null && <span className="text-[10px] text-zinc-400 font-normal"> km</span>}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 whitespace-nowrap truncate">
              出厂 {formatOrDash(health.original_full_range_km, { digits: 1, unit: 'km' })}
            </div>
          </div>

          <div className="bg-zinc-950/60 p-2.5 sm:p-3 rounded-2xl border border-zinc-800/60 flex flex-col justify-center">
            <div className="text-[11px] text-zinc-400 whitespace-nowrap truncate">推算可用容量</div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 mt-1 whitespace-nowrap">
              {formatOrDash(health.current_capacity_kwh, { digits: 1 })}
              {health.current_capacity_kwh != null && <span className="text-[10px] text-zinc-400 font-normal"> kWh</span>}
            </div>
          </div>

          <div className="bg-zinc-950/60 p-2.5 sm:p-3 rounded-2xl border border-zinc-800/60 flex flex-col justify-center">
            <div className="text-[11px] text-zinc-400 whitespace-nowrap truncate">慢充比例</div>
            <div className="text-sm sm:text-base font-bold text-blue-400 mt-1 whitespace-nowrap">
              {formatPercent(slowPercent, 0)}
            </div>
          </div>

          <div className="bg-zinc-950/60 p-2.5 sm:p-3 rounded-2xl border border-zinc-800/60 flex flex-col justify-center">
            <div className="text-[11px] text-zinc-400 whitespace-nowrap truncate">等效循环</div>
            <div className="text-sm sm:text-base font-bold text-purple-400 mt-1 whitespace-nowrap">
              {formatOrDash(health.cycle_count, { digits: 1 })}
              {health.cycle_count != null && <span className="text-[10px] text-zinc-400 font-normal"> 次</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 📈 容量/续航走势 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl">
        <h2 className="text-sm font-bold text-zinc-50 flex items-center gap-2 mb-4">
          <BatteryCharging className="w-4 h-4 text-emerald-400" />
          <span>满电续航对比</span>
        </h2>
        <BatteryHealthCharts health={health} />
      </div>

    </div>
  );
}
