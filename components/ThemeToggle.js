'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

const subscribe = callback => {
  window.addEventListener('dashboard-theme-change', callback);
  return () => window.removeEventListener('dashboard-theme-change', callback);
};
const snapshot = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
const serverSnapshot = () => 'dark';

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('dashboard-theme', next); } catch { /* Theme still works when storage is unavailable. */ }
    window.dispatchEvent(new Event('dashboard-theme-change'));
  };
  return (
    <button type="button" onClick={toggle} className="theme-toggle print:hidden"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <Sun size={17} aria-hidden="true" className={theme === 'light' ? 'theme-active' : ''} />
      <span aria-hidden="true" className="theme-divider" />
      <Moon size={17} aria-hidden="true" className={theme === 'dark' ? 'theme-active' : ''} />
    </button>
  );
}
