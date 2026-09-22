'use client';

import { useEffect } from 'react';
import { reloadOnceForChunkError, reportClientError } from '@/lib/clientError';

// 根布局级错误边界 (Header / 导航 / 设置弹窗出错时)：必须自带 html / body
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (reloadOnceForChunkError(error)) return;
    reportClientError(error, 'layout');
  }, [error]);

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, background: '#09090b', color: '#d4d4d8', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 14 }}>页面出错了</div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#71717a', wordBreak: 'break-all' }}>
            {error.name}: {error.message}
            {error.digest ? ` (${error.digest})` : ''}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => reset()} style={{ padding: '8px 16px', borderRadius: 999, border: 0, background: '#27272a', color: '#fafafa', fontSize: 12 }}>
              重试
            </button>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', borderRadius: 999, border: 0, background: '#dc2626', color: '#fff', fontSize: 12 }}>
              重新加载
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
