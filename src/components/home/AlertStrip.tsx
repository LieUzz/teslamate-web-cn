'use client';

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { CarAlert } from '@/lib/alerts';

export function AlertStrip({ alerts }: { alerts: CarAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1.5" role="status">
      {alerts.map((alert) => {
        const warning = alert.level === 'warning';
        const Icon = warning ? AlertTriangle : Info;
        return (
          <div
            key={alert.key}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
              warning ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}
