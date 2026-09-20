import { wgs84ToGcj02 } from './coordtransform';
import { getConfig } from './config';
import { GEOCODER_CACHE_MAX_ENTRIES, GEOCODER_MIN_INTERVAL_MS, GEOCODER_TIMEOUT_MS } from './constants';

// 仅服务端使用。地址解析的优先级：
//   1. TeslaMate 地理围栏名称 (用户自己起的名字)
//   2. 本模块缓存的逆地理结果 (配置了 AMAP_KEY 时来自高德，中文地址更准)
//   3. TeslaMate 库里已有的地址 (addresses 表，来自 OpenStreetMap)
//   4. null -> 界面显示"暂无数据"
// 外部请求在后台串行限速执行，不阻塞页面渲染；失败不写缓存，下次再试。

interface Coord {
  lat: number;
  lng: number;
}

const cache = new Map<string, string>();
const pending = new Map<string, Coord>();
let workerRunning = false;

const isValidCoord = (lat?: number | null, lng?: number | null): boolean =>
  lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

// 约 11 m 精度
const cacheKey = (lat: number, lng: number) => `${lat.toFixed(4)}_${lng.toFixed(4)}`;

function remember(key: string, value: string) {
  if (cache.size >= GEOCODER_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
    if (!res.ok) {
      console.warn(`geocoder: HTTP ${res.status} from ${new URL(url).host}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`geocoder: request to ${new URL(url).host} failed:`, (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupAmap(coord: Coord, key: string): Promise<string | null> {
  // 高德使用 GCJ-02 坐标
  const [gcjLng, gcjLat] = wgs84ToGcj02(coord.lng, coord.lat);
  const data = await fetchJson(
    `https://restapi.amap.com/v3/geocode/regeo?key=${encodeURIComponent(key)}&location=${gcjLng.toFixed(6)},${gcjLat.toFixed(6)}&extensions=base&radius=500`
  );
  if (!data) return null;
  if (data.status !== '1') {
    console.warn(`geocoder: amap error ${data.infocode} ${data.info}`);
    return null;
  }
  const regeo = data.regeocode;
  if (!regeo) return null;
  const comp = regeo.addressComponent ?? {};
  const asText = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
  const district = asText(comp.district) ?? asText(comp.city) ?? asText(comp.province);
  const place =
    asText(comp.neighborhood?.name) ?? asText(comp.building?.name) ?? asText(comp.streetNumber?.street) ?? asText(comp.township);
  if (district && place) return `${district} · ${place}`;
  return asText(regeo.formatted_address) ?? place ?? district;
}

async function lookupNominatim(coord: Coord): Promise<string | null> {
  // OpenStreetMap 使用 WGS-84 原始坐标
  const data = await fetchJson(
    `https://nominatim.openstreetmap.org/reverse?lat=${coord.lat}&lon=${coord.lng}&format=json&accept-language=zh`,
    { 'User-Agent': 'teslamate-web-cn (self-hosted)' }
  );
  const addr = data?.address;
  if (!addr) return null;
  const place = addr.road || addr.neighbourhood || addr.suburb || addr.amenity || null;
  const district = addr.city || addr.district || addr.county || null;
  if (district && place) return `${district} · ${place}`;
  return place ?? district ?? null;
}

async function runWorker() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (pending.size > 0) {
      const [key, coord] = pending.entries().next().value as [string, Coord];
      pending.delete(key);
      const amapKey = getConfig().amapKey;
      const name = amapKey ? await lookupAmap(coord, amapKey) : await lookupNominatim(coord);
      if (name) remember(key, name);
      await new Promise((r) => setTimeout(r, GEOCODER_MIN_INTERVAL_MS));
    }
  } finally {
    workerRunning = false;
  }
}

/**
 * 同步返回当前已知的最佳地址；必要时在后台排队做一次逆地理，结果供后续请求使用。
 * @param lat/lng  WGS-84 (TeslaMate 原始坐标)
 * @param geofenceName TeslaMate 地理围栏名称
 * @param dbAddress TeslaMate addresses 表里的地址
 */
export function resolveAddress(
  lat: number | null | undefined,
  lng: number | null | undefined,
  geofenceName: string | null | undefined,
  dbAddress: string | null | undefined
): string | null {
  const geofence = geofenceName?.trim();
  if (geofence) return geofence;

  const known = dbAddress?.trim() || null;
  if (!isValidCoord(lat, lng)) return known;

  const key = cacheKey(lat as number, lng as number);
  const cached = cache.get(key);
  if (cached) return cached;

  // 配了高德密钥：用高德结果替换 OSM 地址；没配：只有库里没有地址时才去查 Nominatim
  if (getConfig().amapKey || !known) {
    pending.set(key, { lat: lat as number, lng: lng as number });
    void runWorker();
  }
  return known;
}
