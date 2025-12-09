import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Subject, takeUntil, interval } from 'rxjs';

import { MissionsService } from '../../services/missions.service';
import { AuthService } from '../../services/auth.service';
import { JobQueryRequest, MissionCancelRequest } from '../../models/missions.models';
import { CancelMissionDialogComponent, CancelMissionDialogData, CancelMissionDialogResult } from '../../shared/dialogs/cancel-mission-dialog/cancel-mission-dialog.component';
import { AdminAuthorizationDialogComponent } from '../../shared/dialogs/admin-authorization-dialog/admin-authorization-dialog.component';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import {
  LiveJobDisplayData,
  LiveJobStatistics,
  LiveJobFilters,
  LIVE_STATUS_FILTER_OPTIONS,
  transformJobsForDisplay,
  calculateJobStatistics,
  getUniqueFilterValues
} from '../../models/live-jobs.models';

@Component({
  selector: 'app-live-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDividerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatBadgeModule,
    MatButtonToggleModule,
    MatDialogModule,
    GenericTableComponent
  ],
  templateUrl: './live-jobs.component.html',
  styleUrl: './live-jobs.component.scss'
})
export class LiveJobsComponent implements OnInit, OnDestroy {
  // Data signals
  public jobs = signal<LiveJobDisplayData[]>([]);
  public statistics = signal<LiveJobStatistics | null>(null);

  // Filter options (populated from jobs)
  public robotOptions = signal<string[]>([]);
  public workflowOptions = signal<string[]>([]);
  public mapOptions = signal<string[]>([]);

  // UI State
  public isLoading = signal<boolean>(false);
  public autoRefresh = signal<boolean>(true);
  public filtersExpanded = signal<boolean>(false);
  public lastRefreshed = signal<Date | null>(null);
  public viewMode = signal<'card' | 'table'>('table');

  // Table configuration for table view
  public tableConfig: TableConfig<LiveJobDisplayData> = {
    title: '',
    showRowNumbers: true,
    columns: [
      {
        key: 'statusText',
        header: 'Status',
        sortable: true,
        filterable: true,
        transform: (value, row) => value
      },
      {
        key: 'jobCode',
        header: 'Job Code',
        sortable: true,
        filterable: true
      },
      {
        key: 'workflowName',
        header: 'Workflow',
        sortable: true,
        filterable: true,
        transform: (value) => value || 'Unknown'
      },
      {
        key: 'robotId',
        header: 'Robot',
        sortable: true,
        filterable: true,
        transform: (value) => value || 'Not Assigned'
      },
      {
        key: 'progressPercent',
        header: 'Progress',
        sortable: true,
        filterable: false,
        transform: (value) => `${value || 0}%`
      },
      {
        key: 'locationDisplay',
        header: 'Location',
        sortable: false,
        filterable: true
      },
      {
        key: 'createdDateRelative',
        header: 'Created',
        sortable: false,
        filterable: false
      },
      {
        key: 'durationDisplay',
        header: 'Duration',
        sortable: false,
        filterable: false,
        transform: (value) => value || '-'
      },
      {
        key: 'robotErrorMessage',
        header: 'Error Message',
        sortable: false,
        filterable: true,
        transform: (value, row) => {
          if (row?.statusColorClass === 'status-error' || row?.statusColorClass === 'status-warning') {
            return value || row?.warnCode || 'Error occurred';
          }
          return '-';
        }
      }
    ],
    actions: [
      {
        action: 'cancel',
        label: 'Cancel',
        icon: 'cancel',
        type: 'icon',
        color: 'warn',
        tooltip: 'Cancel this job',
        hidden: (row: LiveJobDisplayData) => !row.isActiveJob
      },
      {
        action: 'dismiss',
        label: 'Dismiss',
        icon: 'close',
        type: 'icon',
        color: 'accent',
        tooltip: 'Dismiss from live view',
        hidden: (row: LiveJobDisplayData) =>
          row.statusColorClass !== 'status-error' && row.statusColorClass !== 'status-warning'
      }
    ],
    pagination: {
      enabled: false,
      pageSize: 100,
      pageSizeOptions: [10, 25, 50, 100]
    },
    filter: {
      enabled: false,
      placeholder: 'Search jobs...'
    },
    empty: {
      message: 'No active jobs',
      icon: 'inbox'
    },
    hoverable: true,
    striped: false,
    bordered: false
  };

