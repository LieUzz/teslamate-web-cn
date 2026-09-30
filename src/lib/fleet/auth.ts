// 车辆控制的调用者身份：整站在 Caddy 的 SSO (oauth2-proxy) 之后，Caddy 把登录邮箱放在请求头里。
// 头不存在就拒绝，防止 docker 网络内绕过 Caddy 直连时能发命令。
// 仅服务端使用

export const FLEET_OAUTH_SCOPES = 'openid offline_access vehicle_device_data vehicle_cmds vehicle_charging_cmds';
export const FLEET_OAUTH_STATE_COOKIE = 'fleet_oauth_state';
export const FLEET_OAUTH_COOKIE_PATH = '/api/fleet/auth/';

export function ssoUser(request: Request): string | null {
  const email = request.headers.get('x-auth-request-email')?.trim();
  return email ? email : null;
}
