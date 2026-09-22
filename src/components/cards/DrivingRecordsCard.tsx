'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Gauge,
  Navigation,
  Clock,
  Leaf,
  Zap,
  BatteryCharging,
  Mountain,
  ThermometerSnowflake,
  ThermometerSun,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DrivingRecordItem, DrivingRecords, DrivingRecordsByPeriod, RecordPeriod } from '@/types';
import { DASH, formatDateTime } from '@/lib/formatters';
import { RECORD_WINDOW_DAYS } from '@/lib/constants';
import { Empty } from '@/components/common/Empty';

type RecordTileKey = Exclude<keyof DrivingRecords, 'period' | 'drive_count' | 'extreme_temp'>;

// 每个极值格的静态标题/单位：仅在该项为 null (无合格行程) 时使用，有数据时以服务端返回的为准
const RECORD_TILES: { key: RecordTileKey; title: string; unit: string; icon: LucideIcon; color: string; iconBg: string }[] = [
  { key: 'max_speed', title: '最高时速', unit: 'km/h', icon: Gauge, color: 'text-rose-400', iconBg: 'bg-rose-500/10 border-rose-500/20' },
  { key: 'longest_distance', title: '单次最远行程', unit: 'km', icon: Navigation, color: 'text-blue-400', iconBg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'longest_duration', title: '单次最长驾驶', unit: '', icon: Clock, color: 'text-indigo-400', iconBg: 'bg-indigo-500/10 border-indigo-500/20' },
  { key: 'best_efficiency', title: '最佳能耗', unit: 'Wh/km', icon: Leaf, color: 'text-emerald-400', iconBg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: 'max_power', title: '最大输出功率', unit: 'kW', icon: Zap, color: 'text-amber-400', iconBg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'max_regen', title: '最大动能回收', unit: 'kW', icon: BatteryCharging, color: 'text-cyan-400', iconBg: 'bg-cyan-500/10 border-cyan-500/20' },
  { key: 'max_ascent', title: '单次最大海拔爬升', unit: 'm', icon: Mountain, color: 'text-teal-400', iconBg: 'bg-teal-500/10 border-teal-500/20' },
];

interface DrivingRecordsCardProps {
  records: DrivingRecordsByPeriod;
}

export function DrivingRecordsCard({ records }: DrivingRecordsCardProps) {
  const [activePeriod, setActivePeriod] = useState<RecordPeriod>('all');

  const periodOptions: { key: RecordPeriod; label: string }[] = [
    // 均为滚动窗口 (天数来自 RECORD_WINDOW_DAYS)，不是自然月/年
    { key: 'month', label: `近 ${RECORD_WINDOW_DAYS.month} 天` },
    { key: 'half_year', label: `近 ${RECORD_WINDOW_DAYS.half_year} 天` },
    { key: 'year', label: `近 ${RECORD_WINDOW_DAYS.year} 天` },
    { key: 'all', label: '全部' },
  ];

  const currentRecords = records[activePeriod];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-6">
      {/* 头部标题与周期切换器 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
            <Trophy className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">驾驶生涯极值榜</h2>
          </div>
        </div>

        {/* 周期切换 Tabs */}
        <div className="inline-flex p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 self-start sm:self-auto">
          {periodOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setActivePeriod(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activePeriod === opt.key
                  ? 'bg-zinc-800 text-amber-400 font-semibold shadow-sm border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 极值指标网格：该周期没有行程时显示空状态，绝不回退到其他周期 */}
      {currentRecords.drive_count === 0 ? (
        <Empty title="该时间范围内暂无行程" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RECORD_TILES.map((tile) => {
            const item = currentRecords[tile.key];
            const Icon = tile.icon;
            return (
              <RecordGridItem
                key={tile.key}
                icon={<Icon className={`w-4 h-4 ${tile.color}`} />}
                iconBg={tile.iconBg}
                title={item?.title ?? tile.title}
                unit={item?.unit ?? tile.unit}
                item={item}
                valueColor={tile.color}
              />
            );
          })}

          {/* 8. 极限气温出行 */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">极限气温出行</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 my-2">
              <TempTile
                label="最低温"
                icon={<ThermometerSnowflake className="w-3 h-3" />}
                color="text-cyan-400"
                border="border-cyan-500/10"
                item={currentRecords.extreme_temp.lowest}
              />
              <TempTile
                label="最高温"
                icon={<ThermometerSun className="w-3 h-3" />}
                color="text-orange-400"
                border="border-orange-500/10"
                item={currentRecords.extreme_temp.highest}
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// 极限气温的单格；无温度数据的周期显示 "--"
function TempTile({
  label,
  icon,
  color,
  border,
  item,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  item: DrivingRecordItem | null;
}) {
  const body = (
    <div className={`bg-zinc-900/60 rounded-lg p-2 border ${border} h-full`}>
      <div className={`flex items-center gap-1 text-[11px] ${color}`}>
        {icon}
        {label}
      </div>
      <div className="text-base font-bold text-zinc-100 mt-1 font-mono">
        {item ? item.formatted_value : DASH} <span className="text-xs font-normal text-zinc-400">°C</span>
      </div>
      <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{item ? formatDateTime(item.date) : '暂无数据'}</div>
    </div>
  );
  if (item?.drive_id != null) {
    return (
      <Link href={`/drives/${item.drive_id}`} className="block">
        {body}
      </Link>
    );
  }
  return body;
}

interface RecordGridItemProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  unit: string;
  item: DrivingRecordItem | null;
  valueColor: string;
}

function RecordGridItem({ icon, iconBg, title, unit, item, valueColor }: RecordGridItemProps) {
  const driveId = item?.drive_id;
  const secondary = item?.secondary_value;
  const subText = item?.sub_text;
  const content = (
    <div className="group bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 hover:bg-zinc-950/90 transition-all h-full">
      <div>
        {/* 顶部标题与图标 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium">{title}</span>
          <div className={`w-7 h-7 rounded-lg ${iconBg} border flex items-center justify-center`}>
            {icon}
          </div>
        </div>

        {/* 极值主数值 */}
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className={`text-2xl font-black font-mono tracking-tight ${item ? valueColor : 'text-zinc-500'}`}>
            {item ? item.formatted_value : DASH}
          </span>
          {unit && <span className="text-xs font-medium text-zinc-400">{unit}</span>}
        </div>

        {/* 描述与路线 */}
        {subText && (
          <p className="text-[11px] text-zinc-300 mt-1.5 line-clamp-1 group-hover:text-zinc-100 transition-colors">
            {subText}
          </p>
        )}
      </div>

      {/* 底部发生时间与附属标签 */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
        <span className="truncate">{item ? formatDateTime(item.date) : '暂无数据'}</span>
        {secondary ? (
          <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 truncate max-w-[120px]">
            {secondary}
          </span>
        ) : driveId != null ? (
          <span className="inline-flex items-center gap-0.5 text-zinc-400 group-hover:text-zinc-200 transition-colors">
            查看行程 <ChevronRight className="w-3 h-3" />
          </span>
        ) : null}
      </div>
    </div>
  );

  if (driveId != null) {
    return (
      <Link href={`/drives/${driveId}`} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
