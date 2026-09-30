'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Car } from '@/types';
import { FleetCommand, CommandStatus } from '@/lib/fleet/commands';
import { sendCommand } from '@/lib/fleetClient';
import { useLongPress } from '@/lib/useLongPress';
import { FLEET_LONG_PRESS_MS, FLEET_RESULT_FLASH_MS } from '@/lib/constants';
import { AirVent, Lightbulb, Lock, ShieldCheck, Unlock, Volume2 } from 'lucide-react';

type Phase = 'idle' | 'pending' | 'done';

interface Action {
  key: string;
  icon: typeof Lock;
  label: string;
  command: FleetCommand;
  // 高风险动作必须长按
  longPress?: boolean;
}

// 未知 (null) 的开关状态一律取安全方向：锁车 / 开空调 / 开哨兵
function actions(car: Car): Action[] {
  const locked = car.is_locked === true;
  return [
    { key: 'flash', icon: Lightbulb, label: '闪灯', command: 'flash_lights' },
    { key: 'horn', icon: Volume2, label: '鸣笛', command: 'honk_horn' },
    locked
      ? { key: 'lock', icon: Unlock, label: '解锁', command: 'door_unlock', longPress: true }
      : { key: 'lock', icon: Lock, label: '锁车', command: 'door_lock' },
    car.is_climate_on
      ? { key: 'climate', icon: AirVent, label: '关空调', command: 'climate_off' }
      : { key: 'climate', icon: AirVent, label: '开空调', command: 'climate_on' },
    car.is_sentry_mode
      ? { key: 'sentry', icon: ShieldCheck, label: '关哨兵', command: 'sentry_off' }
      : { key: 'sentry', icon: ShieldCheck, label: '开哨兵', command: 'sentry_on' },
  ];
}

const RESULT_LABEL: Record<CommandStatus, string> = {
  sent: '已发送',
  failed: '失败',
  asleep: '未唤醒',
  busy: '稍等',
  unauthorized: '未授权',
  ratelimited: '稍等',
};

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

function ControlTile({
  action,
  pending,
  waking,
  result,
  disabled,
  onFire,
}: {
  action: Action;
  pending: boolean;
  waking: boolean;
  result: CommandStatus | null;
  disabled: boolean;
  onFire: () => void;
}) {
  const { progress, handlers } = useLongPress(onFire, FLEET_LONG_PRESS_MS, disabled || !action.longPress);
  const Icon = action.icon;

  let label = action.label;
  let tone = 'text-zinc-400';
  if (pending) {
    label = waking ? '唤醒中' : '发送中';
  } else if (result) {
    label = RESULT_LABEL[result];
    tone = result === 'sent' ? 'text-emerald-400' : 'text-amber-400';
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={action.longPress ? undefined : onFire}
      {...(action.longPress ? handlers : {})}
      style={action.longPress ? { WebkitTouchCallout: 'none' } : undefined}
      className={`relative flex flex-col items-center gap-1 rounded-xl bg-zinc-950/60 border border-zinc-800/80 px-1 py-2.5 text-center min-w-0 select-none touch-none disabled:opacity-60 active:bg-zinc-800/60 ${action.longPress ? '' : 'transition-colors'}`}
    >
      {progress > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 48 48" preserveAspectRatio="xMidYMid meet">
          <circle
            cx="24"
            cy="24"
            r={RING_R}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-amber-400"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
            transform="rotate(-90 24 24)"
          />
        </svg>
      )}
      <Icon className={`w-4 h-4 ${pending ? 'animate-pulse text-zinc-300' : 'text-zinc-300'}`} />
      <div className={`text-[10px] whitespace-nowrap ${tone}`}>{label}</div>
    </button>
  );
}

export function CarControls({ car, enabled }: { car: Car; enabled: boolean }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [waking, setWaking] = useState(false);
  const [result, setResult] = useState<{ key: string; status: CommandStatus } | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(resultTimer.current);
    };
  }, []);

  if (!enabled) return null;

  const fire = async (action: Action) => {
    if (pendingKey) return;
    clearTimeout(resultTimer.current);
    setResult(null);
    setPendingKey(action.key);
    setWaking(car.state === 'asleep' || car.state === 'offline');
    const status = await sendCommand(car.id, action.command);
    if (!mounted.current) return;
    setPendingKey(null);
    setResult({ key: action.key, status });
    resultTimer.current = setTimeout(() => mounted.current && setResult(null), FLEET_RESULT_FLASH_MS);
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 shadow-lg">
      <div className="grid grid-cols-5 gap-2">
        {actions(car).map((action) => (
          <ControlTile
            key={action.key}
            action={action}
            pending={pendingKey === action.key}
            waking={waking}
            result={result?.key === action.key ? result.status : null}
            disabled={pendingKey != null}
            onFire={() => fire(action)}
          />
        ))}
      </div>
    </div>
  );
}
