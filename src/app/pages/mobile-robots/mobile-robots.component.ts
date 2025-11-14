import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import { MobileRobotsService } from '../../services/mobile-robots.service';
import { MobileRobotDisplayData, MobileRobotSyncResultDto, getReliabilityClass, getFloorClass, getStatusClass, getBatteryClass } from '../../models/mobile-robot.models';
import { Subject, takeUntil, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { MOBILE_ROBOT_TABLE_CONFIG } from './mobile-robot-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';

@Component({
  selector: 'app-mobile-robots',
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
  templateUrl: './mobile-robots.component.html',
  styleUrl: './mobile-robots.component.css'
})
export class MobileRobotsComponent implements OnInit, OnDestroy {
  // Table data
  public mobileRobots: MobileRobotDisplayData[] = [];

  // Table configuration
  public tableConfig = MOBILE_ROBOT_TABLE_CONFIG;

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

    // Configure empty state action
    this.tableConfig.empty!.action = () => this.syncMobileRobots();
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
      // Update header action loading state
      const syncAction = this.tableConfig.headerActions?.find(action => action.action === 'sync');
      if (syncAction) {
        syncAction.loading = syncing;
      }
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
        },
        error: (error) => {
          console.error('Error loading mobile robots:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewMobileRobot(event.row);
        break;
      case 'edit':
        this.editMobileRobot(event.row);
        break;
      case 'export':
        this.exportMobileRobot(event.row);
        break;
      case 'delete':
        this.deleteMobileRobot(event.row);
        break;
      case 'refresh':
        this.refreshMobileRobots();
        break;
      case 'sync':
        this.syncMobileRobots();
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
   * View mobile robot details
   */
  private viewMobileRobot(robot: MobileRobotDisplayData): void {
    // TODO: Implement view dialog or navigation
    // Could open a dialog with detailed robot information
  }

  /**
   * Edit mobile robot
   */
  private editMobileRobot(robot: MobileRobotDisplayData): void {
    // TODO: Implement edit dialog or form
    // Could open a dialog with robot editing form
  }

  /**
   * Export mobile robot data
   */
  private exportMobileRobot(robot: MobileRobotDisplayData): void {
    // TODO: Implement export functionality
    // Could export single robot data to CSV/JSON
  }

  /**
   * Delete mobile robot
   */
  private deleteMobileRobot(robot: MobileRobotDisplayData): void {
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
  private refreshMobileRobots(): void {
    this.loadMobileRobots();
  }

  /**
   * Sync mobile robots from external API
   */
  private syncMobileRobots(): void {
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
   * Get cell value for table display
   */
  getCellValue(row: MobileRobotDisplayData, column: any): string {
    const key = column.key as keyof MobileRobotDisplayData;
    const value = row[key];

    if (value == null) return '';

    // Apply transform if configured
    if (column.transform) {
      return column.transform(value, row);
    }

    return String(value);
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