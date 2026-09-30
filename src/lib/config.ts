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

// Tesla Fleet API (车辆控制)：全部变量都配齐才启用，缺任何一个就是 null
export interface FleetConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  // OAuth 主机，如 https://auth.tesla.cn
  authHost: string;
  // Fleet API 主机 (只用作 OAuth audience)，如 https://fleet-api.prd.cn.vn.cloud.tesla.cn
  apiHost: string;
  // 签名代理 tesla-http-proxy 的地址，所有车辆请求都经它转发
  proxyUrl: string;
  // 用户 access / refresh token 的存储文件 (TeslaMate 数据库之外)
  tokenFile: string;
}

export interface AppConfig {
  deliveryDate: string | null;
  electricityPriceCnyPerKwh: number | null;
  batteryOriginalRangeKm: number | null;
  homeGeofenceName: string | null;
  amapKey: string | null;
  timeZone: string;
  fleet: FleetConfig | null;
  // 供 Tesla 抓取的应用公钥 (PEM)；独立于 fleet，注册应用前就要能对外提供
  fleetPublicKeyFile: string | null;
  // 首页 3D 车模 (glb) 文件；未配置则首页只用 2D 渲染图
  carModelFile: string | null;
  // 车模的署名 (CC BY 等)，随模型响应头和 canvas aria-label 一起给出
  carModelCredit: string | null;
}

function readFleet(): FleetConfig | null {
  const clientId = readString('FLEET_CLIENT_ID');
  const clientSecret = readString('FLEET_CLIENT_SECRET');
  const redirectUri = readString('FLEET_REDIRECT_URI');
  const authHost = readString('FLEET_AUTH_HOST');
  const apiHost = readString('FLEET_API_HOST');
  const proxyUrl = readString('FLEET_PROXY_URL');
  const tokenFile = readString('FLEET_TOKEN_FILE');
  if (!clientId || !clientSecret || !redirectUri || !authHost || !apiHost || !proxyUrl || !tokenFile) {
    return null;
  }
  const trim = (u: string) => u.replace(/\/+$/, '');
  return {
    clientId,
    clientSecret,
    redirectUri,
    authHost: trim(authHost),
    apiHost: trim(apiHost),
    proxyUrl: trim(proxyUrl),
    tokenFile,
  };
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
    fleet: readFleet(),
    fleetPublicKeyFile: readString('FLEET_PUBLIC_KEY_FILE'),
    carModelFile: readString('CAR_MODEL_FILE'),
    carModelCredit: readString('CAR_MODEL_CREDIT'),
  };
}
