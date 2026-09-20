'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { FootprintDrivePath, VisitedLocation } from '@/types';
import { formatDateTime, formatDistance, formatOrDash, DASH } from '@/lib/formatters';
import { wgs84ToGcj02 } from '@/lib/coordtransform';
import { Empty } from '@/components/common/Empty';
import { Maximize2 } from 'lucide-react';

// 地图上最多标注的常去地点数 (按到访次数排序；家始终标注)
const MAX_PLACE_MARKERS = 10;

// 弹窗是拼接的 HTML，地址/地点名来自数据库与地理编码，需转义
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface PlaceMarker {
  name: string;
  visit_count: number;
  is_home: boolean;
  latLng: [number, number]; // [lat, lng] GCJ-02
}

// locations 的坐标是 WGS-84，轨迹是 GCJ-02，这里统一转换；没有坐标的地点不上图
function toPlaceMarkers(locations: VisitedLocation[]): PlaceMarker[] {
  const located = locations
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => {
      const [lng, lat] = wgs84ToGcj02(l.longitude as number, l.latitude as number);
      return { name: l.name, visit_count: l.visit_count, is_home: l.is_home === true, latLng: [lat, lng] as [number, number] };
    })
    .sort((a, b) => b.visit_count - a.visit_count);
  const top = located.slice(0, MAX_PLACE_MARKERS);
  // 家不在前 N 名时也要标注
  located.slice(MAX_PLACE_MARKERS).forEach((l) => {
    if (l.is_home) top.push(l);
  });
  return top;
}

interface FootprintMapProps {
  paths: FootprintDrivePath[];
  locations?: VisitedLocation[];
  height?: string;
  className?: string;
  selectedPathId?: number | null;
  onSelectPath?: (path: FootprintDrivePath | null) => void;
}

