import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';

import { SavedCustomMissionsService } from '../../services/saved-custom-missions.service';
import { SavedCustomMissionsDisplayData, SavedCustomMissionsUtils } from '../../models/saved-custom-missions.models';
import { Subject, takeUntil, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { SAVED_CUSTOM_MISSIONS_TABLE_CONFIG } from './saved-custom-missions-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';
import { CustomMissionFormDialogComponent } from '../../shared/dialogs/custom-mission-form/custom-mission-form-dialog.component';

@Component({
  selector: 'app-saved-custom-missions',
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
    MatChipsModule,
    MatBadgeModule,
    GenericTableComponent
  ],
  templateUrl: './saved-custom-missions.component.html',
  styleUrl: './saved-custom-missions.component.css'
})
export class SavedCustomMissionsComponent implements OnInit, OnDestroy {
  // Table data
  public savedCustomMissions: SavedCustomMissionsDisplayData[] = [];

  // Table configuration
  public tableConfig = SAVED_CUSTOM_MISSIONS_TABLE_CONFIG;

  // UI state
  public isLoading = false;
  public isCreating = false;
  public isUpdating = false;
  public isDeleting = false;
  public isTriggering = false;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Observable streams from signals (created in injection context)
  private loading$!: Observable<boolean>;
  private creating$!: Observable<boolean>;
  private updating$!: Observable<boolean>;
  private deleting$!: Observable<boolean>;
  private triggering$!: Observable<boolean>;

  constructor(
    public savedCustomMissionsService: SavedCustomMissionsService,
    private dialog: MatDialog
  ) {
    // Create observables from signals within constructor (injection context)
    this.loading$ = toObservable(this.savedCustomMissionsService.isLoading);
    this.creating$ = toObservable(this.savedCustomMissionsService.isCreating);
    this.updating$ = toObservable(this.savedCustomMissionsService.isUpdating);
    this.deleting$ = toObservable(this.savedCustomMissionsService.isDeleting);
    this.triggering$ = toObservable(this.savedCustomMissionsService.isTriggering);

    // Configure empty state action
    this.tableConfig.empty!.action = () => this.refreshSavedCustomMissions();
  }

  ngOnInit(): void {
    this.loadSavedCustomMissions();
    this.subscribeToServiceState();
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

    // Subscribe to creating state
    this.creating$.pipe(takeUntil(this.destroy$)).subscribe(creating => {
      this.isCreating = creating;
      // Update header action loading state
      const createAction = this.tableConfig.headerActions?.find(action => action.action === 'create');
      if (createAction) {
        createAction.loading = creating;
      }
    });

    // Subscribe to updating state
    this.updating$.pipe(takeUntil(this.destroy$)).subscribe(updating => {
      this.isUpdating = updating;
    });

    // Subscribe to deleting state
    this.deleting$.pipe(takeUntil(this.destroy$)).subscribe(deleting => {
      this.isDeleting = deleting;
    });

    // Subscribe to triggering state
    this.triggering$.pipe(takeUntil(this.destroy$)).subscribe(triggering => {
      this.isTriggering = triggering;
    });
  }

