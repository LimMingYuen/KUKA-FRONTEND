/**
 * Notification type enumeration
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Stored notification interface for localStorage persistence
 */
export interface StoredNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;  // ISO string for JSON serialization
  read: boolean;
}

/**
 * Notification configuration for display options
 */
export interface NotificationConfig {
  duration?: number;           // Snackbar display duration (ms)
  action?: string;             // Action button text
  horizontalPosition?: 'start' | 'center' | 'end' | 'left' | 'right';
  verticalPosition?: 'top' | 'bottom';
  store?: boolean;             // Whether to store in localStorage (default: true)
}

/**
 * Default notification configurations by type
 */
export const DEFAULT_NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfig> = {
  success: {
    duration: 3000,
    action: 'Close',
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    store: true
  },
  error: {
    duration: 5000,
    action: 'Close',
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    store: true
  },
  warning: {
    duration: 5000,
    action: 'Close',
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    store: true
  },
  info: {
    duration: 3000,
    action: 'Close',
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    store: true
  }
};
