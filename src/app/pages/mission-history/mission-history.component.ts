import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MissionHistoryService } from '../../services/mission-history.service';
import { MissionHistoryDisplayData, getStatusClass, getWorkflowClass } from '../../models/mission-history.models';
import { Subject, takeUntil, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { MISSION_HISTORY_TABLE_CONFIG } from './mission-history-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';

@Component({
  selector: 'app-mission-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressBarModule,
    GenericTableComponent
  ],
  templateUrl: './mission-history.component.html',
  styleUrl: './mission-history.component.css'
})
export class MissionHistoryComponent implements OnInit, OnDestroy {
  // Table data
  public missionHistory: MissionHistoryDisplayData[] = [];

  // Table configuration
  public tableConfig = MISSION_HISTORY_TABLE_CONFIG;

  // UI state
  public isLoading = false;
  public isClearing = false;
  public missionCount = 0;
  public maxRecords = 5000;

  // Storage usage
  public storageUsagePercentage = 0;
  public isNearLimit = false;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Observable streams from signals (created in injection context)
  private loading$!: Observable<boolean>;
  private clearing$!: Observable<boolean>;
  private missionCount$!: Observable<number>;

  constructor(
    public missionHistoryService: MissionHistoryService,
    private dialog: MatDialog
  ) {
    // Create observables from signals within constructor (injection context)
    this.loading$ = toObservable(this.missionHistoryService.isLoading);
    this.clearing$ = toObservable(this.missionHistoryService.isClearing);
    this.missionCount$ = toObservable(this.missionHistoryService.missionCount);

    // Configure empty state action
    this.tableConfig.empty!.action = () => this.refreshMissionHistory();
  }

  ngOnInit(): void {
    this.loadMissionHistory();
    this.subscribeToServiceState();
    this.loadMissionCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribe to service state changes
   */
  private subscribeToServiceState(): void {
    // Subscribe to loading state
    this.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.isLoading = loading;
    });

    // Subscribe to clearing state
    this.clearing$.pipe(takeUntil(this.destroy$)).subscribe(clearing => {
      this.isClearing = clearing;
      // Update header action loading state
      const clearAction = this.tableConfig.headerActions?.find(action => action.action === 'clear-history');
      if (clearAction) {
        clearAction.loading = clearing;
      }
    });

    // Subscribe to mission count changes
    this.missionCount$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      this.missionCount = count;
      this.updateStorageUsage();
    });
  }

  /**
   * Load mission history from the service
   */
  private loadMissionHistory(): void {
    this.missionHistoryService.getMissionHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (missionHistory) => {
          this.missionHistory = missionHistory;
        },
        error: (error) => {
          console.error('Error loading mission history:', error);
        }
      });
  }

  /**
   * Load mission count
   */
  private loadMissionCount(): void {
    this.missionHistoryService.getMissionHistoryCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading mission count:', error);
        }
      });
  }

  /**
   * Update storage usage information
   */
  private updateStorageUsage(): void {
    this.storageUsagePercentage = this.missionHistoryService.getStorageUsagePercentage();
    this.isNearLimit = this.missionHistoryService.checkStorageLimit();
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewMissionHistory(event.row);
        break;
      case 'export':
        this.exportMissionHistory(event.row);
        break;
      case 'delete':
        this.deleteMissionHistory(event.row);
        break;
      case 'refresh':
        this.refreshMissionHistory();
        break;
      case 'export-all':
        this.exportAllMissionHistory();
        break;
      case 'clear-history':
        this.clearMissionHistory();
        break;
      default:
        // Unknown action - ignore silently
    }
  }

  /**
   * Handle table sort events
   */
  onSortChange(event: SortEvent): void {
    // Sorting is handled by the generic table component
  }

  /**
   * Handle table page events
   */
  onPageChange(event: PageEvent): void {
    // Pagination is handled by the generic table component
  }

  /**
   * Handle table filter events
   */
  onFilterChange(event: FilterEvent): void {
    // Filtering is handled by the generic table component
  }

  /**
   * View mission history details
   */
  private viewMissionHistory(mission: MissionHistoryDisplayData): void {
    // TODO: Implement view dialog or navigation
    // Could open a dialog with detailed mission information
    console.log('View mission:', mission);
  }

  /**
   * Export single mission history record
   */
  private exportMissionHistory(mission: MissionHistoryDisplayData): void {
    // TODO: Implement export functionality for single record
    // Could export single mission data to CSV/JSON
    console.log('Export mission:', mission);
  }

  /**
   * Delete mission history record
   */
  private deleteMissionHistory(mission: MissionHistoryDisplayData): void {
    // TODO: Implement delete functionality (may not be available via API)
    if (confirm(`Are you sure you want to delete mission "${mission.missionCode}"?`)) {
      // This would require a DELETE endpoint for individual records
      console.log('Delete mission:', mission);
    }
  }

  /**
   * Refresh mission history
   */
  private refreshMissionHistory(): void {
    this.loadMissionHistory();
    this.loadMissionCount();
  }

  /**
   * Export all mission history data
   */
  private exportAllMissionHistory(): void {
    this.missionHistoryService.exportMissionHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'mission-history-export.csv');
        },
        error: (error) => {
          console.error('Error exporting mission history:', error);
        }
      });
  }

  /**
   * Clear all mission history with confirmation
   */
  private clearMissionHistory(): void {
    const message = `Are you sure you want to clear all mission history? This will delete ${this.missionCount} records and cannot be undone.`;

    if (confirm(message)) {
      this.missionHistoryService.clearMissionHistory()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Reload data after successful clear
            this.refreshMissionHistory();
          },
          error: (error) => {
            console.error('Error clearing mission history:', error);
          }
        });
    }
  }

  /**
   * Download file from blob
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get cell value for table display
   */
  getCellValue(row: MissionHistoryDisplayData, column: any): string {
    const key = column.key as keyof MissionHistoryDisplayData;
    const value = row[key];

    if (value == null) return '';

    // Apply transform if configured
    if (column.transform) {
      return column.transform(value, row);
    }

    return String(value);
  }

  /**
   * Get CSS class for status badge
   */
  getStatusClass(status: string): string {
    return getStatusClass(status);
  }

  /**
   * Get CSS class for workflow badge
   */
  getWorkflowClass(workflowName: string): string {
    return getWorkflowClass(workflowName);
  }

  /**
   * Get mission type from code
   */
  getMissionType(missionCode: string): string {
    if (!missionCode) return 'Unknown';

    // Extract mission type from code (assuming format like "TYPE-123" or similar)
    const parts = missionCode.split('-');
    if (parts.length > 1) {
      return parts[0].toUpperCase();
    }

    return 'General';
  }
}