import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getConfig } from '@/lib/config';
import { ssoUser, FLEET_OAUTH_SCOPES, FLEET_OAUTH_STATE_COOKIE, FLEET_OAUTH_COOKIE_PATH } from '@/lib/fleet/auth';
import { FLEET_OAUTH_STATE_MAX_AGE_S } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// 一次性的 Fleet API 授权入口：车主在浏览器里打开一次，跳到 Tesla 登录授权
export async function GET(request: Request) {
  const cfg = getConfig().fleet;
  if (!cfg) return NextResponse.json(null, { status: 404 });
  if (!ssoUser(request)) return NextResponse.json(null, { status: 401 });

  const state = randomBytes(16).toString('hex');
  const url = new URL(`${cfg.authHost}/oauth2/v3/authorize`);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', FLEET_OAUTH_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('locale', 'zh-CN');

  const res = NextResponse.redirect(url, 302);
  res.cookies.set(FLEET_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: FLEET_OAUTH_COOKIE_PATH,
    maxAge: FLEET_OAUTH_STATE_MAX_AGE_S,
  });
  return res;
}
