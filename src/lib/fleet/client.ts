// 向车辆发命令：经 tesla-http-proxy (签名代理) 转发到 Fleet API。
// VIN 只从数据库取；每辆车同一时刻只允许一条命令在路上；命令超时后不重试。
// 仅服务端使用

import { fetchCar } from '@/lib/queries';
import {
  FLEET_COMMAND_TIMEOUT_MS,
  FLEET_MAX_COMMANDS_PER_MIN,
  FLEET_MAX_WAKES_PER_MIN,
  FLEET_WAKE_POLL_MS,
  FLEET_WAKE_TIMEOUT_MS,
} from '@/lib/constants';
import { FLEET_COMMANDS, FleetCommand, CommandStatus } from './commands';
import { FleetError, fleetConfig, getAccessToken } from './tokenStore';

const inFlight = new Set<number>();
const commandTimes: number[] = [];
const wakeTimes: number[] = [];

// 滑动窗口计数：窗口内已满则返回 false
function allow(times: number[], max: number): boolean {
  const cutoff = Date.now() - 60_000;
  while (times.length > 0 && times[0] < cutoff) times.shift();
  if (times.length >= max) return false;
  times.push(Date.now());
  return true;
}

interface ProxyResponse {
  response?: { result?: boolean; reason?: string; state?: string } | null;
  error?: string;
}

async function proxyRequest(
  pathname: string,
  init: { method: 'GET' | 'POST'; body?: unknown; timeoutMs: number },
  retryOn401 = true,
): Promise<{ status: number; data: ProxyResponse }> {
  const cfg = fleetConfig();
  const token = await getAccessToken();
  const res = await fetch(`${cfg.proxyUrl}${pathname}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(init.timeoutMs),
    cache: 'no-store',
  });
  // 401 说明请求根本没被执行，换一次新 token 重试是安全的
  if (res.status === 401 && retryOn401) {
    await getAccessToken(true);
    return proxyRequest(pathname, init, false);
  }
  const text = await res.text();
  let data: ProxyResponse = {};
  try {
    data = text ? (JSON.parse(text) as ProxyResponse) : {};
  } catch {
    data = { error: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 车不在线就唤醒并等到在线；返回是否发生了唤醒。超时或限流抛错
async function ensureAwake(vin: string): Promise<boolean> {
  const state = await proxyRequest(`/api/1/vehicles/${vin}`, { method: 'GET', timeoutMs: FLEET_COMMAND_TIMEOUT_MS });
  if (state.status === 200 && state.data.response?.state === 'online') return false;
  if (!allow(wakeTimes, FLEET_MAX_WAKES_PER_MIN)) throw new FleetError('ratelimited', 'too many wakes');

  await proxyRequest(`/api/1/vehicles/${vin}/wake_up`, { method: 'POST', timeoutMs: FLEET_COMMAND_TIMEOUT_MS });
  const deadline = Date.now() + FLEET_WAKE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(FLEET_WAKE_POLL_MS);
    const poll = await proxyRequest(`/api/1/vehicles/${vin}`, { method: 'GET', timeoutMs: FLEET_COMMAND_TIMEOUT_MS });
    if (poll.status === 200 && poll.data.response?.state === 'online') return true;
  }
  throw new FleetError('asleep', 'vehicle did not come online');
}

export interface RunCommandOutcome {
  status: CommandStatus;
  httpStatus: number;
}

const HTTP_BY_STATUS: Record<CommandStatus, number> = {
  sent: 200,
  failed: 502,
  asleep: 504,
  busy: 409,
  unauthorized: 401,
  ratelimited: 429,
};

export async function runCommand(carId: number, command: FleetCommand, user: string): Promise<RunCommandOutcome> {
  const started = Date.now();
  let woke = false;
  let status: CommandStatus = 'failed';
  let reason: string | undefined;

  const car = await fetchCar(carId);
  if (!car?.vin) return { status: 'failed', httpStatus: 404 };

  if (inFlight.has(carId)) {
    status = 'busy';
  } else if (!allow(commandTimes, FLEET_MAX_COMMANDS_PER_MIN)) {
    status = 'ratelimited';
  } else {
    inFlight.add(carId);
    try {
      woke = await ensureAwake(car.vin);
      const spec = FLEET_COMMANDS[command];
      const res = await proxyRequest(`/api/1/vehicles/${car.vin}/command/${spec.path}`, {
        method: 'POST',
        body: spec.body,
        timeoutMs: FLEET_COMMAND_TIMEOUT_MS,
      });
      if (res.status === 200 && res.data.response?.result === true) {
        status = 'sent';
      } else {
        status = 'failed';
        reason = res.data.response?.reason || res.data.error || `http ${res.status}`;
      }
    } catch (e) {
      if (e instanceof FleetError) {
        status = e.kind === 'unauthorized' || e.kind === 'asleep' || e.kind === 'ratelimited' ? e.kind : 'failed';
        reason = e.message;
      } else {
        status = 'failed';
        reason = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      }
    } finally {
      inFlight.delete(carId);
    }
  }

  // 审计：每条命令一行，不含令牌与 VIN
  console.info(
    `fleet-command user=${user} car=${carId} cmd=${command} status=${status} woke=${woke} ms=${Date.now() - started}` +
      (reason ? ` reason=${JSON.stringify(reason)}` : ''),
  );
  return { status, httpStatus: HTTP_BY_STATUS[status] };
}
