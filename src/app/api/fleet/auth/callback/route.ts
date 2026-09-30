import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { ssoUser, FLEET_OAUTH_STATE_COOKIE, FLEET_OAUTH_COOKIE_PATH } from '@/lib/fleet/auth';
import { FleetError, requestTokens, withTokenLock, writeTokens } from '@/lib/fleet/tokenStore';

export const dynamic = 'force-dynamic';

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

// Tesla 授权后的回调：核对 state，用授权码换令牌并落盘，然后回首页
export async function GET(request: Request) {
  const cfg = getConfig().fleet;
  if (!cfg) return NextResponse.json(null, { status: 404 });
  const user = ssoUser(request);
  if (!user) return NextResponse.json(null, { status: 401 });

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = cookieValue(request, FLEET_OAUTH_STATE_COOKIE);
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.json({ error: 'bad state' }, { status: 400 });
  }

  try {
    await withTokenLock(async () => {
      const tokens = await requestTokens(cfg, {
        grant_type: 'authorization_code',
        code,
        audience: cfg.apiHost,
        redirect_uri: cfg.redirectUri,
      });
      await writeTokens(cfg.tokenFile, tokens);
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`fleet-auth failed user=${user} reason=${JSON.stringify(message)}`);
    return NextResponse.json({ error: e instanceof FleetError ? e.kind : 'failed' }, { status: 502 });
  }

  console.info(`fleet-auth ok user=${user}`);
  const res = NextResponse.redirect(new URL('/', url.origin), 302);
  res.cookies.set(FLEET_OAUTH_STATE_COOKIE, '', { path: FLEET_OAUTH_COOKIE_PATH, maxAge: 0 });
  return res;
}