  // Dismissed error jobs (stored in localStorage for persistence)
  private readonly DISMISSED_JOBS_KEY = 'live_jobs_dismissed';
  public dismissedJobCodes = signal<Set<string>>(new Set());

  // Filters
  public filters = signal<LiveJobFilters>({
    status: null,
    robotId: null,
    workflowName: null,
    mapCode: null
  });

  // Status filter options (active statuses only for live jobs)
  public readonly statusOptions = LIVE_STATUS_FILTER_OPTIONS;

  // Auto-refresh configuration
  private readonly refreshInterval = 5000; // 5 seconds
  private destroy$ = new Subject<void>();

  constructor(
    private missionsService: MissionsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDismissedJobs();
    this.loadJobs();
    this.startAutoRefresh();
  }

  /**
   * Load dismissed job codes from localStorage
   */
  private loadDismissedJobs(): void {
    try {
      const stored = localStorage.getItem(this.DISMISSED_JOBS_KEY);
      if (stored) {
        const codes = JSON.parse(stored) as string[];
        this.dismissedJobCodes.set(new Set(codes));
      }
    } catch {
      // If parsing fails, start with empty set
      this.dismissedJobCodes.set(new Set());
    }
  }

  /**
   * Save dismissed job codes to localStorage
   */
  private saveDismissedJobs(): void {
    const codes = Array.from(this.dismissedJobCodes());
    localStorage.setItem(this.DISMISSED_JOBS_KEY, JSON.stringify(codes));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load jobs from API
   */
  loadJobs(): void {
    this.isLoading.set(true);

    const request = this.buildFilterRequest();

    this.missionsService.queryJobs(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allJobs = transformJobsForDisplay(response.data);
            // Filter to only show active (live) jobs - exclude Complete, Cancelled, etc.
            // Also exclude dismissed error jobs
            const dismissed = this.dismissedJobCodes();
            const liveJobs = allJobs.filter(job =>
              job.isActiveJob && !dismissed.has(job.jobCode)
            );
            this.jobs.set(liveJobs);
            this.statistics.set(calculateJobStatistics(liveJobs));
            this.updateFilterOptions(liveJobs);
            // Clean up dismissed jobs that are no longer in the system
            this.cleanupDismissedJobs(allJobs);
            // Fetch robot info (including error messages) for all jobs with robotId
            this.fetchRobotInfo();
          } else {
            this.jobs.set([]);
            this.statistics.set(null);
          }
          this.lastRefreshed.set(new Date());
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading jobs:', error);
          this.isLoading.set(false);
          this.snackBar.open('Failed to load jobs', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Build filter request from current filter state
   */
  private buildFilterRequest(): JobQueryRequest {
    const currentFilters = this.filters();
    const request: JobQueryRequest = {
      limit: 100
    };

    if (currentFilters.status !== null) {
      request.status = currentFilters.status.toString();
    }

    if (currentFilters.robotId) {
      request.robotId = currentFilters.robotId;
    }

    if (currentFilters.workflowName) {
      request.workflowName = currentFilters.workflowName;
    }

    if (currentFilters.mapCode) {
      request.maps = [currentFilters.mapCode];
    }

    return request;
  }

  /**
   * Update filter dropdown options based on loaded jobs
   */
  private updateFilterOptions(jobs: LiveJobDisplayData[]): void {
    const uniqueValues = getUniqueFilterValues(jobs);
    this.robotOptions.set(uniqueValues.robots);
    this.workflowOptions.set(uniqueValues.workflows);
    this.mapOptions.set(uniqueValues.maps);
  }

  /**
   * Start auto-refresh interval
   */
  private startAutoRefresh(): void {
    interval(this.refreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh()) {
          this.loadJobsSilently();
        }
      });
  }

  /**
   * Load jobs without showing spinner (for auto-refresh)
   */
  private loadJobsSilently(): void {
    const request = this.buildFilterRequest();

    this.missionsService.queryJobs(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allJobs = transformJobsForDisplay(response.data);
            // Filter to only show active (live) jobs - exclude Complete, Cancelled, etc.
            // Also exclude dismissed error jobs
            const dismissed = this.dismissedJobCodes();
            const liveJobs = allJobs.filter(job =>
              job.isActiveJob && !dismissed.has(job.jobCode)
            );
            this.jobs.set(liveJobs);
            this.statistics.set(calculateJobStatistics(liveJobs));
            this.updateFilterOptions(liveJobs);
            // Clean up dismissed jobs that are no longer in the system
            this.cleanupDismissedJobs(allJobs);
            // Fetch robot info (including error messages) for all jobs with robotId
            this.fetchRobotInfo();
          }
          this.lastRefreshed.set(new Date());
        },
        error: (error) => {
          console.error('Error auto-refreshing jobs:', error);
        }
      });
  }

  /**
   * Manual refresh
   */
  refresh(): void {
    this.loadJobs();
    this.snackBar.open('Jobs refreshed', '', { duration: 1500 });
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh(): void {
    this.autoRefresh.update(v => !v);
    const message = this.autoRefresh() ? 'Auto-refresh enabled' : 'Auto-refresh disabled';
    this.snackBar.open(message, '', { duration: 2000 });
  }

  /**
   * Toggle filter panel
   */
  toggleFilters(): void {
    this.filtersExpanded.update(v => !v);
  }

  /**
   * Set view mode (card or table)
   */
  setViewMode(mode: 'card' | 'table'): void {
    this.viewMode.set(mode);
  }

  /**
   * Handle table action events
   */
  handleTableAction(event: ActionEvent): void {
    if (event.action === 'dismiss' && event.row) {
      this.dismissJob(event.row.jobCode);
    } else if (event.action === 'cancel' && event.row) {
      this.cancelJob(event.row);
    }
  }

  /**
   * Cancel a job - requires admin authorization for non-SuperAdmin users
   */
  cancelJob(job: LiveJobDisplayData): void {
    // SuperAdmin bypasses authorization
    if (this.authService.isSuperAdmin()) {
      this.openCancelDialog(job);
      return;
    }

    // Non-admin requires authorization
    const authDialogRef = this.dialog.open(AdminAuthorizationDialogComponent, {
      width: '400px',
      disableClose: true
    });

    authDialogRef.afterClosed().subscribe(authorized => {
      if (authorized) {
        this.openCancelDialog(job);
      }
    });
  }

  /**
   * Open cancel dialog for mode selection
   */
  private openCancelDialog(job: LiveJobDisplayData): void {
    const dialogData: CancelMissionDialogData = {
      missionName: job.workflowName || 'Unknown',
      missionCode: job.jobCode
    };

    const dialogRef = this.dialog.open(CancelMissionDialogComponent, {
      width: '500px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: CancelMissionDialogResult) => {
      if (result) {
        this.executeCancellation(job, result);
      }
    });
  }

  /**
   * Execute the cancellation API call
   */
  private executeCancellation(job: LiveJobDisplayData, result: CancelMissionDialogResult): void {
    const request: MissionCancelRequest = {
      requestId: this.generateRequestId(),
      missionCode: job.jobCode,
      containerCode: '',
      position: '',
      cancelMode: result.cancelMode,
      reason: result.reason
    };

    this.missionsService.cancelMission(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Job cancelled successfully', '', { duration: 3000 });
          this.loadJobs(); // Refresh the list
        }
      },
      error: () => {
        // Error handled by service
      }
    });
  }

  /**
   * Generate a unique request ID for cancellation
   */
  private generateRequestId(): string {
    const now = new Date();
    return `request${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
  }

  /**
   * Update filter value
   */
  updateFilter(field: keyof LiveJobFilters, value: any): void {
    this.filters.update(f => ({
      ...f,
      [field]: value || null
    }));
  }

  /**
   * Apply filters and reload
   */
  applyFilters(): void {
    this.loadJobs();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters.set({
      status: null,
      robotId: null,
      workflowName: null,
      mapCode: null
    });
    this.loadJobs();
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    const f = this.filters();
    return f.status !== null || !!f.robotId || !!f.workflowName || !!f.mapCode;
  }

  /**
   * Format last refreshed time for display
   */
  getLastRefreshedDisplay(): string {
    const date = this.lastRefreshed();
    if (!date) return 'Never';

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Track jobs by jobCode for ngFor
   */
  trackByJobCode(index: number, job: LiveJobDisplayData): string {
    return job.jobCode;
  }

  /**
   * Dismiss an error job from the live view
   */
  dismissJob(jobCode: string): void {
    const dismissed = new Set(this.dismissedJobCodes());
    dismissed.add(jobCode);
    this.dismissedJobCodes.set(dismissed);
    this.saveDismissedJobs();

    // Remove from current jobs list immediately
    this.jobs.update(jobs => jobs.filter(job => job.jobCode !== jobCode));
    this.snackBar.open('Job dismissed from live view', '', { duration: 2000 });
  }

  /**
   * Clear all dismissed jobs (show them again)
   */
  clearDismissedJobs(): void {
    this.dismissedJobCodes.set(new Set());
    localStorage.removeItem(this.DISMISSED_JOBS_KEY);
    this.loadJobs();
    this.snackBar.open('All dismissed jobs restored', '', { duration: 2000 });
  }

  /**
   * Get count of dismissed jobs
   */
  getDismissedCount(): number {
    return this.dismissedJobCodes().size;
  }

  /**
   * Clean up dismissed jobs that are no longer in the system
   * (prevents localStorage from growing indefinitely)
   */
  private cleanupDismissedJobs(allJobs: LiveJobDisplayData[]): void {
    const currentJobCodes = new Set(allJobs.map(job => job.jobCode));
    const dismissed = this.dismissedJobCodes();
    let hasChanges = false;

    const cleanedDismissed = new Set<string>();
    dismissed.forEach(code => {
      if (currentJobCodes.has(code)) {
        cleanedDismissed.add(code);
      } else {
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.dismissedJobCodes.set(cleanedDismissed);
      this.saveDismissedJobs();
    }
  }

  /**
   * Fetch robot information for all live jobs with a robotId.
   * Updates jobs with robot error messages from the Robot Query API.
   */
  private fetchRobotInfo(): void {
    const currentJobs = this.jobs();

    // Get unique robot IDs to avoid duplicate queries
    const uniqueRobotIds = [...new Set(
      currentJobs
        .filter(job => job.robotId)
        .map(job => job.robotId!)
    )];

    // Query each unique robot
    uniqueRobotIds.forEach(robotId => {
      this.missionsService.queryRobots({ robotId })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data?.[0]) {
              const robotData = response.data[0];
              // Update all jobs with this robotId
              const updatedJobs = this.jobs().map(job => {
                if (job.robotId === robotId) {
                  return {
                    ...job,
                    robotErrorMessage: robotData.errorMessage
                  };
                }
                return job;
              });
              this.jobs.set(updatedJobs);
            }
          },
          error: () => {
            // Silently fail - job will show generic error message if needed
          }
        });
    });
  }
}
