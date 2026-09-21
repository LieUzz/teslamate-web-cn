import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fetchCar } from '@/lib/queries';
import { buildCarImageUrl } from '@/lib/carImage';
import { CAR_IMAGE_BROWSER_MAX_AGE_S, CAR_IMAGE_TIMEOUT_MS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// 渲染图只向特斯拉取一次：内存 + 临时目录两级缓存，手机始终只访问本站
const memoryCache = new Map<string, Buffer>();

async function loadImage(url: string): Promise<Buffer | null> {
  const key = createHash('sha256').update(url).digest('hex').slice(0, 32);
  const cached = memoryCache.get(key);
  if (cached) return cached;

  const file = path.join(os.tmpdir(), `car-image-${key}.png`);
  try {
    const onDisk = await fs.readFile(file);
    memoryCache.set(key, onDisk);
    return onDisk;
  } catch {
    // 临时目录里还没有，去取
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(CAR_IMAGE_TIMEOUT_MS) });
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/png')) return null;
  const image = Buffer.from(await res.arrayBuffer());
  memoryCache.set(key, image);
  await fs.writeFile(file, image).catch(() => undefined); // 写不了盘只影响重启后的首次加载
  return image;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const carId = Number(params.id);
  if (!Number.isInteger(carId)) return new Response(null, { status: 404 });

  const car = await fetchCar(carId);
  const url = car ? buildCarImageUrl(car) : null;
  if (!url) return new Response(null, { status: 404 });

  try {
    const image = await loadImage(url);
    if (!image) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(image), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': `private, max-age=${CAR_IMAGE_BROWSER_MAX_AGE_S}` },
    });
  } catch (err) {
    console.error('car image error:', err);
    return new Response(null, { status: 404 });
  }
}
