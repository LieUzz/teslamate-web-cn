import React from 'react';
import { fetchParkings, fetchEnergyBreakdown, fetchParkingDrainAnalysis } from '@/lib/queries';
import { ParkingSwitcher } from '@/components/views/ParkingSwitcher';

export const dynamic = 'force-dynamic';

export default async function ParkingPage() {
  const [parkings, energy, analysis] = await Promise.all([
    fetchParkings(undefined, 50, 0),
    fetchEnergyBreakdown(),
    fetchParkingDrainAnalysis(),
  ]);

  return <ParkingSwitcher parkings={parkings} energy={energy} analysis={analysis} />;
}
