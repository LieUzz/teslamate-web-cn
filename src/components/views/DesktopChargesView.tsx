'use client';

import React from 'react';
import Link from 'next/link';
import { ChargeSummary } from '@/types';
import { formatEnergy, formatDuration, formatCurrency, formatDateTime, formatOrDash, formatPercent, DASH } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { Zap, ChevronRight } from 'lucide-react';
import { sumKnown, describeCharger } from './helpers';

interface DesktopChargesViewProps {
  charges: ChargeSummary[];
}

export function DesktopChargesView({ charges }: DesktopChargesViewProps) {
  // 汇总只累加已知值；没有任何已知值 (含空列表) 时为 null
  const totalEnergyAdded = sumKnown(charges, (c) => c.charge_energy_added);
  const totalCost = sumKnown(charges, (c) => c.cost);
  const totalDuration = sumKnown(charges, (c) => c.duration_min);
  const unpricedCount = charges.filter((c) => c.cost == null).length;
  const estimatedCount = charges.filter((c) => c.cost != null && c.cost_source === 'configured').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 顶部汇总卡片 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-5 rounded-3xl border border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            <span>充电记录与统计</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            汇总仅统计下方列出的 {charges.length} 次充电
            {unpricedCount > 0 && ` · ${unpricedCount} 次无费用数据，未计入总费用`}
            {estimatedCount > 0 && ` · ${estimatedCount} 次费用为按配置电价估算`}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-zinc-900 px-3.5 py-2 rounded-2xl border border-zinc-800">
            <div className="text-zinc-400">所列充入电量</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatOrDash(totalEnergyAdded, { digits: 1, unit: 'kWh' })}</div>
          </div>
          <div className="bg-zinc-900 px-3.5 py-2 rounded-2xl border border-zinc-800">
            <div className="text-zinc-400">所列充电费用</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">{formatCurrency(totalCost)}</div>
          </div>
          <div className="bg-zinc-900 px-3.5 py-2 rounded-2xl border border-zinc-800">
            <div className="text-zinc-400">所列充电时长</div>
            <div className="text-sm font-bold text-white mt-0.5">{formatDuration(totalDuration)}</div>
          </div>
        </div>
      </div>

      {/* 宽表记录 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800/80">
                <th className="pb-3 font-semibold">开始时间</th>
                <th className="pb-3 font-semibold">充电方式</th>
                <th className="pb-3 font-semibold">地点</th>
                <th className="pb-3 font-semibold">充电时长</th>
                <th className="pb-3 font-semibold">电量变化</th>
                <th className="pb-3 font-semibold">充入 / 消耗电量</th>
                <th className="pb-3 font-semibold">费用</th>
                <th className="pb-3 font-semibold text-right">功率详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
              {charges.length === 0 && <Empty as="row" colSpan={8} title="暂无充电记录" icon={Zap} />}
              {charges.map((charge) => (
                <tr key={charge.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 font-mono text-zinc-400">
                    {formatDateTime(charge.start_date)}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                      {describeCharger(charge)}
                    </span>
                  </td>
                  <td className="py-3.5 text-white font-medium max-w-xs truncate">
                    {charge.address ?? DASH}
                  </td>
                  <td className="py-3.5 text-zinc-300">
                    {formatDuration(charge.duration_min)}
                  </td>
                  <td className="py-3.5 font-semibold text-white">
                    {formatPercent(charge.start_battery_level)} → {formatPercent(charge.end_battery_level)}
                  </td>
                  <td className="py-3.5 font-bold text-emerald-400">
                    {charge.charge_energy_added != null ? `+${formatEnergy(charge.charge_energy_added)}` : DASH}
                    <span className="text-zinc-500 font-normal text-[11px] ml-1">
                      (表耗 {formatEnergy(charge.charge_energy_used)})
                    </span>
                  </td>
                  <td className="py-3.5 font-bold text-amber-400">
                    {formatCurrency(charge.cost)}
                    {charge.cost != null && charge.cost_source === 'configured' && (
                      <span className="text-[10px] text-zinc-500 font-normal ml-1">估算</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right whitespace-nowrap">
                    <Link
                      href={`/charges/${charge.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium transition-colors text-xs border border-emerald-500/20"
                    >
                      <span>功率曲线</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
