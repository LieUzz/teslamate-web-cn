'use client';

// 图表的懒加载入口：页面文字和数字先渲染，echarts 代码随后才下载。
// 必须放在客户端组件里 —— 写在服务端页面里的 next/dynamic 仍会把图表算进首屏 JS。
import dynamic from 'next/dynamic';
import { Empty } from '@/components/common/Empty';

const loading = () => <Empty as="chart" title="图表加载中" />;

export const ChargeDetailCharts = dynamic(() => import('./ChargeDetailCharts').then((m) => m.ChargeDetailCharts), { ssr: false, loading });
export const ParkingDetailCharts = dynamic(() => import('./ParkingDetailCharts').then((m) => m.ParkingDetailCharts), { ssr: false, loading });
export const TemperatureCharts = dynamic(() => import('./TemperatureCharts').then((m) => m.TemperatureCharts), { ssr: false, loading });
export const ParkingDrainChart = dynamic(() => import('./ParkingDrainChart').then((m) => m.ParkingDrainChart), { ssr: false, loading });
