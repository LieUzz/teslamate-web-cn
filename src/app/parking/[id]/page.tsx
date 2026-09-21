import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchParkingDetail } from '@/lib/queries';
import { formatDuration, formatDateTime, formatOrDash, formatPercent, DASH } from '@/lib/formatters';
import { Moon, ArrowLeft, Battery, BatteryCharging } from 'lucide-react';
import { ParkingDetailCharts } from '@/components/charts/lazy';

export const dynamic = 'force-dynamic';

interface ParkingDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ParkingDetailPage({ params }: ParkingDetailPageProps) {
  const parkingId = parseInt(params.id, 10);
  if (isNaN(parkingId)) notFound();

  const parking = await fetchParkingDetail(parkingId);
  if (!parking) notFound();

  // 期间有充电时，续航差值不代表静置损耗
  const lossKnown = !parking.has_charge;

  return (
    <div className="space-y-4 pb-24 pt-2 px-3 max-w-4xl mx-auto">
      {/* 顶部返回导航 */}
      <div className="flex items-center justify-between">
        <Link
          href="/parking"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 transition-colors bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回停车流水</span>
        </Link>
        <span className="text-xs text-zinc-400 font-mono">段编号 #{parking.id}</span>
      </div>

      {/* 核心卡片 */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-50 flex items-center gap-2">
                <Moon className="w-5 h-5 text-purple-400" />
                <span>停车静置能耗详情</span>
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                parking.is_home === true ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {parking.address ?? '未知地点'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              {formatDateTime(parking.start_date)} ➔ {parking.is_current ? '停放中' : formatDateTime(parking.end_date)}
            </p>
          </div>

          {parking.has_charge && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 inline-flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5" /> 期间有充电
              </span>
            </div>
          )}
        </div>

        {/* 4 维关键指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">停放时长</div>
            <div className="text-base font-bold text-zinc-50 mt-0.5">{formatDuration(parking.duration_min)}</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">电量变化</div>
            <div className="text-base font-bold text-zinc-50 mt-0.5">
              {formatPercent(parking.start_battery_level)} ➔ {formatPercent(parking.end_battery_level)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
              {formatOrDash(parking.start_range_km, { digits: 1 })} ➔ {formatOrDash(parking.end_range_km, { digits: 1, unit: 'km' })}
            </div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">静置损耗</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">
              {lossKnown ? formatOrDash(parking.energy_lost_kwh, { digits: 2, unit: 'kWh' }) : DASH}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
              续航 {lossKnown ? formatOrDash(parking.range_lost_km, { digits: 1, unit: 'km' }) : DASH}
            </div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">平均损耗速率</div>
            <div className="text-base font-bold text-purple-400 mt-0.5 font-mono">
              {lossKnown ? formatOrDash(parking.drain_rate_kwh_per_hour, { digits: 3, unit: 'kWh/h' }) : DASH}
            </div>
          </div>
        </div>

        {parking.has_charge && (
          <p className="text-[11px] text-zinc-500">期间有充电，无法计算静置损耗</p>
        )}
      </div>

      {/* 📈 停车期间电量与气温走势图 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-zinc-50 flex items-center gap-2 mb-4">
          <Battery className="w-4 h-4 text-emerald-400" />
          <span>停车期间电量与环境温度走势</span>
        </h2>
        <ParkingDetailCharts points={parking.points} />
      </div>
    </div>
  );
}
