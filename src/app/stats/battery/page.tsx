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
  const currentKm = car?.odometer ?? null;

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
                电池健康度与衰减估算
              </h1>
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                {chemistry ? `${chemistry} · ` : ''}由充电记录推导，样本 {health.sample_count} 次
              </p>
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

        {/* 健康度的对比基准说明 */}
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {health.baseline === 'configured_original' &&
            `对比基准：配置的出厂满电续航 ${formatOrDash(health.original_full_range_km, { digits: 1, unit: 'km' })}；衰减 ${formatPercent(health.degradation_percent, 1)}。`}
          {health.baseline === 'max_observed' &&
            `对比基准：有记录以来的最大容量 ${formatOrDash(health.max_observed_capacity_kwh, { digits: 1, unit: 'kWh' })}（不是出厂值）；相对该值衰减 ${formatPercent(health.degradation_percent, 1)}。配置 BATTERY_ORIGINAL_RANGE_KM 后可与出厂续航对比。`}
          {health.baseline == null &&
            (health.original_full_range_km != null
              ? `暂时无法判断健康度：已配置出厂满电续航 ${formatOrDash(health.original_full_range_km, { digits: 0, unit: 'km' })}，还需要至少一次有效充电记录来推算当前满电续航（目前 ${health.sample_count} 次）。`
              : `暂时无法判断健康度：需要更多有效充电记录（目前 ${health.sample_count} 次）。也可以通过环境变量 BATTERY_ORIGINAL_RANGE_KM 配置出厂满电续航作为对比基准。`)}
        </p>

        {/* 4 维核心指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-zinc-950/60 p-2.5 sm:p-3 rounded-2xl border border-zinc-800/60 flex flex-col justify-center">
            <div className="text-[11px] text-zinc-400 whitespace-nowrap truncate">满电推算续航</div>
            <div className="text-sm sm:text-base font-bold text-zinc-50 mt-1 whitespace-nowrap">
              {formatOrDash(health.estimated_full_range_km, { digits: 1 })}
              {health.estimated_full_range_km != null && <span className="text-[10px] text-zinc-400 font-normal"> km</span>}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 whitespace-nowrap truncate">
              {health.original_full_range_km != null
                ? `出厂 ${formatOrDash(health.original_full_range_km, { digits: 1, unit: 'km' })} (配置值)`
                : '未配置出厂续航'}
            </div>
          </div>

          <div className="bg-zinc-950/60 p-2.5 sm:p-3 rounded-2xl border border-zinc-800/60 flex flex-col justify-center">
            <div className="text-[11px] text-zinc-400 whitespace-nowrap truncate">推算可用容量</div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 mt-1 whitespace-nowrap">
              {formatOrDash(health.current_capacity_kwh, { digits: 1 })}
              {health.current_capacity_kwh != null && <span className="text-[10px] text-zinc-400 font-normal"> kWh</span>}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 whitespace-nowrap truncate">
              记录最大 {formatOrDash(health.max_observed_capacity_kwh, { digits: 1, unit: 'kWh' })}
            </div>
          </div>

          <div className="bg-zinc-950/60 p-2.5 sm:p-3 rounded-2xl border border-zinc-800/60 flex flex-col justify-center">
            <div className="text-[11px] text-zinc-400 whitespace-nowrap truncate">慢充比例</div>
            <div className="text-sm sm:text-base font-bold text-blue-400 mt-1 whitespace-nowrap">
              {formatPercent(slowPercent, 0)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 whitespace-nowrap truncate">
              {formatOrDash(health.slow_charge_count)} 次交流 · {formatOrDash(health.fast_charge_count)} 次直流快充
            </div>
          </div>

          <div className="bg-zinc-950/60 p-2.5 sm:p-3 rounded-2xl border border-zinc-800/60 flex flex-col justify-center">
            <div className="text-[11px] text-zinc-400 whitespace-nowrap truncate">等效循环</div>
            <div className="text-sm sm:text-base font-bold text-purple-400 mt-1 whitespace-nowrap">
              {formatOrDash(health.cycle_count, { digits: 1 })}
              {health.cycle_count != null && <span className="text-[10px] text-zinc-400 font-normal"> 次</span>}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 whitespace-nowrap truncate">
              累计充入 {formatOrDash(health.total_energy_added_kwh, { digits: 1, unit: 'kWh' })}
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
        <BatteryHealthCharts health={health} currentKm={currentKm} />
      </div>

      {/* 口径说明 */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 text-xs text-zinc-400 space-y-1.5">
        <div className="font-semibold text-zinc-200">💡 数据口径</div>
        <p>• 可用容量 = 单次充入电量 ÷ 电量百分比变化，取最近若干次有效充电的中位数；充入量过小的充电不参与推导。</p>
        <p>• 等效循环 = TeslaMate 记录的累计充入电量 ÷ 当前推算容量，只包含接入 TeslaMate 之后的充电。</p>
      </div>
    </div>
  );
}
