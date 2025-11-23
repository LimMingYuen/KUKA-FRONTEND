import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { MobileRobotsService } from '../../services/mobile-robots.service';
import { MobileRobotDisplayData, MobileRobotSyncResultDto, getReliabilityClass, getFloorClass, getStatusClass, getBatteryClass } from '../../models/mobile-robot.models';
import { Subject, takeUntil, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-mobile-robots',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './mobile-robots.component.html',
  styleUrl: './mobile-robots.component.css'
})
export class MobileRobotsComponent implements OnInit, OnDestroy {
  // Robot data
  public mobileRobots: MobileRobotDisplayData[] = [];
  public filteredRobots: MobileRobotDisplayData[] = [];

  // Search
  public searchTerm: string = '';

  // UI state
  public isLoading = false;
  public isSyncing = false;
  public lastSyncResult: MobileRobotSyncResultDto | null = null;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Observable streams from signals (created in injection context)
  private loading$!: Observable<boolean>;
  private syncing$!: Observable<boolean>;
  private syncResult$!: Observable<MobileRobotSyncResultDto | null>;

  constructor(public mobileRobotsService: MobileRobotsService) {
    // Create observables from signals within constructor (injection context)
    this.loading$ = toObservable(this.mobileRobotsService.isLoading);
    this.syncing$ = toObservable(this.mobileRobotsService.isSyncing);
    this.syncResult$ = toObservable(this.mobileRobotsService.lastSyncResult);
  }

  ngOnInit(): void {
    this.loadMobileRobots();
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

    // Subscribe to syncing state
    this.syncing$.pipe(takeUntil(this.destroy$)).subscribe(syncing => {
      this.isSyncing = syncing;
    });

    // Subscribe to sync results
    this.syncResult$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.lastSyncResult = result;
      if (result) {
        // Reload data after successful sync
        this.loadMobileRobots();
      }
    });
  }

  /**
   * Load mobile robots from the service
   */
  private loadMobileRobots(): void {
    this.mobileRobotsService.getMobileRobots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mobileRobots) => {
          this.mobileRobots = mobileRobots;
          this.applyFilter();
        },
        error: (error) => {
          console.error('Error loading mobile robots:', error);
        }
      });
  }

  /**
   * Apply search filter to robots
   */
  private applyFilter(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredRobots = [...this.mobileRobots];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();

    this.filteredRobots = this.mobileRobots.filter(robot => {
      return (
        robot.robotId.toLowerCase().includes(searchLower) ||
        robot.robotTypeCode.toLowerCase().includes(searchLower) ||
        robot.statusText.toLowerCase().includes(searchLower) ||
        robot.mapCode.toLowerCase().includes(searchLower) ||
        robot.floorNumber.toLowerCase().includes(searchLower) ||
        robot.floorDisplay.toLowerCase().includes(searchLower) ||
        robot.nodeDisplay.toLowerCase().includes(searchLower) ||
        robot.reliabilityText.toLowerCase().includes(searchLower) ||
        robot.coordinatesText.toLowerCase().includes(searchLower) ||
        robot.orientationText.toLowerCase().includes(searchLower)
      );
    });
  }

  /**
   * Handle search term change
   */
  onSearchChange(): void {
    this.applyFilter();
  }

  /**
   * Clear search filter
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  /**
   * View mobile robot details
   */
  viewMobileRobot(robot: MobileRobotDisplayData): void {
    // TODO: Implement view dialog or navigation
    console.log('View robot:', robot.robotId);
  }

  /**
   * Edit mobile robot
   */
  editMobileRobot(robot: MobileRobotDisplayData): void {
    // TODO: Implement edit dialog or form
    console.log('Edit robot:', robot.robotId);
  }

  /**
   * Export mobile robot data
   */
  exportMobileRobot(robot: MobileRobotDisplayData): void {
    // TODO: Implement export functionality
    console.log('Export robot:', robot.robotId);
  }

  /**
   * Delete mobile robot
   */
  deleteMobileRobot(robot: MobileRobotDisplayData): void {
    // TODO: Implement delete confirmation dialog
    if (confirm(`Are you sure you want to delete mobile robot "${robot.robotId}"?`)) {
      this.mobileRobotsService.deleteMobileRobot(robot.robotId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Reload data after successful deletion
            this.loadMobileRobots();
          },
          error: (error) => {
            // Error handling is managed by the service
          }
        });
    }
  }

  /**
   * Refresh mobile robots
   */
  refreshMobileRobots(): void {
    this.loadMobileRobots();
  }

  /**
   * Sync mobile robots from external API
   */
  syncMobileRobots(): void {
    this.mobileRobotsService.syncMobileRobots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error syncing mobile robots:', error);
        }
      });
  }

  /**
   * Clear sync result banner
   */
  clearSyncResult(): void {
    this.mobileRobotsService.clearSyncResult();
  }

  /**
   * Get CSS class for reliability badge
   */
  getReliabilityClass(reliability: number): string {
    return getReliabilityClass(reliability);
  }

  /**
   * Get CSS class for status badge
   */
  getStatusClass(status: number): string {
    return getStatusClass(status);
  }

  /**
   * Get CSS class for battery level indicator
   */
  getBatteryClass(batteryLevel: number): string {
    return getBatteryClass(batteryLevel);
  }

  /**
   * Get CSS class for floor badge
   */
  getFloorClass(floorNumber: string): string {
    return getFloorClass(floorNumber);
  }
}
