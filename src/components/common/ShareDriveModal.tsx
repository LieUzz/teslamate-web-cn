'use client';

import React, { useRef, useState, useEffect } from 'react';
import { DriveDetail } from '@/types';
import {
  formatDistance,
  formatDuration,
  formatEnergy,
  formatDateTime,
  formatEfficiency,
  formatPercent,
  formatSpeed,
} from '@/lib/formatters';
import { toPng } from 'html-to-image';
import {
  X,
  Copy,
  Check,
  Route,
  Image as ImageIcon,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { wgs84ToGcj02 } from '@/lib/coordtransform';

interface ShareDriveModalProps {
  drive: DriveDetail;
  // 车辆名称/车型来自 Car 对象；未知时传 null，海报上不显示
  carName: string | null;
  carModel?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const TILE_SIZE = 256;

// 经纬度转 Web 墨卡托世界像素坐标 (zoom 级别下，单瓦片 256px)
function lngLatToWorldPx(lng: number, lat: number, zoom: number): [number, number] {
  const n = TILE_SIZE * Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return [x, y];
}

// 隐私打码函数
function maskAddress(addr: string): string {
  if (addr.includes('·')) {
    const parts = addr.split('·');
    return `${parts[0].trim()} · ****** (已脱敏)`;
  }
  if (addr.includes('(')) {
    const parts = addr.split('(');
    return `${parts[0].trim()} (已脱敏)`;
  }
  if (addr.length <= 4) return '****** (已脱敏)';
  return `${addr.substring(0, 3)}****** (已脱敏)`;
}

// 兼容 HTTP 与 HTTPS 的安全剪贴板复制工具
async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
}

export function ShareDriveModal({
  drive,
  carName,
  carModel = null,
  isOpen,
  onClose,
}: ShareDriveModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);

  // 异步在 Canvas 上绘制地图底图与轨迹
  const drawTrackMap = async (isPrivacy: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas || !drive.positions || drive.positions.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = 2;
    const width = 360;
    const height = 190;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. 转换全部点为 GCJ-02 坐标 (高德瓦片为 GCJ-02)
    const gcjPoints: [number, number][] = drive.positions.map((p) => wgs84ToGcj02(p.longitude, p.latitude));

    // 2. 选取能让整条轨迹落在留白内的最大整数 zoom；底图与轨迹共用同一个墨卡托投影，保证对齐
    const padding = 28;
    const drawW = width - padding * 2;
    const drawH = height - padding * 2;
    const world0 = gcjPoints.map(([lng, lat]) => lngLatToWorldPx(lng, lat, 0));
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    world0.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const fitScale = Math.min(spanX > 0 ? drawW / spanX : Infinity, spanY > 0 ? drawH / spanY : Infinity);
    const MIN_ZOOM = 3;
    const MAX_ZOOM = 17;
    const zoom = Number.isFinite(fitScale)
      ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(Math.log2(fitScale))))
      : MAX_ZOOM;
    const zoomScale = Math.pow(2, zoom);
    // 视口左上角的世界像素坐标
    const originX = ((minX + maxX) / 2) * zoomScale - width / 2;
    const originY = ((minY + maxY) / 2) * zoomScale - height / 2;

    let mapLabel: string;

    if (isPrivacy) {
      // 🛡️ 隐私模式：纯黑背景 + 仅轨迹
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // 微弱网格
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      for (let x = 20; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 20; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      mapLabel = '隐私模式 · 地理信息已隐藏';
    } else {
      // 🗺️ 非隐私模式：加载覆盖视口的高德瓦片
      ctx.fillStyle = '#141416';
      ctx.fillRect(0, 0, width, height);

      const maxTile = zoomScale - 1;
      const txMin = Math.max(0, Math.floor(originX / TILE_SIZE));
      const txMax = Math.min(maxTile, Math.floor((originX + width) / TILE_SIZE));
      const tyMin = Math.max(0, Math.floor(originY / TILE_SIZE));
      const tyMax = Math.min(maxTile, Math.floor((originY + height) / TILE_SIZE));

      const tilePromises: Promise<{ img: HTMLImageElement; dx: number; dy: number } | null>[] = [];
      for (let tx = txMin; tx <= txMax; tx++) {
        for (let ty = tyMin; ty <= tyMax; ty++) {
          const sub = (Math.abs(tx + ty) % 4) + 1;
          const url = `https://webrd0${sub}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${tx}&y=${ty}&z=${zoom}`;
          tilePromises.push(
            new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve({ img, dx: tx * TILE_SIZE - originX, dy: ty * TILE_SIZE - originY });
              img.onerror = () => resolve(null);
              img.src = url;
            })
          );
        }
      }

      // 等待瓦片加载 (超时则不画底图)
      const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 2000));
      const loadedTiles = await Promise.race([Promise.all(tilePromises), timeoutPromise]);

      let drawnTiles = 0;
      if (Array.isArray(loadedTiles)) {
        loadedTiles.forEach((item) => {
          if (item) {
            ctx.drawImage(item.img, item.dx, item.dy, TILE_SIZE, TILE_SIZE);
            drawnTiles++;
          }
        });
      }

      // 加一层暗色蒙版，让红线更突出
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, width, height);

      // 标注如实反映底图是否真的画上了
      mapLabel = drawnTiles > 0 ? '底图 © 高德地图' : '底图未加载 · 仅轨迹';
    }

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(mapLabel, width - 10, height - 10);

    // 3. 投影到 Canvas 像素并绘制行车轨迹
    const projectedPoints = gcjPoints.map(([lng, lat]) => {
      const [wx, wy] = lngLatToWorldPx(lng, lat, zoom);
      return [wx - originX, wy - originY];
    });

    // 绘制轨迹红色发光外晕
    ctx.save();
    ctx.beginPath();
    projectedPoints.forEach(([x, y], idx) => {
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    // 绘制主轨迹
    ctx.beginPath();
    projectedPoints.forEach(([x, y], idx) => {
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 绘制起点（绿色发光）与终点（红色发光）
    if (projectedPoints.length > 0) {
      const [startX, startY] = projectedPoints[0];
      const [endX, endY] = projectedPoints[projectedPoints.length - 1];

      // 起点
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(startX, startY, 5, 0, Math.PI * 2);
      ctx.fill();

      // 终点
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(endX, endY, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 生成海报高清图片
  const generatePosterImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsGenerating(true);
      await drawTrackMap(privacyMode);

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // 3倍超高清输出
        quality: 0.95,
      });

      setGeneratedImgUrl(dataUrl);
    } catch (err) {
      console.error('渲染海报图片失败:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 打开弹窗或隐私模式变化时，自动重绘并生成
  useEffect(() => {
    if (!isOpen) {
      setGeneratedImgUrl(null);
      return;
    }

    let isMounted = true;
    setGeneratedImgUrl(null); // 切换模式时先重置，触发重新渲染
    const timer = setTimeout(async () => {
      if (isMounted) {
        await generatePosterImage();
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, privacyMode]);

  if (!isOpen) return null;

  const hasTrack = drive.positions != null && drive.positions.length > 0;
  // 地址未知时为 null，对应的行不出现在海报上
  const mask = (addr: string | null) => (addr == null ? null : privacyMode ? maskAddress(addr) : addr);
  const displayStartAddr = mask(drive.start_address);
  const displayEndAddr = mask(drive.end_address);

  const headerTitle = carName ?? carModel ?? '行程全览';
  const headerSubtitle = carName != null && carModel != null ? `${carModel} · 行程全览` : carName != null || carModel != null ? '行程全览' : null;

  const hasBatteryChange = drive.start_battery_level != null && drive.end_battery_level != null;
  const batteryChangeText = `${formatPercent(drive.start_battery_level)} ➔ ${formatPercent(drive.end_battery_level)}`;
  // 里程下方的副信息，未知项不出现
  const headlineMeta = [
    drive.duration_min != null ? `耗时 ${formatDuration(drive.duration_min)}` : null,
    drive.speed_avg != null ? `均速 ${formatSpeed(drive.speed_avg)}` : null,
  ].filter((v): v is string => v != null);

  // 复制行程文字战报
  const handleCopyText = async () => {
    // 未知的指标不写进战报
    const consumption = [
      hasBatteryChange ? batteryChangeText : null,
      drive.consumption_kwh != null ? formatEnergy(drive.consumption_kwh) : null,
    ].filter((v): v is string => v != null);
    const route = [displayStartAddr, displayEndAddr].filter((v): v is string => v != null);
    const lines = [
      `🚗【${carName != null ? `${carName} · ` : ''}单次行程战报】`,
      `🗓️ 出发时间: ${formatDateTime(drive.start_date)}`,
      drive.distance != null ? `📍 行驶里程: ${formatDistance(drive.distance)}` : null,
      headlineMeta.length > 0 ? `⏱️ ${headlineMeta.join(' · ')}` : null,
      consumption.length > 0 ? `🔋 电量消耗: ${consumption.join(' · ')}` : null,
      drive.efficiency_wh_km != null ? `🌿 平均能耗: ${formatEfficiency(drive.efficiency_wh_km)}` : null,
      route.length === 2 ? `🏁 路线: ${route[0]} ➔ ${route[1]}` : null,
      '✨ 由 TeslaMate CN 生成',
    ].filter((v): v is string => v != null);
    const text = lines.join('\n');

    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div data-theme="dark" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[94vh] overflow-y-auto">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 z-20 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 顶部操作区：隐私模式切换与保存提示 */}
        <div className="mb-3 pr-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-medium">
              {isGenerating ? '正在生成海报...' : '📱 长按图片存储到相册'}
            </span>
          </div>

          {/* 🌟 隐私模式一键切换 */}
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
              privacyMode
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-500/20'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            {privacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{privacyMode ? '隐私模式：已开启' : '开启隐私模式'}</span>
          </button>
        </div>

        {/* 🌟 海报图片容器 (彻底杜绝任何 link.click() 跳转) */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl bg-zinc-900">
          {generatedImgUrl ? (
            <img
              src={generatedImgUrl}
              alt="行程海报"
              className="w-full h-auto block select-auto pointer-events-auto"
            />
          ) : (
            /* 用于初次渲染绘制的基础海报 DOM */
            <div
              ref={cardRef}
              className="p-5 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 text-white space-y-3.5"
            >
              {/* 1. 顶栏品牌 */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white shadow-md shadow-red-600/30">
                    <span className="text-base tracking-tighter">T</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold tracking-tight text-white">{headerTitle}</div>
                    {headerSubtitle && <div className="text-[10px] text-zinc-400 font-mono">{headerSubtitle}</div>}
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {formatDateTime(drive.start_date)}
                </span>
              </div>

              {/* 2. 核心大里程概览 (里程未知则整块不出现) */}
              {drive.distance != null && (
                <div className="text-center py-2 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 p-3">
                  <div className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
                    <Route className="w-3.5 h-3.5 text-blue-400" />
                    <span>本次行驶里程</span>
                  </div>
                  <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mt-0.5">
                    {formatDistance(drive.distance)}
                  </div>
                  {headlineMeta.length > 0 && (
                    <div className="text-[10px] text-zinc-400 mt-1 flex items-center justify-center gap-2">
                      {headlineMeta.map((item, idx) => (
                        <React.Fragment key={item}>
                          {idx > 0 && <span>•</span>}
                          <span>{item}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. 🗺️ 行车轨迹地图；底图来源标注画在 canvas 上，如实反映瓦片是否加载成功 */}
              {hasTrack && (
                <div className="rounded-xl overflow-hidden border border-zinc-800/80 shadow-md relative bg-zinc-950">
                  <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '170px' }}
                    className="block"
                  />
                </div>
              )}

              {/* 4. 起止路线 (隐私模式下严格打码；地址未知的行不显示) */}
              {(displayStartAddr != null || displayEndAddr != null) && (
                <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-2.5 text-xs space-y-1.5">
                  {displayStartAddr != null && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <div className="truncate text-zinc-300">
                        <span className="text-zinc-500 mr-1">起:</span>
                        <span className={privacyMode ? 'font-mono text-zinc-400' : ''}>
                          {displayStartAddr}
                        </span>
                      </div>
                    </div>
                  )}
                  {displayEndAddr != null && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                      <div className="truncate text-zinc-300">
                        <span className="text-zinc-500 mr-1">终:</span>
                        <span className={privacyMode ? 'font-mono text-zinc-400' : ''}>
                          {displayEndAddr}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. 能耗网格：只放有数据的格子 */}
              {(drive.efficiency_wh_km != null || hasBatteryChange || drive.consumption_kwh != null) && (
                <div className="grid grid-cols-2 gap-2 text-left text-xs">
                  {drive.efficiency_wh_km != null && (
                    <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-400">平均能耗</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">
                        {Math.round(drive.efficiency_wh_km)} <span className="text-[10px] font-normal text-zinc-400">Wh/km</span>
                      </div>
                    </div>
                  )}

                  {(hasBatteryChange || drive.consumption_kwh != null) && (
                    <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
                      <div className="text-[10px] text-zinc-400">电量消耗</div>
                      {hasBatteryChange && (
                        <div className="text-sm font-bold text-white mt-0.5">{batteryChangeText}</div>
                      )}
                      {drive.consumption_kwh != null && (
                        <div className={hasBatteryChange ? 'text-[9px] text-zinc-400 mt-0.5' : 'text-sm font-bold text-white mt-0.5'}>
                          {hasBatteryChange ? '耗电 ' : ''}{formatEnergy(drive.consumption_kwh)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 6. 底部品牌与签名 */}
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                <span className="font-mono">TeslaMate CN</span>
                <span>数据来自 TeslaMate 行车记录</span>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span>正在生成高清海报...</span>
            </div>
          )}
        </div>

        {/* 底部复制文字战报栏 */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-700 transition-all active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制文字战报' : '复制文字战报'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
