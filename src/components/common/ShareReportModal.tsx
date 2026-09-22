'use client';

import React, { useRef, useState, useEffect } from 'react';
import { MonthlyReport } from '@/types';
import { formatCurrency, formatOrDash } from '@/lib/formatters';
import { toPng } from 'html-to-image';
import { X, Copy, Check, Route, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ShareReportModalProps {
  report: MonthlyReport;
  // 车辆名称/车型来自 Car 对象；未知时传 null，海报上不显示
  carName: string | null;
  carModel?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// 兼容 HTTP 局域网与 HTTPS 的安全剪贴板复制工具
async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 继续 fallback
    }
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

export function ShareReportModal({
  report,
  carName,
  carModel = null,
  isOpen,
  onClose,
}: ShareReportModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);

  // 打开弹窗时自动渲染生成高清图片
  useEffect(() => {
    if (!isOpen) {
      setGeneratedImgUrl(null);
      return;
    }

    let isMounted = true;
    // 延迟 100ms 等待 DOM 完全渲染
    const timer = setTimeout(async () => {
      if (cardRef.current && isMounted) {
        try {
          setIsGenerating(true);
          const dataUrl = await toPng(cardRef.current, {
            cacheBust: true,
            pixelRatio: 3, // 3倍超高清输出
            quality: 0.95,
          });
          if (isMounted) {
            setGeneratedImgUrl(dataUrl);
          }
        } catch (err) {
          console.error('自动渲染海报图片失败:', err);
        } finally {
          if (isMounted) setIsGenerating(false);
        }
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const headerTitle = carName ?? carModel ?? '出行月报';
  const headerSubtitle = carName != null ? carModel : null;

  // 每公里电费：没有里程、没有电费、或电费不完整时都算不出来
  const costPerKm =
    report.charge_cost != null && report.distance_km > 0 && report.unpriced_charge_count === 0
      ? report.charge_cost / report.distance_km
      : null;

  const distanceText = formatOrDash(report.distance_km, { digits: 1, unit: 'km' });
  const chargeEnergyText = formatOrDash(report.charge_energy_kwh, { digits: 1, unit: 'kWh' });

  // 复制文字战报
  const handleCopyText = async () => {
    // 未知的指标不写进战报
    const lines = [
      `🚗【${carName != null ? `${carName} · ` : ''}${report.month} 出行月报】`,
      `📍 行驶里程: ${distanceText}`,
      `⚡ 充入电量: ${chargeEnergyText}`,
      report.charge_cost != null
        ? `💰 充电费用: ${formatCurrency(report.charge_cost)}`
        : null,
      report.avg_wh_km != null ? `🌿 平均能耗: ${Math.round(report.avg_wh_km)} Wh/km` : null,
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
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 z-20 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 顶部清晰操作提示 (专为 iOS 与 极空间 App 设计) */}
        <div className="mb-3 pr-8 flex items-center gap-2 text-xs text-zinc-300">
          <ImageIcon className="w-4 h-4 text-red-500 shrink-0" />
          <span className="font-medium">
            {isGenerating ? '正在生成高清海报...' : '📱 长按下方图片可「存储到相册」'}
          </span>
        </div>

        {/* 🌟 图片显示区 (彻底杜绝任何 link.click() 跳转) */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl bg-zinc-900">
          {/* 生成好的真实 <img> 供极空间与微信长按保存 */}
          {generatedImgUrl ? (
            <img
              src={generatedImgUrl}
              alt="月度出行海报"
              className="w-full h-auto block select-auto pointer-events-auto"
            />
          ) : (
            /* 用于初次渲染绘制的基础 DOM 节点 */
            <div
              ref={cardRef}
              className="p-5 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 text-white space-y-4"
            >
              {/* 顶栏品牌 */}
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

                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {report.month} 出行月报
                </span>
              </div>

              {/* 核心主视觉：本月里程 */}
              <div className="text-center py-2 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 p-3">
                <div className="text-xs text-zinc-400 flex items-center justify-center gap-1">
                  <Route className="w-3.5 h-3.5 text-blue-400" />
                  <span>本月行驶里程</span>
                </div>
                <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mt-0.5">
                  {distanceText}
                </div>
              </div>

              {/* 关键指标格：没有数据的格子不出现 */}
              <div className="grid grid-cols-2 gap-2 text-left text-xs">
                <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400">总行驶里程</div>
                  <div className="text-sm font-bold text-white mt-0.5">{distanceText}</div>
                </div>

                <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400">充入电量</div>
                  <div className="text-sm font-bold text-white mt-0.5">{chargeEnergyText}</div>
                </div>

                {report.charge_cost != null && (
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400">充电费用</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">{formatCurrency(report.charge_cost)}</div>
                  </div>
                )}

                {report.avg_wh_km != null && (
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400">平均能耗</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{Math.round(report.avg_wh_km)} <span className="text-[10px] font-normal text-zinc-400">Wh/km</span></div>
                  </div>
                )}

                {costPerKm != null && (
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400">折合每公里电费</div>
                    <div className="text-sm font-bold text-blue-400 mt-0.5">¥{costPerKm.toFixed(3)}</div>
                  </div>
                )}
              </div>

            </div>
          )}

          {isGenerating && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              <span>正在生成高清海报...</span>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
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
