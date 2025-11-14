import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
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

import { AreasService } from '../../services/areas.service';
import {
  AreaDisplayData,
  AreaCreateRequest,
  AreaUpdateRequest,
  getStatusClass,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription
} from '../../models/areas.models';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { AREAS_TABLE_CONFIG } from './areas-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';

@Component({
  selector: 'app-areas',
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
  templateUrl: './areas.component.html',
  styleUrl: './areas.component.css'
})
export class AreasComponent implements OnInit, OnDestroy {
  // Table data
  public areas: AreaDisplayData[] = [];

  // Table configuration
  public tableConfig = AREAS_TABLE_CONFIG;

  // UI state
  public isLoading = false;
  public isCreating = false;
  public isUpdating = false;
  public isDeleting = false;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Form for create/edit
  public areaForm!: FormGroup;

  constructor(
    public areasService: AreasService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    // Initialize form
    this.initializeForm();

    // Configure empty state action
    if (this.tableConfig.empty) {
      this.tableConfig.empty.action = () => this.openCreateDialog();
    }

    // Set up reactive effects for service state changes
    effect(() => {
      this.isLoading = this.areasService.isLoading();
    });

    effect(() => {
      this.isCreating = this.areasService.isCreating();
    });

    effect(() => {
      this.isUpdating = this.areasService.isUpdating();
    });

    effect(() => {
      this.isDeleting = this.areasService.isDeleting();
    });

    effect(() => {
      this.areas = this.areasService.areas();
    });
  }

  ngOnInit(): void {
    this.loadAreas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    this.areaForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      actualValue: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  /**
   * Load areas from the service
   */
  private loadAreas(): void {
    this.areasService.getAreas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading areas:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewArea(event.row);
        break;
      case 'edit':
        this.editArea(event.row);
        break;
      case 'toggle-status':
        this.toggleAreaStatus(event.row);
        break;
      case 'delete':
        this.deleteArea(event.row);
        break;
      case 'refresh':
        this.refreshAreas();
        break;
      case 'create-area':
        this.openCreateDialog();
        break;
      case 'export':
        this.exportAreas();
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
   * View area details
   */
  private viewArea(area: AreaDisplayData): void {
    // TODO: Implement view dialog
    console.log('View area:', area);
  }

  /**
   * Edit area
   */
  private editArea(area: AreaDisplayData): void {
    // TODO: Implement edit dialog
    console.log('Edit area:', area);
  }

  /**
   * Toggle area status
   */
  private toggleAreaStatus(area: AreaDisplayData): void {
    this.areasService.toggleAreaStatus(area.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error toggling area status:', error);
        }
      });
  }

  /**
   * Delete area with confirmation
   */
  private deleteArea(area: AreaDisplayData): void {
    if (confirm(`Are you sure you want to delete area "${area.displayName}"?`)) {
      this.areasService.deleteArea(area.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {
            console.error('Error deleting area:', error);
          }
        });
    }
  }

  /**
   * Refresh areas
   */
  public refreshAreas(): void {
    this.loadAreas();
  }

  /**
   * Open create dialog
   */
  public openCreateDialog(): void {
    this.resetForm();
    // TODO: Implement create dialog
    console.log('Open create dialog');
  }

  /**
   * Export areas data
   */
  public exportAreas(): void {
    this.areasService.exportAreas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'areas-export.csv');
        },
        error: (error) => {
          console.error('Error exporting areas:', error);
        }
      });
  }

  /**
   * Create new area
   */
  createArea(): void {
    if (this.areaForm.invalid) {
      this.markFormGroupTouched(this.areaForm);
      return;
    }

    const formValue = this.areaForm.value;

    if (!this.validateAreaData(formValue.displayName, formValue.actualValue, formValue.description)) {
      return;
    }

    const request: AreaCreateRequest = {
      displayName: formValue.displayName.trim(),
      actualValue: formValue.actualValue.trim(),
      description: formValue.description?.trim() || '',
      isActive: formValue.isActive
    };

    this.areasService.createArea(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetForm();
        },
        error: (error) => {
          console.error('Error creating area:', error);
        }
      });
  }

  /**
   * Validate area data
   */
  private validateAreaData(displayName: string, actualValue: string, description: string): boolean {
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
    this.areaForm.reset({
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
   * Get areas count
   */
  getAreasCount(): { active: number; inactive: number; total: number } {
    return this.areasService.getAreasCount();
  }
}
