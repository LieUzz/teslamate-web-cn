import React from 'react';
import Link from 'next/link';
import { CarMilestonesData } from '@/types';
import { Award, CheckCircle2, Clock, Calendar, Sparkles, ChevronRight, Target } from 'lucide-react';
import { DASH, formatDateTime, formatOrDash, formatPercent } from '@/lib/formatters';

interface CarMilestonesCardProps {
  data: CarMilestonesData;
}

// 纯展示组件：天数、日均、预测全部由服务端计算，这里不做任何二次推算
export function CarMilestonesCard({ data }: CarMilestonesCardProps) {
  const achievedCount = data.milestones.filter((m) => m.is_achieved).length;

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
      {/* 顶部背景高光饰条 */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* 卡片头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-50 flex items-center gap-1.5">
              <span>爱车里程碑</span>
              {data.milestones.length > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  已达成 {achievedCount} 项
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* 提车日期 (只读，来自配置) */}
        <div className="inline-flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-800/90 px-3.5 py-1.5 rounded-xl border border-zinc-700/80 self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>提车日: {data.delivery_date ?? '未配置'}</span>
        </div>
      </div>

      {/* 总况速览栏 */}
      <div
        className={`grid ${
          data.recent_daily_avg_km != null ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
        } gap-2 text-center text-xs bg-zinc-950/50 p-2.5 rounded-2xl border border-zinc-800/80`}
      >
        <div>
          <div className="text-[11px] text-zinc-400">提车至今</div>
          <div className="text-sm font-bold text-zinc-50 mt-0.5">
            {formatOrDash(data.days_since_delivery)} <span className="text-[10px] text-zinc-400 font-normal">天</span>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-zinc-400">当前总里程</div>
          <div className="text-sm font-bold text-amber-400 mt-0.5">
            {formatOrDash(data.current_odometer, { locale: true })}{' '}
            <span className="text-[10px] text-zinc-400 font-normal">km</span>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-zinc-400">提车至今日均</div>
          <div className="text-sm font-bold text-blue-400 mt-0.5">
            {formatOrDash(data.daily_avg_km, { digits: 1 })}{' '}
            <span className="text-[10px] text-zinc-400 font-normal">km/天</span>
          </div>
        </div>
        {data.recent_daily_avg_km != null && (
          <div>
            <div className="text-[11px] text-zinc-400">近期日均</div>
            <div className="text-sm font-bold text-blue-400 mt-0.5">
              {formatOrDash(data.recent_daily_avg_km, { digits: 1 })}{' '}
              <span className="text-[10px] text-zinc-400 font-normal">km/天</span>
            </div>
          </div>
        )}
      </div>

      {/* 里程碑梯级列表 */}
      {data.milestones.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500">暂无里程碑数据</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {data.milestones.map((m) => {
            if (m.is_achieved) {
              const beforeLogging = m.achieved_before_logging === true;
              // 已达成勋章卡片
              return (
                <div
                  key={m.target_km}
                  className="bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group"
                >
                  {/* 达成金色光晕 */}
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-50">{m.label}</div>
                        <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            已达成
                            {!beforeLogging && m.achieved_duration_days != null
                              ? ` · 提车后第 ${m.achieved_duration_days} 天`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      达成
                    </span>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    {beforeLogging ? (
                      <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                        已达成
                      </span>
                    ) : (
                      <div className="text-zinc-400 text-[11px]">
                        达成时刻: <span className="text-zinc-300">{formatDateTime(m.achieved_date)}</span>
                      </div>
                    )}
                    {!beforeLogging && m.drive_id != null && (
                      <Link
                        href={`/drives/${m.drive_id}`}
                        className="text-amber-400 hover:text-amber-300 font-medium text-[11px] flex items-center gap-0.5 transition-colors"
                      >
                        <span>回看行程</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            }

            // 未达成进度卡片 (下一个目标)
            const progress =
              m.current_progress_percent != null && Number.isFinite(m.current_progress_percent)
                ? Math.min(100, Math.max(0, m.current_progress_percent))
                : null;
            return (
              <div
                key={m.target_km}
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-zinc-800/80 text-zinc-400">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-300">{m.label}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          还差 {formatOrDash(m.remaining_km, { locale: true })} km
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                      {formatPercent(m.current_progress_percent, 1)}
                    </span>
                  </div>

                  {/* 进度条：进度未知时不画填充 */}
                  <div className="mt-3 w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                    {progress != null && (
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                  {m.predicted_date != null ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>预计还需 {m.predicted_days_remaining ?? DASH} 天</span>
                      </div>
                      <div className="text-zinc-500">约 {m.predicted_date} 达成</div>
                    </>
                  ) : (
                    <span className="text-zinc-500">暂无足够行驶记录用于预测</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
