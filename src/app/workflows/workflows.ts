import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import { WorkflowService } from '../services/workflow.service';
import { WorkflowDisplayData, WorkflowSyncResultDto } from '../models/workflow.models';
import { Subject, takeUntil, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { GenericTableComponent } from '../shared/components/generic-table/generic-table';
import { WORKFLOW_TABLE_CONFIG } from './workflow-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../shared/models/table.models';

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    GenericTableComponent
  ],
  templateUrl: './workflows.html',
  styleUrl: './workflows.scss'
})
export class WorkflowsComponent implements OnInit, OnDestroy {
  // Table data
  public workflows: WorkflowDisplayData[] = [];

  // Table configuration
  public tableConfig = WORKFLOW_TABLE_CONFIG;

  // UI state
  public isLoading = false;
  public isSyncing = false;
  public lastSyncResult: WorkflowSyncResultDto | null = null;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Observable streams from signals (created in injection context)
  private loading$!: Observable<boolean>;
  private syncing$!: Observable<boolean>;
  private syncResult$!: Observable<WorkflowSyncResultDto | null>;

  constructor(public workflowService: WorkflowService) {
    // Create observables from signals within constructor (injection context)
    this.loading$ = toObservable(this.workflowService.isLoading);
    this.syncing$ = toObservable(this.workflowService.isSyncing);
    this.syncResult$ = toObservable(this.workflowService.lastSyncResult);

    // Configure empty state action
    this.tableConfig.empty!.action = () => this.syncWorkflows();
  }

  ngOnInit(): void {
    this.loadWorkflows();
    this.subscribeToServiceStates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load workflows from the API
   */
  public loadWorkflows(): void {
    this.isLoading = true;

    this.workflowService.getWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflows) => {
          this.workflows = workflows;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading workflows:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Sync workflows from external API
   */
  public syncWorkflows(): void {
    if (this.isSyncing) return;

    this.workflowService.syncWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.lastSyncResult = result;
          // Reload workflows after successful sync
          this.loadWorkflows();
        },
        error: (error) => {
          console.error('Error syncing workflows:', error);
        }
      });
  }

  /**
   * Handle table action events
   */
  public onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'sync':
        this.syncWorkflows();
        break;
      case 'view':
        this.viewWorkflow(event.row);
        break;
      case 'trigger':
        this.triggerWorkflow(event.row);
        break;
      default:
        console.log('Unknown action:', event.action, event.row);
    }
  }

  /**
   * View workflow details
   */
  private viewWorkflow(workflow: WorkflowDisplayData): void {
    // TODO: Implement when API endpoint is available
    console.log('View workflow details:', workflow);
  }

  /**
   * Trigger workflow mission
   */
  private triggerWorkflow(workflow: WorkflowDisplayData): void {
    // TODO: Implement workflow trigger functionality
    console.log('Trigger workflow:', workflow);
  }

  /**
   * Get cell value for display
   */
  public getCellValue(row: WorkflowDisplayData, column: any): string {
    const key = column.key as keyof WorkflowDisplayData;
    const value = row[key];
    return value != null ? String(value) : 'N/A';
  }

  /**
   * Get status badge CSS class based on status
   */
  public getStatusClass(status: number): string {
    switch (status) {
      case 1: return 'status-active';
      case 0: return 'status-inactive';
      case 2: return 'status-pending';
      case 3: return 'status-completed';
      case 4: return 'status-failed';
      case 5: return 'status-suspended';
      default: return 'status-unknown';
    }
  }

  /**
   * Subscribe to service state changes
   */
  private subscribeToServiceStates(): void {
    // Subscribe to loading states
    this.loading$.pipe(takeUntil(this.destroy$)).subscribe(
      (isLoading: boolean) => {
        this.isLoading = isLoading;
      }
    );

    this.syncing$.pipe(takeUntil(this.destroy$)).subscribe(
      (isSyncing: boolean) => {
        this.isSyncing = isSyncing;
        // Update sync button loading state
        this.updateSyncButtonLoadingState();
      }
    );

    // Subscribe to sync results
    this.syncResult$.pipe(takeUntil(this.destroy$)).subscribe(
      (result: WorkflowSyncResultDto | null) => {
        this.lastSyncResult = result;
      }
    );
  }

  /**
   * Update sync button loading state in table configuration
   */
  private updateSyncButtonLoadingState(): void {
    const syncAction = this.tableConfig.headerActions?.find(action => action.action === 'sync');
    if (syncAction) {
      syncAction.loading = this.isSyncing;
    }
  }

  /**
   * Clear sync result
   */
  public clearSyncResult(): void {
    this.lastSyncResult = null;
    this.workflowService.clearSyncResult();
  }
}