import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { QrCodesService } from '../../services/qr-codes.service';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';
import { QrCodeDisplayData, QrCodeSyncResultDto, getReliabilityClass, getFloorClass } from '../../models/qr-code.models';
import { Subject, takeUntil, Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { QR_CODE_TABLE_CONFIG } from './qr-code-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';

@Component({
  selector: 'app-qr-codes',
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
  templateUrl: './qr-codes.component.html',
  styleUrl: './qr-codes.component.css'
})
export class QrCodesComponent implements OnInit, OnDestroy {
  // Table data
  public qrCodes: QrCodeDisplayData[] = [];

  // Table configuration
  public tableConfig = QR_CODE_TABLE_CONFIG;

  // UI state - start as true to show loading until data arrives
  public isLoading = true;
  public isSyncing = false;
  public lastSyncResult: QrCodeSyncResultDto | null = null;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Observable streams from signals (created in injection context)
  private loading$!: Observable<boolean>;
  private syncing$!: Observable<boolean>;
  private syncResult$!: Observable<QrCodeSyncResultDto | null>;

  constructor(
    public qrCodesService: QrCodesService,
    private dialog: MatDialog
  ) {
    // Create observables from signals within constructor (injection context)
    this.loading$ = toObservable(this.qrCodesService.isLoading);
    this.syncing$ = toObservable(this.qrCodesService.isSyncing);
    this.syncResult$ = toObservable(this.qrCodesService.lastSyncResult);

    // Configure empty state action
    this.tableConfig.empty!.action = () => this.syncQrCodes();
  }

  ngOnInit(): void {
    this.loadQrCodes();
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
        this.loadQrCodes();
      }
    });
  }

  /**
   * Load QR codes from the service
   */
  private loadQrCodes(): void {
    this.qrCodesService.getQrCodes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (qrCodes) => {
          this.qrCodes = qrCodes;
        },
        error: (error) => {
          console.error('Error loading QR codes:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewQrCode(event.row);
        break;
      case 'edit':
        this.editQrCode(event.row);
        break;
      case 'export':
        this.exportQrCode(event.row);
        break;
      case 'delete':
        this.deleteQrCode(event.row);
        break;
      case 'refresh':
        this.refreshQrCodes();
        break;
      case 'sync':
        this.syncQrCodes();
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
   * View QR code details
   */
  private viewQrCode(qrCode: QrCodeDisplayData): void {
    // TODO: Implement view dialog or navigation
    // Could open a dialog with detailed QR code information
  }

  /**
   * Edit QR code
   */
  private editQrCode(qrCode: QrCodeDisplayData): void {
    // TODO: Implement edit dialog or form
    // Could open a dialog with QR code editing form
  }

  /**
   * Export QR code data
   */
  private exportQrCode(qrCode: QrCodeDisplayData): void {
    // TODO: Implement export functionality
    // Could export single QR code data to CSV/JSON
  }

  /**
   * Delete QR code
   */
  private deleteQrCode(qrCode: QrCodeDisplayData): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete QR Code',
      message: `Are you sure you want to delete QR code "${qrCode.nodeLabel}"?`,
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
        this.qrCodesService.deleteQrCode(qrCode.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Reload data after successful deletion
              this.loadQrCodes();
            },
            error: (error) => {
              // Error handling is managed by the service
            }
          });
      }
    });
  }

  /**
   * Refresh QR codes
   */
  private refreshQrCodes(): void {
    this.loadQrCodes();
  }

  /**
   * Sync QR codes from external API
   */
  private syncQrCodes(): void {
    this.qrCodesService.syncQrCodes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error syncing QR codes:', error);
        }
      });
  }

  /**
   * Clear sync result banner
   */
  clearSyncResult(): void {
    this.qrCodesService.clearSyncResult();
  }

  /**
   * Get cell value for table display
   */
  getCellValue(row: QrCodeDisplayData, column: any): string {
    const key = column.key as keyof QrCodeDisplayData;
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
   * Get CSS class for floor badge
   */
  getFloorClass(floorNumber: string): string {
    return getFloorClass(floorNumber);
  }
}