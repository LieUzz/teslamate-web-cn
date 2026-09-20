import { fetchCars, fetchDrives, fetchCharges, fetchLifetimeStats } from '@/lib/queries';
import { DashboardSwitcher } from '@/components/views/DashboardSwitcher';
import { Empty } from '@/components/common/Empty';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [cars, drives, charges, stats] = await Promise.all([
    fetchCars(),
    fetchDrives(undefined, 10, 0),
    fetchCharges(undefined, 10, 0),
    fetchLifetimeStats(),
  ]);

  const primaryCar = cars[0];

  // 数据库里还没有车辆 (或数据库未连接)：不渲染看板
  if (!primaryCar) {
    return (
      <div className="max-w-4xl mx-auto pt-2 px-3">
        <Empty title="暂无车辆数据" hint="未能从 TeslaMate 数据库读取到车辆，请检查数据库连接或等待 TeslaMate 完成首次同步" />
      </div>
    );
  }

  return (
    <DashboardSwitcher
      car={primaryCar}
      drives={drives}
      charges={charges}
      stats={stats}
    />
  );
}
