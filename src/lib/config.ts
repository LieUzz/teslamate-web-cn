// 用户参数一律来自环境变量，全部没有默认值：未配置就是 null，由界面显示"未配置"
// 仅服务端使用 (不要在 'use client' 组件里 import)

function readString(name: string): string | null {
  const v = process.env[name];
  return v != null && v.trim() !== '' ? v.trim() : null;
}

function readPositiveNumber(name: string): number | null {
  const v = readString(name);
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    console.warn(`config: ${name}="${v}" is not a positive number, ignoring`);
    return null;
  }
  return n;
}

function readDate(name: string): string | null {
  const v = readString(name);
  if (v == null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(`${v}T00:00:00Z`).getTime())) {
    console.warn(`config: ${name}="${v}" is not a YYYY-MM-DD date, ignoring`);
    return null;
  }
  return v;
}

export interface AppConfig {
  deliveryDate: string | null;
  electricityPriceCnyPerKwh: number | null;
  batteryOriginalRangeKm: number | null;
  homeGeofenceName: string | null;
  amapKey: string | null;
  timeZone: string;
}

export function getConfig(): AppConfig {
  return {
    deliveryDate: readDate('DELIVERY_DATE'),
    // 仅当 TeslaMate 没有给出该次充电的费用时，用它估算
    electricityPriceCnyPerKwh: readPositiveNumber('ELECTRICITY_PRICE_CNY_PER_KWH'),
    batteryOriginalRangeKm: readPositiveNumber('BATTERY_ORIGINAL_RANGE_KM'),
    homeGeofenceName: readString('HOME_GEOFENCE_NAME'),
    amapKey: readString('AMAP_KEY'),
    // 统计分月等 SQL 口径用的时区；未设置时取进程时区
    timeZone: readString('TZ') ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
