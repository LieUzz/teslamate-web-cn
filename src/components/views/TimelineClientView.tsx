'use client';

import React from 'react';
import Link from 'next/link';
import { DayTimeline as DayTimelineData } from '@/types';
import { DayTimeline } from '@/components/home/DayTimeline';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// YYYY-MM-DD 的星期几，不经过浏览器时区
function weekdayOf(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '';
}

function DayLink({ date, children, label }: { date: string | null; children: React.ReactNode; label: string }) {
  const cls = 'p-2 rounded-full border transition-colors';
  if (date == null) {
    return (
      <span aria-disabled="true" className={`${cls} border-zinc-800/60 text-zinc-700`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={`/timeline/?date=${date}`} aria-label={label} className={`${cls} border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800`}>
      {children}
    </Link>
  );
}

export function TimelineClientView({ data }: { data: DayTimelineData }) {
  return (
    <div className="space-y-3 pb-24 pt-2 px-2.5 max-w-lg mx-auto">
      <div className="flex items-center justify-between gap-2">
        <DayLink date={data.prev_date} label="上一个有活动的日期">
          <ChevronLeft className="w-4 h-4" />
        </DayLink>
        <div className="text-center min-w-0">
          <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-zinc-50">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <span>{data.date}</span>
            <span className="text-zinc-400 font-medium">{weekdayOf(data.date)}</span>
            {data.is_today && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">今天</span>}
          </div>
          {!data.is_today && (
            <Link href="/timeline/" className="text-[11px] text-zinc-400 hover:text-zinc-50">回到今天</Link>
          )}
        </div>
        <DayLink date={data.next_date} label="下一个有活动的日期">
          <ChevronRight className="w-4 h-4" />
        </DayLink>
      </div>

      <DayTimeline data={data} variant="day" />
    </div>
  );
}
