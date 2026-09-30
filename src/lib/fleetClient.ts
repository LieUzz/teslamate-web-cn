'use client';

import { FleetCommand, CommandResult, CommandStatus } from '@/lib/fleet/commands';

// 浏览器端发一条命令；只发一次，绝不自动重试 (命令可能已在车上执行)
export async function sendCommand(carId: number, command: FleetCommand): Promise<CommandStatus> {
  try {
    const res = await fetch(`/api/cars/${carId}/command/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => null)) as CommandResult | null;
    return data?.status ?? 'failed';
  } catch {
    return 'failed';
  }
}
