// 切换页面时立即显示的骨架屏：数据还在路上时，界面先切过去
export default function Loading() {
  return (
    <div className="space-y-4 pb-24 pt-2 px-3 mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="加载中">
      <div className="h-28 rounded-3xl bg-zinc-900/80 border border-zinc-800" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-zinc-900/60 border border-zinc-800/80" />
      ))}
    </div>
  );
}
