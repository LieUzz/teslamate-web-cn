'use client';

import React, { useState } from 'react';
import { ParkingDrainAnalysis, ParkingDrainPeriod, ParkingDrainBand } from '@/types';
import { PARKING_DRAIN_POWER_BANDS_W } from '@/lib/constants';
import { formatOrDash, DASH } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { ParkingDrainChart } from '@/components/charts/lazy';
import { BarChart3, Gauge, BedDouble } from 'lucide-react';

const PERIODS: { key: ParkingDrainPeriod; label: string }[] = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
];

const BAND_META: Record<ParkingDrainBand['key'], { label: string; range: string; bar: string; text: string }> = {
  low: { label: '已休眠', range: `< ${PARKING_DRAIN_POWER_BANDS_W.normal_from} W`, bar: 'bg-emerald-500', text: 'text-emerald-400' },
  normal: { label: '正常', range: `${PARKING_DRAIN_POWER_BANDS_W.normal_from}–${PARKING_DRAIN_POWER_BANDS_W.high_from} W`, bar: 'bg-amber-500', text: 'text-amber-400' },
  high: { label: '偏高', range: `> ${PARKING_DRAIN_POWER_BANDS_W.high_from} W`, bar: 'bg-red-500', text: 'text-red-400' },
};

function CardHeader({ icon: Icon, tone, title, right }: { icon: typeof BarChart3; tone: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`p-1.5 rounded-lg ${tone}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-xs font-bold text-zinc-50 min-w-0">{title}</div>
      </div>
      {right}
    </div>
  );
}

export function DrainAnalysis({ data }: { data: ParkingDrainAnalysis }) {
  const [period, setPeriod] = useState<ParkingDrainPeriod>('month');
  const current = data.periods.find((p) => p.period === period);
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? '';

  const knownCount = current ? current.bands.reduce((s, b) => s + b.count, 0) : 0;
  const stateValues = current ? [current.asleep_hours, current.offline_hours, current.online_parked_hours] : [null, null, null];
  const stateKnown = stateValues.every((v) => v != null);
  const stateTotal = stateKnown ? (stateValues as number[]).reduce((s, v) => s + v, 0) : null;
  const pct = (v: number | null) => (v != null && stateTotal != null && stateTotal > 0 ? `${Math.round((v / stateTotal) * 100)}%` : null);
  const stateRows: { label: string; value: number | null; bar: string; text: string }[] = current
    ? [
        { label: '休眠', value: current.asleep_hours, bar: 'bg-purple-500', text: 'text-purple-400' },
        { label: '在线 (停车)', value: current.online_parked_hours, bar: 'bg-blue-500', text: 'text-blue-400' },
        { label: '离线', value: current.offline_hours, bar: 'bg-zinc-500', text: 'text-zinc-300' },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* 按月趋势 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-lg">
        <CardHeader icon={BarChart3} tone="bg-amber-500/10 text-amber-400" title="按月掉电趋势" />
        <div className="mt-2">
          <ParkingDrainChart months={data.months} unit={data.efficiency_known ? 'kwh' : 'km'} />
        </div>
      </div>

      {/* 分档 + 状态占比，共用周期页签 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-lg">
        <CardHeader
          icon={Gauge}
          tone="bg-purple-500/10 text-purple-400"
          title="掉电速率分档"
          right={
            <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800/80 rounded-full p-0.5 shrink-0">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    period === p.key ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          }
        />

        <div className="mt-3">
          {!current ? (
            <Empty as="chart" title="暂无数据" />
          ) : !data.efficiency_known ? (
            <Empty as="chart" title="暂无数据" />
          ) : knownCount === 0 && current.unknown_count === 0 ? (
            <Empty as="chart" title={`${periodLabel}暂无停车记录`} />
          ) : (
            <div className="space-y-2">
              {current.bands.map((b) => {
                const meta = BAND_META[b.key];
                const share = knownCount > 0 ? (b.count / knownCount) * 100 : 0;
                return (
                  <div key={b.key} className="text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span className={`font-semibold ${meta.text}`}>{meta.label}</span>
                        <span className="text-zinc-500">{meta.range}</span>
                      </span>
                      <span className="text-zinc-300 whitespace-nowrap">
                        {b.count} 次 · {formatOrDash(b.hours, { digits: 0, unit: '小时' })} · {formatOrDash(b.energy_lost_kwh, { digits: 2, unit: 'kWh' })}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800/80">
          <CardHeader icon={BedDouble} tone="bg-blue-500/10 text-blue-400" title="停车时的状态" />
          {!current || stateValues.every((v) => v == null) ? (
            <Empty as="chart" title={`${periodLabel}暂无状态记录`} />
          ) : (
            <div className="mt-3">
              {stateKnown && stateTotal != null && stateTotal > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
                  {stateRows.map((r) => (
                    <div key={r.label} className={r.bar} style={{ width: `${((r.value as number) / stateTotal) * 100}%` }} />
                  ))}
                </div>
              )}
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {stateRows.map((r) => (
                  <div key={r.label} className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-2 min-w-0">
                    <div className={`text-[10px] font-semibold ${r.text} whitespace-nowrap`}>{r.label}</div>
                    <div className="text-sm font-bold text-zinc-50 whitespace-nowrap">{formatOrDash(r.value, { digits: 1, unit: 'h' })}</div>
                    <div className="text-[10px] text-zinc-500">{pct(r.value) ?? DASH}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
