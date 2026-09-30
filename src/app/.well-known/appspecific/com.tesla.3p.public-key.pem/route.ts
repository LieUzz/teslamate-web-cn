import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

// Tesla Fleet API 虚拟钥匙的公钥发现地址 (Tesla 服务器匿名抓取；Caddy 对该路径免 SSO)
export async function GET() {
  const file = getConfig().fleetPublicKeyFile;
  if (!file) return new NextResponse(null, { status: 404 });
  try {
    const pem = await fs.readFile(file, 'utf8');
    return new NextResponse(pem, {
      headers: { 'Content-Type': 'application/x-pem-file', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
