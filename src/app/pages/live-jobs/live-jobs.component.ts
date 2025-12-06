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
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';

import { Subject, takeUntil, interval } from 'rxjs';

import { MissionsService } from '../../services/missions.service';
import { JobQueryRequest } from '../../models/missions.models';
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
    MatBadgeModule
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
    private snackBar: MatSnackBar
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
}
