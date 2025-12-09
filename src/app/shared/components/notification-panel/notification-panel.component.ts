import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService } from '../../../services/notification.service';
import { StoredNotification, NotificationType } from '../../../models/notification.models';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './notification-panel.component.html',
  styleUrl: './notification-panel.component.scss'
})
export class NotificationPanelComponent {
  notificationService = inject(NotificationService);

  // Output event for closing panel
  closePanel = output<void>();

  /**
   * Get icon for notification type
   */
  getIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return iconMap[type];
  }

  /**
   * Get CSS class for notification type
   */
  getTypeClass(type: NotificationType): string {
    return `notification-item--${type}`;
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  /**
   * Handle notification click
   */
  onNotificationClick(notification: StoredNotification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  /**
   * Delete notification
   */
  onDeleteNotification(event: Event, notification: StoredNotification): void {
    event.stopPropagation();
    this.notificationService.delete(notification.id);
  }

  /**
   * Mark all as read
   */
  onMarkAllRead(): void {
    this.notificationService.markAllAsRead();
  }

  /**
   * Clear all notifications
   */
  onClearAll(): void {
    this.notificationService.clearAll();
  }

  /**
   * Track by function for ngFor
   */
  trackById(index: number, notification: StoredNotification): string {
    return notification.id;
  }
}
