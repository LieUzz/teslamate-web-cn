import React from 'react';
import { notFound } from 'next/navigation';
import { fetchCars, fetchDriveDetail } from '@/lib/queries';
import { DriveDetailClient } from '@/components/views/DriveDetailClient';

export const dynamic = 'force-dynamic';

interface DriveDetailPageProps {
  params: {
    id: string;
  };
}


export default async function DriveDetailPage({ params }: DriveDetailPageProps) {
  const driveId = parseInt(params.id, 10);
  if (isNaN(driveId)) notFound();

  const [drive, cars] = await Promise.all([fetchDriveDetail(driveId), fetchCars()]);
  if (!drive) notFound();

  // 分享海报上的车辆名称/车型取自该行程所属车辆
  const car = cars.find((c) => c.id === drive.car_id) ?? null;

  return (
    <DriveDetailClient
      drive={drive}
      carName={car?.name ?? null}
      carModel={car?.marketing_name ?? car?.model ?? null}
    />
  );
}
