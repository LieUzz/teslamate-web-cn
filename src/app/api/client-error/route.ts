import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 浏览器端异常上报：只写进服务端日志 (docker compose logs)，不落库、不存文件
export async function POST(req: NextRequest) {
  try {
    const text = (await req.text()).slice(0, 8000);
    const data = JSON.parse(text) as Record<string, unknown>;
    console.error(
      `client-error [${String(data.where ?? '')}] ${String(data.name ?? '')}: ${String(data.message ?? '')} | url=${String(data.url ?? '')} | ua=${String(data.userAgent ?? '')} | digest=${String(data.digest ?? '')}\n${String(data.stack ?? '')}`
    );
  } catch (err) {
    console.error('client-error: unreadable report', err);
  }
  return new NextResponse(null, { status: 204 });
}
