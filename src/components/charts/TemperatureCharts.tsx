'use client';

import React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { echarts } from '@/lib/echarts';
import { useChartColors } from '@/lib/useChartColors';
import { TemperatureEfficiencyPoint } from '@/types';
import { Empty } from '@/components/common/Empty';

interface TemperatureChartsProps {
  points: TemperatureEfficiencyPoint[];
}

export function TemperatureCharts({ points }: TemperatureChartsProps) {
  const colors = useChartColors();
  if (!colors) return null;

  if (!points || points.length === 0) {
    return <Empty as="chart" title="暂无气温与能耗关联数据" />;
  }

  const temps = points.map((p) => `${p.temp}°C`);
  const whs = points.map((p) => p.avg_wh_km);
  const counts = points.map((p) => p.drive_count);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText, fontSize: 12 },
    },
    legend: {
      data: ['平均能耗 (Wh/km)', '行程次数 (次)'],
      textStyle: { color: colors.legend, fontSize: 11 },
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '18%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: temps,
      axisLine: { lineStyle: { color: colors.axis } },
      axisLabel: { color: colors.label, fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: '能耗 (Wh/km)',
        scale: true,
        nameTextStyle: { color: colors.label, fontSize: 10 },
        splitLine: { lineStyle: { color: colors.split } },
        axisLabel: { color: colors.label, fontSize: 10 },
      },
      {
        type: 'value',
        name: '行程数 (次)',
        nameTextStyle: { color: colors.label, fontSize: 10 },
        splitLine: { show: false },
        axisLabel: { color: colors.label, fontSize: 10 },
      },
    ],
    series: [
      {
        name: '平均能耗 (Wh/km)',
        type: 'line',
        data: whs,
        smooth: true,
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2.5 },
      },
      {
        name: '行程次数 (次)',
        type: 'bar',
        yAxisIndex: 1,
        data: counts,
        itemStyle: { color: 'rgba(59, 130, 246, 0.4)', borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '260px', width: '100%' }} />;
}
