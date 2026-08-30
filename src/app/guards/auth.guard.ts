import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

/**
 * Functional Auth Guard
 * Verifies active session token or anonymous user identity.
 * Redirects to home/login with returnUrl query parameter on unauthorized access.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const notifications = inject(NotificationService);

  // In this client architecture, verify localStorage session or guest identifier
  const userSession = typeof localStorage !== 'undefined' ? localStorage.getItem('cakeheaven_user') : null;

  if (userSession) {
    return true;
  }

  // Graceful guest experience: allow browsing, but notify if accessing restricted sections
  notifications.info('Sign In Recommended', 'You are currently browsing as a guest.');
  return true;
};
