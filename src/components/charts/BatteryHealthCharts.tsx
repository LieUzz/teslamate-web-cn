import React from 'react';
import { BatteryHealthInfo } from '@/types';
import { formatOrDash } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';

interface BatteryHealthChartsProps {
  health: BatteryHealthInfo;
  currentKm: number | null;
}

interface CompareRow {
  label: string;
  unit: string;
  digits: number;
  current: number;
  currentLabel: string;
  reference: number;
  referenceLabel: string;
}

// 没有历史容量序列，因此不画衰减曲线；只把"当前值"与"基准值"并排对比
export function BatteryHealthCharts({ health, currentKm }: BatteryHealthChartsProps) {
  const rows: CompareRow[] = [];

  if (health.estimated_full_range_km != null && health.original_full_range_km != null) {
    rows.push({
      label: '满电续航',
      unit: 'km',
      digits: 0,
      current: health.estimated_full_range_km,
      currentLabel: '当前估算',
      reference: health.original_full_range_km,
      referenceLabel: '出厂值 (BATTERY_ORIGINAL_RANGE_KM)',
    });
  }

  if (health.current_capacity_kwh != null && health.max_observed_capacity_kwh != null) {
    rows.push({
      label: '可用容量',
      unit: 'kWh',
      digits: 1,
      current: health.current_capacity_kwh,
      currentLabel: '当前推算',
      reference: health.max_observed_capacity_kwh,
      referenceLabel: '有记录以来的最大容量',
    });
  }

  if (rows.length === 0) {
    return (
      <Empty
        as="chart"
        title="充电记录不足，暂无法评估电池健康"
        hint={`已有 ${health.sample_count} 次可用充电记录`}
      />
    );
  }

  return (
    <div className="space-y-5 py-2">
      {rows.map((row) => {
        // 两根条按同一比例尺绘制 (以两者较大值为 100%)
        const scaleMax = Math.max(row.current, row.reference);
        const width = (v: number) => (scaleMax > 0 ? `${Math.max(0, (v / scaleMax) * 100)}%` : '0%');
        return (
          <div key={row.label} className="space-y-2">
            <div className="text-xs font-medium text-zinc-300">{row.label}</div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>{row.currentLabel}</span>
                <span className="font-mono text-emerald-400">
                  {formatOrDash(row.current, { digits: row.digits, unit: row.unit })}
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: width(row.current) }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>{row.referenceLabel}</span>
                <span className="font-mono text-zinc-300">
                  {formatOrDash(row.reference, { digits: row.digits, unit: row.unit })}
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-zinc-500 h-full rounded-full" style={{ width: width(row.reference) }} />
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-[11px] text-zinc-500">
        基于 {health.sample_count} 次可用充电记录推算
        {currentKm != null ? ` · 当前总里程 ${formatOrDash(currentKm, { digits: 0, locale: true, unit: 'km' })}` : ''}
        {health.original_full_range_km == null ? ' · 未配置出厂续航 (BATTERY_ORIGINAL_RANGE_KM)，无法与出厂值对比' : ''}
      </p>
    </div>
  );
}
