import { promises as fs } from 'fs';
import { getConfig } from '@/lib/config';
import { CAR_MODEL_BROWSER_MAX_AGE_S } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// 首页 3D 车模 (glb)。文件由部署侧挂载，未配置即 404，前端保持 2D 渲染图
let cached: { etag: string; body: Buffer } | null = null;

async function fileEtag(file: string): Promise<string> {
  const s = await fs.stat(file);
  return `"${s.size.toString(16)}-${Math.floor(s.mtimeMs).toString(16)}"`;
}

function headers(etag: string, credit: string | null, length?: number): HeadersInit {
  return {
    'Content-Type': 'model/gltf-binary',
    'Cache-Control': `private, max-age=${CAR_MODEL_BROWSER_MAX_AGE_S}, immutable`,
    ETag: etag,
    ...(length != null ? { 'Content-Length': String(length) } : {}),
    ...(credit ? { 'X-Model-Credit': credit } : {}),
  };
}

function validId(id: string): boolean {
  return Number.isInteger(Number(id));
}

export async function HEAD(_request: Request, { params }: { params: { id: string } }) {
  const { carModelFile, carModelCredit } = getConfig();
  if (!carModelFile || !validId(params.id)) return new Response(null, { status: 404 });
  try {
    const s = await fs.stat(carModelFile);
    return new Response(null, { status: 200, headers: headers(await fileEtag(carModelFile), carModelCredit, s.size) });
  } catch {
    return new Response(null, { status: 404 });
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { carModelFile, carModelCredit } = getConfig();
  if (!carModelFile || !validId(params.id)) return new Response(null, { status: 404 });
  try {
    const etag = await fileEtag(carModelFile);
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: headers(etag, carModelCredit) });
    }
    if (!cached || cached.etag !== etag) cached = { etag, body: await fs.readFile(carModelFile) };
    return new Response(new Uint8Array(cached.body), { status: 200, headers: headers(etag, carModelCredit, cached.body.length) });
  } catch {
    return new Response(null, { status: 404 });
  }
}
