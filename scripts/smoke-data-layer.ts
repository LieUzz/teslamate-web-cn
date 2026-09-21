// 数据层冒烟测试：打印每个查询函数对真实库的返回值 (只读)。
// 用法见 README；需要 DATABASE_* / MQTT_HOST 等环境变量。
import * as q from '../src/lib/queries';

const redact = (v: unknown): unknown =>
  v === undefined ? null : process.env.SMOKE_VERBOSE === '1' ? v : JSON.parse(
    JSON.stringify(v, (k, val) =>
      ['latitude', 'longitude', 'vin', 'address', 'start_address', 'end_address', 'points', 'positions', 'name'].includes(k) && val != null
        ? Array.isArray(val) ? `[${val.length} items]` : '<redacted>'
        : val
    )
  );

async function main() {
  const run = async (name: string, fn: () => Promise<unknown>) => {
    const t = Date.now();
    const out = await fn();
    const shown = Array.isArray(out) ? { count: out.length, first: redact(out[0]), ...(process.env.SMOKE_VERBOSE === '1' ? { all: out } : {}) } : redact(out);
    console.log(`\n=== ${name} (${Date.now() - t} ms)\n${JSON.stringify(shown, null, 1)}`);
  };
  await run('fetchCars', q.fetchCars);
  await new Promise((r) => setTimeout(r, 4000)); // 等 MQTT retained 消息
  await run('fetchCars (after mqtt)', q.fetchCars);
  await run('fetchDrives', () => q.fetchDrives(undefined, 50, 0, true));
  await run('fetchParkings', () => q.fetchParkings());
  await run('fetchCharges', () => q.fetchCharges());
  await run('fetchEnergyBreakdown', () => q.fetchEnergyBreakdown());
  await run('fetchBatteryHealth', () => q.fetchBatteryHealth());
  await run('fetchMonthlyReports', () => q.fetchMonthlyReports());
  await run('fetchUsageSummary', () => q.fetchUsageSummary());
  await run('fetchTemperatureStats', () => q.fetchTemperatureStats());
  await run('fetchVisitedLocations', () => q.fetchVisitedLocations());
  await run('fetchLifetimeStats', () => q.fetchLifetimeStats());
  await run('fetchDrivingRecords', async () => (await q.fetchDrivingRecords()).all);
  await run('fetchFootprintDrives', () => q.fetchFootprintDrives());
  await run('fetchCarMilestones', () => q.fetchCarMilestones());
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
