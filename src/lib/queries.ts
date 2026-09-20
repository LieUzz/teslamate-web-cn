import type { Pool } from 'pg';
import { getDbPool, getTouCostJoin } from './db';
import { getCarMqttState } from './mqtt';
import { getConfig } from './config';
import { resolveAddress } from './geocoder';
import { wgs84ToGcj02 } from './coordtransform';
import {
  BATTERY_HEALTH_MIN_ENERGY_ADDED_KWH,
  BATTERY_HEALTH_MIN_SOC_DELTA,
  BATTERY_HEALTH_RECENT_SAMPLES,
  CO2_KG_PER_LITRE_PETROL,
  FOOTPRINT_MAX_DRIVES,
  FOOTPRINT_TARGET_POINTS,
  MERGE_GAP_SLACK_MINUTES,
  MERGE_MAX_GAP_MINUTES,
  MILESTONE_TARGETS_KM,
  MIN_DISTANCE_FOR_EFFICIENCY_KM,
  MIN_DISTANCE_FOR_EFFICIENCY_RECORD_KM,
  MIN_DISTANCE_FOR_FOOTPRINT_KM,
  MIN_LOGGED_DAYS_FOR_DAILY_AVG,
  MIN_PARKING_SECONDS,
  PARKING_CURVE_TARGET_POINTS,
  RECORD_WINDOW_DAYS,
} from './constants';
import {
  Car,
  DriveSummary,
  DriveDetail,
  ChargeSummary,
  ChargeDetail,
  ParkingSummary,
  ParkingDetail,
  LifetimeStats,
  EnergyBreakdown,
  BatteryHealthInfo,
  MonthlyReport,
  TemperatureEfficiencyPoint,
  VisitedLocation,
  FootprintDrivePath,
  DrivingRecords,
  DrivingRecordsByPeriod,
  RecordPeriod,
  DrivingRecordItem,
  CarMilestone,
  CarMilestonesData,
  SavingsAnalysis,
} from '@/types';

// 数据层约定：
//  - 没有演示/模拟数据：这里返回的每个数字都来自 TeslaMate 数据库、MQTT 或用户配置
//  - 查不到 / 算不出的值一律返回 null，绝不使用默认值顶替
//  - 能耗沿用 TeslaMate 自己的定义：续航变化量 × cars.efficiency，续航口径取 settings.preferred_range

// ---------------------------------------------------------------------------
// 通用小工具
// ---------------------------------------------------------------------------

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const round = (v: number | null, digits: number): number | null =>
  v == null ? null : Number(v.toFixed(digits));

