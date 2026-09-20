import React from 'react';
import { notFound } from 'next/navigation';
import { fetchDriveDetail } from '@/lib/queries';
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

  const drive = await fetchDriveDetail(driveId);
  if (!drive) notFound();

  return <DriveDetailClient drive={drive} />;
}
