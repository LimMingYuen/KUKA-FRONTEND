import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { interval, Subject, takeUntil } from 'rxjs';

import { QueueMonitorService } from '../../services/queue-monitor.service';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import {
  QueueStatisticsResponse,
  MapCodeQueueResponse,
  QueueItemStatusDto,
  MissionsUtils
} from '../../models/missions.models';

@Component({
  selector: 'app-queue-monitor',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    FormsModule,
    GenericTableComponent
  ],
  templateUrl: './queue-monitor.component.html',
  styleUrl: './queue-monitor.component.scss'
})
export class QueueMonitorComponent implements OnInit, OnDestroy {
  // Data
  public statistics: QueueStatisticsResponse | null = null;
  public queueItems: QueueItemStatusDto[] = [];
  public selectedMapCode: string = '';
  public availableMapCodes: string[] = [];
  public statusFilter: string = '';

  // UI State
  public isLoading = false;
  public autoRefreshEnabled = true;
  public refreshInterval = 5000; // 5 seconds

  // Table configuration
  public tableConfig: TableConfig<QueueItemStatusDto> = {
    title: 'Queue Items',
    columns: [
      { key: 'queueItemCode', header: 'Queue Code', sortable: true, filterable: true },
      { key: 'missionCode', header: 'Mission Code', sortable: true, filterable: true },
      { key: 'status', header: 'Status', sortable: true, filterable: true },
      { key: 'priority', header: 'Priority', sortable: true, filterable: false },
      { key: 'primaryMapCode', header: 'Map Code', sortable: true, filterable: true },
      { key: 'assignedRobotId', header: 'Robot ID', sortable: true, filterable: true },
      { key: 'enqueuedUtc', header: 'Enqueued At', sortable: true, filterable: false, transform: (value) => MissionsUtils.formatDateTime(value) },
      { key: 'startedUtc', header: 'Started At', sortable: true, filterable: false, transform: (value) => MissionsUtils.formatDateTime(value) },
      { key: 'completedUtc', header: 'Completed At', sortable: true, filterable: false, transform: (value) => MissionsUtils.formatDateTime(value) }
    ],
    actions: [
      { action: 'view', label: 'View Details', icon: 'visibility', color: 'primary' },
      { action: 'cancel', label: 'Cancel', icon: 'cancel', color: 'warn' }
    ],
    headerActions: [
      { action: 'refresh', label: 'Refresh', icon: 'refresh' }
    ],
    pagination: {
      pageSize: 20,
      pageSizeOptions: [10, 20, 50, 100]
    },
    filter: {
      placeholder: 'Search queue items...',
      enabled: true
    },
    defaultSort: {
      column: 'enqueuedUtc',
      direction: 'desc'
    }
  };

  private destroy$ = new Subject<void>();

  constructor(
    public queueMonitorService: QueueMonitorService
  ) {}

  ngOnInit(): void {
    this.loadQueueStatistics();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load queue statistics
   */
  loadQueueStatistics(): void {
    this.isLoading = true;

    this.queueMonitorService.getQueueStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
          this.availableMapCodes = stats.mapCodeStatistics.map(s => s.mapCode);

          // Select first map code if none selected
          if (!this.selectedMapCode && this.availableMapCodes.length > 0) {
            this.selectedMapCode = this.availableMapCodes[0];
            this.loadMapCodeQueue();
          }

          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading queue statistics:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Load queue items for selected map code
   */
  loadMapCodeQueue(): void {
    if (!this.selectedMapCode) return;

    this.isLoading = true;

    this.queueMonitorService.getMapCodeQueue(this.selectedMapCode, this.statusFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.queueItems = response.queueItems;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading map code queue:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle map code selection change
   */
  onMapCodeChange(): void {
    this.loadMapCodeQueue();
  }

  /**
   * Handle status filter change
   */
  onStatusFilterChange(): void {
    this.loadMapCodeQueue();
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewQueueItemDetails(event.row);
        break;
      case 'cancel':
        this.cancelQueueItem(event.row);
        break;
      case 'refresh':
        this.refreshData();
        break;
      default:
        console.log('Unknown action:', event.action);
    }
  }

  /**
   * View queue item details
   */
  viewQueueItemDetails(item: QueueItemStatusDto): void {
    // TODO: Implement details dialog
    console.log('View queue item details:', item);
  }

  /**
   * Cancel queue item
   */
  cancelQueueItem(item: QueueItemStatusDto): void {
    const message = `Are you sure you want to cancel queue item "${item.queueItemCode}"?`;

    if (confirm(message)) {
      this.queueMonitorService.cancelQueueItem(item.queueItemId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.refreshData();
          },
          error: (error) => {
            console.error('Error cancelling queue item:', error);
          }
        });
    }
  }

  /**
   * Refresh all data
   */
  refreshData(): void {
    this.loadQueueStatistics();
    this.loadMapCodeQueue();
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;

    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    }
  }

  /**
   * Start auto-refresh
   */
  private startAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      interval(this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.autoRefreshEnabled) {
            this.refreshData();
          }
        });
    }
  }

  /**
   * Get status color for chips
   */
  getStatusColor(status: string): string {
    return MissionsUtils.getStatusColor(status);
  }

  /**
   * Get priority color for chips
   */
  getPriorityColor(priority: number): string {
    return MissionsUtils.getPriorityColor(priority);
  }
}
