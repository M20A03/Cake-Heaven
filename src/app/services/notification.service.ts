import { Injectable, signal } from '@angular/core';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  durationMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public toasts = signal<ToastNotification[]>([]);

  public show(notification: Omit<ToastNotification, 'id'>): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastNotification = {
      ...notification,
      id,
      durationMs: notification.durationMs ?? 4500
    };

    this.toasts.update((current) => [...current, newToast]);

    if (newToast.durationMs && newToast.durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newToast.durationMs);
    }

    return id;
  }

  public success(title: string, message?: string, durationMs = 4000): string {
    return this.show({ type: 'success', title, message, durationMs });
  }

  public error(title: string, message?: string, durationMs = 6000): string {
    return this.show({ type: 'error', title, message, durationMs });
  }

  public warning(title: string, message?: string, durationMs = 5000): string {
    return this.show({ type: 'warning', title, message, durationMs });
  }

  public info(title: string, message?: string, durationMs = 4000): string {
    return this.show({ type: 'info', title, message, durationMs });
  }

  public dismiss(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  public clearAll(): void {
    this.toasts.set([]);
  }
}
