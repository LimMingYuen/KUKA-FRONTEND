import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import { MapZonesService } from '../../services/map-zones.service';
import { MapZoneDisplayData, MapZoneSyncResultDto } from '../../models/map-zone.models';
import { Subject, takeUntil, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { MAP_ZONE_TABLE_CONFIG } from './map-zone-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';

@Component({
  selector: 'app-map-zones',
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
  templateUrl: './map-zones.component.html',
  styleUrl: './map-zones.component.css'
})
export class MapZonesComponent implements OnInit, OnDestroy {
  // Table data
  public mapZones: MapZoneDisplayData[] = [];

  // Table configuration
  public tableConfig = MAP_ZONE_TABLE_CONFIG;

  // UI state
  public isLoading = false;
  public isSyncing = false;
  public lastSyncResult: MapZoneSyncResultDto | null = null;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Observable streams from signals (created in injection context)
  private loading$!: Observable<boolean>;
  private syncing$!: Observable<boolean>;
  private syncResult$!: Observable<MapZoneSyncResultDto | null>;

  constructor(public mapZonesService: MapZonesService) {
    // Create observables from signals within constructor (injection context)
    this.loading$ = toObservable(this.mapZonesService.isLoading);
    this.syncing$ = toObservable(this.mapZonesService.isSyncing);
    this.syncResult$ = toObservable(this.mapZonesService.lastSyncResult);

    // Configure empty state action
    this.tableConfig.empty!.action = () => this.syncMapZones();
  }

  ngOnInit(): void {
    this.loadMapZones();
    this.subscribeToServiceStates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load map zones from the API
   */
  public loadMapZones(): void {
    this.isLoading = true;

    this.mapZonesService.getMapZones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mapZones) => {
          this.mapZones = mapZones;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading map zones:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Sync map zones from external API
   */
  public syncMapZones(): void {
    if (this.isSyncing) return;

    this.mapZonesService.syncMapZones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.lastSyncResult = result;
          // Reload map zones after successful sync
          this.loadMapZones();
        },
        error: (error) => {
          console.error('Error syncing map zones:', error);
        }
      });
  }

  /**
   * Refresh map zone data
   */
  public refresh(): void {
    this.loadMapZones();
  }

  /**
   * Handle table action events
   */
  public onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'refresh':
        this.refresh();
        break;
      case 'sync':
        this.syncMapZones();
        break;
      case 'view':
        console.log('View map zone:', event.row);
        this.viewMapZone(event.row);
        break;
      case 'edit':
        console.log('Edit map zone:', event.row);
        this.editMapZone(event.row);
        break;
      case 'export':
        console.log('Export map zone:', event.row);
        this.exportMapZone(event.row);
        break;
      case 'delete':
        console.log('Delete map zone:', event.row);
        this.deleteMapZone(event.row);
        break;
      default:
        console.log('Unknown action:', event.action, event.row);
    }
  }

  /**
   * View map zone details
   */
  private viewMapZone(zone: MapZoneDisplayData): void {
    // TODO: Implement view functionality
    console.log('Viewing map zone:', zone);
  }

  /**
   * Edit map zone
   */
  private editMapZone(zone: MapZoneDisplayData): void {
    // TODO: Implement edit functionality
    console.log('Editing map zone:', zone);
  }

  /**
   * Export map zone data
   */
  private exportMapZone(zone: MapZoneDisplayData): void {
    // TODO: Implement export functionality
    console.log('Exporting map zone:', zone);
  }

  /**
   * Delete map zone
   */
  private deleteMapZone(zone: MapZoneDisplayData): void {
    // TODO: Implement delete functionality
    console.log('Deleting map zone:', zone);
  }

  /**
   * Get cell value for display
   */
  public getCellValue(row: MapZoneDisplayData, column: any): string {
    const key = column.key as keyof MapZoneDisplayData;
    const value = row[key];
    return value != null ? String(value) : 'N/A';
  }

  /**
   * Get status badge CSS class based on status
   */
  public getStatusClass(status: number): string {
    switch (status) {
      case 1: return 'status-enabled';
      case 0: return 'status-disabled';
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
      (result: MapZoneSyncResultDto | null) => {
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
    this.mapZonesService.clearSyncResult();
  }
}