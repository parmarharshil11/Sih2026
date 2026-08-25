'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isPortal: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const isPortal = Boolean(
    pathname && (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/trainee') ||
      pathname.startsWith('/trainer')
    )
  );

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isPortal) {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [mounted, isPortal, theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (isPortal) {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isPortal }}>
      <div style={!mounted ? { visibility: 'hidden' } : undefined}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

