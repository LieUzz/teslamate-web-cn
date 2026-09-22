'use client';

import React from 'react';
import Link from 'next/link';
import { DayTimeline as DayTimelineData, TimelineItem } from '@/types';
import { formatTime, formatDistance, formatDuration, formatEnergy, formatPercent, formatCurrency, formatOrDash, DASH } from '@/lib/formatters';
import { sumKnown } from '@/components/views/helpers';
import { Empty } from '@/components/common/Empty';
import { CalendarDays, Route, Zap, ChevronRight } from 'lucide-react';

interface DayTimelineProps {
  data: DayTimelineData;
  // home: 首页卡片 (带标题与"按天查看"入口)；day: 按天页面 (日期栏由页面负责)
  variant: 'home' | 'day';
}

const itemStart = (item: TimelineItem) => (item.kind === 'drive' ? item.drive.start_date : item.charge.start_date);

function ItemRow({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
  const isDrive = item.kind === 'drive';
  const href = isDrive ? `/drives/${item.drive.id}` : `/charges/${item.charge.id}`;

  let title: string;
  let detail: string;
  if (item.kind === 'drive') {
    const d = item.drive;
    title = `${d.start_address ?? DASH} → ${d.end_address ?? DASH}`;
    detail = [
      `${formatDistance(d.distance)} · ${formatDuration(d.duration_min)}`,
      `${formatPercent(d.start_battery_level)} → ${formatPercent(d.end_battery_level)}`,
      d.is_merged && d.merged_count ? `含 ${d.merged_count} 段` : null,
    ].filter(Boolean).join(' · ');
  } else {
    const c = item.charge;
    title = c.address ?? DASH;
    detail = [
      c.charge_energy_added != null ? `+${formatEnergy(c.charge_energy_added)}` : DASH,
      `${formatPercent(c.start_battery_level)} → ${formatPercent(c.end_battery_level)}`,
      c.end_date == null ? '充电中' : formatDuration(c.duration_min),
      c.cost != null ? `${formatCurrency(c.cost)}${c.cost_source === 'configured' ? ' (估算)' : ''}` : null,
    ].filter(Boolean).join(' · ');
  }

  return (
    <Link href={href} className="flex items-stretch gap-2.5 group">
      <div className="w-10 shrink-0 pt-2 font-mono text-[11px] text-zinc-400 text-right">{formatTime(itemStart(item))}</div>
      <div className="relative shrink-0 flex flex-col items-center">
        <div className={`mt-1.5 p-1.5 rounded-full ${isDrive ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {isDrive ? <Route className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
        </div>
        {!isLast && <div className="w-px flex-1 bg-zinc-800 my-1" />}
      </div>
      <div className="min-w-0 flex-1 py-1.5 pr-1 border-b border-zinc-800/60 group-last:border-b-0 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-zinc-50 truncate">{title}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{detail}</div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 shrink-0" />
      </div>
    </Link>
  );
}

export function DayTimeline({ data, variant }: DayTimelineProps) {
  const drives = data.items.filter((i): i is Extract<TimelineItem, { kind: 'drive' }> => i.kind === 'drive');
  const charges = data.items.filter((i): i is Extract<TimelineItem, { kind: 'charge' }> => i.kind === 'charge');
  const distance = sumKnown(drives, (i) => i.drive.distance);
  const energyAdded = sumKnown(charges, (i) => i.charge.charge_energy_added);

  let empty: React.ReactNode = null;
  if (data.items.length === 0) {
    if (variant === 'day') {
      empty = <Empty as="chart" title="这一天没有行程和充电" />;
    } else if (data.latest_activity_date == null) {
      empty = <Empty as="chart" title="暂无行程和充电记录" />;
    } else {
      empty = (
        <div className="py-8 text-center text-xs text-zinc-500">
          <div>今天还没有行程和充电</div>
          <Link href={`/timeline/?date=${data.latest_activity_date}`} className="inline-flex items-center gap-0.5 mt-2 text-zinc-300 hover:text-zinc-50">
            <span>最近一次活动：{data.latest_activity_date}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      );
    }
  }

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-lg">
      {variant === 'home' && (
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <CalendarDays className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-50">今日动态</span>
          </div>
          <Link href="/timeline/" className="text-[11px] text-zinc-400 hover:text-zinc-50 flex items-center gap-0.5">
            <span>按天查看</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {empty ?? (
        <div className={variant === 'home' ? 'mt-1.5' : ''}>
          {data.items.map((item, idx) => (
            <ItemRow key={`${item.kind}-${item.kind === 'drive' ? item.drive.id : item.charge.id}`} item={item} isLast={idx === data.items.length - 1} />
          ))}
          <div className="mt-2.5 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
            <span>{drives.length} 段行程</span>
            <span>{formatOrDash(distance, { digits: 1, unit: 'km' })}</span>
            <span>{charges.length} 次充电</span>
            <span>{energyAdded != null ? `+${formatEnergy(energyAdded)}` : DASH}</span>
          </div>
        </div>
      )}
    </div>
  );
}
