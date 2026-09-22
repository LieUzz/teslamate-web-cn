'use client';

import React from 'react';
import { Car } from '@/types';
import { DASH, formatDuration, formatOrDash, formatPercent } from '@/lib/formatters';
import { minutesSince } from '@/lib/useNow';
import { BatteryCharging, Download, Navigation, ParkingCircle } from 'lucide-react';

interface StateCardProps {
  car: Car;
  now: number | null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-zinc-400 whitespace-nowrap">{label}</div>
      <div className="text-sm font-bold text-zinc-50 whitespace-nowrap truncate mt-0.5">{value}</div>
    </div>
  );
}

function Shell({ icon: Icon, tone, title, children }: { icon: typeof ParkingCircle; tone: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3">
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${tone}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{title}</span>
      </div>
      {children}
    </div>
  );
}

// 随车辆状态切换的状态卡：充电 / 行驶 / 停车 (升级中也算停车，卡内显示安装进度)
export function StateCard({ car, now }: StateCardProps) {
  const elapsed = formatDuration(minutesSince(car.since, now));

  if (car.state === 'charging') {
    const { charging } = car;
    const level = car.battery_level;
    const limit = charging.charge_limit_soc;
    const remainingMin = charging.time_to_full_charge_h != null ? charging.time_to_full_charge_h * 60 : null;
    return (
      <Shell icon={BatteryCharging} tone="text-emerald-400" title={`充电中 · 已充 ${elapsed}`}>
        {level != null && (
          <div className="relative h-2 rounded-full bg-zinc-800 mt-3">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, level))}%` }} />
            {limit != null && (
              <div className="absolute -top-1 h-4 w-0.5 rounded bg-zinc-300" style={{ left: `${Math.min(100, Math.max(0, limit))}%` }} />
            )}
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <Metric label="功率" value={formatOrDash(charging.charger_power_kw, { digits: 0, unit: 'kW' })} />
          <Metric label="已充入" value={formatOrDash(charging.energy_added_kwh, { digits: 1, unit: 'kWh' })} />
          <Metric label="预计还需" value={formatDuration(remainingMin)} />
          <Metric label="充电上限" value={formatPercent(limit)} />
        </div>
      </Shell>
    );
  }

  if (car.state === 'driving') {
    return (
      <Shell icon={Navigation} tone="text-blue-400" title={`行驶中 · 已行驶 ${elapsed}`}>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Metric label="车速" value={formatOrDash(car.speed, { digits: 0, unit: 'km/h' })} />
          <Metric label="功率" value={formatOrDash(car.power, { digits: 0, unit: 'kW' })} />
          <Metric label="挡位" value={car.shift_state ?? DASH} />
        </div>
      </Shell>
    );
  }

  if (car.state == null) return null;

  const updating = car.state === 'updating';
  return (
    <Shell icon={updating ? Download : ParkingCircle} tone={updating ? 'text-purple-400' : 'text-zinc-300'} title={elapsed === DASH ? '已停放' : `已停放 ${elapsed}`}>
      {car.address && <p className="text-[11px] text-zinc-400 mt-1.5 truncate">{car.address}</p>}
      {updating && (
        <div className="mt-2">
          <div className="text-[11px] text-purple-400">{car.update_version ? `正在安装 ${car.update_version}` : '正在安装软件更新'}</div>
          {car.install_percent != null && (
            <>
              <div className="h-2 rounded-full bg-zinc-800 mt-1.5">
                <div className="h-full rounded-full bg-purple-500 transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, car.install_percent))}%` }} />
              </div>
              <div className="text-[11px] text-zinc-400 mt-1.5">安装进度 {formatPercent(car.install_percent)}</div>
            </>
          )}
        </div>
      )}
    </Shell>
  );
}
