import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { MissionTypesService } from '../../services/mission-types.service';
import {
  MissionTypeDisplayData,
  getStatusClass,
  getActualValueClass
} from '../../models/mission-types.models';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { MISSION_TYPES_TABLE_CONFIG } from './mission-types-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';
import { MissionTypeDialogComponent, MissionTypeDialogData } from './mission-type-dialog.component';

@Component({
  selector: 'app-mission-types',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatDialogModule,
    GenericTableComponent
  ],
  templateUrl: './mission-types.component.html',
  styleUrl: './mission-types.component.css'
})
export class MissionTypesComponent implements OnInit, OnDestroy {
  // Table configuration
  public tableConfig = MISSION_TYPES_TABLE_CONFIG;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(
    public missionTypesService: MissionTypesService,
    private dialog: MatDialog
  ) {
    // Configure empty state action
    if (this.tableConfig.empty) {
      this.tableConfig.empty.action = () => this.openCreateDialog();
    }
  }

  ngOnInit(): void {
    this.loadMissionTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

/**
   * Load mission types from the service
   */
  private loadMissionTypes(): void {
    this.missionTypesService.getMissionTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading mission types:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewMissionType(event.row);
        break;
      case 'edit':
        this.editMissionType(event.row);
        break;
      case 'toggle-status':
        this.toggleMissionTypeStatus(event.row);
        break;
      case 'delete':
        this.deleteMissionType(event.row);
        break;
      case 'refresh':
        this.refreshMissionTypes();
        break;
      case 'create-mission-type':
        this.openCreateDialog();
        break;
      case 'export':
        this.exportMissionTypes();
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
   * View mission type details
   */
  private viewMissionType(missionType: MissionTypeDisplayData): void {
    const dialogData: MissionTypeDialogData = {
      mode: 'view',
      missionType: missionType
    };

    this.dialog.open(MissionTypeDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      data: dialogData
    });
  }

  /**
   * Edit mission type
   */
  private editMissionType(missionType: MissionTypeDisplayData): void {
    this.openEditDialog(missionType);
  }

  /**
   * Toggle mission type status
   */
  private toggleMissionTypeStatus(missionType: MissionTypeDisplayData): void {
    this.missionTypesService.toggleMissionTypeStatus(missionType.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error toggling mission type status:', error);
        }
      });
  }

  /**
   * Delete mission type with confirmation and usage check
   */
  private deleteMissionType(missionType: MissionTypeDisplayData): void {
    // First check if this mission type is in use
    this.missionTypesService.checkUsageInTemplates(missionType.actualValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usage) => {
          if (usage.isUsed) {
            // Show warning about templates using this mission type
            const templateList = usage.templateNames.join('\n  - ');
            const message = `Cannot delete mission type "${missionType.displayName}" because it is used by ${usage.usageCount} workflow template(s):\n\n  - ${templateList}\n\nPlease update or delete these templates first, or deactivate this mission type instead.`;
            alert(message);
          } else {
            // Not in use, proceed with deletion after confirmation
            if (confirm(`Are you sure you want to delete mission type "${missionType.displayName}"?`)) {
              this.missionTypesService.deleteMissionType(missionType.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  error: (error) => {
                    console.error('Error deleting mission type:', error);
                  }
                });
            }
          }
        },
        error: (error) => {
          console.error('Error checking mission type usage:', error);
          // On error, still allow deletion with a warning
          if (confirm(`Unable to verify usage. Delete mission type "${missionType.displayName}" anyway?`)) {
            this.missionTypesService.deleteMissionType(missionType.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                error: (error) => {
                  console.error('Error deleting mission type:', error);
                }
              });
          }
        }
      });
  }

  /**
   * Refresh mission types
   */
  private refreshMissionTypes(): void {
    this.loadMissionTypes();
  }

  /**
   * Open create dialog
   */
  private openCreateDialog(): void {
    const dialogData: MissionTypeDialogData = {
      mode: 'create'
    };

    const dialogRef = this.dialog.open(MissionTypeDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createMissionType(result);
      }
    });
  }

  /**
   * Open edit dialog
   */
  private openEditDialog(missionType: MissionTypeDisplayData): void {
    const dialogData: MissionTypeDialogData = {
      mode: 'edit',
      missionType: missionType
    };

    const dialogRef = this.dialog.open(MissionTypeDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateMissionType(missionType.id, result);
      }
    });
  }

  /**
   * Export mission types data
   */
  private exportMissionTypes(): void {
    this.missionTypesService.exportMissionTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'mission-types-export.csv');
        },
        error: (error) => {
          console.error('Error exporting mission types:', error);
        }
      });
  }

  /**
   * Create new mission type
   */
  private createMissionType(request: any): void {
    this.missionTypesService.createMissionType(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Mission type created successfully
        },
        error: (error) => {
          console.error('Error creating mission type:', error);
        }
      });
  }

  /**
   * Update existing mission type
   */
  private updateMissionType(id: number, request: any): void {
    this.missionTypesService.updateMissionType(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Mission type updated successfully
        },
        error: (error) => {
          console.error('Error updating mission type:', error);
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
  getCellValue(row: MissionTypeDisplayData, column: any): string {
    const key = column.key as keyof MissionTypeDisplayData;
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
  getStatusClass(isActive: boolean): string {
    return getStatusClass(isActive);
  }

  /**
   * Get CSS class for actual value display
   */
  getActualValueClass(value: string): string {
    return getActualValueClass(value);
  }

  /**
   * Get mission types count
   */
  getMissionTypesCount(): { active: number; inactive: number; total: number } {
    return this.missionTypesService.getMissionTypesCount();
  }
}