import React from 'react';
import { fetchVisitedLocations, fetchDrives, fetchFootprintDrives, fetchLifetimeStats } from '@/lib/queries';
import { FootprintAnalysisClientView } from '@/components/views/FootprintAnalysisClientView';

export const dynamic = 'force-dynamic';

export default async function FootprintPage() {
  const [locations, drives, paths, stats] = await Promise.all([
    fetchVisitedLocations(),
    fetchDrives(undefined, 200, 0, true),
    fetchFootprintDrives(),
    fetchLifetimeStats(),
  ]);

  return (
    <FootprintAnalysisClientView
      locations={locations}
      drives={drives}
      paths={paths}
      stats={stats}
    />
  );
}
