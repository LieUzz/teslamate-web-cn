import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 没有数据时统一显示的占位符；不要用 0 顶替未知值
export const DASH = '--';

// 数值格式化：未知 -> "--"
export function formatOrDash(
  v: number | null | undefined,
  opts: { digits?: number; unit?: string; locale?: boolean } = {}
): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  let n: string;
  if (opts.locale) {
    n = v.toLocaleString('zh-CN', opts.digits == null ? undefined : { minimumFractionDigits: opts.digits, maximumFractionDigits: opts.digits });
  } else {
    n = opts.digits == null ? String(v) : v.toFixed(opts.digits);
  }
  return opts.unit ? `${n} ${opts.unit}` : n;
}

export function formatPercent(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(digits)}%`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null || isNaN(km)) return DASH;
  return `${km.toFixed(1)} km`;
}

export function formatSpeed(kmh: number | null | undefined): string {
  if (kmh == null || isNaN(kmh)) return DASH;
  return `${Math.round(kmh)} km/h`;
}

export function formatPower(kw: number | null | undefined): string {
  if (kw == null || isNaN(kw)) return DASH;
  return `${kw.toFixed(1)} kW`;
}

export function formatEnergy(kwh: number | null | undefined): string {
  if (kwh == null || isNaN(kwh)) return DASH;
  return `${kwh.toFixed(2)} kWh`;
}

export function formatEfficiency(whkm: number | null | undefined): string {
  if (whkm == null || isNaN(whkm)) return DASH;
  return `${Math.round(whkm)} Wh/km`;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || isNaN(minutes) || minutes < 0) return DASH;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins} 分钟`;
  return `${hrs} 小时 ${mins} 分钟`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return DASH;
  return `¥${amount.toFixed(2)}`;
}

/**
 * 按运行环境时区格式化完整日期时间 (服务端取 TZ 环境变量)
 * 输出示例: 2026-08-29 14:10
 */
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return DASH;
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);

    const formatter = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * 按运行环境时区仅格式化时间 (HH:mm)
 */
export function formatTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return DASH;
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);

    const formatter = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    return `${getPart('hour')}:${getPart('minute')}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * 🕒 相对时间格式化 (例如: 10分钟前)
 */
export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return DASH;
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
  } catch {
    return dateStr;
  }
}

export function getCarStateInfo(state: string | null | undefined) {
  switch (state) {
    case 'driving':
      return { text: '行驶中', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
    case 'charging':
      return { text: '充电中', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'asleep':
      return { text: '睡眠中', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' };
    case 'online':
      return { text: '已唤醒', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    case 'suspended':
      return { text: '准备睡眠', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' };
    case 'offline':
      return { text: '离线', color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' };
    case 'updating':
      return { text: '升级中', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
    default:
      // 没有状态数据不等于离线
      return { text: '状态未知', color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' };
  }
}
