'use client';

import React from 'react';
import Link from 'next/link';
import { ChargeSummary } from '@/types';
import { formatEnergy, formatDuration, formatCurrency, formatDateTime, formatPercent, DASH } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { Zap, Clock, MapPin, ChevronRight } from 'lucide-react';
import { describeCharger } from './helpers';

interface MobileChargesViewProps {
  charges: ChargeSummary[];
}

export function MobileChargesView({ charges }: MobileChargesViewProps) {
  return (
    <div className="space-y-3 pb-24 pt-2 px-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-zinc-50 flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-500" />
          <span>充电历史记录</span>
        </h2>
        <span className="text-xs text-zinc-400">共 {charges.length} 次充电记录</span>
      </div>

      {charges.length === 0 && <Empty title="暂无充电记录" icon={Zap} />}

      <div className="space-y-3">
        {charges.map((charge) => (
          <Link
            key={charge.id}
            href={`/charges/${charge.id}`}
            className="block bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-3xl p-4 shadow-md transition-all active:scale-[0.99]"
          >
            {/* 时间与充电类型 */}
            <div className="flex items-center justify-between text-xs pb-2.5 border-b border-zinc-800/60">
              <span className="font-mono text-zinc-400">{formatDateTime(charge.start_date)}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] border border-emerald-500/20 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>{describeCharger(charge)}</span>
              </span>
            </div>

            {/* 充入电量与费用 */}
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-emerald-400 tracking-tight">
                  {charge.charge_energy_added != null ? `+${formatEnergy(charge.charge_energy_added)}` : DASH}
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>耗时 {formatDuration(charge.duration_min)}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-bold text-amber-400">
                  {formatCurrency(charge.cost)}
                  {charge.cost != null && charge.cost_source === 'configured' && (
                    <span className="text-[10px] text-zinc-500 font-normal ml-1">估算</span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {formatPercent(charge.start_battery_level)} → {formatPercent(charge.end_battery_level)}
                </div>
              </div>
            </div>

            {/* 位置与下钻 */}
            <div className="mt-3 pt-2.5 border-t border-zinc-800/40 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 truncate pr-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{charge.address ?? DASH}</span>
              </div>
              <div className="flex items-center gap-0.5 text-emerald-400 shrink-0 font-medium text-[11px]">
                <span>功率详情</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
