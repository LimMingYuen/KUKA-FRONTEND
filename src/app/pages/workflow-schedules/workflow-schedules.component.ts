import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import { WorkflowScheduleService } from '../../services/workflow-schedule.service';
import {
  WorkflowSchedule,
  WorkflowScheduleDisplayData,
  INTERVAL_OPTIONS,
  transformScheduleToDisplayData
} from '../../models/workflow-schedule.models';
import { ScheduleDialogComponent } from './schedule-dialog.component';
import { WORKFLOW_SCHEDULES_TABLE_CONFIG } from './workflow-schedules-table.config';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-workflow-schedules',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatTooltipModule,
    GenericTableComponent
  ],
  templateUrl: './workflow-schedules.component.html',
  styleUrl: './workflow-schedules.component.scss'
})
export class WorkflowSchedulesComponent implements OnInit, OnDestroy, AfterViewInit {
  // Template reference for the toggle column
  @ViewChild('toggleTemplate', { static: true }) toggleTemplate!: TemplateRef<any>;
  @ViewChild('lastRunTemplate', { static: true }) lastRunTemplate!: TemplateRef<any>;
  @ViewChild('scheduleNameTemplate', { static: true }) scheduleNameTemplate!: TemplateRef<any>;
  @ViewChild('typeTemplate', { static: true }) typeTemplate!: TemplateRef<any>;

  // Table data
  tableData: WorkflowScheduleDisplayData[] = [];
  tableConfig: TableConfig<WorkflowScheduleDisplayData>;

  // Loading states
  isLoading = false;
  togglingIds = new Set<number>();
  triggeringIds = new Set<number>();

  private destroy$ = new Subject<void>();

  constructor(
    private scheduleService: WorkflowScheduleService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    // Deep clone the config to avoid modifying the original
    this.tableConfig = {
      ...WORKFLOW_SCHEDULES_TABLE_CONFIG,
      columns: WORKFLOW_SCHEDULES_TABLE_CONFIG.columns.map(col => ({ ...col }))
    };
  }

  ngOnInit(): void {
    // Assign custom templates to columns before loading data
    this.assignCustomTemplates();
    this.loadSchedules();
  }

  ngAfterViewInit(): void {
    // Re-assign templates after view init to ensure they're available
    setTimeout(() => {
      this.assignCustomTemplates();
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Assign custom templates to specific columns
   */
  private assignCustomTemplates(): void {
    // Find and update the isEnabled column with the toggle template
    const enabledColumn = this.tableConfig.columns.find(col => col.key === 'isEnabled');
    if (enabledColumn && this.toggleTemplate) {
      enabledColumn.template = this.toggleTemplate;
    }

    // Find and update the lastRunDisplay column with custom template
    const lastRunColumn = this.tableConfig.columns.find(col => col.key === 'lastRunDisplay');
    if (lastRunColumn && this.lastRunTemplate) {
      lastRunColumn.template = this.lastRunTemplate;
    }

    // Find and update the scheduleName column with custom template
    const nameColumn = this.tableConfig.columns.find(col => col.key === 'scheduleName');
    if (nameColumn && this.scheduleNameTemplate) {
      nameColumn.template = this.scheduleNameTemplate;
    }

    // Find and update the type column with custom template
    const typeColumn = this.tableConfig.columns.find(col => col.key === 'scheduleTypeDisplay');
    if (typeColumn && this.typeTemplate) {
      typeColumn.template = this.typeTemplate;
    }

    // Update config to trigger change detection
    this.tableConfig = { ...this.tableConfig };
  }

  /**
   * Load schedules from the backend
   */
  loadSchedules(): void {
    this.isLoading = true;
    this.scheduleService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (schedules) => {
          this.tableData = schedules.map(s => transformScheduleToDisplayData(s, INTERVAL_OPTIONS));
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading schedules:', err);
          this.snackBar.open(err.message || 'Failed to load schedules', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle table actions
   */
  handleAction(event: ActionEvent): void {
    switch (event.action) {
      case 'add':
        this.openCreateDialog();
        break;
      case 'edit':
        this.openEditDialog(event.row as WorkflowScheduleDisplayData);
        break;
      case 'delete':
        this.deleteSchedule(event.row as WorkflowScheduleDisplayData);
        break;
    }
  }

  /**
   * Handle empty state action (create first schedule)
   */
  handleEmptyAction(): void {
    this.openCreateDialog();
  }

  /**
   * Toggle schedule enabled state
   */
  toggleEnabled(schedule: WorkflowScheduleDisplayData, enabled: boolean): void {
    this.togglingIds.add(schedule.id);

    this.scheduleService.toggle(schedule.id, enabled)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          // Update the schedule in the table data
          const index = this.tableData.findIndex(s => s.id === schedule.id);
          if (index !== -1) {
            this.tableData[index] = transformScheduleToDisplayData(updated, INTERVAL_OPTIONS);
            this.tableData = [...this.tableData]; // Trigger change detection
          }
          this.snackBar.open(
            `Schedule "${schedule.scheduleName}" ${enabled ? 'enabled' : 'disabled'}`,
            'Close',
            { duration: 3000 }
          );
          this.togglingIds.delete(schedule.id);
        },
        error: (err) => {
          console.error('Error toggling schedule:', err);
          this.snackBar.open(err.message || 'Failed to toggle schedule', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.togglingIds.delete(schedule.id);
        }
      });
  }

  /**
   * Trigger schedule manually
   */
  triggerNow(schedule: WorkflowScheduleDisplayData): void {
    this.triggeringIds.add(schedule.id);

    this.scheduleService.triggerNow(schedule.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.snackBar.open(
              `Triggered "${schedule.scheduleName}" - Mission: ${result.missionCode}`,
              'Close',
              { duration: 5000, panelClass: ['success-snackbar'] }
            );
            this.loadSchedules(); // Refresh to update last run
          } else {
            this.snackBar.open(
              result.errorMessage || 'Failed to trigger schedule',
              'Close',
              { duration: 5000, panelClass: ['error-snackbar'] }
            );
          }
          this.triggeringIds.delete(schedule.id);
        },
        error: (err) => {
          console.error('Error triggering schedule:', err);
          this.snackBar.open(err.message || 'Failed to trigger schedule', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.triggeringIds.delete(schedule.id);
        }
      });
  }

  /**
   * Open create schedule dialog
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadSchedules();
      }
    });
  }

  /**
   * Open edit schedule dialog
   */
  openEditDialog(schedule: WorkflowScheduleDisplayData): void {
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '600px',
      data: { mode: 'edit', schedule }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadSchedules();
      }
    });
  }

  /**
   * Delete schedule with confirmation
   */
  deleteSchedule(schedule: WorkflowScheduleDisplayData): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Schedule',
      message: `Are you sure you want to delete schedule "${schedule.scheduleName}"?`,
      icon: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      confirmColor: 'warn'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result === true) {
        this.scheduleService.delete(schedule.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open(`Schedule "${schedule.scheduleName}" deleted`, 'Close', {
                duration: 3000
              });
              this.loadSchedules();
            },
            error: (err) => {
              console.error('Error deleting schedule:', err);
              this.snackBar.open(err.message || 'Failed to delete schedule', 'Close', {
                duration: 5000,
                panelClass: ['error-snackbar']
              });
            }
          });
      }
    });
  }

  /**
   * Check if a schedule is being toggled
   */
  isToggling(id: number): boolean {
    return this.togglingIds.has(id);
  }

  /**
   * Check if a schedule is being triggered
   */
  isTriggering(id: number): boolean {
    return this.triggeringIds.has(id);
  }
}
