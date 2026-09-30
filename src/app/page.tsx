import { fetchCars, fetchLifetimeStats, fetchUsageSummary, fetchDayTimeline } from '@/lib/queries';
import { DashboardSwitcher } from '@/components/views/DashboardSwitcher';
import { Empty } from '@/components/common/Empty';
import { isFleetEnabled } from '@/lib/fleet/tokenStore';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [cars, stats, usage, timeline] = await Promise.all([
    fetchCars(),
    fetchLifetimeStats(),
    fetchUsageSummary(),
    fetchDayTimeline(),
  ]);

  const primaryCar = cars[0];
  // 只把"是否启用车辆控制"这个布尔值交给客户端，Fleet API 配置本身不出服务端
  const fleetEnabled = isFleetEnabled();

  // 数据库里还没有车辆 (或数据库未连接)：不渲染看板
  if (!primaryCar) {
    return (
      <div className="max-w-4xl mx-auto pt-2 px-3">
        <Empty title="暂无车辆数据" />
      </div>
    );
  }

  return (
    <DashboardSwitcher
      car={primaryCar}
      stats={stats}
      usage={usage}
      timeline={timeline}
      fleetEnabled={fleetEnabled}
    />
  );
}
