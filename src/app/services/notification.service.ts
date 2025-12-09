import { Injectable, signal, computed, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  StoredNotification,
  NotificationType,
  NotificationConfig,
  DEFAULT_NOTIFICATION_CONFIG
} from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly STORAGE_KEY = 'app_notifications';
  private readonly RETENTION_HOURS = 24;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute

  private snackBar = inject(MatSnackBar);

  // Reactive state using signals
  private _notifications = signal<StoredNotification[]>([]);

  // Public computed signals
  public notifications = computed(() => this._notifications());
  public unreadCount = computed(() =>
    this._notifications().filter(n => !n.read).length
  );
  public hasUnread = computed(() => this.unreadCount() > 0);

  constructor() {
    this.loadFromStorage();
    this.cleanupExpired();
    this.startCleanupInterval();
  }

  // ================== PUBLIC API ==================

  /**
   * Show success notification
   */
  success(message: string, config?: Partial<NotificationConfig>): void {
    this.show('success', message, config);
  }

  /**
   * Show error notification
   */
  error(message: string, config?: Partial<NotificationConfig>): void {
    this.show('error', message, config);
  }

  /**
   * Show warning notification
   */
  warning(message: string, config?: Partial<NotificationConfig>): void {
    this.show('warning', message, config);
  }

  /**
   * Show info notification
   */
  info(message: string, config?: Partial<NotificationConfig>): void {
    this.show('info', message, config);
  }

  /**
   * Get all stored notifications
   */
  getNotifications(): StoredNotification[] {
    return this._notifications();
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): StoredNotification[] {
    return this._notifications().filter(n => !n.read);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: string): void {
    const notifications = this._notifications().map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this._notifications.set(notifications);
    this.saveToStorage();
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const notifications = this._notifications().map(n => ({ ...n, read: true }));
    this._notifications.set(notifications);
    this.saveToStorage();
  }

  /**
   * Delete a specific notification
   */
  delete(id: string): void {
    const notifications = this._notifications().filter(n => n.id !== id);
    this._notifications.set(notifications);
    this.saveToStorage();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this._notifications.set([]);
    this.saveToStorage();
  }

  /**
   * Manually trigger cleanup of expired notifications
   */
  cleanupExpired(): void {
    const cutoffTime = Date.now() - (this.RETENTION_HOURS * 60 * 60 * 1000);
    const notifications = this._notifications().filter(n =>
      new Date(n.timestamp).getTime() > cutoffTime
    );

    if (notifications.length !== this._notifications().length) {
      this._notifications.set(notifications);
      this.saveToStorage();
    }
  }

  // ================== PRIVATE METHODS ==================

  /**
   * Core notification display and storage logic
   */
  private show(
    type: NotificationType,
    message: string,
    config?: Partial<NotificationConfig>
  ): void {
    const mergedConfig = { ...DEFAULT_NOTIFICATION_CONFIG[type], ...config };

    // Show snackbar
    this.snackBar.open(message, mergedConfig.action || 'Close', {
      duration: mergedConfig.duration,
      horizontalPosition: mergedConfig.horizontalPosition,
      verticalPosition: mergedConfig.verticalPosition,
      panelClass: [this.getPanelClass(type)]
    });

    // Store notification if enabled
    if (mergedConfig.store !== false) {
      this.storeNotification(type, message);
    }
  }

  /**
   * Get CSS panel class for notification type
   */
  private getPanelClass(type: NotificationType): string {
    const classMap: Record<NotificationType, string> = {
      success: 'success-snackbar',
      error: 'error-snackbar',
      warning: 'warning-snackbar',
      info: 'info-snackbar'
    };
    return classMap[type];
  }

  /**
   * Store notification in memory and localStorage
   */
  private storeNotification(
    type: NotificationType,
    message: string
  ): void {
    const notification: StoredNotification = {
      id: this.generateId(),
      type,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Add to beginning of array (newest first)
    const notifications = [notification, ...this._notifications()];
    this._notifications.set(notifications);
    this.saveToStorage();
  }

  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Load notifications from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const notifications: StoredNotification[] = JSON.parse(stored);
        this._notifications.set(notifications);
      }
    } catch (error) {
      console.warn('Failed to load notifications from storage:', error);
      this._notifications.set([]);
    }
  }

  /**
   * Save notifications to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this._notifications())
      );
    } catch (error) {
      console.warn('Failed to save notifications to storage:', error);
    }
  }

  /**
   * Start periodic cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, this.CLEANUP_INTERVAL_MS);
  }
}
