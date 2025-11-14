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

import { RobotTypesService } from '../../services/robot-types.service';
import {
  RobotTypeDisplayData,
  RobotTypeCreateRequest,
  RobotTypeUpdateRequest,
  getStatusClass,
  getActualValueClass,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription
} from '../../models/robot-types.models';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { ROBOT_TYPES_TABLE_CONFIG } from './robot-types-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';

@Component({
  selector: 'app-robot-types',
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
  templateUrl: './robot-types.component.html',
  styleUrl: './robot-types.component.css'
})
export class RobotTypesComponent implements OnInit, OnDestroy {
  // Table data
  public robotTypes: RobotTypeDisplayData[] = [];

  // Table configuration
  public tableConfig = ROBOT_TYPES_TABLE_CONFIG;

  // UI state
  public isLoading = false;
  public isCreating = false;
  public isUpdating = false;
  public isDeleting = false;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Form for create/edit
  public robotTypeForm!: FormGroup;

  constructor(
    public robotTypesService: RobotTypesService,
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
      this.isLoading = this.robotTypesService.isLoading();
    });

    effect(() => {
      this.isCreating = this.robotTypesService.isCreating();
    });

    effect(() => {
      this.isUpdating = this.robotTypesService.isUpdating();
    });

    effect(() => {
      this.isDeleting = this.robotTypesService.isDeleting();
    });

    effect(() => {
      this.robotTypes = this.robotTypesService.robotTypes();
    });
  }

  ngOnInit(): void {
    this.loadRobotTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    this.robotTypeForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      actualValue: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  /**
   * Load robot types from the service
   */
  private loadRobotTypes(): void {
    this.robotTypesService.getRobotTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading robot types:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewRobotType(event.row);
        break;
      case 'edit':
        this.editRobotType(event.row);
        break;
      case 'toggle-status':
        this.toggleRobotTypeStatus(event.row);
        break;
      case 'delete':
        this.deleteRobotType(event.row);
        break;
      case 'refresh':
        this.refreshRobotTypes();
        break;
      case 'create-robot-type':
        this.openCreateDialog();
        break;
      case 'export':
        this.exportRobotTypes();
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
   * View robot type details
   */
  private viewRobotType(robotType: RobotTypeDisplayData): void {
    // TODO: Implement view dialog
    console.log('View robot type:', robotType);
  }

  /**
   * Edit robot type
   */
  private editRobotType(robotType: RobotTypeDisplayData): void {
    // TODO: Implement edit dialog
    console.log('Edit robot type:', robotType);
  }

  /**
   * Toggle robot type status
   */
  private toggleRobotTypeStatus(robotType: RobotTypeDisplayData): void {
    this.robotTypesService.toggleRobotTypeStatus(robotType.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error toggling robot type status:', error);
        }
      });
  }

  /**
   * Delete robot type with confirmation
   */
  private deleteRobotType(robotType: RobotTypeDisplayData): void {
    if (confirm(`Are you sure you want to delete robot type "${robotType.displayName}"?`)) {
      this.robotTypesService.deleteRobotType(robotType.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {
            console.error('Error deleting robot type:', error);
          }
        });
    }
  }

  /**
   * Refresh robot types
   */
  public refreshRobotTypes(): void {
    this.loadRobotTypes();
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
   * Export robot types data
   */
  public exportRobotTypes(): void {
    this.robotTypesService.exportRobotTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'robot-types-export.csv');
        },
        error: (error) => {
          console.error('Error exporting robot types:', error);
        }
      });
  }

  /**
   * Create new robot type
   */
  createRobotType(): void {
    if (this.robotTypeForm.invalid) {
      this.markFormGroupTouched(this.robotTypeForm);
      return;
    }

    const formValue = this.robotTypeForm.value;

    if (!this.validateRobotTypeData(formValue.displayName, formValue.actualValue, formValue.description)) {
      return;
    }

    const request: RobotTypeCreateRequest = {
      displayName: formValue.displayName.trim(),
      actualValue: formValue.actualValue.trim(),
      description: formValue.description?.trim() || '',
      isActive: formValue.isActive
    };

    this.robotTypesService.createRobotType(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetForm();
        },
        error: (error) => {
          console.error('Error creating robot type:', error);
        }
      });
  }

  /**
   * Validate robot type data
   */
  private validateRobotTypeData(displayName: string, actualValue: string, description: string): boolean {
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
    this.robotTypeForm.reset({
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
   * Get cell value for table display
   */
  getCellValue(row: RobotTypeDisplayData, column: any): string {
    const key = column.key as keyof RobotTypeDisplayData;
    const value = row[key];

    if (value == null) return '';

    // Apply transform if configured
    if (column.transform) {
      return column.transform(value, row);
    }

    return String(value);
  }

  /**
   * Get CSS class for status badge
   */
  getStatusClass(isActive: boolean): string {
    return getStatusClass(isActive);
  }

  /**
   * Get CSS class for actual value display
   */
  getActualValueClass(value: string): string {
    return getActualValueClass(value);
  }

  /**
   * Get robot types count
   */
  getRobotTypesCount(): { active: number; inactive: number; total: number } {
    return this.robotTypesService.getRobotTypesCount();
  }
}