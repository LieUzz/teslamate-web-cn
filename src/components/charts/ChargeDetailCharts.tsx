'use client';

import React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { echarts } from '@/lib/echarts';
import { useChartColors } from '@/lib/useChartColors';
import { ChargePoint } from '@/types';
import { Empty } from '@/components/common/Empty';

interface ChargeDetailChartsProps {
  points: ChargePoint[];
}

export function ChargeDetailCharts({ points }: ChargeDetailChartsProps) {
  const colors = useChartColors();
  if (!colors) return null;

  if (!points || points.length === 0) {
    return <Empty as="chart" title="该次充电暂无采样数据" />;
  }

  const times = points.map((p) => {
    const d = new Date(p.date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  // 缺失采样保持 null，图上显示为断点
  const powers = points.map((p) => p.charger_power ?? null);
  const socs = points.map((p) => p.battery_level ?? null);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText, fontSize: 12 },
    },
    legend: {
      data: ['充电功率 (kW)', '电池 SOC (%)'],
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
      data: times,
      axisLine: { lineStyle: { color: colors.axis } },
      axisLabel: { color: colors.label, fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: '功率 (kW)',
        nameTextStyle: { color: colors.label, fontSize: 10 },
        splitLine: { lineStyle: { color: colors.split } },
        axisLabel: { color: colors.label, fontSize: 10 },
      },
      {
        type: 'value',
        name: 'SOC (%)',
        min: 0,
        max: 100,
        nameTextStyle: { color: colors.label, fontSize: 10 },
        splitLine: { show: false },
        axisLabel: { color: colors.label, fontSize: 10 },
      },
    ],
    series: [
      {
        name: '充电功率 (kW)',
        type: 'line',
        data: powers,
        connectNulls: false,
        smooth: true,
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
            ],
          },
        },
      },
      {
        name: '电池 SOC (%)',
        type: 'line',
        yAxisIndex: 1,
        data: socs,
        connectNulls: false,
        smooth: true,
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 2 },
      },
    ],
  };

  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: '260px', width: '100%' }} />;
}
