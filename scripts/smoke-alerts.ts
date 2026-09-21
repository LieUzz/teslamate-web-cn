/* eslint-disable no-console */
// 首页提醒规则的断言：npx tsx scripts/smoke-alerts.ts
import assert from 'node:assert/strict';
import { deriveAlerts } from '../src/lib/alerts';
import type { Car } from '../src/types';

const unknown = { driver_front: null, driver_rear: null, passenger_front: null, passenger_rear: null };
// 所有字段未知的车：不应产生任何提醒
const blank = new Proxy({ doors: unknown, windows: unknown, charging: {} } as unknown as Car, {
  get: (target, key) => (key in target ? (target as unknown as Record<string | symbol, unknown>)[key] : null),
});
const car = (patch: Partial<Car>): Car => Object.assign(Object.create(blank), patch);
const keys = (c: Car) => deriveAlerts(c).map((a) => a.key);

assert.deepEqual(keys(blank), [], '全部未知 → 无提醒');

const parkedEmpty = { state: 'online', is_user_present: false } as Partial<Car>;
assert.deepEqual(keys(car({ ...parkedEmpty, doors_open: true, is_locked: false })), ['doors', 'unlocked']);
assert.deepEqual(keys(car({ ...parkedEmpty, windows_open: true, frunk_open: true, trunk_open: true })), ['windows', 'frunk', 'trunk']);
assert.deepEqual(keys(car({ ...parkedEmpty, doors_open: false, is_locked: true })), [], '都关好 → 无提醒');
assert.deepEqual(keys(car({ state: 'online', is_user_present: true, doors_open: true, is_locked: false })), [], '车上有人 → 不提醒');
assert.deepEqual(keys(car({ state: 'online', doors_open: true })), [], '不知道车上有没有人 → 不提醒');
assert.deepEqual(keys(car({ state: 'driving', is_user_present: false, doors_open: true })), [], '行驶中 → 不提醒');
assert.deepEqual(keys(car({ is_user_present: false, doors_open: true })), [], '状态未知 → 不提醒');
assert.equal(
  deriveAlerts(car({ ...parkedEmpty, doors_open: true, doors: { ...unknown, driver_front: true, passenger_rear: true } }))[0].message,
  '左前、右后车门未关'
);

assert.deepEqual(keys(car({ tire_warning_rl: true })), ['tires']);
assert.deepEqual(keys(car({ tire_warning_rl: false })), []);

const charging = (patch: Partial<Car['charging']>) => car({ charging: { ...blank.charging, ...patch } as Car['charging'] });
assert.deepEqual(keys(charging({ plugged_in: true, charging_state: 'Complete' })), ['charge-complete']);
assert.deepEqual(keys(charging({ plugged_in: true, charging_state: 'Charging' })), []);
assert.deepEqual(keys(charging({ plugged_in: false, charging_state: 'Complete' })), []);

assert.deepEqual(keys(car({ state: 'online', update_available: true, update_version: '2026.20.1' })), ['update']);
assert.deepEqual(keys(car({ state: 'updating', update_available: true })), [], '安装中 → 不再提示有新版本');
assert.deepEqual(keys(car({ is_sentry_mode: false, ...parkedEmpty })), [], '哨兵没开不提醒');

console.log('✓ alert rules ok');
