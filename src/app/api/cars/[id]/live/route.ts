import { NextResponse } from 'next/server';
import { fetchCar } from '@/lib/queries';

export const dynamic = 'force-dynamic';

// 首页轮询用的实时车况 (只读)
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const carId = Number(params.id);
  const car = Number.isInteger(carId) ? await fetchCar(carId) : null;
  if (!car) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(car, { headers: { 'Cache-Control': 'no-store' } });
}
