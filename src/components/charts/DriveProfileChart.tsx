'use client';

import React, { useEffect, useRef } from 'react';
import { PositionPoint } from '@/types';
import { format, parseISO } from 'date-fns';
import { Empty } from '@/components/common/Empty';
import { useChartColors } from '@/lib/useChartColors';

interface DriveProfileChartProps {
  positions: PositionPoint[];
  height?: string;
}

/**
 * 海拔轻度平滑：只对真实采样做滑动均值，缺失点保持 null (图上留空)，不填充、不臆造
 */
function smoothElevations(raw: (number | null)[]): (number | null)[] {
  const windowSize = Math.max(2, Math.min(10, Math.floor(raw.length / 20)));
  return raw.map((val, i) => {
    if (val == null) return null;
    let sum = 0;
    let count = 0;
    const end = Math.min(raw.length, i + windowSize + 1);
    for (let j = Math.max(0, i - windowSize); j < end; j++) {
      const v = raw[j];
      if (v != null) {
        sum += v;
        count++;
      }
    }
    return Math.round(sum / count);
  });
}

const isNum = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

export function DriveProfileChart({ positions, height = '280px' }: DriveProfileChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  const colors = useChartColors();

  useEffect(() => {
    let isMounted = true;

    async function initChart() {
      if (!chartRef.current || positions.length === 0 || !colors) return;
      const { echarts } = await import('@/lib/echarts');

      if (!isMounted) return;

      if (!instanceRef.current) {
        instanceRef.current = echarts.init(chartRef.current);
      }

      const times = positions.map((p) => {
        try {
          return format(parseISO(p.date), 'HH:mm:ss');
        } catch {
          return p.date;
        }
      });
      // 缺失采样保持 null，图上显示为断点
      const speeds = positions.map((p) => (isNum(p.speed) ? Math.round(p.speed) : null));
      const powers = positions.map((p) => (isNum(p.power) ? Math.round(p.power) : null));
      const rawElevations = positions.map((p) => (isNum(p.elevation) ? p.elevation : null));
      // 整段行程都没有海拔数据时，不画海拔序列与右轴
      const hasElevation = rawElevations.some((e) => e != null);
      const smoothedElevations = hasElevation ? smoothElevations(rawElevations) : [];

      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: colors.tooltipBg,
          borderColor: colors.tooltipBorder,
          textStyle: { color: colors.tooltipText, fontSize: 12 },
          axisPointer: { type: 'cross' },
        },
        legend: {
          data: ['车速 (km/h)', '功率 (kW)', ...(hasElevation ? ['海拔 (m)'] : [])],
          textStyle: { color: colors.legend, fontSize: 11 },
          top: 0,
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '35px',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: times,
          axisLine: { lineStyle: { color: colors.axis } },
          axisLabel: { color: colors.label, fontSize: 10 },
        },
        yAxis: [
          {
            type: 'value',
            name: '速度/功率',
            position: 'left',
            axisLine: { lineStyle: { color: colors.axis } },
            splitLine: { lineStyle: { color: colors.split } },
            axisLabel: { color: colors.label, fontSize: 10 },
          },
          ...(hasElevation
            ? [
                {
                  type: 'value',
                  name: '海拔(m)',
                  position: 'right',
                  scale: true,
                  splitLine: { show: false },
                  axisLine: { lineStyle: { color: colors.axis } },
                  axisLabel: { color: colors.label, fontSize: 10 },
                },
              ]
            : []),
        ],
        series: [
          // 底层：海拔背景 (仅在有海拔数据时)
          ...(hasElevation
            ? [
                {
                  name: '海拔 (m)',
                  type: 'line',
                  yAxisIndex: 1,
                  smooth: 0.6,
                  showSymbol: false,
                  connectNulls: false,
                  data: smoothedElevations,
                  itemStyle: { color: '#10b981' },
                  lineStyle: { width: 1.5, opacity: 0.6 },
                  areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: 'rgba(16, 185, 129, 0.12)' },
                      { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
                    ]),
                  },
                  z: 1,
                },
              ]
            : []),
          // 车速主曲线
          {
            name: '车速 (km/h)',
            type: 'line',
            smooth: true,
            showSymbol: false,
            connectNulls: false,
            data: speeds,
            itemStyle: { color: '#3b82f6' },
            lineStyle: { width: 2.2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.0)' },
              ]),
            },
            z: 3,
          },
          // 功率主曲线 (加速红 / 回收绿)
          {
            name: '功率 (kW)',
            type: 'line',
            smooth: true,
            showSymbol: false,
            connectNulls: false,
            data: powers,
            itemStyle: { color: '#ef4444' },
            lineStyle: { width: 1.8 },
            z: 4,
          },
        ],
      };

      // notMerge: 序列数量可能随数据变化 (有无海拔)
      instanceRef.current.setOption(option, true);
    }

    const handleResize = () => {
      instanceRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    initChart();

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, [positions, colors]);

  if (positions.length === 0) {
    return <Empty as="chart" title="该行程暂无采样数据" />;
  }

  return (
    <div
      ref={chartRef}
      style={{ height }}
      className="w-full rounded-2xl bg-zinc-900/60 p-2 border border-zinc-800"
    />
  );
}
