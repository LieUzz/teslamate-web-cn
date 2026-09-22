'use client';

import { useEffect, useState } from 'react';
import { reloadOnceForChunkError, reportClientError } from '@/lib/clientError';

// 页面级错误边界：替代 Next.js 默认的 "Application error: a client-side exception has occurred"
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (reloadOnceForChunkError(error)) {
      setReloading(true);
      return;
    }
    reportClientError(error, 'page');
  }, [error]);

  if (reloading) {
    return <div className="py-16 text-center text-xs text-zinc-500">页面已更新，正在重新加载…</div>;
  }

  return (
    <div className="max-w-lg mx-auto pt-10 px-3 text-center">
      <div className="text-sm text-zinc-300">页面出错了</div>
      <div className="mt-2 text-[11px] text-zinc-500 break-all">
        {error.name}: {error.message}
        {error.digest ? ` (${error.digest})` : ''}
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        <button onClick={() => reset()} className="px-4 py-2 rounded-full text-xs font-medium bg-zinc-800 text-zinc-50 hover:bg-zinc-700">
          重试
        </button>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-500">
          重新加载
        </button>
      </div>
    </div>
  );
}
