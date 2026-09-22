'use client';

import React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { echarts } from '@/lib/echarts';
import { useChartColors } from '@/lib/useChartColors';
import { ParkingDrainMonth } from '@/types';
import { Empty } from '@/components/common/Empty';
import { formatOrDash } from '@/lib/formatters';

interface ParkingDrainChartProps {
  months: ParkingDrainMonth[];
  // kwh: 效率系数已知，按 kWh；km: 效率未知，按续航损失 km
  unit: 'kwh' | 'km';
}

export function ParkingDrainChart({ months, unit }: ParkingDrainChartProps) {
  const colors = useChartColors();
  if (!colors) return null;

  if (months.length === 0) {
    return <Empty as="chart" title="近几个月没有停车记录" />;
  }

  const values = months.map((m) => (unit === 'kwh' ? m.energy_lost_kwh : m.range_lost_km));
  const unitLabel = unit === 'kwh' ? 'kWh' : 'km';

  const option = {
    backgroundColor: 'transparent',
    // 切换周期页签会重新渲染，关掉动画避免柱子反复生长
    animation: false,
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText, fontSize: 12 },
      formatter: (params: { dataIndex: number }[]) => {
        const m = months[params[0]?.dataIndex ?? 0];
        if (!m) return '';
        return [
          `<b>${m.month}</b>`,
          `停车 ${m.parking_count} 次 · ${formatOrDash(m.hours, { digits: 0, unit: '小时' })}`,
          `续航损失 ${formatOrDash(m.range_lost_km, { digits: 1, unit: 'km' })}`,
          `电量损失 ${formatOrDash(m.energy_lost_kwh, { digits: 2, unit: 'kWh' })}`,
        ].join('<br/>');
      },
    },
    grid: { left: '3%', right: '4%', bottom: '5%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: months.map((m) => m.month),
      axisLine: { lineStyle: { color: colors.axis } },
      axisLabel: { color: colors.label, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: colors.split } },
      axisLabel: { color: colors.label, fontSize: 10 },
    },
    series: [
      {
        name: unitLabel,
        type: 'bar',
        data: values,
        barMaxWidth: 36,
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return (
    <div>
      <div className="text-[10px] text-zinc-500">{unit === 'kwh' ? '电量损失 (kWh)' : '续航损失 (km)'}</div>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: '200px', width: '100%' }} />
    </div>
  );
}
