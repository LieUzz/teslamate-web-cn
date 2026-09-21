'use client';

import React from 'react';
import { Car } from '@/types';
import { DASH, formatOrDash } from '@/lib/formatters';
import { openPositions } from '@/lib/alerts';
import { AirVent, DoorOpen, Lock, PackageOpen, PanelTop, ShieldCheck, Unlock, UserRound } from 'lucide-react';

type Tone = 'normal' | 'attention' | 'active' | 'unknown';

const TONE_CLASSES: Record<Tone, string> = {
  normal: 'text-zinc-300',
  attention: 'text-amber-400',
  active: 'text-emerald-400',
  unknown: 'text-zinc-500',
};

function Tile({ icon: Icon, label, value, tone }: { icon: typeof Lock; label: string; value: string; tone: Tone }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-zinc-950/60 border border-zinc-800/80 px-1 py-2.5 text-center min-w-0">
      <Icon className={`w-4 h-4 ${TONE_CLASSES[tone]}`} />
      <div className="text-[10px] text-zinc-400 whitespace-nowrap">{label}</div>
      <div className={`text-[11px] font-semibold whitespace-nowrap truncate max-w-full ${tone === 'normal' ? 'text-zinc-50' : TONE_CLASSES[tone]}`}>{value}</div>
    </div>
  );
}

// 开 / 关类状态：open = true 需要注意，false 正常，null 未知
function openState(open: boolean | null, detail?: string[]): { value: string; tone: Tone } {
  if (open == null) return { value: DASH, tone: 'unknown' };
  if (!open) return { value: '已关', tone: 'normal' };
  return { value: detail && detail.length > 0 ? `${detail.join('')}开` : '开着', tone: 'attention' };
}

const KEEPER_LABELS: Record<string, string> = { on: '保持开启', dog: '爱犬模式', camp: '露营模式' };

function climateState(car: Car): { value: string; tone: Tone } {
  if (car.is_climate_on == null) return { value: DASH, tone: 'unknown' };
  if (!car.is_climate_on) return { value: '已关', tone: 'normal' };
  if (car.climate_keeper_mode && car.climate_keeper_mode !== 'off') {
    return { value: KEEPER_LABELS[car.climate_keeper_mode] ?? car.climate_keeper_mode, tone: 'active' };
  }
  return { value: car.is_preconditioning ? '预热 / 预冷中' : '开启', tone: 'active' };
}

const TIRES: { key: 'fl' | 'fr' | 'rl' | 'rr'; label: string }[] = [
  { key: 'fl', label: '左前' },
  { key: 'fr', label: '右前' },
  { key: 'rl', label: '左后' },
  { key: 'rr', label: '右后' },
];

export function BodyStatus({ car }: { car: Car }) {
  const lock = car.is_locked == null ? { value: DASH, tone: 'unknown' as Tone } : car.is_locked ? { value: '已锁', tone: 'normal' as Tone } : { value: '未锁', tone: 'attention' as Tone };
  const sentry = car.is_sentry_mode == null ? { value: DASH, tone: 'unknown' as Tone } : car.is_sentry_mode ? { value: '已开启', tone: 'active' as Tone } : { value: '已关闭', tone: 'normal' as Tone };
  const occupant = car.is_user_present == null ? { value: DASH, tone: 'unknown' as Tone } : car.is_user_present ? { value: '有人', tone: 'active' as Tone } : { value: '无人', tone: 'normal' as Tone };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-lg space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <Tile icon={car.is_locked === false ? Unlock : Lock} label="车锁" {...lock} />
        <Tile icon={DoorOpen} label="车门" {...openState(car.doors_open, openPositions(car.doors))} />
        <Tile icon={PanelTop} label="车窗" {...openState(car.windows_open, openPositions(car.windows))} />
        <Tile icon={ShieldCheck} label="哨兵" {...sentry} />
        <Tile icon={PackageOpen} label="前备箱" {...openState(car.frunk_open)} />
        <Tile icon={PackageOpen} label="后备箱" {...openState(car.trunk_open)} />
        <Tile icon={AirVent} label="空调" {...climateState(car)} />
        <Tile icon={UserRound} label="车内" {...occupant} />
      </div>

      <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-800/80">
        <span className="text-zinc-400">车内 / 室外温度</span>
        <span className="font-semibold text-zinc-50">
          {formatOrDash(car.inside_temp, { digits: 1 })}° / {formatOrDash(car.outside_temp, { digits: 1 })}°
        </span>
      </div>

      <div className="pt-3 border-t border-zinc-800/80">
        <div className="text-xs text-zinc-400 mb-2">胎压 (bar)</div>
        <div className="grid grid-cols-4 gap-2">
          {TIRES.map(({ key, label }) => {
            const warning = car[`tire_warning_${key}`] === true;
            return (
              <div key={key} className="text-center">
                <div className="text-[10px] text-zinc-400">{label}</div>
                <div className={`text-sm font-bold font-mono ${warning ? 'text-amber-400' : 'text-zinc-50'}`}>
                  {formatOrDash(car[`tire_pressure_${key}`], { digits: 2 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
