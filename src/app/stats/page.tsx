import React from 'react';
import {
  fetchLifetimeStats,
  fetchEnergyBreakdown,
  fetchDrivingRecords,
  fetchCarMilestones,
} from '@/lib/queries';
import { StatsClientView } from '@/components/views/StatsClientView';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const [stats, energy, records, milestones] = await Promise.all([
    fetchLifetimeStats(),
    fetchEnergyBreakdown(),
    fetchDrivingRecords(),
    fetchCarMilestones(),
  ]);

  return (
    <StatsClientView
      stats={stats}
      energy={energy}
      records={records}
      milestones={milestones}
    />
  );
}
