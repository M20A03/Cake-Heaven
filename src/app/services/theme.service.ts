import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private storageKey = 'cakeheaven_theme';

  // Signals
  public currentTheme = signal<'light' | 'dark'>('light');
  public themePreference = signal<ThemeMode>('system');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeTheme();
      this.listenToSystemChanges();
    }
  }

  private initializeTheme(): void {
    const saved = localStorage.getItem(this.storageKey) as ThemeMode | null;
    if (saved && (saved === 'light' || saved === 'dark')) {
      this.themePreference.set(saved);
      this.applyTheme(saved);
    } else {
      this.themePreference.set('system');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  private listenToSystemChanges(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (this.themePreference() === 'system') {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  public toggleTheme(): void {
    const nextTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  public setTheme(mode: ThemeMode): void {
    this.themePreference.set(mode);
    if (mode === 'system') {
      localStorage.removeItem(this.storageKey);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    } else {
      localStorage.setItem(this.storageKey, mode);
      this.applyTheme(mode);
    }
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    this.currentTheme.set(theme);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
}
