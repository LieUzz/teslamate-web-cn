'use client';

import React from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { echarts } from '@/lib/echarts';
import { useChartColors } from '@/lib/useChartColors';
import { ParkingPoint } from '@/types';
import { Empty } from '@/components/common/Empty';

interface ParkingDetailChartsProps {
  points: ParkingPoint[];
}

export function ParkingDetailCharts({ points }: ParkingDetailChartsProps) {
  const colors = useChartColors();
  if (!colors) return null;

  if (!points || points.length === 0) {
    return <Empty as="chart" title="该停车段暂无采样数据" />;
  }

  const times = points.map((p) => {
    const d = new Date(p.date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  // 缺失采样保持 null，图上显示为断点；车外温度未知时不用车内温度顶替
  const socs = points.map((p) => p.battery_level ?? null);
  const ranges = points.map((p) => p.range_km ?? null);
  const temps = points.map((p) => p.outside_temp ?? null);
  const hasTemp = temps.some((t) => t != null);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText, fontSize: 12 },
    },
    legend: {
      data: ['电量 SOC (%)', '续航 (km)', ...(hasTemp ? ['车外温度 (°C)'] : [])],
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
        name: '电量/续航',
        nameTextStyle: { color: colors.label, fontSize: 10 },
        splitLine: { lineStyle: { color: colors.split } },
        axisLabel: { color: colors.label, fontSize: 10 },
      },
      ...(hasTemp
        ? [
            {
              type: 'value',
              name: '温度(°C)',
              scale: true,
              nameTextStyle: { color: colors.label, fontSize: 10 },
              splitLine: { show: false },
              axisLabel: { color: colors.label, fontSize: 10 },
            },
          ]
        : []),
    ],
    series: [
      {
        name: '电量 SOC (%)',
        type: 'line',
        data: socs,
        connectNulls: false,
        smooth: true,
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 2 },
      },
      {
        name: '续航 (km)',
        type: 'line',
        data: ranges,
        connectNulls: false,
        smooth: true,
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 2 },
      },
      ...(hasTemp
        ? [
            {
              name: '车外温度 (°C)',
              type: 'line',
              yAxisIndex: 1,
              data: temps,
              connectNulls: false,
              smooth: true,
              itemStyle: { color: '#f59e0b' },
              lineStyle: { width: 1.5, type: 'dashed' },
            },
          ]
        : []),
    ],
  };

  return <ReactEChartsCore echarts={echarts} option={option} notMerge style={{ height: '260px', width: '100%' }} />;
}
