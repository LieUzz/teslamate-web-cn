'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Route, Zap, BarChart3, MapPin } from 'lucide-react';

const navItems = [
  { name: '总览看板', href: '/', icon: LayoutDashboard },
  { name: '行程记录', href: '/drives', icon: Route },
  { name: '充电统计', href: '/charges', icon: Zap },
  { name: '能耗与效率', href: '/stats', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 hidden lg:flex flex-col border-r border-zinc-800 bg-zinc-950/60 p-4 space-y-6 shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
          导航菜单
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              // 页面都是动态渲染：默认预取拿不到页面数据，这里预取完整数据，点击时无需再等一次往返
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-zinc-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

    </aside>
  );
}
