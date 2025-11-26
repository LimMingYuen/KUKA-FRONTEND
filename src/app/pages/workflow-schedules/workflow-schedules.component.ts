import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

import { WorkflowScheduleService } from '../../services/workflow-schedule.service';
import { WorkflowSchedule, INTERVAL_OPTIONS } from '../../models/workflow-schedule.models';
import { ScheduleDialogComponent } from './schedule-dialog.component';

@Component({
  selector: 'app-workflow-schedules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatMenuModule
  ],
  template: `
    <div class="schedules-container">
      <div class="page-header">
        <div class="header-left">
          <h1>Workflow Schedules</h1>
          <p class="subtitle">Manage automatic workflow triggers</p>
        </div>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          Create Schedule
        </button>
      </div>

      <mat-card class="schedules-card">
        <mat-card-content>
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading schedules...</p>
          </div>

          <div *ngIf="!isLoading && schedules.length === 0" class="empty-state">
            <mat-icon>schedule</mat-icon>
            <h3>No Schedules</h3>
            <p>Create a schedule to automatically trigger workflow templates</p>
            <button mat-stroked-button color="primary" (click)="openCreateDialog()">
              <mat-icon>add</mat-icon>
              Create First Schedule
            </button>
          </div>

          <table *ngIf="!isLoading && schedules.length > 0"
                 mat-table [dataSource]="sortedSchedules" matSort (matSortChange)="onSortChange($event)"
                 class="schedules-table">

            <!-- Schedule Name Column -->
            <ng-container matColumnDef="scheduleName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Schedule Name</th>
              <td mat-cell *matCellDef="let schedule">
                <div class="schedule-name">
                  <span class="name">{{ schedule.scheduleName }}</span>
                  <span class="description" *ngIf="schedule.description">{{ schedule.description }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Workflow Template Column -->
            <ng-container matColumnDef="savedMissionName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Workflow Template</th>
              <td mat-cell *matCellDef="let schedule">{{ schedule.savedMissionName }}</td>
            </ng-container>

            <!-- Type Column -->
            <ng-container matColumnDef="scheduleType">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
              <td mat-cell *matCellDef="let schedule">
                <mat-chip [class]="'type-chip type-' + schedule.scheduleType.toLowerCase()">
                  {{ getTypeLabel(schedule) }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Next Run Column -->
            <ng-container matColumnDef="nextRunUtc">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Next Run</th>
              <td mat-cell *matCellDef="let schedule">
                <span *ngIf="schedule.nextRunUtc">{{ formatUtcToLocal(schedule.nextRunUtc) }}</span>
                <span *ngIf="!schedule.nextRunUtc" class="text-muted">-</span>
              </td>
            </ng-container>

            <!-- Last Run Column -->
            <ng-container matColumnDef="lastRunUtc">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Run</th>
              <td mat-cell *matCellDef="let schedule">
                <div class="last-run" *ngIf="schedule.lastRunUtc">
                  <span>{{ formatUtcToLocal(schedule.lastRunUtc) }}</span>
                  <mat-icon *ngIf="schedule.lastRunStatus === 'Success'" class="status-success">check_circle</mat-icon>
                  <mat-icon *ngIf="schedule.lastRunStatus === 'Failed'" class="status-failed"
                            [matTooltip]="schedule.lastErrorMessage || 'Failed'">error</mat-icon>
                </div>
                <span *ngIf="!schedule.lastRunUtc" class="text-muted">Never</span>
              </td>
            </ng-container>

            <!-- Executions Column -->
            <ng-container matColumnDef="executionCount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Executions</th>
              <td mat-cell *matCellDef="let schedule">
                {{ schedule.executionCount }}
                <span *ngIf="schedule.maxExecutions" class="text-muted"> / {{ schedule.maxExecutions }}</span>
              </td>
            </ng-container>

            <!-- Enabled Column -->
            <ng-container matColumnDef="isEnabled">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let schedule">
                <mat-slide-toggle
                  [checked]="schedule.isEnabled"
                  (change)="toggleEnabled(schedule, $event.checked)"
                  [disabled]="togglingIds.has(schedule.id)"
                  color="primary">
                </mat-slide-toggle>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let schedule">
                <button mat-icon-button
                        [matMenuTriggerFor]="actionMenu"
                        [disabled]="triggeringIds.has(schedule.id)">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #actionMenu="matMenu">
                  <button mat-menu-item (click)="triggerNow(schedule)" [disabled]="triggeringIds.has(schedule.id)">
                    <mat-icon>play_arrow</mat-icon>
                    <span>Trigger Now</span>
                  </button>
                  <button mat-menu-item (click)="openEditDialog(schedule)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="deleteSchedule(schedule)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <mat-paginator *ngIf="!isLoading && schedules.length > 10"
                         [length]="schedules.length"
                         [pageSize]="pageSize"
                         [pageSizeOptions]="[10, 25, 50]"
                         (page)="onPageChange($event)">
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .schedules-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-left h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .header-left .subtitle {
      margin: 4px 0 0;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }

    .schedules-card {
      margin-bottom: 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: rgba(0, 0, 0, 0.6);
    }

    .loading-container p {
      margin-top: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: rgba(0, 0, 0, 0.3);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px;
      font-weight: 500;
    }

    .empty-state p {
      margin: 0 0 24px;
      color: rgba(0, 0, 0, 0.6);
    }

    .schedules-table {
      width: 100%;
    }

    .schedule-name {
      display: flex;
      flex-direction: column;
    }

    .schedule-name .name {
      font-weight: 500;
    }

    .schedule-name .description {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 2px;
    }

    .type-chip {
      font-size: 11px;
    }

    .type-chip.type-onetime {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .type-chip.type-interval {
      background-color: #fff3e0;
      color: #ef6c00;
    }

    .type-chip.type-cron {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .last-run {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-success {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #2e7d32;
    }

    .status-failed {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #c62828;
      cursor: help;
    }

    .text-muted {
      color: rgba(0, 0, 0, 0.4);
    }

    .delete-action {
      color: #c62828;
    }

    .delete-action mat-icon {
      color: #c62828;
    }

    mat-paginator {
      border-top: 1px solid rgba(0, 0, 0, 0.12);
    }
  `]
})
export class WorkflowSchedulesComponent implements OnInit, OnDestroy {
  schedules: WorkflowSchedule[] = [];
  sortedSchedules: WorkflowSchedule[] = [];
  displayedColumns = ['scheduleName', 'savedMissionName', 'scheduleType', 'nextRunUtc', 'lastRunUtc', 'executionCount', 'isEnabled', 'actions'];

