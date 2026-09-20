import React from 'react';
import Link from 'next/link';
import { fetchTemperatureStats } from '@/lib/queries';
import { ArrowLeft, ThermometerSun } from 'lucide-react';
import { TemperatureCharts } from '@/components/charts/lazy';

export const dynamic = 'force-dynamic';

export default async function TemperaturePage() {
  const points = await fetchTemperatureStats();

  // 实测温区取自数据本身；没有数据就不显示
  const temps = points.map((p) => p.temp).filter((t) => Number.isFinite(t));
  const tempRange = temps.length > 0 ? { min: Math.min(...temps), max: Math.max(...temps) } : null;

  return (
    <div className="space-y-4 pb-24 pt-2 px-3 max-w-4xl mx-auto">
      {/* 顶部返回导航 */}
      <div className="flex items-center justify-between">
        <Link
          href="/stats"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回统计大盘</span>
        </Link>
        <span className="text-xs text-zinc-400 font-mono">环境温度能效模型</span>
      </div>

      {/* 核心卡片 */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
              <ThermometerSun className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">气温对能耗与续航影响</h1>
              <p className="text-xs text-zinc-400 mt-0.5">不同室外气温下的实测平均能耗 (Wh/km)</p>
            </div>
          </div>
          {tempRange && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
              实测温区 {tempRange.min}°C ~ {tempRange.max}°C
            </span>
          )}
        </div>

        {/* 📈 气温与能耗散点/走势图 */}
        <div className="pt-2">
          <TemperatureCharts points={points} />
        </div>
      </div>

      {/* 口径说明 */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 text-xs text-zinc-400 space-y-1.5">
        <div className="font-semibold text-zinc-200">💡 数据口径</div>
        <p>• 每个温度点为该室外平均气温下所有有记录行程的平均能耗；行程数少的温度点波动较大，仅供参考。</p>
      </div>
    </div>
  );
}
