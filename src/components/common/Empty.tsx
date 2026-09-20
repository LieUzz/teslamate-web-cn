import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyProps {
  title?: string;
  hint?: string;
  icon?: LucideIcon;
  // card: 列表/页面里的空状态卡片；row: 表格里的整行；chart: 图表占位
  as?: 'card' | 'row' | 'chart';
  colSpan?: number;
}

export function Empty({ title = '暂无数据', hint, icon: Icon = Inbox, as = 'card', colSpan }: EmptyProps) {
  if (as === 'chart') {
    return (
      <div className="py-12 text-center text-xs text-zinc-500">
        {title}
        {hint ? <div className="mt-1 text-[11px] text-zinc-600">{hint}</div> : null}
      </div>
    );
  }

  const body = (
    <>
      <Icon className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
      <div className="text-sm text-zinc-300">{title}</div>
      {hint ? <div className="text-xs text-zinc-500 mt-1">{hint}</div> : null}
    </>
  );

  if (as === 'row') {
    return (
      <tr>
        <td colSpan={colSpan} className="py-12 text-center">
          {body}
        </td>
      </tr>
    );
  }

  return <div className="py-12 text-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40">{body}</div>;
}
