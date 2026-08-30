import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';
import { NotificationService } from './notification.service';

export interface FirebaseParsedError {
  code: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  private zone = inject(NgZone);
  private notifications = inject(NotificationService);

  handleError(error: any): void {
    const parsedMessage = this.extractErrorMessage(error);

    // Run inside Angular zone so Signal/UI updates propagate immediately
    this.zone.run(() => {
      console.error('[GlobalErrorHandler caught exception]:', error);
      this.notifications.error('Application Error', parsedMessage);
    });
  }

  private extractErrorMessage(error: any): string {
    if (!error) return 'An unexpected error occurred.';

    // Check Firebase Error Codes
    const rawCode = error.code || error?.error?.code || error?.originalError?.code;
    if (rawCode) {
      switch (rawCode) {
        case 'permission-denied':
          return 'Access Denied: You do not have permission to perform this database operation.';
        case 'unavailable':
          return 'Service Offline: The database is temporarily unreachable. Please check your network connection.';
        case 'not-found':
          return 'Item Not Found: The requested cake or order record could not be found.';
        case 'already-exists':
          return 'Conflict: This item or order ID already exists in the system.';
        case 'resource-exhausted':
          return 'Quota Exceeded: Too many requests have been submitted. Please try again shortly.';
        case 'unauthenticated':
          return 'Session Expired: Please log in to complete your request.';
        default:
          return `Firebase Error [${rawCode}]: ${error.message || 'Operation failed.'}`;
      }
    }

    if (error.status === 401) {
      return 'Session Expired (401): Please refresh or sign in again.';
    }
    if (error.status === 403) {
      return 'Forbidden (403): You do not have access to this resource.';
    }
    if (error.status === 404) {
      return 'Resource Not Found (404).';
    }
    if (error.status === 500) {
      return 'Internal Server Error (500): Our bakery servers encountered an issue.';
    }

    if (typeof error === 'string') {
      return error;
    }

    return error.message || error.toString();
  }
}
