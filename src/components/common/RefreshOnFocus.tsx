'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clearChunkReloadFlag } from '@/lib/clientError';

// 回到前台 (从桌面图标重新打开、切回标签页) 时，距上次刷新超过该时长就重新取数
const MIN_REFRESH_INTERVAL_MS = 60_000;

// 页面数据在客户端会缓存几分钟以便秒切；这里保证重新打开时看到的是最新数据
export function RefreshOnFocus() {
  const router = useRouter();
  const lastRefresh = useRef(Date.now());

  // 页面正常挂载了，说明当前 JS 是最新的：允许下一次部署后再自动刷新一次
  useEffect(() => {
    clearChunkReloadFlag();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefresh.current < MIN_REFRESH_INTERVAL_MS) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);

  return null;
}
