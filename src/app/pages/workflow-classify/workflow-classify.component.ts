import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { WorkflowNodeCodesService } from '../../services/workflow-node-codes.service';
import {
  SyncAndClassifyAllResult,
  ClassifiedWorkflow,
  SyncClassifyHistoryEntry
} from '../../models/workflow-node-codes.models';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-workflow-classify',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    MatTabsModule,
    GenericTableComponent
  ],
  templateUrl: './workflow-classify.component.html',
  styleUrl: './workflow-classify.component.scss'
})
export class WorkflowClassifyComponent implements OnInit, OnDestroy {
  // Sync and classify history
  syncHistory: SyncClassifyHistoryEntry[] = [];
  historyIdCounter = 1;

  // Current sync result
  currentSyncResult = signal<SyncAndClassifyAllResult | null>(null);

  // Classified workflows table configuration
  classifiedTableConfig: TableConfig<ClassifiedWorkflow> = {
    title: 'Classified Workflows',
    columns: [
      {
        key: 'externalWorkflowId',
        header: 'Workflow ID',
        sortable: true,
        filterable: true
      },
      {
        key: 'workflowCode',
        header: 'Workflow Code',
        sortable: true,
        filterable: true
      },
      {
        key: 'workflowName',
        header: 'Workflow Name',
        sortable: true,
        filterable: true
      },
      {
        key: 'zoneName',
        header: 'Zone Name',
        sortable: true,
        filterable: true
      },
      {
        key: 'zoneCode',
        header: 'Zone Code',
        sortable: true,
        filterable: true
      }
    ],
    pagination: {
      pageSize: 25,
      pageSizeOptions: [10, 25, 50, 100]
    },
    filter: {
      placeholder: 'Search classified workflows...',
      enabled: true
    },
    defaultSort: {
      column: 'externalWorkflowId',
      direction: 'asc'
    },
    empty: {
      message: 'No classified workflows available. Run sync & classify to populate data.',
      icon: 'category'
    }
  };

  // History table configuration
  historyTableConfig: TableConfig<SyncClassifyHistoryEntry> = {
    title: 'Sync & Classify History',
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
        header: 'Total',
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
        key: 'classifiedCount',
        header: 'Classified',
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
        key: 'noZoneMatchCount',
        header: 'No Zone Match',
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
      placeholder: 'Search history...',
      enabled: true
    },
    defaultSort: {
      column: 'id',
      direction: 'desc'
    },
    empty: {
      message: 'No sync history available.',
      icon: 'history'
    }
  };

  private destroy$ = new Subject<void>();

  constructor(public workflowNodeCodesService: WorkflowNodeCodesService) {
    // React to sync result changes
    effect(() => {
      const result = this.workflowNodeCodesService.lastSyncClassifyResult();
      if (result) {
        this.currentSyncResult.set(result);
      }
    });
  }

  ngOnInit(): void {
    // Load any persisted history from localStorage
    this.loadHistoryFromStorage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Trigger sync and classify operation
   */
  syncAndClassifyNow(): void {
    const startTime = Date.now();

    this.workflowNodeCodesService.syncAndClassifyAllWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const duration = Date.now() - startTime;
          this.addToHistory({ ...result, timestamp: new Date() }, duration);
        },
        error: (err) => {
          console.error('Sync & classify failed:', err);
        }
      });
  }

  /**
   * Get classified workflows from current result
   */
  getClassifiedWorkflows(): ClassifiedWorkflow[] {
    return this.currentSyncResult()?.classifiedWorkflows || [];
  }

  /**
   * Add sync result to history
   */
  private addToHistory(result: SyncAndClassifyAllResult, duration?: number): void {
    const status: 'success' | 'partial' | 'failed' =
      (result.failureCount === 0 && result.noZoneMatchCount === 0) ? 'success' :
      result.successCount > 0 ? 'partial' : 'failed';

    const historyEntry: SyncClassifyHistoryEntry = {
      id: this.historyIdCounter++,
      timestamp: result.timestamp || new Date(),
      totalWorkflows: result.totalWorkflows,
      successCount: result.successCount,
      failureCount: result.failureCount,
      noZoneMatchCount: result.noZoneMatchCount,
      classifiedCount: result.classifiedWorkflows.length,
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
    this.workflowNodeCodesService.clearSyncClassifyResult();
    localStorage.removeItem('workflow_classify_history');
  }

  /**
   * Load history from localStorage
   */
  private loadHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('workflow_classify_history');
      if (stored) {
        const data = JSON.parse(stored);
        this.syncHistory = data.history || [];
        this.historyIdCounter = data.counter || 1;
      }
    } catch (error) {
      console.error('Failed to load sync & classify history from storage:', error);
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistoryToStorage(): void {
    try {
      localStorage.setItem('workflow_classify_history', JSON.stringify({
        history: this.syncHistory,
        counter: this.historyIdCounter
      }));
    } catch (error) {
      console.error('Failed to save sync & classify history to storage:', error);
    }
  }

  /**
   * Handle table actions
   */
  handleAction(event: ActionEvent): void {
    console.log('Action:', event);
  }
}
