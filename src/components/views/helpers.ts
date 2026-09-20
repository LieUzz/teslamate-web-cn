import { ChargeSummary } from '@/types';
import { DASH } from '@/lib/formatters';

// 只累加已知值；一个已知值都没有时返回 null (界面显示 "--"，而不是 0)
export function sumKnown<T>(items: T[], pick: (item: T) => number | null | undefined): number | null {
  let sum = 0;
  let known = 0;
  for (const item of items) {
    const v = pick(item);
    if (v != null && Number.isFinite(v)) {
      sum += v;
      known += 1;
    }
  }
  return known > 0 ? sum : null;
}

// 起止电量差 (百分点)；任一端未知则为 null
export function batteryDelta(start: number | null | undefined, end: number | null | undefined): number | null {
  if (start == null || end == null) return null;
  return end - start;
}

// 充电方式描述：由 is_fast_charge 与最高功率推导，未知显示 "--"
export function describeCharger(charge: Pick<ChargeSummary, 'is_fast_charge' | 'max_charger_power_kw' | 'fast_charger_brand'>): string {
  const parts: string[] = [];
  if (charge.is_fast_charge != null) {
    parts.push(charge.is_fast_charge ? '直流快充' : '交流充电');
  }
  if (charge.is_fast_charge && charge.fast_charger_brand) {
    parts.push(charge.fast_charger_brand);
  }
  if (charge.max_charger_power_kw != null) {
    parts.push(`最高 ${Math.round(charge.max_charger_power_kw)} kW`);
  }
  return parts.length > 0 ? parts.join(' · ') : DASH;
}
