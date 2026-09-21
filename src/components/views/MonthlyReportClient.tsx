'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MonthlyReport } from '@/types';
import { formatCurrency, formatOrDash } from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { ShareReportModal } from '@/components/common/ShareReportModal';

interface MonthlyReportClientProps {
  reports: MonthlyReport[];
  carName: string | null;
  carModel: string | null;
}

export function MonthlyReportClient({ reports, carName, carModel }: MonthlyReportClientProps) {
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);

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
        <span className="text-xs text-zinc-400 font-mono">月度出行能耗账单</span>
      </div>

      {/* 月度报告卡片列表 */}
      {reports.length === 0 && <Empty title="暂无月度报告" hint="还没有任何月份的行程或充电记录" icon={Calendar} />}

      <div className="space-y-4">
        {reports.map((report) => {
          // 当月电费 ÷ 当月里程；费用未知或里程为 0 时不计算
          const costPerKm =
            report.charge_cost != null && report.distance_km > 0 ? report.charge_cost / report.distance_km : null;
          return (
          <div
            key={report.month}
            className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-zinc-50">{report.month} 月度用车报告</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">当月行驶里程与充电开销汇总</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* 🌟 生成海报分享按钮 */}
                <button
                  onClick={() => setSelectedReport(report)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>生成分享海报</span>
                </button>
              </div>
            </div>

            {/* 6 维关键指标网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/60">
                <div className="text-[11px] text-zinc-400">行驶里程 / 行程数</div>
                <div className="text-base font-bold text-zinc-50 mt-1">
                  {formatOrDash(report.distance_km, { digits: 1, locale: true })} <span className="text-[10px] text-zinc-400 font-normal">km</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">共 {report.drive_count} 次行程</div>
              </div>

              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/60">
                <div className="text-[11px] text-zinc-400">充电总费用</div>
                <div className="text-base font-bold text-amber-400 mt-1">
                  {formatCurrency(report.charge_cost)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {report.charge_count} 次充电 · 共充入 {formatOrDash(report.charge_energy_kwh, { digits: 1 })} kWh
                </div>
                {report.unpriced_charge_count > 0 && (
                  <div className="text-[10px] text-amber-500/80 mt-0.5">
                    {report.unpriced_charge_count} 次充电无费用数据，未计入
                  </div>
                )}
              </div>

              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/60">
                <div className="text-[11px] text-zinc-400">平均能耗</div>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  {formatOrDash(report.avg_wh_km, { digits: 0 })} <span className="text-[10px] text-zinc-400 font-normal">Wh/km</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  当月电费 ÷ 里程: {costPerKm != null ? `¥${costPerKm.toFixed(3)} / km` : '--'}
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* 模态框 */}
      {selectedReport && (
        <ShareReportModal
          report={selectedReport}
          carName={carName}
          carModel={carModel}
          isOpen={true}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
