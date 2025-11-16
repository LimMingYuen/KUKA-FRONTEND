import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { WorkflowNodeCodesService } from '../../services/workflow-node-codes.service';
import {
  WorkflowNodeCodeSyncResult,
  SyncHistoryEntry
} from '../../models/workflow-node-codes.models';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-workflow-sync-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    GenericTableComponent
  ],
  templateUrl: './workflow-sync-status.component.html',
  styleUrl: './workflow-sync-status.component.scss'
})
export class WorkflowSyncStatusComponent implements OnInit, OnDestroy {
  // Sync history data
  syncHistory: SyncHistoryEntry[] = [];
  historyIdCounter = 1;

  // Current sync result
  currentSyncResult = signal<WorkflowNodeCodeSyncResult | null>(null);

  // Table configuration
  tableConfig: TableConfig<SyncHistoryEntry> = {
    title: 'Sync History',
    columns: [
      {
        key: 'id',
        header: '#',
        sortable: true,
        filterable: false
      },
      {
        key: 'timestamp',
        header: 'Timestamp',
        sortable: true,
        filterable: false,
        transform: (value) => new Date(value).toLocaleString()
      },
      {
        key: 'totalWorkflows',
        header: 'Total Workflows',
        sortable: true,
        filterable: false
      },
      {
        key: 'successCount',
        header: 'Success',
        sortable: true,
        filterable: false
      },
      {
        key: 'failureCount',
        header: 'Failures',
        sortable: true,
        filterable: false
      },
      {
        key: 'nodeCodesInserted',
        header: 'Inserted',
        sortable: true,
        filterable: false
      },
      {
        key: 'nodeCodesDeleted',
        header: 'Deleted',
        sortable: true,
        filterable: false
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        filterable: true,
        transform: (value) => value === 'success' ? '✓ Success' :
                              value === 'partial' ? '⚠ Partial' : '✗ Failed'
      },
      {
        key: 'duration',
        header: 'Duration',
        sortable: true,
        filterable: false,
        transform: (value) => value ? `${(value / 1000).toFixed(1)}s` : 'N/A'
      }
    ],
    pagination: {
      pageSize: 10,
      pageSizeOptions: [5, 10, 25, 50]
    },
    filter: {
      placeholder: 'Search sync history...',
      enabled: true
    },
    defaultSort: {
      column: 'id',
      direction: 'desc'
    },
    emptyState: {
      message: 'No sync history available. Click "Sync Now" to perform your first sync.',
      icon: 'history'
    }
  };

  private destroy$ = new Subject<void>();

  constructor(public workflowNodeCodesService: WorkflowNodeCodesService) {
    // React to sync result changes
    effect(() => {
      const result = this.workflowNodeCodesService.lastSyncResult();
      if (result) {
        this.currentSyncResult.set(result);
        this.addToHistory(result);
      }
    });
  }

  ngOnInit(): void {
    // Load any persisted sync history from localStorage
    this.loadHistoryFromStorage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Trigger sync operation
   */
  syncNow(): void {
    const startTime = Date.now();

    this.workflowNodeCodesService.syncAllWorkflowNodeCodes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const duration = Date.now() - startTime;
          // Add duration to result before adding to history
          this.addToHistory({ ...result, timestamp: new Date() }, duration);
        },
        error: (err) => {
          console.error('Sync failed:', err);
        }
      });
  }

  /**
   * Add sync result to history
   */
  private addToHistory(result: WorkflowNodeCodeSyncResult, duration?: number): void {
    const status: 'success' | 'partial' | 'failed' =
      result.failureCount === 0 ? 'success' :
      result.successCount > 0 ? 'partial' : 'failed';

    const historyEntry: SyncHistoryEntry = {
      id: this.historyIdCounter++,
      timestamp: result.timestamp || new Date(),
      totalWorkflows: result.totalWorkflows,
      successCount: result.successCount,
      failureCount: result.failureCount,
      nodeCodesInserted: result.nodeCodesInserted,
      nodeCodesDeleted: result.nodeCodesDeleted,
      duration: duration,
      status
    };

    // Add to beginning of array (most recent first)
    this.syncHistory = [historyEntry, ...this.syncHistory];

    // Keep only last 100 entries
    if (this.syncHistory.length > 100) {
      this.syncHistory = this.syncHistory.slice(0, 100);
    }

    // Persist to localStorage
    this.saveHistoryToStorage();
  }

  /**
   * Get status color class
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'success': return 'status-success';
      case 'partial': return 'status-warning';
      case 'failed': return 'status-error';
      default: return '';
    }
  }

  /**
   * Clear sync history
   */
  clearHistory(): void {
    this.syncHistory = [];
    this.historyIdCounter = 1;
    this.currentSyncResult.set(null);
    this.workflowNodeCodesService.clearSyncResult();
    localStorage.removeItem('workflow_sync_history');
  }

  /**
   * Load history from localStorage
   */
  private loadHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('workflow_sync_history');
      if (stored) {
        const data = JSON.parse(stored);
        this.syncHistory = data.history || [];
        this.historyIdCounter = data.counter || 1;
      }
    } catch (error) {
      console.error('Failed to load sync history from storage:', error);
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistoryToStorage(): void {
    try {
      localStorage.setItem('workflow_sync_history', JSON.stringify({
        history: this.syncHistory,
        counter: this.historyIdCounter
      }));
    } catch (error) {
      console.error('Failed to save sync history to storage:', error);
    }
  }

  /**
   * Handle table actions (if any)
   */
  handleAction(event: ActionEvent): void {
    // No actions needed for history table currently
    console.log('Action:', event);
  }
}
