import { Pool, types } from 'pg';

// 关键时区修复：PostgreSQL 的 timestamp without time zone 存储的是 UTC 时间
// 必须解析为标准 ISO UTC 字符串，否则 pg 驱动会将其当作本地时区解析导致快/慢 8 小时
types.setTypeParser(1114, (stringValue: string) => {
  if (!stringValue) return null;
  // 转换为 ISO UTC 格式: 2026-08-29T04:40:27.093Z
  const isoStr = stringValue.replace(' ', 'T') + 'Z';
  return new Date(isoStr);
});

// TIMESTAMPTZ 类型 (OID 1184)
types.setTypeParser(1184, (stringValue: string) => {
  return stringValue ? new Date(stringValue) : null;
});

// 只读 PostgreSQL 连接池
let pool: Pool | null = null;

export function getDbPool(): Pool | null {
  if (pool) return pool;

  const host = process.env.DATABASE_HOST || 'database';
  const user = process.env.DATABASE_USER || 'teslamate';
  const password = process.env.DATABASE_PASS || 'your_database_password';
  const database = process.env.DATABASE_NAME || 'teslamate';
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);

  try {
    pool = new Pool({
      host,
      port,
      user,
      password,
      database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });
    return pool;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
    return null;
  }
}

// charging_processes_tou_cost 由 teslamate-chinese-dashboards 的分时电价功能创建，
// 未配置分时电价的库里没有这张表；不存在时用空子查询代替，费用回退到 cp.cost
const TOU_JOIN = 'LEFT JOIN charging_processes_tou_cost tc ON cp.id = tc.charging_process_id';
const TOU_JOIN_EMPTY =
  'LEFT JOIN (SELECT NULL::int AS charging_process_id, NULL::numeric AS cost_tou WHERE false) tc ON cp.id = tc.charging_process_id';
let touTableExists = false;

export async function getTouCostJoin(p: Pool | null): Promise<string> {
  if (touTableExists || !p) return touTableExists ? TOU_JOIN : TOU_JOIN_EMPTY;
  try {
    const res = await p.query("SELECT to_regclass('public.charging_processes_tou_cost') IS NOT NULL AS ok");
    touTableExists = res.rows[0]?.ok === true;
  } catch {
    touTableExists = false;
  }
  return touTableExists ? TOU_JOIN : TOU_JOIN_EMPTY;
}
