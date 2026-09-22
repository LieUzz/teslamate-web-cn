import React from 'react';
import Link from 'next/link';
import { fetchTemperatureStats } from '@/lib/queries';
import { ArrowLeft, ThermometerSun } from 'lucide-react';
import { TemperatureCharts } from '@/components/charts/lazy';

export const dynamic = 'force-dynamic';

export default async function TemperaturePage() {
  const points = await fetchTemperatureStats();

  return (
    <div className="space-y-4 pb-24 pt-2 px-3 max-w-4xl mx-auto">
      {/* 顶部返回导航 */}
      <div className="flex items-center justify-between">
        <Link
          href="/stats"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 transition-colors bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800"
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
              <h1 className="text-lg font-bold text-zinc-50">气温对能耗与续航影响</h1>
            </div>
          </div>
        </div>

        {/* 📈 气温与能耗散点/走势图 */}
        <div className="pt-2">
          <TemperatureCharts points={points} />
        </div>
      </div>

    </div>
  );
}
