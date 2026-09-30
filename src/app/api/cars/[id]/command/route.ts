import { NextResponse } from 'next/server';
import { ssoUser } from '@/lib/fleet/auth';
import { isFleetCommand, CommandResult } from '@/lib/fleet/commands';
import { isFleetEnabled } from '@/lib/fleet/tokenStore';
import { runCommand } from '@/lib/fleet/client';

export const dynamic = 'force-dynamic';

// 向车发一条白名单内的命令。调用者身份来自 SSO 请求头；VIN 由服务端查库得到
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = ssoUser(request);
  if (!user) return NextResponse.json(null, { status: 401 });
  if (!isFleetEnabled()) return NextResponse.json(null, { status: 404 });

  const carId = Number(params.id);
  if (!Number.isInteger(carId)) return NextResponse.json(null, { status: 404 });

  let command: unknown;
  try {
    command = ((await request.json()) as { command?: unknown })?.command;
  } catch {
    command = undefined;
  }
  if (!isFleetCommand(command)) return NextResponse.json(null, { status: 400 });

  const { status, httpStatus } = await runCommand(carId, command, user);
  const body: CommandResult = { status };
  return NextResponse.json(body, { status: httpStatus, headers: { 'Cache-Control': 'no-store' } });
}
