import { Car, CarOpenings } from '@/types';

export type CarAlertLevel = 'warning' | 'info';
export interface CarAlert {
  key: string;
  level: CarAlertLevel;
  message: string;
}

const OPENING_LABELS: Record<keyof CarOpenings, string> = {
  driver_front: '左前',
  driver_rear: '左后',
  passenger_front: '右前',
  passenger_rear: '右后',
};

// 哪几扇开着；各扇状态未知时返回空数组
export function openPositions(openings: CarOpenings): string[] {
  return (Object.keys(OPENING_LABELS) as (keyof CarOpenings)[])
    .filter((key) => openings[key] === true)
    .map((key) => OPENING_LABELS[key]);
}

function describeOpen(noun: string, openings: CarOpenings): string {
  const positions = openPositions(openings);
  return positions.length > 0 ? `${positions.join('、')}${noun}未关` : `${noun}未关`;
}

/**
 * 首页提醒条。只依据车辆自己上报的状态；判断所需的字段未知 (null) 时，该条不触发。
 * "车没关好"类提醒只在车停着且确认车上没人时出现，避免上下车过程中误报。
 */
export function deriveAlerts(car: Car): CarAlert[] {
  const alerts: CarAlert[] = [];
  const stationary = car.state != null && car.state !== 'driving' && car.state !== 'updating';
  const unattended = stationary && car.is_user_present === false;

  if (unattended) {
    if (car.doors_open === true) alerts.push({ key: 'doors', level: 'warning', message: describeOpen('车门', car.doors) });
    if (car.windows_open === true) alerts.push({ key: 'windows', level: 'warning', message: describeOpen('车窗', car.windows) });
    if (car.frunk_open === true) alerts.push({ key: 'frunk', level: 'warning', message: '前备箱未关' });
    if (car.trunk_open === true) alerts.push({ key: 'trunk', level: 'warning', message: '后备箱未关' });
    if (car.is_locked === false) alerts.push({ key: 'unlocked', level: 'warning', message: '车辆未上锁' });
  }

  const tires = [
    car.tire_warning_fl === true ? '左前' : null,
    car.tire_warning_fr === true ? '右前' : null,
    car.tire_warning_rl === true ? '左后' : null,
    car.tire_warning_rr === true ? '右后' : null,
  ].filter((t): t is string => t != null);
  if (tires.length > 0) alerts.push({ key: 'tires', level: 'warning', message: `${tires.join('、')}轮胎压异常` });

  if (car.charging.plugged_in === true && car.charging.charging_state === 'Complete') {
    alerts.push({ key: 'charge-complete', level: 'info', message: '充电已完成，充电枪仍连接' });
  }

  if (car.update_available === true && car.state !== 'updating') {
    alerts.push({
      key: 'update',
      level: 'info',
      message: car.update_version ? `有新版本可安装：${car.update_version}` : '有新版本可安装',
    });
  }

  return alerts;
}
