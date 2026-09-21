import { ThemePreference } from '@/types';

export const THEME_STORAGE_KEY = 'teslamate_theme';
export type ResolvedTheme = 'light' | 'dark';

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // 隐私模式下 localStorage 可能不可用
  }
  return 'system';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference;
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
}

// 写入 <html data-theme>，并让 iOS 状态栏 / 浏览器工具栏颜色跟随页面底色
export function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  const background = getComputedStyle(root).getPropertyValue('--zinc-950').trim();
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  // 变量是空格分隔的 RGB 通道；theme-color 用兼容性最好的逗号写法
  meta.content = `rgb(${background.split(/\s+/).join(', ')})`;
}

export function onSystemThemeChange(listener: () => void) {
  const query = window.matchMedia(SYSTEM_DARK_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

// 首屏绘制前执行，避免先深后浅的闪烁；逻辑与 readThemePreference + resolveTheme 一致
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var t=(p==='light'||p==='dark')?p:(window.matchMedia('${SYSTEM_DARK_QUERY}').matches?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){}})();`;
