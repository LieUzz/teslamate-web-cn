import { create } from 'zustand';
import { ThemePreference } from '@/types';
import { THEME_STORAGE_KEY, ResolvedTheme, applyTheme, resolveTheme } from '@/lib/theme';

interface ThemeState {
  // 用户偏好：'system' | 'light' | 'dark'
  preference: ThemePreference;
  // 实际生效的主题；客户端初始化之前未知
  resolved: ResolvedTheme | null;
  setPreference: (preference: ThemePreference) => void;
  // 重新按当前偏好计算 (初始化、系统外观变化时调用)
  sync: (preference?: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  resolved: null,
  setPreference: (preference: ThemePreference) => {
    try {
      if (preference === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      // 无法持久化时仅本次生效
    }
    get().sync(preference);
  },
  sync: (preference = get().preference) => {
    const resolved = resolveTheme(preference);
    applyTheme(resolved);
    set({ preference, resolved });
  },
}));
