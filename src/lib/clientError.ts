'use client';

// 客户端异常的处理约定：
//  - 重新部署后，手机上仍开着的旧页面再去加载旧版本的 JS 分块会 404 (ChunkLoadError)，
//    这不是代码错误，整页刷新一次即可恢复；用 sessionStorage 防止反复刷新
//  - 其他异常把信息发到服务端记进日志 (POST /api/client-error/)，便于事后排查

const RELOAD_FLAG = 'teslamate_chunk_reload';

export function isChunkLoadError(error: Error): boolean {
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    `${error.name} ${error.message}`
  );
}

// 返回 true 表示已触发刷新
export function reloadOnceForChunkError(error: Error): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === '1') return false;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // 无法使用 sessionStorage 时也只刷新这一次 (下一次进来的是新页面)
  }
  window.location.reload();
  return true;
}

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // ignore
  }
}

export function reportClientError(error: Error & { digest?: string }, where: string): void {
  const body = JSON.stringify({
    where,
    name: error.name,
    message: error.message,
    digest: error.digest ?? null,
    stack: (error.stack ?? '').slice(0, 2000),
    url: window.location.href,
    userAgent: navigator.userAgent,
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/client-error/', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/client-error/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    // 上报失败不影响界面
  }
}
