'use client';

import React, { useState } from 'react';
import { UsagePeriod, UsageSummary as UsageSummaryData } from '@/types';
import { formatCurrency, formatOrDash } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { CalendarRange } from 'lucide-react';

const PERIODS: { key: UsagePeriod; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
];

function Cell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-2.5 min-w-0">
      <div className="text-[10px] text-zinc-400 whitespace-nowrap">{label}</div>
      <div className="text-sm font-bold text-zinc-50 whitespace-nowrap truncate mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-zinc-500 whitespace-nowrap truncate mt-0.5">{hint}</div>}
    </div>
  );
}

export function UsageSummary({ summaries }: { summaries: UsageSummaryData[] }) {
  const [period, setPeriod] = useState<UsagePeriod>('today');
  const current = summaries.find((s) => s.period === period);
  const label = PERIODS.find((p) => p.key === period)?.label ?? '';

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <CalendarRange className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-zinc-50">用车小结</span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800/80 rounded-full p-0.5">
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
      </div>

      <div className="mt-3">
        {!current ? (
          <Empty as="chart" title="暂无数据" />
        ) : current.drive_count === 0 && current.charge_count === 0 ? (
          <Empty as="chart" title={`${label}暂无行程和充电`} />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Cell label="行驶里程" value={current.drive_count === 0 ? '暂无行程' : formatOrDash(current.distance_km, { digits: 1, unit: 'km' })} hint={`${current.drive_count} 段行程`} />
            <Cell label="行驶耗电" value={formatOrDash(current.drive_kwh, { digits: 1, unit: 'kWh' })} />
            <Cell label="平均能耗" value={formatOrDash(current.avg_wh_km, { digits: 0, unit: 'Wh/km' })} />
            <Cell label="充电次数" value={`${current.charge_count} 次`} />
            <Cell label="充入电量" value={current.charge_count === 0 ? '暂无充电' : formatOrDash(current.charge_energy_kwh, { digits: 1, unit: 'kWh' })} />
            <Cell
              label="充电费用"
              value={formatCurrency(current.charge_cost)}
              hint={current.unpriced_charge_count > 0 ? `${current.unpriced_charge_count} 次无费用数据` : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
