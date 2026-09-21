import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchChargeDetail } from '@/lib/queries';
import { formatEnergy, formatDuration, formatCurrency, formatDateTime, formatPercent, formatOrDash, DASH } from '@/lib/formatters';
import { Zap, ArrowLeft, MapPin, BatteryCharging } from 'lucide-react';
import { ChargeDetailCharts } from '@/components/charts/lazy';

export const dynamic = 'force-dynamic';

interface ChargeDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ChargeDetailPage({ params }: ChargeDetailPageProps) {
  const chargeId = parseInt(params.id, 10);
  if (isNaN(chargeId)) notFound();

  const charge = await fetchChargeDetail(chargeId);
  if (!charge) notFound();

  // 充电效率 = 充入电池 ÷ 电网侧耗电；任一缺失即未知
  const efficiency =
    charge.charge_energy_added != null && charge.charge_energy_used != null && charge.charge_energy_used > 0
      ? (charge.charge_energy_added / charge.charge_energy_used) * 100
      : null;

  // 充电方式描述：只依据 TeslaMate 记录的快充标记与实测最高功率
  const chargerLabel =
    charge.is_fast_charge == null
      ? null
      : [
          charge.is_fast_charge ? '直流快充' : '交流充电',
          charge.is_fast_charge ? charge.fast_charger_brand : null,
          charge.max_charger_power_kw != null ? `最高 ${formatOrDash(charge.max_charger_power_kw, { digits: 0 })} kW` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  const costNote =
    charge.cost == null
      ? '无费用数据'
      : charge.cost_source === 'configured'
        ? '按配置电价估算'
        : charge.cost_source === 'tou'
          ? '按分时电价表计算'
          : charge.cost_source === 'teslamate'
            ? 'TeslaMate 记录'
            : null;

  return (
    <div className="space-y-4 pb-24 pt-2 px-3 max-w-4xl mx-auto">
      {/* 返回导航 */}
      <div className="flex items-center justify-between">
        <Link
          href="/charges"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 transition-colors bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回充电记录</span>
        </Link>
        <span className="text-xs text-zinc-400 font-mono">充电记录 #{charge.id}</span>
      </div>

      {/* 核心概览卡片 */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-50 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <span>充电过程与功率详情</span>
              </h1>
              {chargerLabel ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {chargerLabel}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  充电方式 {DASH}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              {formatDateTime(charge.start_date)} ➔ {charge.end_date ? formatDateTime(charge.end_date) : '未结束'}
            </p>
            {charge.address && (
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{charge.address}</span>
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <span className={`text-xl font-bold ${charge.cost == null ? 'text-zinc-500' : 'text-amber-400'}`}>
              {charge.cost != null && charge.cost_source === 'configured' ? '≈ ' : ''}
              {formatCurrency(charge.cost)}
            </span>
            {costNote && <div className="text-[10px] text-zinc-500 mt-0.5">{costNote}</div>}
          </div>
        </div>

        {/* 4 维关键指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">充入电量</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{charge.charge_energy_added != null ? '+' : ''}{formatEnergy(charge.charge_energy_added)}</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">电量变化</div>
            <div className="text-base font-bold text-zinc-50 mt-0.5">
              {formatPercent(charge.start_battery_level)} ➔ {formatPercent(charge.end_battery_level)}
            </div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">充电时长</div>
            <div className="text-base font-bold text-zinc-50 mt-0.5">{formatDuration(charge.duration_min)}</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">充电效率</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{formatPercent(efficiency, 1)}</div>
          </div>
        </div>
      </div>

      {/* 📈 充电功率与 SOC 爬升图 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-zinc-50 flex items-center gap-2 mb-4">
          <BatteryCharging className="w-4 h-4 text-emerald-400" />
          <span>充电功率曲线与电池 SOC 爬升</span>
        </h2>
        <ChargeDetailCharts points={charge.points} />
      </div>
    </div>
  );
}
