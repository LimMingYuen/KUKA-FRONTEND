import { Component, OnInit, OnDestroy, signal, effect, ChangeDetectorRef, inject, NgZone } from '@angular/core';
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
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

import { MissionQueueService } from '../../services/mission-queue.service';
import { SignalRService } from '../../services/signalr.service';
import { AuthService } from '../../services/auth.service';
import { AdminAuthorizationDialogComponent, AdminAuthorizationDialogData, AdminAuthorizationDialogResult } from '../../shared/dialogs/admin-authorization-dialog/admin-authorization-dialog.component';
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

  // MatTableDataSource for proper table change detection
  // MatTableDataSource has built-in change detection that works better than raw arrays
  public activeItemsDataSource = new MatTableDataSource<MissionQueueDisplayData>([]);

  // Keep track of counts for UI display
  public activeItemsCount = signal<number>(0);
  public queuedItemsCount = signal<number>(0);
  public historyItemsCount = signal<number>(0);

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

  // Auto-refresh (automatic fallback when SignalR disconnected)
  public autoRefresh = signal<boolean>(false);
  private autoRefreshInterval = 5000; // 5 seconds

  // SignalR connection status
  public connectionState = signal<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // Whether fallback polling is active (for UI indicator)
  public usingFallbackPolling = signal<boolean>(false);

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

  // Inject ChangeDetectorRef and NgZone to ensure proper change detection
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  constructor(
    private queueService: MissionQueueService,
    private signalRService: SignalRService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    // Effect: Update connection state
    effect(() => {
      this.connectionState.set(this.signalRService.connectionState());
    });

    // Effect: Reload data when queue is updated via SignalR
    // Using counter-based signal - any change (> 0) indicates an update
    effect(() => {
      const updateCount = this.signalRService.queueUpdated();
      if (updateCount > 0) {
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
    // Using counter-based signal - any change (> 0) indicates an update
    effect(() => {
      const updateCount = this.signalRService.statisticsUpdated();
      if (updateCount > 0) {
        this.loadStatisticsSilently();
      }
    });

    // Effect: Auto-enable/disable fallback polling based on SignalR connection state
    effect(() => {
      const state = this.signalRService.connectionState();
      if (state === 'error' || state === 'disconnected') {
        // SignalR failed - enable fallback polling
        this.autoRefresh.set(true);
        this.usingFallbackPolling.set(true);
      } else if (state === 'connected') {
        // SignalR connected - disable fallback polling
        this.autoRefresh.set(false);
        this.usingFallbackPolling.set(false);
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
          this.updateQueueData(items);
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
          this.updateQueueData(items);
        },
        error: () => {
          // Silently handle error
        }
      });

    this.queueService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.ngZone.run(() => {
            this.statistics.set(stats);
            this.cdr.detectChanges();
          });
        },
        error: () => {
          // Silently handle error
        }
      });
  }

  /**
   * Update queue data and all filtered views
   * This ensures MatTable gets proper change notifications
   * Runs inside NgZone to ensure Angular detects the changes
   */
  private updateQueueData(items: MissionQueueDisplayData[]): void {
    // Run inside NgZone to ensure Angular detects changes from SignalR callbacks
    this.ngZone.run(() => {
      // Update main signal
      this.queueItems.set(items);

      // Filter items by status
      const active = items.filter(item =>
        item.statusCode === MissionQueueStatus.Queued ||
        item.statusCode === MissionQueueStatus.Processing ||
        item.statusCode === MissionQueueStatus.Assigned
      );
      const queued = items.filter(item =>
        item.statusCode === MissionQueueStatus.Queued ||
        item.statusCode === MissionQueueStatus.Processing
      );
      const history = items.filter(item =>
        item.statusCode === MissionQueueStatus.Completed ||
        item.statusCode === MissionQueueStatus.Failed ||
        item.statusCode === MissionQueueStatus.Cancelled
      );

      // Update MatTableDataSource - this properly triggers table re-render
      this.activeItemsDataSource.data = active;

      // Update count signals for UI
      this.activeItemsCount.set(active.length);
      this.queuedItemsCount.set(queued.length);
      this.historyItemsCount.set(history.length);

      // Force change detection
      this.cdr.detectChanges();
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
   * Manual refresh
   */
  refresh(): void {
    this.loadData();
    this.snackBar.open('Queue refreshed', '', { duration: 1500 });
  }

  /**
   * Cancel queue item
   * Requires admin authorization for non-SuperAdmin users
   */
  cancelItem(item: MissionQueueDisplayData): void {
    if (!item.canCancel) {
      this.snackBar.open('This item cannot be cancelled', 'Close', { duration: 3000 });
      return;
    }

    // Check if user is SuperAdmin - proceed directly if true
    if (this.authService.isSuperAdmin()) {
      this.executeCancelItem(item);
      return;
    }

    // Non-admin user - show admin authorization dialog first
    const authDialogRef = this.dialog.open(AdminAuthorizationDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        title: 'Admin Authorization Required',
        message: `Cancelling queue item "${item.missionName}" requires admin authorization. Please enter admin credentials to proceed.`,
        actionLabel: 'Authorize & Cancel'
      } as AdminAuthorizationDialogData
    });

    authDialogRef.afterClosed().subscribe((authResult: AdminAuthorizationDialogResult | undefined) => {
      if (authResult?.authorized) {
        this.executeCancelItem(item);
      }
    });
  }

  /**
   * Execute the actual cancel operation after authorization check
   */
  private executeCancelItem(item: MissionQueueDisplayData): void {
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
   * TrackBy function for MatTable - helps Angular identify which rows changed
   */
  trackByQueueItem(index: number, item: MissionQueueDisplayData): number {
    return item.id;
  }

  // Note: getQueuedItems, getActiveItems, getHistoryItems replaced by computed signals
  // at the top of the class (queuedItems, activeItems, historyItems)
}