export function FootprintMap({
  paths,
  locations = [],
  height = '520px',
  className = '',
  selectedPathId = null,
  onSelectPath,
}: FootprintMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const polylinesMapRef = useRef<Map<number, { poly: any; glow: any }>>(new Map());

  const placeMarkers = useMemo(() => toPlaceMarkers(locations), [locations]);
  const drawablePaths = useMemo(() => paths.filter((p) => p.points && p.points.length >= 2), [paths]);
  const hasContent = drawablePaths.length > 0 || placeMarkers.length > 0;

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || !hasContent) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;
      leafletRef.current = L;

      // 如果已有实例则销毁重新初始化
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        polylinesMapRef.current.clear();
      }

      // 不设默认中心：视野完全由实际轨迹/地点的边界决定
      const map = L.map(mapContainerRef.current, {
        attributionControl: false,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // 高德地图栅格瓦片
      L.tileLayer(
        'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        {
          subdomains: ['1', '2', '3', '4'],
          maxZoom: 18,
          minZoom: 4,
        }
      ).addTo(map);

      const allLatLngs: [number, number][] = [];
      const featureGroup = L.featureGroup();

      // 绘制所有轨迹
      drawablePaths.forEach((path) => {
        path.points.forEach((pt) => allLatLngs.push(pt));

        const isSelected = selectedPathId === path.id;

        // 1. 底层发光微光晕
        const glowLine = L.polyline(path.points, {
          color: isSelected ? '#38bdf8' : '#ef4444',
          weight: isSelected ? 10 : 6,
          opacity: isSelected ? 0.6 : (selectedPathId != null ? 0.15 : 0.3),
          lineCap: 'round',
          lineJoin: 'round',
        });
        glowLine.addTo(featureGroup);

        // 2. 表层鲜亮核心轨迹
        const polyline = L.polyline(path.points, {
          color: isSelected ? '#00f2ff' : '#ff2a32',
          weight: isSelected ? 4.5 : 3,
          opacity: isSelected ? 1.0 : (selectedPathId != null ? 0.35 : 0.85),
          lineCap: 'round',
          lineJoin: 'round',
        });

        polyline.on('click', () => {
          if (onSelectPath) {
            onSelectPath(isSelected ? null : path);
          }
        });

        polyline.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #18181b; line-height: 1.5; padding: 2px;">
            <div style="font-weight: bold; color: #dc2626; font-size: 13px;">🚗 ${formatDistance(path.distance)} 行程</div>
            <div style="color: #71717a; font-size: 11px; margin-top: 2px;">${formatDateTime(path.start_date)}</div>
            <div style="margin-top: 6px;"><strong>起：</strong>${path.start_address ? escapeHtml(path.start_address) : DASH}</div>
            <div><strong>终：</strong>${path.end_address ? escapeHtml(path.end_address) : DASH}</div>
          </div>
        `);

        polyline.addTo(featureGroup);
        polylinesMapRef.current.set(path.id, { poly: polyline, glow: glowLine });
      });

      featureGroup.addTo(map);

      // 标注常去地点 (来自停车统计)；只有地理围栏/数据明确标记 is_home 的地点才显示为"家"
      placeMarkers.forEach((place) => {
        const color = place.is_home ? '#3b82f6' : '#f59e0b';
        const size = place.is_home ? 14 : 10;
        const icon = L.divIcon({
          className: 'custom-place-pin',
          html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>`,
          iconSize: [size + 4, size + 4],
          iconAnchor: [(size + 4) / 2, (size + 4) / 2],
        });
        L.marker(place.latLng, { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #18181b; line-height: 1.5; padding: 2px;">
              <div style="font-weight: bold;">${place.is_home ? '🏠 家 · ' : '📍 '}${escapeHtml(place.name)}</div>
              <div style="color: #71717a; font-size: 11px;">到访 ${formatOrDash(place.visit_count)} 次</div>
            </div>
          `);
        allLatLngs.push(place.latLng);
      });

      // 自适应缩放：选中单程时聚焦该行程，否则 (或选中项不在当前列表) 适应全部内容
      const selected = selectedPathId != null ? drawablePaths.find((p) => p.id === selectedPathId) : undefined;
      if (selected) {
        map.fitBounds(L.latLngBounds(selected.points), {
          padding: [50, 50],
          maxZoom: 15,
        });
      } else {
        map.fitBounds(L.latLngBounds(allLatLngs), {
          padding: [45, 45],
          maxZoom: 14,
        });
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // onSelectPath 由父组件每次渲染新建，不作为依赖以免地图反复重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawablePaths, placeMarkers, selectedPathId, hasContent]);

  // 重置回全景视野
  const handleResetBounds = () => {
    const L = leafletRef.current;
    if (!mapInstanceRef.current || !L) return;
    const allLatLngs = [...drawablePaths.flatMap((p) => p.points), ...placeMarkers.map((m) => m.latLng)];
    if (allLatLngs.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allLatLngs), {
        padding: [45, 45],
        maxZoom: 14,
      });
    }
  };

  if (!hasContent) {
    return <Empty title="该时间范围内暂无行车轨迹" hint="没有可上图的行程或带坐标的常去地点" />;
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950">
      <div
        ref={mapContainerRef}
        style={{ height }}
        className={`w-full relative z-10 ${className}`}
      />

      {/* 地图悬浮操作浮窗 */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleResetBounds}
          className="bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white p-2.5 rounded-2xl border border-zinc-700 shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 text-xs"
          title="居中适应全景足迹"
        >
          <Maximize2 className="w-4 h-4 text-red-500" />
          <span className="hidden sm:inline font-medium">全景自适应</span>
        </button>
      </div>

      {/* 底部悬浮指示卡 */}
      <div className="absolute bottom-4 left-4 z-20 bg-zinc-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-zinc-800 text-xs shadow-xl flex items-center gap-3 text-zinc-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-sm shadow-red-500/50" />
          <span>行车轨迹 ({drawablePaths.length} 段)</span>
        </div>
        {placeMarkers.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>常去地点 ({placeMarkers.length})</span>
          </div>
        )}
        {selectedPathId != null && (
          <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
            <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400/50 animate-pulse" />
            <span>已高亮选中单程</span>
          </div>
        )}
      </div>
    </div>
  );
}
