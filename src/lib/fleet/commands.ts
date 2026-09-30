// 允许发给车的命令白名单：客户端只传这里的键名，Tesla 端点路径和请求体都在服务端决定
// (客户端与服务端共用，不能 import 服务端模块)

export const FLEET_COMMANDS = {
  flash_lights: { path: 'flash_lights', body: {} },
  honk_horn: { path: 'honk_horn', body: {} },
  door_lock: { path: 'door_lock', body: {} },
  door_unlock: { path: 'door_unlock', body: {} },
  climate_on: { path: 'auto_conditioning_start', body: {} },
  climate_off: { path: 'auto_conditioning_stop', body: {} },
  sentry_on: { path: 'set_sentry_mode', body: { on: true } },
  sentry_off: { path: 'set_sentry_mode', body: { on: false } },
} as const;

export type FleetCommand = keyof typeof FLEET_COMMANDS;

export function isFleetCommand(value: unknown): value is FleetCommand {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FLEET_COMMANDS, value);
}

// sent: 车已确认执行; failed: 车拒绝 / 网络失败 / 超时; asleep: 唤醒超时;
// busy: 这辆车还有命令在路上; unauthorized: 令牌失效需重新授权; ratelimited: 触发本地限流
export type CommandStatus = 'sent' | 'failed' | 'asleep' | 'busy' | 'unauthorized' | 'ratelimited';

export interface CommandResult {
  status: CommandStatus;
}