const iso = (v: unknown): string | null => {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const bool = (v: unknown): boolean | null => (v == null ? null : Boolean(v));

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// 按配置时区输出 YYYY-MM-DD
const localDateString = (d: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getConfig().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

// 续航口径：TeslaMate settings.preferred_range ('ideal' | 'rated')。只接受这两个值，可安全拼进 SQL 列名。
type RangeBasis = 'ideal' | 'rated';
let cachedRangeBasis: { value: RangeBasis; at: number } | null = null;

async function getRangeBasis(pool: Pool): Promise<RangeBasis> {
  if (cachedRangeBasis && Date.now() - cachedRangeBasis.at < 60_000) return cachedRangeBasis.value;
  const res = await pool.query(`SELECT preferred_range FROM settings ORDER BY id LIMIT 1`);
  const value: RangeBasis = res.rows[0]?.preferred_range === 'ideal' ? 'ideal' : 'rated';
  cachedRangeBasis = { value, at: Date.now() };
  return value;
}

// 库内地址的显示形式 (同 TeslaMate Grafana 的写法)
const addressExpr = (alias: string) =>
  `COALESCE(NULLIF(CONCAT_WS(', ', COALESCE(${alias}.name, NULLIF(CONCAT_WS(' ', ${alias}.road, ${alias}.house_number), '')), ${alias}.city), ''), ${alias}.display_name)`;

// 起终点标识：同一个地理围栏或同一条地址记录视为同一地点
const placeKeyExpr = (geofenceCol: string, addressCol: string) =>
  `CASE WHEN ${geofenceCol} IS NOT NULL THEN 'g' || ${geofenceCol} WHEN ${addressCol} IS NOT NULL THEN 'a' || ${addressCol} END`;

// ---------------------------------------------------------------------------
// 车辆实时状态
// ---------------------------------------------------------------------------

export async function fetchCars(): Promise<Car[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    const basis = await getRangeBasis(pool);
    const res = await pool.query(`
      SELECT
        c.id, c.name, c.model, c.trim_badging, c.marketing_name, c.vin, c.exterior_color, c.wheel_type,
        pos.battery_level, pos.usable_battery_level,
        pos.${basis}_battery_range_km AS range_km,
        pos.est_battery_range_km, pos.odometer, pos.speed, pos.power,
        pos.inside_temp, pos.outside_temp, pos.is_climate_on, pos.battery_heater,
        pos.latitude, pos.longitude,
        tp.tpms_pressure_fl, tp.tpms_pressure_fr, tp.tpms_pressure_rl, tp.tpms_pressure_rr,
        st.state, st.start_date AS since,
        upd.version,
        lg.name AS last_geofence,
        ${addressExpr('la')} AS last_address
      FROM cars c
      LEFT JOIN LATERAL (
        SELECT * FROM positions p WHERE p.car_id = c.id ORDER BY p.date DESC LIMIT 1
      ) pos ON true
      LEFT JOIN LATERAL (
        SELECT tpms_pressure_fl, tpms_pressure_fr, tpms_pressure_rl, tpms_pressure_rr
        FROM positions p WHERE p.car_id = c.id AND p.tpms_pressure_fl IS NOT NULL
        ORDER BY p.date DESC LIMIT 1
      ) tp ON true
      LEFT JOIN LATERAL (
        SELECT state, start_date FROM states s WHERE s.car_id = c.id ORDER BY s.start_date DESC LIMIT 1
      ) st ON true
      LEFT JOIN LATERAL (
        SELECT version FROM updates u WHERE u.car_id = c.id AND u.version IS NOT NULL ORDER BY u.start_date DESC LIMIT 1
      ) upd ON true
      LEFT JOIN LATERAL (
        SELECT d.end_geofence_id, d.end_address_id FROM drives d
        WHERE d.car_id = c.id AND d.end_date IS NOT NULL ORDER BY d.start_date DESC LIMIT 1
      ) ld ON true
      LEFT JOIN geofences lg ON lg.id = ld.end_geofence_id
      LEFT JOIN addresses la ON la.id = ld.end_address_id
      ORDER BY c.display_priority, c.id
    `);

    return res.rows.map((row): Car => {
      // MQTT 是 TeslaMate 发布的实时值，优先于库里最后一个位置点
      const live = getCarMqttState(row.id);
      const state = live.state ?? text(row.state);
      const latitude = live.latitude ?? num(row.latitude);
      const longitude = live.longitude ?? num(row.longitude);
      const liveRange = basis === 'ideal' ? live.ideal_battery_range_km : live.rated_battery_range_km;
      // 行驶中"上一段行程的终点"不是当前位置，此时只按坐标解析
      const parked = state !== 'driving';
      return {
        id: row.id,
        name: live.display_name ?? text(row.name),
        model: text(row.model),
        trim_badging: text(row.trim_badging),
        marketing_name: text(row.marketing_name),
        vin: text(row.vin),
        exterior_color: text(row.exterior_color),
        wheel_type: text(row.wheel_type),
        battery_level: live.battery_level ?? num(row.battery_level),
        usable_battery_level: live.usable_battery_level ?? num(row.usable_battery_level),
        range_km: round(liveRange ?? num(row.range_km), 1),
        est_battery_range_km: round(live.est_battery_range_km ?? num(row.est_battery_range_km), 1),
        odometer: round(live.odometer ?? num(row.odometer), 1),
        speed: live.speed ?? num(row.speed),
        power: live.power ?? num(row.power),
        state,
        since: iso(live.since ?? row.since),
        inside_temp: live.inside_temp ?? num(row.inside_temp),
        outside_temp: live.outside_temp ?? num(row.outside_temp),
        is_climate_on: live.is_climate_on ?? bool(row.is_climate_on),
        // 以下几项 TeslaMate 只通过 MQTT 发布，库里没有
        is_locked: live.locked ?? null,
        is_sentry_mode: live.sentry_mode ?? null,
        doors_open: live.doors_open ?? null,
        windows_open: live.windows_open ?? null,
        frunk_open: live.frunk_open ?? null,
        trunk_open: live.trunk_open ?? null,
        tire_pressure_fl: round(live.tpms_pressure_fl ?? num(row.tpms_pressure_fl), 2),
        tire_pressure_fr: round(live.tpms_pressure_fr ?? num(row.tpms_pressure_fr), 2),
        tire_pressure_rl: round(live.tpms_pressure_rl ?? num(row.tpms_pressure_rl), 2),
        tire_pressure_rr: round(live.tpms_pressure_rr ?? num(row.tpms_pressure_rr), 2),
        latitude,
        longitude,
        address: resolveAddress(
          latitude,
          longitude,
          live.geofence ?? (parked ? row.last_geofence : null),
          parked ? row.last_address : null
        ),
        version: live.version ?? text(row.version),
        battery_heater: live.battery_heater ?? bool(row.battery_heater),
      };
    });
  } catch (err) {
    console.error('fetchCars error:', err);
    return [];
  }
}

async function getDefaultCarId(pool: Pool): Promise<number | null> {
  const res = await pool.query(`SELECT id FROM cars ORDER BY display_priority, id LIMIT 1`);
  return res.rows[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// 行程
// ---------------------------------------------------------------------------

/**
 * 智能行程合并：同一辆车、间隔不超过 MERGE_MAX_GAP_MINUTES、且上一段终点与下一段起点是同一地点的连续行程，
 * 合并为一条连贯行程 (临时停车、等人等)
 */
export function mergeConsecutiveDrives(drives: DriveSummary[]): DriveSummary[] {
  if (!drives || drives.length <= 1) return drives || [];

  const sorted = [...drives].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const merged: DriveSummary[] = [];
  let group: DriveSummary[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = group[group.length - 1];
    const curr = sorted[i];
    let mergeable = false;
    if (prev.car_id === curr.car_id && prev.end_date && prev.end_place_key && prev.end_place_key === curr.start_place_key) {
      const gapMinutes = (new Date(curr.start_date).getTime() - new Date(prev.end_date).getTime()) / 60000;
      mergeable = gapMinutes >= MERGE_GAP_SLACK_MINUTES && gapMinutes <= MERGE_MAX_GAP_MINUTES;
    }
    if (mergeable) {
      group.push(curr);
    } else {
      merged.push(combineDriveGroup(group));
      group = [curr];
    }
  }
  merged.push(combineDriveGroup(group));

  return merged.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
}

function combineDriveGroup(group: DriveSummary[]): DriveSummary {
  if (group.length === 1) return group[0];

  const first = group[0];
  const last = group[group.length - 1];

  // 任何一段缺值，合计就是未知，而不是把缺的当 0
  const sumOrNull = (pick: (d: DriveSummary) => number | null | undefined): number | null => {
    let total = 0;
    for (const d of group) {
      const v = pick(d);
      if (v == null) return null;
      total += v;
    }
    return total;
  };
  const extreme = (pick: (d: DriveSummary) => number | null | undefined, fn: (...n: number[]) => number): number | null => {
    const values = group.map(pick).filter((v): v is number => v != null);
    return values.length > 0 ? fn(...values) : null;
  };

  const totalDistance = sumOrNull((d) => d.distance);
  const totalDuration = sumOrNull((d) => d.duration_min);
  const totalConsumption = sumOrNull((d) => d.consumption_kwh);

  let stopoverMin: number | undefined;
  if (last.end_date && totalDuration != null) {
    const spanMin = Math.round((new Date(last.end_date).getTime() - new Date(first.start_date).getTime()) / 60000);
    stopoverMin = Math.max(0, spanMin - totalDuration);
  }

  // 平均气温按时长加权
  let tempWeighted = 0;
  let tempWeight = 0;
  for (const d of group) {
    if (d.outside_temp_avg != null && d.duration_min != null && d.duration_min > 0) {
      tempWeighted += d.outside_temp_avg * d.duration_min;
      tempWeight += d.duration_min;
    }
  }

  return {
    ...first,
    end_date: last.end_date,
    end_address: last.end_address,
    end_battery_level: last.end_battery_level,
    end_position_id: last.end_position_id,
    end_place_key: last.end_place_key,
    duration_min: totalDuration,
    distance: round(totalDistance, 1),
    speed_max: extreme((d) => d.speed_max, Math.max),
    speed_avg:
      totalDistance != null && totalDuration != null && totalDuration > 0
        ? round((totalDistance / totalDuration) * 60, 1)
        : null,
    power_max: extreme((d) => d.power_max, Math.max),
    power_min: extreme((d) => d.power_min, Math.min),
    consumption_kwh: round(totalConsumption, 2),
    efficiency_wh_km: efficiencyWhKm(totalConsumption, totalDistance),
    ascent: sumOrNull((d) => d.ascent),
    descent: sumOrNull((d) => d.descent),
    outside_temp_avg: tempWeight > 0 ? round(tempWeighted / tempWeight, 1) : null,
    is_merged: true,
    merged_count: group.length,
    merged_drive_ids: group.map((d) => d.id),
    stopover_duration_min: stopoverMin,
  };
}

// 距离太短的行程能耗没有意义
function efficiencyWhKm(consumptionKwh: number | null, distanceKm: number | null): number | null {
  if (consumptionKwh == null || distanceKm == null || distanceKm < MIN_DISTANCE_FOR_EFFICIENCY_KM) return null;
  return Math.round((consumptionKwh * 1000) / distanceKm);
}

interface DriveQuery {
  carId?: number | null;
  driveIds?: number[];
  from?: Date;
  to?: Date;
  limit?: number | null;
  offset?: number;
}

async function queryDrives(pool: Pool, q: DriveQuery): Promise<DriveSummary[]> {
  const basis = await getRangeBasis(pool);
  const res = await pool.query(
    `
    SELECT
      d.id, d.car_id, d.start_date, d.end_date, d.duration_min, d.distance,
      d.speed_max, d.power_max, d.power_min, d.ascent, d.descent, d.outside_temp_avg,
      d.start_position_id, d.end_position_id,
      (d.start_${basis}_range_km - d.end_${basis}_range_km) * c.efficiency AS consumption_kwh,
      sp.battery_level AS start_battery_level, ep.battery_level AS end_battery_level,
      sp.latitude AS start_lat, sp.longitude AS start_lng,
      ep.latitude AS end_lat, ep.longitude AS end_lng,
      sg.name AS start_geofence, eg.name AS end_geofence,
      ${addressExpr('sa')} AS start_db_address,
      ${addressExpr('ea')} AS end_db_address,
      ${placeKeyExpr('d.start_geofence_id', 'd.start_address_id')} AS start_place_key,
      ${placeKeyExpr('d.end_geofence_id', 'd.end_address_id')} AS end_place_key
    FROM drives d
    JOIN cars c ON c.id = d.car_id
    LEFT JOIN positions sp ON sp.id = d.start_position_id
    LEFT JOIN positions ep ON ep.id = d.end_position_id
    LEFT JOIN addresses sa ON sa.id = d.start_address_id
    LEFT JOIN addresses ea ON ea.id = d.end_address_id
    LEFT JOIN geofences sg ON sg.id = d.start_geofence_id
    LEFT JOIN geofences eg ON eg.id = d.end_geofence_id
    WHERE d.end_date IS NOT NULL
      AND ($1::int IS NULL OR d.car_id = $1)
      AND ($2::int[] IS NULL OR d.id = ANY($2))
      AND ($3::timestamp IS NULL OR d.start_date >= $3)
      AND ($4::timestamp IS NULL OR d.start_date <= $4)
    ORDER BY d.start_date DESC
    LIMIT $5 OFFSET $6
    `,
    [q.carId ?? null, q.driveIds ?? null, q.from ?? null, q.to ?? null, q.limit ?? null, q.offset ?? 0]
  );

  return res.rows.map((row): DriveSummary => {
    const distance = num(row.distance);
    const duration = num(row.duration_min);
    const consumption = num(row.consumption_kwh);
    return {
      id: row.id,
      car_id: row.car_id,
      start_date: iso(row.start_date) as string,
      end_date: iso(row.end_date),
      duration_min: duration,
      distance: round(distance, 1),
      speed_max: num(row.speed_max),
      speed_avg: distance != null && duration != null && duration > 0 ? round((distance / duration) * 60, 1) : null,
      power_max: num(row.power_max),
      power_min: num(row.power_min),
      start_address: resolveAddress(num(row.start_lat), num(row.start_lng), row.start_geofence, row.start_db_address),
      end_address: resolveAddress(num(row.end_lat), num(row.end_lng), row.end_geofence, row.end_db_address),
      start_battery_level: num(row.start_battery_level),
      end_battery_level: num(row.end_battery_level),
      consumption_kwh: round(consumption, 2),
      efficiency_wh_km: efficiencyWhKm(consumption, distance),
      start_position_id: row.start_position_id,
      end_position_id: row.end_position_id,
      ascent: num(row.ascent),
      descent: num(row.descent),
      outside_temp_avg: round(num(row.outside_temp_avg), 1),
      start_place_key: row.start_place_key,
      end_place_key: row.end_place_key,
    };
  });
}

/**
 * 行程列表 (按开始时间倒序)。enableMerge 时在这一页范围内做智能合并。
 */
export async function fetchDrives(carId?: number, limit = 50, offset = 0, enableMerge = false): Promise<DriveSummary[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    const drives = await queryDrives(pool, { carId, limit, offset });
    return enableMerge ? mergeConsecutiveDrives(drives) : drives;
  } catch (err) {
    console.error('fetchDrives error:', err);
    return [];
  }
}

/**
 * 行程详情：driveId 可以是任意一段原始行程的 id，返回它所在的合并行程及完整轨迹
 */
export async function fetchDriveDetail(driveId: number): Promise<DriveDetail | null> {
  const pool = getDbPool();
  if (!pool) return null;

  try {
    const [target] = await queryDrives(pool, { driveIds: [driveId] });
    if (!target) return null;

    // 在目标行程前后各一天内找同车行程，重建它所属的合并组
    const dayMs = 24 * 3600 * 1000;
    const start = new Date(target.start_date).getTime();
    const neighbours = await queryDrives(pool, {
      carId: target.car_id,
      from: new Date(start - dayMs),
      to: new Date(start + dayMs),
    });
    const drive =
      mergeConsecutiveDrives(neighbours).find((d) => d.id === driveId || d.merged_drive_ids?.includes(driveId)) ?? target;

    const posRes = await pool.query(
      `SELECT id, date, latitude, longitude, speed, power, battery_level, odometer, elevation, inside_temp, outside_temp
       FROM positions
       WHERE drive_id = ANY($1::int[])
       ORDER BY date ASC`,
      [drive.merged_drive_ids ?? [drive.id]]
    );

    return {
      ...drive,
      positions: posRes.rows.map((p) => ({
        id: p.id,
        date: iso(p.date) as string,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        speed: num(p.speed),
        power: num(p.power),
        battery_level: num(p.battery_level),
        odometer: num(p.odometer),
        elevation: num(p.elevation),
        inside_temp: num(p.inside_temp),
        outside_temp: num(p.outside_temp),
      })),
    };
  } catch (err) {
    console.error('fetchDriveDetail error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 停车 (相邻两段行程之间的静置)
// ---------------------------------------------------------------------------

// 停车段 = 某段行程结束到同一辆车下一段行程开始；最后一段行程之后是"当前停车"，终值取该车最新位置点
const parkingCte = (basis: RangeBasis) => `
  parking AS (
    SELECT
      d.id, d.car_id, d.end_date AS start_date, d.end_position_id,
      d.end_geofence_id AS geofence_id, d.end_address_id AS address_id,
      d.end_${basis}_range_km AS start_range_km,
      LEAD(d.start_date) OVER w AS next_start,
      LEAD(d.start_${basis}_range_km) OVER w AS next_range_km,
      LEAD(d.start_position_id) OVER w AS next_position_id
    FROM drives d
    WHERE d.end_date IS NOT NULL
    WINDOW w AS (PARTITION BY d.car_id ORDER BY d.start_date)
  ),
  parking_full AS (
    SELECT
      p.id, p.car_id, p.start_date, p.geofence_id, p.address_id, p.start_range_km,
      p.next_start AS end_date,
      (p.next_start IS NULL) AS is_current,
      COALESCE(p.next_range_km, cur.${basis}_battery_range_km) AS end_range_km,
      sp.battery_level AS start_battery_level,
      COALESCE(np.battery_level, cur.battery_level) AS end_battery_level,
      sp.latitude, sp.longitude,
      EXTRACT(EPOCH FROM (COALESCE(p.next_start, cur.date) - p.start_date)) AS duration_sec,
      c.efficiency,
      EXISTS (
        SELECT 1 FROM charging_processes cp
        WHERE cp.car_id = p.car_id AND cp.start_date >= p.start_date
          AND (p.next_start IS NULL OR cp.start_date < p.next_start)
      ) AS has_charge
    FROM parking p
    JOIN cars c ON c.id = p.car_id
    LEFT JOIN positions sp ON sp.id = p.end_position_id
    LEFT JOIN positions np ON np.id = p.next_position_id
    LEFT JOIN LATERAL (
      SELECT date, battery_level, ${basis}_battery_range_km
      FROM positions lp WHERE lp.car_id = p.car_id ORDER BY lp.date DESC LIMIT 1
    ) cur ON p.next_start IS NULL
  )`;

function mapParking(row: any): ParkingSummary {
  const durationSec = num(row.duration_sec);
  const startRange = num(row.start_range_km);
  const endRange = num(row.end_range_km);
  const efficiency = num(row.efficiency);
  const hasCharge = Boolean(row.has_charge);

  // 期间充过电：续航变化不代表损耗，损耗未知
  const rangeLost = !hasCharge && startRange != null && endRange != null ? startRange - endRange : null;
  const energyLost = rangeLost != null && efficiency != null ? rangeLost * efficiency : null;
  const hours = durationSec != null && durationSec > 0 ? durationSec / 3600 : null;
  const homeName = getConfig().homeGeofenceName;

  return {
    id: row.id,
    car_id: row.car_id,
    start_date: iso(row.start_date) as string,
    end_date: iso(row.end_date),
    duration_min: durationSec != null ? Math.round(durationSec / 60) : null,
    start_range_km: round(startRange, 1),
    end_range_km: round(endRange, 1),
    start_battery_level: num(row.start_battery_level),
    end_battery_level: num(row.end_battery_level),
    range_lost_km: round(rangeLost, 1),
    energy_lost_kwh: round(energyLost, 2),
    drain_rate_kwh_per_hour: energyLost != null && hours != null ? round(energyLost / hours, 3) : null,
    address: resolveAddress(num(row.latitude), num(row.longitude), row.geofence_name, row.db_address),
    // 只有配置了 HOME_GEOFENCE_NAME 才能判断是不是家
    is_home: homeName == null ? null : row.geofence_name === homeName,
    has_charge: hasCharge,
    is_current: Boolean(row.is_current),
  };
}

async function queryParkings(pool: Pool, carId: number | null, parkingId: number | null, limit: number | null, offset: number) {
  const basis = await getRangeBasis(pool);
  const res = await pool.query(
    `
    WITH ${parkingCte(basis)}
    SELECT pf.*, g.name AS geofence_name, ${addressExpr('a')} AS db_address
    FROM parking_full pf
    LEFT JOIN geofences g ON g.id = pf.geofence_id
    LEFT JOIN addresses a ON a.id = pf.address_id
    WHERE pf.duration_sec >= $1
      AND ($2::int IS NULL OR pf.car_id = $2)
      AND ($3::int IS NULL OR pf.id = $3)
    ORDER BY pf.start_date DESC
    LIMIT $4 OFFSET $5
    `,
    [MIN_PARKING_SECONDS, carId, parkingId, limit, offset]
  );
  return res.rows.map(mapParking);
}

export async function fetchParkings(carId?: number, limit = 50, offset = 0): Promise<ParkingSummary[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    return await queryParkings(pool, carId ?? null, null, limit, offset);
  } catch (err) {
    console.error('fetchParkings error:', err);
    return [];
  }
}

export async function fetchParkingDetail(parkingId: number): Promise<ParkingDetail | null> {
  const pool = getDbPool();
  if (!pool) return null;

  try {
    const [summary] = await queryParkings(pool, null, parkingId, 1, 0);
    if (!summary) return null;

    const basis = await getRangeBasis(pool);
    // 均匀抽样，避免长时间停车的曲线被截断
    const pointsRes = await pool.query(
      `
      SELECT date, battery_level, range_km, inside_temp, outside_temp FROM (
        SELECT date, battery_level, ${basis}_battery_range_km AS range_km, inside_temp, outside_temp,
               ROW_NUMBER() OVER (ORDER BY date) AS rn, COUNT(*) OVER () AS total
        FROM positions
        WHERE car_id = $1 AND date >= $2 AND ($3::timestamp IS NULL OR date <= $3)
      ) s
      WHERE rn = 1 OR rn = total OR rn % GREATEST(1, CEIL(total::numeric / $4)::int) = 0
      ORDER BY date
      `,
      [summary.car_id, summary.start_date, summary.end_date, PARKING_CURVE_TARGET_POINTS]
    );

    return {
      ...summary,
      points: pointsRes.rows.map((p) => ({
        date: iso(p.date) as string,
        battery_level: num(p.battery_level),
        range_km: round(num(p.range_km), 1),
        inside_temp: num(p.inside_temp),
        outside_temp: num(p.outside_temp),
      })),
    };
  } catch (err) {
    console.error('fetchParkingDetail error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 充电
// ---------------------------------------------------------------------------

// 充电费用优先级：汉化仪表盘的分时电价结果 > TeslaMate 按地理围栏电价算出的 cost > 配置的电价估算 > 未知
// $price 为 NULL 时第三项自然为 NULL
const chargeCostExpr = (priceParam: string) =>
  `COALESCE(tc.cost_tou, cp.cost, ${priceParam}::numeric * COALESCE(cp.charge_energy_used, cp.charge_energy_added))`;

async function queryCharges(pool: Pool, carId: number | null, chargeId: number | null, limit: number | null, offset: number) {
  const basis = await getRangeBasis(pool);
  const touJoin = await getTouCostJoin(pool);
  const price = getConfig().electricityPriceCnyPerKwh;
  const res = await pool.query(
    `
    SELECT
      cp.id, cp.car_id, cp.start_date, cp.end_date, cp.duration_min,
      cp.charge_energy_added, cp.charge_energy_used,
      cp.start_battery_level, cp.end_battery_level,
      cp.start_${basis}_range_km AS start_range_km, cp.end_${basis}_range_km AS end_range_km,
      tc.cost_tou, cp.cost AS teslamate_cost,
      ${chargeCostExpr('$5')} AS cost,
      pos.latitude, pos.longitude,
      g.name AS geofence_name, ${addressExpr('a')} AS db_address,
      ch.max_power, ch.fast_present, ch.fast_brand
    FROM charging_processes cp
    ${touJoin}
    LEFT JOIN positions pos ON pos.id = cp.position_id
    LEFT JOIN addresses a ON a.id = cp.address_id
    LEFT JOIN geofences g ON g.id = cp.geofence_id
    LEFT JOIN LATERAL (
      SELECT MAX(c.charger_power) AS max_power,
             BOOL_OR(c.fast_charger_present) AS fast_present,
             MAX(NULLIF(c.fast_charger_brand, '')) AS fast_brand
      FROM charges c WHERE c.charging_process_id = cp.id
    ) ch ON true
    WHERE ($1::int IS NULL OR cp.car_id = $1)
      AND ($2::int IS NULL OR cp.id = $2)
    ORDER BY cp.start_date DESC
    LIMIT $3 OFFSET $4
    `,
    [carId, chargeId, limit, offset, price]
  );

  return res.rows.map((row): ChargeSummary => {
    const cost = num(row.cost);
    let costSource: ChargeSummary['cost_source'] = null;
    if (cost != null) {
      costSource = row.cost_tou != null ? 'tou' : row.teslamate_cost != null ? 'teslamate' : 'configured';
    }
    return {
      id: row.id,
      car_id: row.car_id,
      start_date: iso(row.start_date) as string,
      end_date: iso(row.end_date),
      duration_min: num(row.duration_min),
      charge_energy_added: round(num(row.charge_energy_added), 2),
      charge_energy_used: round(num(row.charge_energy_used), 2),
      start_battery_level: num(row.start_battery_level),
      end_battery_level: num(row.end_battery_level),
      start_range_km: round(num(row.start_range_km), 1),
      end_range_km: round(num(row.end_range_km), 1),
      cost: round(cost, 2),
      cost_source: costSource,
      address: resolveAddress(num(row.latitude), num(row.longitude), row.geofence_name, row.db_address),
      is_fast_charge: bool(row.fast_present),
      fast_charger_brand: text(row.fast_brand),
      max_charger_power_kw: num(row.max_power),
    };
  });
}

export async function fetchCharges(carId?: number, limit = 50, offset = 0): Promise<ChargeSummary[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    return await queryCharges(pool, carId ?? null, null, limit, offset);
  } catch (err) {
    console.error('fetchCharges error:', err);
    return [];
  }
}

export async function fetchChargeDetail(chargeId: number): Promise<ChargeDetail | null> {
  const pool = getDbPool();
  if (!pool) return null;

  try {
    const [summary] = await queryCharges(pool, null, chargeId, 1, 0);
    if (!summary) return null;

    const pointsRes = await pool.query(
      `SELECT date, battery_level, charge_energy_added, charger_power, charger_voltage, charger_actual_current, outside_temp
       FROM charges WHERE charging_process_id = $1 ORDER BY date ASC`,
      [chargeId]
    );

    return {
      ...summary,
      points: pointsRes.rows.map((p) => ({
        date: iso(p.date) as string,
        battery_level: num(p.battery_level),
        charge_energy_added: num(p.charge_energy_added),
        charger_power: num(p.charger_power),
        charger_voltage: num(p.charger_voltage),
        charger_actual_current: num(p.charger_actual_current),
        outside_temp: num(p.outside_temp),
      })),
    };
  } catch (err) {
    console.error('fetchChargeDetail error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 统计
// ---------------------------------------------------------------------------

const EMPTY_ENERGY_BREAKDOWN: EnergyBreakdown = {
  total_energy_added_kwh: null,
  grid_energy_used_kwh: null,
  driving_energy_kwh: null,
  parking_drain_kwh: null,
  charging_loss_kwh: null,
  driving_percent: null,
  parking_percent: null,
  charging_efficiency_percent: null,
  online_hours: null,
  asleep_hours: null,
  offline_hours: null,
  avg_parking_drain_kwh_per_hour: null,
};

/**
 * 电量去向：只统计 TeslaMate 有记录的部分
 */
export async function fetchEnergyBreakdown(carId?: number): Promise<EnergyBreakdown> {
  const pool = getDbPool();
  if (!pool) return EMPTY_ENERGY_BREAKDOWN;

  try {
    const basis = await getRangeBasis(pool);
    const res = await pool.query(
      `
      WITH ${parkingCte(basis)}
      SELECT
        (SELECT SUM(charge_energy_added) FROM charging_processes WHERE ($1::int IS NULL OR car_id = $1)) AS total_added,
        -- 充电效率只用"充入量"和"电网用量"都有记录的充电来算
        (SELECT SUM(charge_energy_added) FROM charging_processes
          WHERE ($1::int IS NULL OR car_id = $1) AND charge_energy_used > 0 AND charge_energy_added > 0) AS paired_added,
        (SELECT SUM(charge_energy_used) FROM charging_processes
          WHERE ($1::int IS NULL OR car_id = $1) AND charge_energy_used > 0 AND charge_energy_added > 0) AS paired_used,
        (SELECT SUM((d.start_${basis}_range_km - d.end_${basis}_range_km) * c.efficiency)
           FROM drives d JOIN cars c ON c.id = d.car_id
          WHERE d.end_date IS NOT NULL AND ($1::int IS NULL OR d.car_id = $1)) AS driving_kwh,
        (SELECT SUM((pf.start_range_km - pf.end_range_km) * pf.efficiency) FROM parking_full pf
          WHERE NOT pf.has_charge AND pf.duration_sec >= $2 AND ($1::int IS NULL OR pf.car_id = $1)) AS parking_kwh,
        (SELECT SUM(pf.duration_sec) / 3600.0 FROM parking_full pf
          WHERE NOT pf.has_charge AND pf.duration_sec >= $2 AND pf.start_range_km IS NOT NULL AND pf.end_range_km IS NOT NULL
            AND pf.efficiency IS NOT NULL AND ($1::int IS NULL OR pf.car_id = $1)) AS parking_hours,
        (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(end_date, NOW() AT TIME ZONE 'UTC') - start_date))) / 3600.0
           FROM states WHERE state = 'online' AND ($1::int IS NULL OR car_id = $1)) AS online_hours,
        (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(end_date, NOW() AT TIME ZONE 'UTC') - start_date))) / 3600.0
           FROM states WHERE state = 'asleep' AND ($1::int IS NULL OR car_id = $1)) AS asleep_hours,
        (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(end_date, NOW() AT TIME ZONE 'UTC') - start_date))) / 3600.0
           FROM states WHERE state = 'offline' AND ($1::int IS NULL OR car_id = $1)) AS offline_hours
      `,
      [carId ?? null, MIN_PARKING_SECONDS]
    );

    const row = res.rows[0] ?? {};
    const totalAdded = num(row.total_added);
    const pairedAdded = num(row.paired_added);
    const pairedUsed = num(row.paired_used);
    const drivingKwh = num(row.driving_kwh);
    const parkingKwh = num(row.parking_kwh);
    const parkingHours = num(row.parking_hours);
    const consumed = drivingKwh != null && parkingKwh != null ? drivingKwh + parkingKwh : null;

    return {
      total_energy_added_kwh: round(totalAdded, 1),
      grid_energy_used_kwh: round(pairedUsed, 1),
      driving_energy_kwh: round(drivingKwh, 1),
      parking_drain_kwh: round(parkingKwh, 1),
      charging_loss_kwh: pairedUsed != null && pairedAdded != null ? round(pairedUsed - pairedAdded, 1) : null,
      driving_percent: consumed != null && consumed > 0 ? round(((drivingKwh as number) / consumed) * 100, 1) : null,
      parking_percent: consumed != null && consumed > 0 ? round(((parkingKwh as number) / consumed) * 100, 1) : null,
      charging_efficiency_percent:
        pairedUsed != null && pairedAdded != null && pairedUsed > 0 ? round((pairedAdded / pairedUsed) * 100, 1) : null,
      online_hours: round(num(row.online_hours), 1),
      asleep_hours: round(num(row.asleep_hours), 1),
      offline_hours: round(num(row.offline_hours), 1),
      avg_parking_drain_kwh_per_hour:
        parkingKwh != null && parkingHours != null && parkingHours > 0 ? round(parkingKwh / parkingHours, 3) : null,
    };
  } catch (err) {
    console.error('fetchEnergyBreakdown error:', err);
    return EMPTY_ENERGY_BREAKDOWN;
  }
}

const EMPTY_BATTERY_HEALTH: BatteryHealthInfo = {
  current_capacity_kwh: null,
  max_observed_capacity_kwh: null,
  estimated_full_range_km: null,
  original_full_range_km: null,
  health_percent: null,
  degradation_percent: null,
  baseline: null,
  slow_charge_count: null,
  fast_charge_count: null,
  total_energy_added_kwh: null,
  cycle_count: null,
  is_lfp: null,
  sample_count: 0,
};

/**
 * 电池健康：容量由充电记录推导 (充入电量 ÷ SoC 变化量)，只用充入量足够大的充电
 */
export async function fetchBatteryHealth(carId?: number): Promise<BatteryHealthInfo> {
  const pool = getDbPool();
  if (!pool) return EMPTY_BATTERY_HEALTH;

  try {
    const id = carId ?? (await getDefaultCarId(pool));
    if (id == null) return EMPTY_BATTERY_HEALTH;
    const basis = await getRangeBasis(pool);

    const [samplesRes, totalsRes] = await Promise.all([
      pool.query(
        `
        SELECT cp.charge_energy_added / (cp.end_battery_level - cp.start_battery_level) * 100 AS capacity_kwh,
               cp.end_${basis}_range_km / NULLIF(cp.end_battery_level, 0) * 100 AS full_range_km
        FROM charging_processes cp
        WHERE cp.car_id = $1 AND cp.end_date IS NOT NULL
          AND cp.charge_energy_added >= $2
          AND cp.end_battery_level - cp.start_battery_level >= $3
        ORDER BY cp.start_date ASC
        `,
        [id, BATTERY_HEALTH_MIN_ENERGY_ADDED_KWH, BATTERY_HEALTH_MIN_SOC_DELTA]
      ),
      pool.query(
        `
        SELECT
          (SELECT SUM(charge_energy_added) FROM charging_processes WHERE car_id = $1) AS total_added,
          (SELECT COUNT(*) FROM charging_processes cp WHERE cp.car_id = $1 AND cp.end_date IS NOT NULL
             AND EXISTS (SELECT 1 FROM charges c WHERE c.charging_process_id = cp.id AND c.fast_charger_present)) AS fast_count,
          (SELECT COUNT(*) FROM charging_processes cp WHERE cp.car_id = $1 AND cp.end_date IS NOT NULL) AS total_count,
          (SELECT cs.lfp_battery FROM cars c JOIN car_settings cs ON cs.id = c.settings_id WHERE c.id = $1) AS is_lfp
        `,
        [id]
      ),
    ]);

    const capacities = samplesRes.rows.map((r) => num(r.capacity_kwh)).filter((v): v is number => v != null && v > 0);
    const fullRanges = samplesRes.rows.map((r) => num(r.full_range_km)).filter((v): v is number => v != null && v > 0);

    const currentCapacity = median(capacities.slice(-BATTERY_HEALTH_RECENT_SAMPLES));
    // 滚动中位数的最大值，避免单次异常充电被当成"最大容量"
    let maxCapacity: number | null = null;
    for (let i = 0; i < capacities.length; i++) {
      const window = median(capacities.slice(Math.max(0, i - BATTERY_HEALTH_RECENT_SAMPLES + 1), i + 1));
      if (window != null && (maxCapacity == null || window > maxCapacity)) maxCapacity = window;
    }
    const estimatedFullRange = median(fullRanges.slice(-BATTERY_HEALTH_RECENT_SAMPLES));

    const original = getConfig().batteryOriginalRangeKm;
    let health: number | null = null;
    let baseline: BatteryHealthInfo['baseline'] = null;
    if (original != null && estimatedFullRange != null) {
      health = (estimatedFullRange / original) * 100;
      baseline = 'configured_original';
    } else if (currentCapacity != null && maxCapacity != null && capacities.length > BATTERY_HEALTH_RECENT_SAMPLES) {
      // 没有出厂值时，只能和"有记录以来的最大值"比
      health = (currentCapacity / maxCapacity) * 100;
      baseline = 'max_observed';
    }

    const totals = totalsRes.rows[0] ?? {};
    const totalAdded = num(totals.total_added);
    const totalCount = num(totals.total_count);
    const fastCount = num(totals.fast_count);

    return {
      current_capacity_kwh: round(currentCapacity, 1),
      max_observed_capacity_kwh: round(maxCapacity, 1),
      estimated_full_range_km: round(estimatedFullRange, 1),
      original_full_range_km: original,
      health_percent: round(health, 1),
      degradation_percent: health != null ? round(100 - health, 1) : null,
      baseline,
      slow_charge_count: totalCount != null && fastCount != null ? totalCount - fastCount : null,
      fast_charge_count: fastCount,
      total_energy_added_kwh: round(totalAdded, 1),
      cycle_count: totalAdded != null && currentCapacity != null ? round(totalAdded / currentCapacity, 1) : null,
      is_lfp: bool(totals.is_lfp),
      sample_count: capacities.length,
    };
  } catch (err) {
    console.error('fetchBatteryHealth error:', err);
    return EMPTY_BATTERY_HEALTH;
  }
}

// 油车对比参数；两项都配置了才有意义
function fuelCostPerKm(): number | null {
  const { fuelPriceCnyPerLitre, fuelConsumptionLPer100km } = getConfig();
  if (fuelPriceCnyPerLitre == null || fuelConsumptionLPer100km == null) return null;
  return (fuelConsumptionLPer100km / 100) * fuelPriceCnyPerLitre;
}

/**
 * 月度报告：按配置时区分月 (库里存的是 UTC)
 */
export async function fetchMonthlyReports(carId?: number): Promise<MonthlyReport[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    const basis = await getRangeBasis(pool);
    const touJoin = await getTouCostJoin(pool);
    const { electricityPriceCnyPerKwh, timeZone } = getConfig();
    const res = await pool.query(
      `
      WITH drive_months AS (
        SELECT TO_CHAR((d.start_date AT TIME ZONE 'UTC') AT TIME ZONE $2, 'YYYY-MM') AS month,
               COUNT(*) AS drive_count,
               SUM(d.distance) AS distance_km,
               -- 能耗只统计两端续航和车辆效率都有值的行程，并记下对应的里程，保证 Wh/km 的分子分母口径一致
               SUM((d.start_${basis}_range_km - d.end_${basis}_range_km) * c.efficiency) AS drive_kwh,
               SUM(d.distance) FILTER (WHERE (d.start_${basis}_range_km - d.end_${basis}_range_km) * c.efficiency IS NOT NULL) AS kwh_distance
        FROM drives d JOIN cars c ON c.id = d.car_id
        WHERE d.end_date IS NOT NULL AND ($1::int IS NULL OR d.car_id = $1)
        GROUP BY 1
      ),
      charge_months AS (
        SELECT TO_CHAR((cp.start_date AT TIME ZONE 'UTC') AT TIME ZONE $2, 'YYYY-MM') AS month,
               COUNT(*) AS charge_count,
               SUM(cp.charge_energy_added) AS charge_energy_kwh,
               SUM(${chargeCostExpr('$3')}) AS charge_cost,
               COUNT(*) FILTER (WHERE ${chargeCostExpr('$3')} IS NULL) AS unpriced_count
        FROM charging_processes cp
        ${touJoin}
        WHERE cp.end_date IS NOT NULL AND ($1::int IS NULL OR cp.car_id = $1)
        GROUP BY 1
      )
      SELECT COALESCE(dm.month, cm.month) AS month,
             COALESCE(dm.drive_count, 0) AS drive_count, COALESCE(dm.distance_km, 0) AS distance_km,
             dm.drive_kwh, dm.kwh_distance,
             COALESCE(cm.charge_count, 0) AS charge_count, COALESCE(cm.charge_energy_kwh, 0) AS charge_energy_kwh,
             cm.charge_cost, COALESCE(cm.unpriced_count, 0) AS unpriced_count
      FROM drive_months dm
      FULL OUTER JOIN charge_months cm ON cm.month = dm.month
      ORDER BY 1 DESC
      `,
      [carId ?? null, timeZone, electricityPriceCnyPerKwh]
    );

    const perKm = fuelCostPerKm();
    return res.rows.map((row): MonthlyReport => {
      const distance = num(row.distance_km) ?? 0;
      const driveKwh = num(row.drive_kwh);
      const kwhDistance = num(row.kwh_distance);
      const chargeCost = num(row.charge_cost);
      const fuelCost = perKm != null ? distance * perKm : null;
      return {
        month: row.month,
        drive_count: Number(row.drive_count),
        distance_km: Number(distance.toFixed(1)),
        drive_kwh: round(driveKwh, 1),
        avg_wh_km: driveKwh != null && kwhDistance != null && kwhDistance > 0 ? Math.round((driveKwh * 1000) / kwhDistance) : null,
        charge_count: Number(row.charge_count),
        charge_energy_kwh: Number((num(row.charge_energy_kwh) ?? 0).toFixed(1)),
        charge_cost: round(chargeCost, 2),
        unpriced_charge_count: Number(row.unpriced_count),
        fuel_equivalent_cost: round(fuelCost, 2),
        // 可以为负：电费比油费贵的月份如实显示
        saved_cost: fuelCost != null && chargeCost != null ? round(fuelCost - chargeCost, 2) : null,
      };
    });
  } catch (err) {
    console.error('fetchMonthlyReports error:', err);
    return [];
  }
}

/**
 * 气温与能耗：按整数气温分组，组内按里程加权
 */
export async function fetchTemperatureStats(carId?: number): Promise<TemperatureEfficiencyPoint[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    const basis = await getRangeBasis(pool);
    const res = await pool.query(
      `
      SELECT ROUND(d.outside_temp_avg)::int AS temp,
             COUNT(*) AS drive_count,
             SUM((d.start_${basis}_range_km - d.end_${basis}_range_km) * c.efficiency) * 1000 / SUM(d.distance) AS avg_wh_km
      FROM drives d JOIN cars c ON c.id = d.car_id
      WHERE d.end_date IS NOT NULL
        AND ($1::int IS NULL OR d.car_id = $1)
        AND d.outside_temp_avg IS NOT NULL
        AND d.distance >= $2
        AND (d.start_${basis}_range_km - d.end_${basis}_range_km) * c.efficiency > 0
      GROUP BY 1
      ORDER BY 1
      `,
      [carId ?? null, MIN_DISTANCE_FOR_EFFICIENCY_KM]
    );
    return res.rows
      .map((row) => ({ temp: Number(row.temp), drive_count: Number(row.drive_count), avg_wh_km: num(row.avg_wh_km) }))
      .filter((p): p is TemperatureEfficiencyPoint => p.avg_wh_km != null)
      .map((p) => ({ ...p, avg_wh_km: Math.round(p.avg_wh_km) }));
  } catch (err) {
    console.error('fetchTemperatureStats error:', err);
    return [];
  }
}

/**
 * 常去地点：对全部停车记录按地点聚合
 */
export async function fetchVisitedLocations(carId?: number, limit = 20): Promise<VisitedLocation[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    const basis = await getRangeBasis(pool);
    const res = await pool.query(
      `
      WITH ${parkingCte(basis)}
      SELECT COALESCE(g.name, ${addressExpr('a')}) AS name,
             BOOL_OR(g.name IS NOT NULL) AS is_geofence,
             MAX(g.name) AS geofence_name,
             COUNT(*) AS visit_count,
             SUM(pf.duration_sec) / 3600.0 AS total_hours,
             AVG(pf.latitude) AS latitude, AVG(pf.longitude) AS longitude
      FROM parking_full pf
      LEFT JOIN geofences g ON g.id = pf.geofence_id
      LEFT JOIN addresses a ON a.id = pf.address_id
      WHERE pf.duration_sec >= $2 AND ($1::int IS NULL OR pf.car_id = $1)
      GROUP BY 1
      HAVING COALESCE(g.name, ${addressExpr('a')}) IS NOT NULL
      ORDER BY COUNT(*) DESC, SUM(pf.duration_sec) DESC
      LIMIT $3
      `,
      [carId ?? null, MIN_PARKING_SECONDS, limit]
    );

    const homeName = getConfig().homeGeofenceName;
    return res.rows.map((row): VisitedLocation => {
      const lat = num(row.latitude);
      const lng = num(row.longitude);
      return {
        name: resolveAddress(lat, lng, row.geofence_name, row.name) ?? row.name,
        visit_count: Number(row.visit_count),
        total_parking_hours: round(num(row.total_hours), 1),
        is_home: homeName == null ? null : row.geofence_name === homeName,
        latitude: lat,
        longitude: lng,
      };
    });
  } catch (err) {
    console.error('fetchVisitedLocations error:', err);
    return [];
  }
}

const EMPTY_LIFETIME_STATS: LifetimeStats = {
  total_drives: 0,
  raw_total_drives: 0,
  total_distance_km: null,
  logged_distance_km: null,
  first_logged_odometer: null,
  first_logged_date: null,
  total_drive_duration_hours: null,
  total_energy_kwh: null,
  avg_efficiency_wh_km: null,
  total_charges: 0,
  total_charge_energy_added: null,
  total_charge_cost: null,
  unpriced_charge_count: 0,
  asleep_duration_hours: null,
};

/**
 * 全生命周期统计：全部在 SQL 里聚合，不受列表分页影响
 */
export async function fetchLifetimeStats(carId?: number): Promise<LifetimeStats> {
  const pool = getDbPool();
  if (!pool) return EMPTY_LIFETIME_STATS;

  try {
    const basis = await getRangeBasis(pool);
    const touJoin = await getTouCostJoin(pool);
    const price = getConfig().electricityPriceCnyPerKwh;
    const res = await pool.query(
      `
      WITH drive_flags AS (
        -- 与 mergeConsecutiveDrives 相同的合并规则，用来数"连贯行程"的段数
        SELECT d.*,
          (LAG(d.end_date) OVER w IS NOT NULL
            AND EXTRACT(EPOCH FROM (d.start_date - LAG(d.end_date) OVER w)) / 60 BETWEEN $3 AND $4
            AND ${placeKeyExpr('d.start_geofence_id', 'd.start_address_id')}
              = LAG(${placeKeyExpr('d.end_geofence_id', 'd.end_address_id')}) OVER w) AS merges_with_previous
        FROM drives d
        WHERE d.end_date IS NOT NULL AND ($1::int IS NULL OR d.car_id = $1)
        WINDOW w AS (PARTITION BY d.car_id ORDER BY d.start_date)
      ),
      drive_totals AS (
        SELECT COUNT(*) AS raw_count,
               COUNT(*) FILTER (WHERE merges_with_previous IS NOT TRUE) AS merged_count,
               SUM(df.distance) AS logged_km,
               SUM(df.duration_min) / 60.0 AS drive_hours,
               SUM((df.start_${basis}_range_km - df.end_${basis}_range_km) * c.efficiency) AS drive_kwh,
               SUM(df.distance) FILTER (WHERE (df.start_${basis}_range_km - df.end_${basis}_range_km) * c.efficiency IS NOT NULL) AS kwh_distance
        FROM drive_flags df JOIN cars c ON c.id = df.car_id
      ),
      charge_totals AS (
        SELECT COUNT(*) AS charge_count,
               SUM(cp.charge_energy_added) AS energy_added,
               SUM(${chargeCostExpr('$2')}) AS charge_cost,
               COUNT(*) FILTER (WHERE ${chargeCostExpr('$2')} IS NULL) AS unpriced_count
        FROM charging_processes cp
        ${touJoin}
        WHERE cp.end_date IS NOT NULL AND ($1::int IS NULL OR cp.car_id = $1)
      ),
      odometer AS (
        -- 每辆车取最新/最早的位置点 (走 date 索引，不扫全表)
        SELECT SUM(latest.odometer) AS current_odometer,
               SUM(earliest.odometer) AS first_odometer,
               MIN(earliest.date) AS first_date
        FROM cars c
        LEFT JOIN LATERAL (SELECT odometer FROM positions p WHERE p.car_id = c.id AND p.odometer IS NOT NULL ORDER BY p.date DESC LIMIT 1) latest ON true
        LEFT JOIN LATERAL (SELECT odometer, date FROM positions p WHERE p.car_id = c.id AND p.odometer IS NOT NULL ORDER BY p.date ASC LIMIT 1) earliest ON true
        WHERE ($1::int IS NULL OR c.id = $1)
      )
      SELECT dt.*, ct.*, o.*,
        (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(end_date, NOW() AT TIME ZONE 'UTC') - start_date))) / 3600.0
           FROM states WHERE state = 'asleep' AND ($1::int IS NULL OR car_id = $1)) AS asleep_hours
      FROM drive_totals dt, charge_totals ct, odometer o
      `,
      [carId ?? null, price, MERGE_GAP_SLACK_MINUTES, MERGE_MAX_GAP_MINUTES]
    );

    const row = res.rows[0] ?? {};
    const driveKwh = num(row.drive_kwh);
    const kwhDistance = num(row.kwh_distance);
    return {
      total_drives: Number(row.merged_count ?? 0),
      raw_total_drives: Number(row.raw_count ?? 0),
      total_distance_km: round(num(row.current_odometer), 1),
      logged_distance_km: round(num(row.logged_km), 1),
      first_logged_odometer: round(num(row.first_odometer), 1),
      first_logged_date: iso(row.first_date),
      total_drive_duration_hours: round(num(row.drive_hours), 1),
      total_energy_kwh: round(driveKwh, 1),
      avg_efficiency_wh_km: driveKwh != null && kwhDistance != null && kwhDistance > 0 ? Math.round((driveKwh * 1000) / kwhDistance) : null,
      total_charges: Number(row.charge_count ?? 0),
      total_charge_energy_added: round(num(row.energy_added), 1),
      total_charge_cost: round(num(row.charge_cost), 2),
      unpriced_charge_count: Number(row.unpriced_count ?? 0),
      asleep_duration_hours: round(num(row.asleep_hours), 1),
    };
  } catch (err) {
    console.error('fetchLifetimeStats error:', err);
    return EMPTY_LIFETIME_STATS;
  }
}

/**
 * 油车对比：只拿"有记录的里程"对比"有记录的电费"。接入 TeslaMate 之前的里程不参与，否则等于把那部分电费当成 0。
 */
export async function fetchSavingsAnalysis(carId?: number): Promise<SavingsAnalysis> {
  const { fuelPriceCnyPerLitre, fuelConsumptionLPer100km } = getConfig();
  const stats = await fetchLifetimeStats(carId);

  const perKm = fuelCostPerKm();
  const distance = stats.logged_distance_km;
  const evCost = stats.total_charge_cost;
  const fuelCost = perKm != null && distance != null ? distance * perKm : null;
  const litres = fuelConsumptionLPer100km != null && distance != null ? (distance / 100) * fuelConsumptionLPer100km : null;

  return {
    configured: perKm != null,
    fuel_price_cny_per_litre: fuelPriceCnyPerLitre,
    fuel_consumption_l_per_100km: fuelConsumptionLPer100km,
    logged_distance_km: distance,
    ev_cost: evCost,
    ev_cost_per_km: evCost != null && distance != null && distance > 0 ? round(evCost / distance, 3) : null,
    fuel_cost: round(fuelCost, 2),
    fuel_cost_per_km: round(perKm, 3),
    saved_cost: fuelCost != null && evCost != null ? round(fuelCost - evCost, 2) : null,
    fuel_liters_saved: round(litres, 1),
    co2_reduced_kg: litres != null ? round(litres * CO2_KG_PER_LITRE_PETROL, 0) : null,
    unpriced_charge_count: stats.unpriced_charge_count,
  };
}

// ---------------------------------------------------------------------------
// 极值榜
// ---------------------------------------------------------------------------

const route = (d: DriveSummary): string | undefined =>
  d.start_address && d.end_address ? `${d.start_address} ➔ ${d.end_address}` : d.end_address ?? d.start_address ?? undefined;

function recordItem(
  drive: DriveSummary | undefined,
  value: number | null | undefined,
  fields: { title: string; unit: string; format: (v: number) => string; secondary?: (d: DriveSummary) => string | undefined }
): DrivingRecordItem | null {
  if (!drive || value == null) return null;
  return {
    value,
    formatted_value: fields.format(value),
    unit: fields.unit,
    title: fields.title,
    sub_text: route(drive),
    date: drive.start_date,
    location: drive.end_address,
    drive_id: drive.id,
    secondary_value: fields.secondary?.(drive),
  };
}

// 取 pick 值最大 (或最小) 的那段行程；没有任何一段有值则返回 undefined
function pickExtreme(
  drives: DriveSummary[],
  pick: (d: DriveSummary) => number | null | undefined,
  direction: 'max' | 'min'
): DriveSummary | undefined {
  let best: DriveSummary | undefined;
  let bestValue: number | undefined;
  for (const d of drives) {
    const v = pick(d);
    if (v == null) continue;
    if (bestValue === undefined || (direction === 'max' ? v > bestValue : v < bestValue)) {
      best = d;
      bestValue = v;
    }
  }
  return best;
}

function computeRecords(period: RecordPeriod, drives: DriveSummary[]): DrivingRecords {
  const all = period === 'all';
  const efficiencyDrives = drives.filter(
    (d) => (d.distance ?? 0) >= MIN_DISTANCE_FOR_EFFICIENCY_RECORD_KM && d.efficiency_wh_km != null && d.efficiency_wh_km > 0
  );
  const regenDrives = drives.filter((d) => d.power_min != null && d.power_min < 0);
  const ascentDrives = drives.filter((d) => d.ascent != null && d.ascent > 0);

  const maxSpeed = pickExtreme(drives, (d) => d.speed_max, 'max');
  const longestDistance = pickExtreme(drives, (d) => d.distance, 'max');
  const longestDuration = pickExtreme(drives, (d) => d.duration_min, 'max');
  const bestEfficiency = pickExtreme(efficiencyDrives, (d) => d.efficiency_wh_km, 'min');
  const maxPower = pickExtreme(drives, (d) => d.power_max, 'max');
  const maxRegen = pickExtreme(regenDrives, (d) => d.power_min, 'min');
  const maxAscent = pickExtreme(ascentDrives, (d) => d.ascent, 'max');
  const lowestTemp = pickExtreme(drives, (d) => d.outside_temp_avg, 'min');
  const highestTemp = pickExtreme(drives, (d) => d.outside_temp_avg, 'max');

  const hoursMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
  };

  return {
    period,
    drive_count: drives.length,
    max_speed: recordItem(maxSpeed, maxSpeed?.speed_max, {
      title: all ? '生涯最高时速' : '最高时速', unit: 'km/h', format: (v) => String(Math.round(v)),
    }),
    longest_distance: recordItem(longestDistance, longestDistance?.distance, {
      title: all ? '生涯单次最远行程' : '单次最远行程', unit: 'km', format: (v) => v.toFixed(1),
    }),
    longest_duration: recordItem(longestDuration, longestDuration?.duration_min, {
      title: all ? '生涯单次最长驾驶' : '单次最长驾驶', unit: '', format: hoursMinutes,
    }),
    best_efficiency: recordItem(bestEfficiency, bestEfficiency?.efficiency_wh_km, {
      title: `最佳能耗 (≥${MIN_DISTANCE_FOR_EFFICIENCY_RECORD_KM} km 行程)`, unit: 'Wh/km', format: (v) => String(Math.round(v)),
      secondary: (d) => (d.distance != null ? `${d.distance.toFixed(1)} km` : undefined),
    }),
    max_power: recordItem(maxPower, maxPower?.power_max, {
      title: all ? '生涯最大输出功率' : '最大输出功率', unit: 'kW', format: (v) => String(Math.round(v)),
    }),
    max_regen: recordItem(maxRegen, maxRegen?.power_min != null ? Math.abs(maxRegen.power_min) : null, {
      title: all ? '生涯最大动能回收' : '最大动能回收', unit: 'kW', format: (v) => String(Math.round(v)),
    }),
    max_ascent: recordItem(maxAscent, maxAscent?.ascent, {
      title: all ? '生涯单次最大爬升' : '单次最大海拔爬升', unit: 'm', format: (v) => `+${Math.round(v)}`,
    }),
    extreme_temp: {
      lowest: recordItem(lowestTemp, lowestTemp?.outside_temp_avg, { title: '最低温出行', unit: '°C', format: (v) => v.toFixed(1) }),
      highest: recordItem(highestTemp, highestTemp?.outside_temp_avg, { title: '最高温出行', unit: '°C', format: (v) => v.toFixed(1) }),
    },
  };
}

/**
 * 极值榜：基于全部行程 (智能合并后)。某个周期内没有行程，该周期各项就是 null，不会用别的周期顶替。
 */
export async function fetchDrivingRecords(carId?: number): Promise<DrivingRecordsByPeriod> {
  const pool = getDbPool();

  let drives: DriveSummary[] = [];
  if (pool) {
    try {
      drives = mergeConsecutiveDrives(await queryDrives(pool, { carId }));
    } catch (err) {
      console.error('fetchDrivingRecords error:', err);
    }
  }

  const now = Date.now();
  const since = (days: number) => drives.filter((d) => new Date(d.start_date).getTime() >= now - days * 24 * 3600 * 1000);
  return {
    month: computeRecords('month', since(RECORD_WINDOW_DAYS.month)),
    half_year: computeRecords('half_year', since(RECORD_WINDOW_DAYS.half_year)),
    year: computeRecords('year', since(RECORD_WINDOW_DAYS.year)),
    all: computeRecords('all', drives),
  };
}

// ---------------------------------------------------------------------------
// 足迹
// ---------------------------------------------------------------------------

/**
 * 足迹轨迹：最近 FOOTPRINT_MAX_DRIVES 段行程，每段抽样约 FOOTPRINT_TARGET_POINTS 个点，转成 GCJ-02 供高德底图使用
 */
export async function fetchFootprintDrives(carId?: number): Promise<FootprintDrivePath[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    const drives = (await queryDrives(pool, { carId, limit: FOOTPRINT_MAX_DRIVES })).filter(
      (d) => (d.distance ?? 0) >= MIN_DISTANCE_FOR_FOOTPRINT_KM
    );
    if (drives.length === 0) return [];

    const res = await pool.query(
      `
      SELECT drive_id, latitude, longitude FROM (
        SELECT drive_id, latitude, longitude, date,
               ROW_NUMBER() OVER (PARTITION BY drive_id ORDER BY date) AS rn,
               COUNT(*) OVER (PARTITION BY drive_id) AS total
        FROM positions
        WHERE drive_id = ANY($1::int[])
      ) s
      WHERE rn = 1 OR rn = total OR rn % GREATEST(1, CEIL(total::numeric / $2)::int) = 0
      ORDER BY drive_id, date
      `,
      [drives.map((d) => d.id), FOOTPRINT_TARGET_POINTS]
    );

    const byDrive = new Map<number, [number, number][]>();
    for (const row of res.rows) {
      const [gcjLng, gcjLat] = wgs84ToGcj02(Number(row.longitude), Number(row.latitude));
      const list = byDrive.get(row.drive_id) ?? [];
      list.push([gcjLat, gcjLng]);
      byDrive.set(row.drive_id, list);
    }

    return drives
      .map((d): FootprintDrivePath => ({
        id: d.id,
        start_date: d.start_date,
        distance: d.distance,
        duration_min: d.duration_min,
        start_address: d.start_address,
        end_address: d.end_address,
        points: byDrive.get(d.id) ?? [],
      }))
      .filter((d) => d.points.length >= 2);
  } catch (err) {
    console.error('fetchFootprintDrives error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 里程碑
// ---------------------------------------------------------------------------

const emptyCarMilestones = (carId: number | null): CarMilestonesData => ({
  car_id: carId,
  delivery_date: getConfig().deliveryDate,
  days_since_delivery: null,
  current_odometer: null,
  daily_avg_km: null,
  recent_daily_avg_km: null,
  milestones: [],
});

/**
 * 里程碑：提车日来自配置 DELIVERY_DATE。接入 TeslaMate 之前就已超过的里程碑，达成时间未知，不伪造。
 */
export async function fetchCarMilestones(carId?: number): Promise<CarMilestonesData> {
  const pool = getDbPool();
  if (!pool) return emptyCarMilestones(carId ?? null);

  try {
    const id = carId ?? (await getDefaultCarId(pool));
    if (id == null) return emptyCarMilestones(null);

    const { deliveryDate, timeZone } = getConfig();
    const res = await pool.query(
      `
      SELECT
        (SELECT odometer FROM positions WHERE car_id = $1 AND odometer IS NOT NULL ORDER BY date DESC LIMIT 1) AS current_odometer,
        (SELECT odometer FROM positions WHERE car_id = $1 AND odometer IS NOT NULL ORDER BY date ASC LIMIT 1) AS first_odometer,
        (SELECT SUM(distance) FROM drives WHERE car_id = $1 AND end_date IS NOT NULL) AS logged_km,
        (SELECT EXTRACT(EPOCH FROM (MAX(end_date) - MIN(start_date))) / 86400.0 FROM drives WHERE car_id = $1 AND end_date IS NOT NULL) AS logged_days,
        -- 提车日按配置时区的当天 0 点起算
        CASE WHEN $2::date IS NULL THEN NULL
             ELSE EXTRACT(EPOCH FROM (NOW() - ($2::date::timestamp AT TIME ZONE $3))) / 86400.0 END AS days_since_delivery
      `,
      [id, deliveryDate, timeZone]
    );
    const row = res.rows[0] ?? {};
    const odometer = num(row.current_odometer);
    const firstOdometer = num(row.first_odometer);
    const loggedKm = num(row.logged_km);
    const loggedDays = num(row.logged_days);
    const daysSinceDelivery = num(row.days_since_delivery);

    const dailyAvg = odometer != null && daysSinceDelivery != null && daysSinceDelivery >= 1 ? odometer / daysSinceDelivery : null;
    // 记录时间太短时，日均没有参考意义
    const recentDailyAvg =
      loggedKm != null && loggedDays != null && loggedDays >= MIN_LOGGED_DAYS_FOR_DAILY_AVG ? loggedKm / loggedDays : null;
    const predictionRate = recentDailyAvg ?? dailyAvg;

    const milestones: CarMilestone[] = [];
    if (odometer != null) {
      for (const { target, label } of MILESTONE_TARGETS_KM) {
        if (odometer >= target) {
          if (firstOdometer != null && firstOdometer >= target) {
            milestones.push({ target_km: target, label, is_achieved: true, achieved_before_logging: true });
            continue;
          }
          const hit = await pool.query(
            `SELECT id, end_date FROM drives WHERE car_id = $1 AND end_km >= $2 AND end_date IS NOT NULL ORDER BY start_date ASC LIMIT 1`,
            [id, target]
          );
          const achievedDate = iso(hit.rows[0]?.end_date);
          let durationDays: number | null = null;
          if (achievedDate && deliveryDate) {
            const deliveryMs = Date.now() - (daysSinceDelivery as number) * 86400000;
            durationDays = Math.max(0, Math.round((new Date(achievedDate).getTime() - deliveryMs) / 86400000));
          }
          milestones.push({
            target_km: target,
            label,
            is_achieved: true,
            achieved_before_logging: false,
            achieved_date: achievedDate,
            achieved_duration_days: durationDays,
            drive_id: hit.rows[0]?.id ?? null,
          });
        } else {
          const remaining = target - odometer;
          const daysRemaining = predictionRate != null && predictionRate > 0 ? Math.ceil(remaining / predictionRate) : null;
          milestones.push({
            target_km: target,
            label,
            is_achieved: false,
            current_progress_percent: round((odometer / target) * 100, 1),
            remaining_km: round(remaining, 1),
            predicted_days_remaining: daysRemaining,
            predicted_date: daysRemaining != null ? localDateString(new Date(Date.now() + daysRemaining * 86400000)) : null,
          });
          break; // 只展示下一个未达成的目标
        }
      }
    }

    return {
      car_id: id,
      delivery_date: deliveryDate,
      days_since_delivery: daysSinceDelivery != null ? Math.floor(daysSinceDelivery) : null,
      current_odometer: round(odometer, 1),
      daily_avg_km: round(dailyAvg, 1),
      recent_daily_avg_km: round(recentDailyAvg, 1),
      milestones,
    };
  } catch (err) {
    console.error('fetchCarMilestones error:', err);
    return emptyCarMilestones(carId ?? null);
  }
}
