import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { OrganizationIdsService } from '../../services/organization-ids.service';
import {
  OrganizationIdDisplayData,
  OrganizationIdCreateRequest,
  OrganizationIdUpdateRequest,
  getStatusClass,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription
} from '../../models/organization-ids.models';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { ORGANIZATION_IDS_TABLE_CONFIG } from './organization-ids-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';
import { OrganizationIdDialogComponent } from './organization-id-dialog.component';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-organization-ids',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDividerModule,
    ReactiveFormsModule,
    GenericTableComponent
  ],
  templateUrl: './organization-ids.component.html',
  styleUrl: './organization-ids.component.css'
})
export class OrganizationIdsComponent implements OnInit, OnDestroy {
  // Table configuration
  public tableConfig = ORGANIZATION_IDS_TABLE_CONFIG;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Form for create/edit
  public organizationIdForm!: FormGroup;

  constructor(
    public organizationIdsService: OrganizationIdsService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    // Initialize form
    this.initializeForm();

    // Configure empty state action
    if (this.tableConfig.empty) {
      this.tableConfig.empty.action = () => this.openCreateDialog();
    }
  }

  ngOnInit(): void {
    this.loadOrganizationIds();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    this.organizationIdForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      actualValue: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  /**
   * Load organization IDs from the service
   */
  private loadOrganizationIds(): void {
    this.organizationIdsService.getOrganizationIds()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading organization IDs:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewOrganizationId(event.row);
        break;
      case 'edit':
        this.editOrganizationId(event.row);
        break;
      case 'toggle-status':
        this.toggleOrganizationIdStatus(event.row);
        break;
      case 'delete':
        this.deleteOrganizationId(event.row);
        break;
      case 'refresh':
        this.refreshOrganizationIds();
        break;
      case 'create-organization-id':
        this.openCreateDialog();
        break;
      case 'export':
        this.exportOrganizationIds();
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
   * View organization ID details
   */
  private viewOrganizationId(organizationId: OrganizationIdDisplayData): void {
    this.dialog.open(OrganizationIdDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      data: {
        mode: 'view',
        organizationId: organizationId
      }
    });
  }

  /**
   * Edit organization ID
   */
  private editOrganizationId(organizationId: OrganizationIdDisplayData): void {
    const dialogRef = this.dialog.open(OrganizationIdDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        mode: 'edit',
        organizationId: organizationId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateOrganizationId(organizationId.id, result);
      }
    });
  }

  /**
   * Toggle organization ID status
   */
  private toggleOrganizationIdStatus(organizationId: OrganizationIdDisplayData): void {
    this.organizationIdsService.toggleOrganizationIdStatus(organizationId.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error toggling organization ID status:', error);
        }
      });
  }

  /**
   * Delete organization ID with confirmation
   */
  private deleteOrganizationId(organizationId: OrganizationIdDisplayData): void {
    if (organizationId.isActive) {
      this.snackBar.open('Cannot delete an active organization ID. Please set it to inactive first.', 'Dismiss', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const dialogData: ConfirmationDialogData = {
      title: 'Delete Organization ID',
      message: `Are you sure you want to delete organization ID "${organizationId.displayName}"?`,
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
        this.organizationIdsService.deleteOrganizationId(organizationId.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (error) => {
              console.error('Error deleting organization ID:', error);
            }
          });
      }
    });
  }

  /**
   * Refresh organization IDs
   */
  public refreshOrganizationIds(): void {
    this.loadOrganizationIds();
  }

  /**
   * Open create dialog
   */
  public openCreateDialog(): void {
    const dialogRef = this.dialog.open(OrganizationIdDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createOrganizationId(result);
      }
    });
  }

  /**
   * Export organization IDs data
   */
  public exportOrganizationIds(): void {
    this.organizationIdsService.exportOrganizationIds()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'organization-ids-export.csv');
        },
        error: (error) => {
          console.error('Error exporting organization IDs:', error);
        }
      });
  }

  /**
   * Create new organization ID
   */
  private createOrganizationId(request: OrganizationIdCreateRequest): void {
    this.organizationIdsService.createOrganizationId(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error creating organization ID:', error);
        }
      });
  }

  /**
   * Update organization ID
   */
  private updateOrganizationId(id: number, request: OrganizationIdUpdateRequest): void {
    this.organizationIdsService.updateOrganizationId(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error updating organization ID:', error);
        }
      });
  }

  /**
   * Validate organization ID data
   */
  private validateOrganizationIdData(displayName: string, actualValue: string, description: string): boolean {
    if (!isValidDisplayName(displayName)) {
      this.showErrorMessage('Display name must be between 3 and 100 characters');
      return false;
    }

    if (!isValidActualValue(actualValue)) {
      this.showErrorMessage('Actual value must be between 1 and 50 characters');
      return false;
    }

    if (!isValidDescription(description)) {
      this.showErrorMessage('Description must be less than 500 characters');
      return false;
    }

    return true;
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.organizationIdForm.reset({
      displayName: '',
      actualValue: '',
      description: '',
      isActive: true
    });
  }

  /**
   * Mark all form controls as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
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
   * Show error message (temporary, service handles this)
   */
  private showErrorMessage(message: string): void {
    // This is handled by the service, keeping as fallback
    console.error(message);
  }

  /**
   * Get CSS class for status badge
   */
  getStatusClass(isActive: boolean): string {
    return getStatusClass(isActive);
  }

  /**
   * Get organization IDs count
   */
  getOrganizationIdsCount(): { active: number; inactive: number; total: number } {
    return this.organizationIdsService.getOrganizationIdsCount();
  }
}
