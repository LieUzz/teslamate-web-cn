'use client';

import { useEffect, useState } from 'react';

// 当前时间；服务端渲染与首帧为 null (避免服务端 / 客户端时间不一致)，挂载后按 intervalMs 更新
export function useNow(intervalMs: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// 从 iso 时间到 now 经过的分钟数；任一未知返回 null
export function minutesSince(iso: string | null, now: number | null): number | null {
  if (!iso || now == null) return null;
  const start = new Date(iso).getTime();
  if (!Number.isFinite(start)) return null;
  return Math.max(0, (now - start) / 60000);
}