  /**
   * Load saved custom missions from the service
   */
  private loadSavedCustomMissions(): void {
    this.savedCustomMissionsService.getAllSavedCustomMissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (missions) => {
          this.savedCustomMissions = missions;
        },
        error: (error) => {
          console.error('Error loading saved custom missions:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewMissionDetails(event.row);
        break;
      case 'edit':
        this.editMission(event.row);
        break;
      case 'trigger':
        this.triggerMission(event.row);
        break;
      case 'duplicate':
        this.duplicateMission(event.row);
        break;
      case 'export':
        this.exportMission(event.row);
        break;
      case 'delete':
        this.deleteMission(event.row);
        break;
      case 'refresh':
        this.refreshSavedCustomMissions();
        break;
      case 'create':
        this.createNewMission();
        break;
      case 'export-all':
        this.exportAllMissions();
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
   * View mission details
   */
  private viewMissionDetails(mission: SavedCustomMissionsDisplayData): void {
    // TODO: Implement view dialog or navigation
    console.log('View mission details:', mission);
    // Could open a dialog with detailed mission information
  }

  /**
   * Edit mission
   */
  private editMission(mission: SavedCustomMissionsDisplayData): void {
    const dialogRef = this.dialog.open(CustomMissionFormDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      disableClose: false,
      data: {
        mode: 'edit',
        mission: mission
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh data after successful edit
        this.refreshSavedCustomMissions();
      }
    });
  }

  /**
   * Trigger mission execution
   */
  private triggerMission(mission: SavedCustomMissionsDisplayData): void {
    const message = `Are you sure you want to trigger mission "${mission.missionName}"?`;

    if (confirm(message)) {
      this.savedCustomMissionsService.triggerSavedCustomMission(mission.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Mission triggered:', response);
            // Refresh data to get updated status
            this.refreshSavedCustomMissions();
          },
          error: (error) => {
            console.error('Error triggering mission:', error);
          }
        });
    }
  }

  /**
   * Duplicate mission
   */
  private duplicateMission(mission: SavedCustomMissionsDisplayData): void {
    // TODO: Implement duplicate functionality
    console.log('Duplicate mission:', mission);
    // Could create a copy of the mission with a new name
  }

  /**
   * Export single mission
   */
  private exportMission(mission: SavedCustomMissionsDisplayData): void {
    // TODO: Implement export functionality for single mission
    console.log('Export mission:', mission);
    // Could export single mission data to CSV/JSON
  }

  /**
   * Delete mission with confirmation
   */
  private deleteMission(mission: SavedCustomMissionsDisplayData): void {
    const message = `Are you sure you want to delete mission "${mission.missionName}"? This action cannot be undone.`;

    if (confirm(message)) {
      this.savedCustomMissionsService.deleteSavedCustomMission(mission.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Reload data after successful delete
            this.refreshSavedCustomMissions();
          },
          error: (error) => {
            console.error('Error deleting mission:', error);
          }
        });
    }
  }

  /**
   * Create new mission
   */
  private createNewMission(): void {
    const dialogRef = this.dialog.open(CustomMissionFormDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      disableClose: false,
      data: {
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh data after successful creation
        this.refreshSavedCustomMissions();
      }
    });
  }

  /**
   * Refresh saved custom missions
   */
  private refreshSavedCustomMissions(): void {
    this.loadSavedCustomMissions();
  }

  /**
   * Export all missions data
   */
  private exportAllMissions(): void {
    this.savedCustomMissionsService.exportSavedCustomMissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'saved-custom-missions-export.csv');
        },
        error: (error) => {
          console.error('Error exporting missions:', error);
        }
      });
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
  getCellValue(row: SavedCustomMissionsDisplayData, column: any): string {
    const key = column.key as keyof SavedCustomMissionsDisplayData;
    const value = row[key];

    if (value == null) return '';

    // Apply transform if configured
    if (column.transform) {
      return column.transform(value, row);
    }

    return String(value);
  }

  /**
   * Get CSS class for priority badge
   */
  getPriorityClass(priority: string): string {
    const color = SavedCustomMissionsUtils.getPriorityColor(priority);
    return color ? `priority-${color}` : '';
  }

  /**
   * Get CSS class for status badge
   */
  getStatusClass(status: string): string {
    const color = SavedCustomMissionsUtils.getStatusColor(status);
    return color ? `status-${color}` : '';
  }

  /**
   * Check if mission has active schedules
   */
  hasActiveSchedules(mission: SavedCustomMissionsDisplayData): boolean {
    return mission.activeSchedules > 0;
  }

  /**
   * Check if mission is scheduled
   */
  isScheduled(mission: SavedCustomMissionsDisplayData): boolean {
    return mission.nextRunUtc !== 'Not scheduled';
  }

  /**
   * Get mission type display text
   */
  getMissionTypeDisplay(missionType: string): string {
    if (!missionType) return 'Unknown';
    return missionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get priority display text
   */
  getPriorityDisplay(priority: string): string {
    if (!priority) return 'Medium';
    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  }
}