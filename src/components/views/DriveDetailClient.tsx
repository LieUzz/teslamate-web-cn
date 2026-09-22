'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DriveDetail } from '@/types';
import { DriveMap } from '@/components/map/DriveMap';
import { DriveProfileChart } from '@/components/charts/DriveProfileChart';
import { StatCard } from '@/components/common/StatCard';
import {
  formatOrDash,
  formatPercent,
  DASH,
} from '@/lib/formatters';
import { Empty } from '@/components/common/Empty';
import { wgs84ToGcj02 } from '@/lib/coordtransform';
import {
  ArrowLeft,
  Route,
  Gauge,
  Zap,
  TrendingUp,
  Compass,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { ShareDriveModal } from '@/components/common/ShareDriveModal';

interface DriveDetailClientProps {
  drive: DriveDetail;
  carName: string | null;
  carModel: string | null;
}

export function DriveDetailClient({ drive, carName, carModel }: DriveDetailClientProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const hasPositions = drive.positions != null && drive.positions.length > 0;

  const startPos = hasPositions ? drive.positions[0] : null;
  const endPos = hasPositions ? drive.positions[drive.positions.length - 1] : null;

  // 生成高德地图标记/导航 URL
  const getAmapUrl = (lat: number, lng: number, title: string) => {
    const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat);
    return `https://uri.amap.com/marker?position=${gcjLng.toFixed(6)},${gcjLat.toFixed(
      6
    )}&name=${encodeURIComponent(title)}&coordinate=gaode&callnative=1`;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-24 lg:pb-8 pt-1 px-3">
      {/* 顶部返回与小巧精致的分享按钮 */}
      <div className="flex items-center justify-between">
        <Link
          href="/drives"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-50 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回行程列表</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* 🌟 小巧精致的单次行程分享按钮 */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-50 bg-zinc-900/90 hover:bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700 shadow-md transition-all active:scale-95 cursor-pointer"
            title="生成行程海报并分享"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span>分享行程</span>
          </button>
        </div>
      </div>

      {/* 4 核心统计指标 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <StatCard
          title="行驶距离"
          value={formatOrDash(drive.distance, { digits: 1 })}
          unit="km"
          icon={Route}
          highlight
        />
        <StatCard
          title="行驶能耗"
          value={formatOrDash(drive.efficiency_wh_km, { digits: 0 })}
          unit="Wh/km"
          icon={TrendingUp}
        />
        <StatCard
          title="平均车速"
          value={formatOrDash(drive.speed_avg, { digits: 0 })}
          unit="km/h"
          icon={Gauge}
        />
        <StatCard
          title="电量变化"
          value={`${formatPercent(drive.start_battery_level)} → ${formatPercent(drive.end_battery_level)}`}
          icon={Zap}
        />
      </div>

      {/* 起终点路线卡片 (支持一键打开高德地图定位) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* 起点 */}
        <div className="flex items-center justify-between gap-2 min-w-0 flex-1 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-zinc-500 text-[10px]">起点位置</div>
              <div className="text-zinc-50 font-medium truncate">{drive.start_address ?? DASH}</div>
            </div>
          </div>

          {startPos && (
            <a
              href={getAmapUrl(startPos.latitude, startPos.longitude, drive.start_address ?? '起点')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0 transition-colors"
              title="在高德地图中打开定位"
            >
              <span>高德定位</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="hidden md:block text-zinc-600 font-bold">➔</div>

        {/* 终点 */}
        <div className="flex items-center justify-between gap-2 min-w-0 flex-1 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-zinc-500 text-[10px]">终点位置</div>
              <div className="text-zinc-50 font-medium truncate">{drive.end_address ?? DASH}</div>
            </div>
          </div>

          {endPos && (
            <a
              href={getAmapUrl(endPos.latitude, endPos.longitude, drive.end_address ?? '终点')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0 transition-colors"
              title="在高德地图中打开定位"
            >
              <span>高德定位</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* 轨迹地图 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-zinc-50 flex items-center gap-2">
            <Compass className="w-4 h-4 text-red-500" />
            <span>GPS 行车轨迹地图</span>
          </h2>
        </div>
        {hasPositions ? (
          <DriveMap positions={drive.positions} height="400px" />
        ) : (
          <Empty title="暂无轨迹数据" icon={Compass} />
        )}
      </div>

      {/* 速度/功率/海拔曲线剖面图 */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-zinc-50 flex items-center gap-2 px-1">
          <Gauge className="w-4 h-4 text-blue-400" />
          <span>动力与车速剖面图</span>
        </h2>
        {hasPositions ? (
          <DriveProfileChart positions={drive.positions} height="280px" />
        ) : (
          <Empty as="chart" />
        )}
      </div>

      {/* 分享海报弹窗 */}
      <ShareDriveModal
        drive={drive}
        carName={carName}
        carModel={carModel}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
