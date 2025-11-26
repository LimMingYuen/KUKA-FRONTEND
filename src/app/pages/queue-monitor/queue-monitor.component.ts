import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

import { MissionQueueService } from '../../services/mission-queue.service';
import { SignalRService } from '../../services/signalr.service';
import {
  MissionQueueDisplayData,
  MissionQueueStatistics,
  MissionQueueStatus,
  formatSuccessRate,
  formatAverageWaitTime,
  PRIORITY_CONFIG
} from '../../models/mission-queue.models';
import { Subject, takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-queue-monitor',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
    MatTableModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './queue-monitor.component.html',
  styleUrl: './queue-monitor.component.scss'
})
export class QueueMonitorComponent implements OnInit, OnDestroy {
  // Data signals
  public queueItems = signal<MissionQueueDisplayData[]>([]);
  public statistics = signal<MissionQueueStatistics | null>(null);

  // Loading states
  public isLoading = signal<boolean>(false);
  public processingActions = signal<Set<number>>(new Set());

  // View configuration
  public displayedColumns: string[] = [
    'queuePosition',
    'missionName',
    'status',
    'priority',
    'robotDisplay',
    'waitTimeDisplay',
    'createdDateRelative',
    'actions'
  ];

  // Auto-refresh (fallback when SignalR disconnected)
  public autoRefresh = signal<boolean>(false); // Disabled by default when SignalR is active
  private autoRefreshInterval = 5000; // 5 seconds

