import React from 'react';
import { fetchCars, fetchMonthlyReports } from '@/lib/queries';
import { MonthlyReportClient } from '@/components/views/MonthlyReportClient';

export const dynamic = 'force-dynamic';

export default async function MonthlyReportsPage() {
  // 月报与分享海报上的车辆名称对应同一辆车 (默认车辆，排序同 fetchCars)
  const cars = await fetchCars();
  const car = cars[0] ?? null;
  const reports = await fetchMonthlyReports(car?.id);

  return (
    <MonthlyReportClient
      reports={reports}
      carName={car?.name ?? null}
      carModel={car?.marketing_name ?? car?.model ?? null}
    />
  );
}
