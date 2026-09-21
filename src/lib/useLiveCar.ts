'use client';

import { useEffect, useRef, useState } from 'react';
import { Car } from '@/types';
import { LIVE_POLL_MS_ACTIVE, LIVE_POLL_MS_ASLEEP, LIVE_POLL_MS_ONLINE } from './constants';

function pollInterval(state: Car['state']): number {
  if (state === 'driving' || state === 'charging' || state === 'updating') return LIVE_POLL_MS_ACTIVE;
  if (state === 'asleep' || state === 'offline') return LIVE_POLL_MS_ASLEEP;
  return LIVE_POLL_MS_ONLINE;
}

/**
 * 首页实时车况：以服务端渲染的 car 为初值，页面可见时按车辆状态自适应轮询，切到后台暂停。
 * 请求失败时保留上一次的数据，failed = true 供界面提示。
 */
export function useLiveCar(initial: Car): { car: Car; failed: boolean } {
  const [car, setCar] = useState(initial);
  const [failed, setFailed] = useState(false);
  const stateRef = useRef(initial.state);

  // 整页刷新 (RefreshOnFocus / 手动刷新) 带来了更新的服务端数据
  useEffect(() => {
    setCar(initial);
    stateRef.current = initial.state;
  }, [initial]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const schedule = () => {
      if (stopped || document.hidden) return;
      timer = setTimeout(poll, pollInterval(stateRef.current));
    };

    const poll = async () => {
      try {
        const res = await fetch(`/api/cars/${initial.id}/live/`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as Car;
        if (stopped) return;
        stateRef.current = next.state;
        setCar(next);
        setFailed(false);
      } catch {
        if (!stopped) setFailed(true);
      }
      schedule();
    };

    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) poll();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [initial.id]);

  return { car, failed };
}