  // SignalR connection status
  public connectionState = signal<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // Priority options for dropdown
  public priorityOptions = Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
    value: parseInt(value),
    text: config.text
  }));

  // Cleanup
  private destroy$ = new Subject<void>();

  // Expose utilities to template
  public readonly formatSuccessRate = formatSuccessRate;
  public readonly formatAverageWaitTime = formatAverageWaitTime;

  constructor(
    private queueService: MissionQueueService,
    private signalRService: SignalRService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    // Effect: Update connection state
    effect(() => {
      this.connectionState.set(this.signalRService.connectionState());
    });

    // Effect: Reload data when queue is updated via SignalR
    effect(() => {
      if (this.signalRService.queueUpdated()) {
        this.loadDataSilently();
      }
    });

    // Effect: Reload data when mission status changes via SignalR
    effect(() => {
      const statusChange = this.signalRService.missionStatusChanged();
      if (statusChange) {
        this.loadDataSilently();
      }
    });

    // Effect: Reload statistics when updated via SignalR
    effect(() => {
      if (this.signalRService.statisticsUpdated()) {
        this.loadStatisticsSilently();
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load queue items and statistics
   */
  loadData(): void {
    this.isLoading.set(true);

    // Load both in parallel
    this.queueService.getAllQueueItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.queueItems.set(items);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });

    this.queueService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics.set(stats);
        }
      });
  }

  /**
   * Load data silently (without spinner) - used by SignalR updates
   */
  loadDataSilently(): void {
    this.queueService.getAllQueueItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.queueItems.set(items);
        }
      });

    this.queueService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics.set(stats);
        }
      });
  }

  /**
   * Load statistics silently - used by SignalR updates
   */
  loadStatisticsSilently(): void {
    this.queueService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics.set(stats);
        }
      });
  }

  /**
   * Start auto-refresh interval (fallback when SignalR is not connected)
   */
  startAutoRefresh(): void {
    interval(this.autoRefreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh()) {
          this.loadData();
        }
      });
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh(): void {
    this.autoRefresh.update(v => !v);
    if (this.autoRefresh()) {
      this.snackBar.open('Auto-refresh enabled', '', { duration: 2000 });
    } else {
      this.snackBar.open('Auto-refresh disabled', '', { duration: 2000 });
    }
  }

  /**
   * Manual refresh
   */
  refresh(): void {
    this.loadData();
    this.snackBar.open('Queue refreshed', '', { duration: 1500 });
  }

  /**
   * Cancel queue item
   */
  cancelItem(item: MissionQueueDisplayData): void {
    if (!item.canCancel) {
      this.snackBar.open('This item cannot be cancelled', 'Close', { duration: 3000 });
      return;
    }

    this.addProcessingAction(item.id);

    this.queueService.cancel(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.removeProcessingAction(item.id);
          this.loadData();
        },
        error: () => {
          this.removeProcessingAction(item.id);
        }
      });
  }

  /**
   * Retry failed item
   */
  retryItem(item: MissionQueueDisplayData): void {
    if (!item.canRetry) {
      this.snackBar.open('This item cannot be retried', 'Close', { duration: 3000 });
      return;
    }

    this.addProcessingAction(item.id);

    this.queueService.retry(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.removeProcessingAction(item.id);
          this.loadData();
        },
        error: () => {
          this.removeProcessingAction(item.id);
        }
      });
  }

  /**
   * Move item up in queue
   */
  moveUp(item: MissionQueueDisplayData): void {
    if (!item.canMoveUp) {
      this.snackBar.open('This item cannot be moved up', 'Close', { duration: 3000 });
      return;
    }

    this.addProcessingAction(item.id);

    this.queueService.moveUp(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.removeProcessingAction(item.id);
          this.loadData();
        },
        error: () => {
          this.removeProcessingAction(item.id);
        }
      });
  }

  /**
   * Move item down in queue
   */
  moveDown(item: MissionQueueDisplayData): void {
    if (!item.canMoveDown) {
      this.snackBar.open('This item cannot be moved down', 'Close', { duration: 3000 });
      return;
    }

    this.addProcessingAction(item.id);

    this.queueService.moveDown(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.removeProcessingAction(item.id);
          this.loadData();
        },
        error: () => {
          this.removeProcessingAction(item.id);
        }
      });
  }

  /**
   * Change item priority
   */
  changePriority(item: MissionQueueDisplayData, priority: number): void {
    this.addProcessingAction(item.id);

    this.queueService.changePriority(item.id, priority)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.removeProcessingAction(item.id);
          this.loadData();
        },
        error: () => {
          this.removeProcessingAction(item.id);
        }
      });
  }

  /**
   * Check if action is processing for an item
   */
  isProcessing(id: number): boolean {
    return this.processingActions().has(id);
  }

  /**
   * Add item to processing set
   */
  private addProcessingAction(id: number): void {
    this.processingActions.update(set => {
      const newSet = new Set(set);
      newSet.add(id);
      return newSet;
    });
  }

  /**
   * Remove item from processing set
   */
  private removeProcessingAction(id: number): void {
    this.processingActions.update(set => {
      const newSet = new Set(set);
      newSet.delete(id);
      return newSet;
    });
  }

  /**
   * Get status icon
   */
  getStatusIcon(statusCode: number): string {
    const icons: Record<number, string> = {
      [MissionQueueStatus.Queued]: 'hourglass_empty',
      [MissionQueueStatus.Processing]: 'sync',
      [MissionQueueStatus.Assigned]: 'smart_toy',
      [MissionQueueStatus.Completed]: 'check_circle',
      [MissionQueueStatus.Failed]: 'error',
      [MissionQueueStatus.Cancelled]: 'cancel'
    };
    return icons[statusCode] || 'help';
  }

  /**
   * Get queued items only
   */
  getQueuedItems(): MissionQueueDisplayData[] {
    return this.queueItems().filter(item =>
      item.statusCode === MissionQueueStatus.Queued ||
      item.statusCode === MissionQueueStatus.Processing
    );
  }

  /**
   * Get active items (queued + processing + assigned)
   */
  getActiveItems(): MissionQueueDisplayData[] {
    return this.queueItems().filter(item =>
      item.statusCode === MissionQueueStatus.Queued ||
      item.statusCode === MissionQueueStatus.Processing ||
      item.statusCode === MissionQueueStatus.Assigned
    );
  }

  /**
   * Get completed items (completed + failed + cancelled)
   */
  getHistoryItems(): MissionQueueDisplayData[] {
    return this.queueItems().filter(item =>
      item.statusCode === MissionQueueStatus.Completed ||
      item.statusCode === MissionQueueStatus.Failed ||
      item.statusCode === MissionQueueStatus.Cancelled
    );
  }
}
