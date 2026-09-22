import { fetchDayTimeline } from '@/lib/queries';
import { TimelineClientView } from '@/components/views/TimelineClientView';

export const dynamic = 'force-dynamic';

// 按天翻看的活动时间线：?date=YYYY-MM-DD (配置时区)，缺省或非法为今天
export default async function TimelinePage({ searchParams }: { searchParams: { date?: string } }) {
  const data = await fetchDayTimeline(undefined, searchParams.date);
  return <TimelineClientView data={data} />;
}
