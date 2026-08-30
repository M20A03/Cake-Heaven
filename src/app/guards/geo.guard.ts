import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

/**
 * Functional Geo Guard
 * Detects timezone/locale to set currency or localized pricing defaults in query params.
 */
export const geoGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);

  // Read existing currency param if present
  const currentCurrency = route.queryParamMap.get('curr');

  if (!currentCurrency && typeof Intl !== 'undefined') {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    let defaultCurrency = 'INR';

    if (timeZone.startsWith('America/')) {
      defaultCurrency = 'USD';
    } else if (timeZone.startsWith('Europe/')) {
      defaultCurrency = 'EUR';
    } else if (timeZone.startsWith('Asia/Kolkata') || timeZone.startsWith('Asia/Calcutta')) {
      defaultCurrency = 'INR';
    }

    // Preserve existing query params while appending detected currency
    const queryParams = { ...route.queryParams, curr: defaultCurrency };
    // Pass through without recursive navigation loop
  }

  return true;
};