  isLoading = false;
  togglingIds = new Set<number>();
  triggeringIds = new Set<number>();

  pageSize = 10;
  pageIndex = 0;

  private destroy$ = new Subject<void>();
  private currentSort: Sort = { active: 'scheduleName', direction: 'asc' };

  constructor(
    private scheduleService: WorkflowScheduleService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSchedules();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSchedules(): void {
    this.isLoading = true;
    this.scheduleService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (schedules) => {
          this.schedules = schedules;
          this.applySorting();
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

  onSortChange(sort: Sort): void {
    this.currentSort = sort;
    this.applySorting();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.applySorting();
  }

  private applySorting(): void {
    let sorted = [...this.schedules];

    if (this.currentSort.active && this.currentSort.direction) {
      sorted.sort((a, b) => {
        const aValue = (a as any)[this.currentSort.active];
        const bValue = (b as any)[this.currentSort.active];
        const direction = this.currentSort.direction === 'asc' ? 1 : -1;

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (typeof aValue === 'string') {
          return aValue.localeCompare(bValue) * direction;
        }
        return (aValue - bValue) * direction;
      });
    }

    // Apply pagination
    const start = this.pageIndex * this.pageSize;
    this.sortedSchedules = sorted.slice(start, start + this.pageSize);
  }

  getTypeLabel(schedule: WorkflowSchedule): string {
    switch (schedule.scheduleType) {
      case 'OneTime':
        return 'One-time';
      case 'Interval':
        const option = INTERVAL_OPTIONS.find(o => o.value === schedule.intervalMinutes);
        return option ? option.label : `${schedule.intervalMinutes} min`;
      case 'Cron':
        return schedule.cronExpression || 'Cron';
      default:
        return schedule.scheduleType;
    }
  }

  /**
   * Convert UTC datetime string to local time display string
   */
  formatUtcToLocal(utcString: string): string {
    if (!utcString) return '';

    // Ensure the string is treated as UTC by appending 'Z' if not present
    const utcDate = utcString.endsWith('Z') ? utcString : utcString + 'Z';
    const date = new Date(utcDate);

    // Format as local date/time
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  toggleEnabled(schedule: WorkflowSchedule, enabled: boolean): void {
    this.togglingIds.add(schedule.id);

    this.scheduleService.toggle(schedule.id, enabled)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.schedules.findIndex(s => s.id === schedule.id);
          if (index !== -1) {
            this.schedules[index] = updated;
            this.applySorting();
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

  triggerNow(schedule: WorkflowSchedule): void {
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

  openEditDialog(schedule: WorkflowSchedule): void {
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

  deleteSchedule(schedule: WorkflowSchedule): void {
    if (!confirm(`Are you sure you want to delete schedule "${schedule.scheduleName}"?`)) {
      return;
    }

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
}
