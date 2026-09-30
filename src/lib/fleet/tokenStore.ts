// Fleet API 用户令牌：存在 TeslaMate 数据库之外的一个 JSON 文件里。
// refresh token 一次性有效且每次刷新都会轮换，所以所有读写 / 刷新串行化，并且先落盘再返回。
// 仅服务端使用

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { getConfig, FleetConfig } from '@/lib/config';
import { FLEET_TOKEN_REFRESH_MARGIN_MS, FLEET_TOKEN_TIMEOUT_MS } from '@/lib/constants';

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  // 毫秒时间戳
  expires_at: number;
}

export class FleetError extends Error {
  constructor(
    public readonly kind: 'disabled' | 'unauthorized' | 'upstream' | 'asleep' | 'ratelimited',
    message: string,
  ) {
    super(message);
  }
}

export function fleetConfig(): FleetConfig {
  const cfg = getConfig().fleet;
  if (!cfg) throw new FleetError('disabled', 'fleet api not configured');
  return cfg;
}

// 已配置且完成过 OAuth (令牌文件存在) 才算启用；界面据此决定是否渲染控制按钮
export function isFleetEnabled(): boolean {
  const cfg = getConfig().fleet;
  return cfg != null && existsSync(cfg.tokenFile);
}

let chain: Promise<unknown> = Promise.resolve();

export function withTokenLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function readTokens(file: string): Promise<StoredTokens | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const t = JSON.parse(raw) as Partial<StoredTokens>;
    if (typeof t.access_token !== 'string' || typeof t.refresh_token !== 'string' || typeof t.expires_at !== 'number') {
      return null;
    }
    return t as StoredTokens;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

// 先写临时文件再 rename，进程中途被杀也不会留下半个文件
export async function writeTokens(file: string, tokens: StoredTokens): Promise<void> {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(tokens), { mode: 0o600 });
  await fs.rename(tmp, file);
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// 授权码换令牌 / 刷新令牌共用的请求
export async function requestTokens(cfg: FleetConfig, params: Record<string, string>): Promise<StoredTokens> {
  const body = new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...params });
  const res = await fetch(`${cfg.authHost}/oauth2/v3/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(FLEET_TOKEN_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) {
    // invalid_grant = refresh token 已失效 (过期或被用过)，只能重新走 OAuth
    const kind = res.status === 400 || res.status === 401 ? 'unauthorized' : 'upstream';
    throw new FleetError(kind, `token endpoint ${res.status}: ${text.slice(0, 200)}`);
  }
  const t = JSON.parse(text) as Partial<TokenResponse>;
  if (typeof t.access_token !== 'string' || typeof t.refresh_token !== 'string' || typeof t.expires_in !== 'number') {
    throw new FleetError('upstream', 'token endpoint returned an unexpected payload');
  }
  return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000 };
}

// 取可用的 access token；快过期或 force 时用 refresh token 换新，新的 refresh token 落盘后才返回
export function getAccessToken(force = false): Promise<string> {
  return withTokenLock(async () => {
    const cfg = fleetConfig();
    const current = await readTokens(cfg.tokenFile);
    if (!current) throw new FleetError('unauthorized', 'no stored tokens');
    if (!force && current.expires_at - Date.now() > FLEET_TOKEN_REFRESH_MARGIN_MS) return current.access_token;
    const fresh = await requestTokens(cfg, { grant_type: 'refresh_token', refresh_token: current.refresh_token });
    await writeTokens(cfg.tokenFile, fresh);
    return fresh.access_token;
  });
}
