'use client';

import { useMemo } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

// 图表的中性色 (坐标轴 / 分隔线 / 提示框)，定义在 globals.css 的 --chart-* 变量里，随主题切换
const CHART_VARIABLES = {
  axis: '--chart-axis',
  split: '--chart-split',
  label: '--chart-label',
  legend: '--chart-legend',
  tooltipBg: '--chart-tooltip-bg',
  tooltipBorder: '--chart-tooltip-border',
  tooltipText: '--chart-tooltip-text',
} as const;

export type ChartColors = Record<keyof typeof CHART_VARIABLES, string>;

// 服务端渲染时没有 document，返回 null；图表只在客户端绘制
export function useChartColors(): ChartColors | null {
  const resolved = useThemeStore((state) => state.resolved);

  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    // canvas 不认识 var()，这里把嵌套变量解析成最终的 rgb 值
    const probe = document.createElement('span');
    document.documentElement.appendChild(probe);
    const colors = Object.fromEntries(
      Object.entries(CHART_VARIABLES).map(([key, variable]) => {
        probe.style.color = `var(${variable})`;
        return [key, getComputedStyle(probe).color];
      }),
    ) as ChartColors;
    probe.remove();
    return colors;
    // resolved 变化 = 主题已切换，需要重新读取
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);
}
