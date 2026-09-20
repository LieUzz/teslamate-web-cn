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

  const host = process.env.DATABASE_HOST;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASS;
  const database = process.env.DATABASE_NAME;
  if (!host || !user || !password || !database) {
    // 构建阶段 (next build) 没有这些变量是正常的；运行时缺失则各页面显示"暂无数据"
    console.error('database: DATABASE_HOST / DATABASE_USER / DATABASE_PASS / DATABASE_NAME must all be set');
    return null;
  }

  pool = new Pool({
    host,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user,
    password,
    database,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
    application_name: 'teslamate-web-cn',
    // 本应用对 TeslaMate 数据库只读：即使账号有写权限，连接层也拒绝写入
    options: '-c default_transaction_read_only=on',
  });
  pool.on('error', (err) => console.error('database pool error:', err.message));
  return pool;
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
