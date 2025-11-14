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
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MissionTypesService } from '../../services/mission-types.service';
import {
  MissionTypeDisplayData,
  MissionTypeCreateRequest,
  MissionTypeUpdateRequest,
  getStatusClass,
  getActualValueClass,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription
} from '../../models/mission-types.models';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { MISSION_TYPES_TABLE_CONFIG } from './mission-types-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';

@Component({
  selector: 'app-mission-types',
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
    ReactiveFormsModule,
    GenericTableComponent
  ],
  templateUrl: './mission-types.component.html',
  styleUrl: './mission-types.component.css'
})
export class MissionTypesComponent implements OnInit, OnDestroy {
  // Table data
  public missionTypes: MissionTypeDisplayData[] = [];

  // Table configuration
  public tableConfig = MISSION_TYPES_TABLE_CONFIG;

  // UI state
  public isLoading = false;
  public isCreating = false;
  public isUpdating = false;
  public isDeleting = false;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Form for create/edit
  public missionTypeForm!: FormGroup;

  constructor(
    public missionTypesService: MissionTypesService,
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
      this.isLoading = this.missionTypesService.isLoading();
    });

    effect(() => {
      this.isCreating = this.missionTypesService.isCreating();
    });

    effect(() => {
      this.isUpdating = this.missionTypesService.isUpdating();
    });

    effect(() => {
      this.isDeleting = this.missionTypesService.isDeleting();
    });

    effect(() => {
      this.missionTypes = this.missionTypesService.missionTypes();
    });
  }

  ngOnInit(): void {
    this.loadMissionTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    this.missionTypeForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      actualValue: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  /**
   * Load mission types from the service
   */
  private loadMissionTypes(): void {
    this.missionTypesService.getMissionTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading mission types:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewMissionType(event.row);
        break;
      case 'edit':
        this.editMissionType(event.row);
        break;
      case 'toggle-status':
        this.toggleMissionTypeStatus(event.row);
        break;
      case 'delete':
        this.deleteMissionType(event.row);
        break;
      case 'refresh':
        this.refreshMissionTypes();
        break;
      case 'create-mission-type':
        this.openCreateDialog();
        break;
      case 'export':
        this.exportMissionTypes();
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
   * View mission type details
   */
  private viewMissionType(missionType: MissionTypeDisplayData): void {
    // TODO: Implement view dialog
    console.log('View mission type:', missionType);
  }

  /**
   * Edit mission type
   */
  private editMissionType(missionType: MissionTypeDisplayData): void {
    // TODO: Implement edit dialog
    console.log('Edit mission type:', missionType);
  }

  /**
   * Toggle mission type status
   */
  private toggleMissionTypeStatus(missionType: MissionTypeDisplayData): void {
    this.missionTypesService.toggleMissionTypeStatus(missionType.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error toggling mission type status:', error);
        }
      });
  }

  /**
   * Delete mission type with confirmation
   */
  private deleteMissionType(missionType: MissionTypeDisplayData): void {
    if (confirm(`Are you sure you want to delete mission type "${missionType.displayName}"?`)) {
      this.missionTypesService.deleteMissionType(missionType.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {
            console.error('Error deleting mission type:', error);
          }
        });
    }
  }

  /**
   * Refresh mission types
   */
  private refreshMissionTypes(): void {
    this.loadMissionTypes();
  }

  /**
   * Open create dialog
   */
  private openCreateDialog(): void {
    this.resetForm();
    // TODO: Implement create dialog
    console.log('Open create dialog');
  }

  /**
   * Export mission types data
   */
  private exportMissionTypes(): void {
    this.missionTypesService.exportMissionTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'mission-types-export.csv');
        },
        error: (error) => {
          console.error('Error exporting mission types:', error);
        }
      });
  }

  /**
   * Create new mission type
   */
  createMissionType(): void {
    if (this.missionTypeForm.invalid) {
      this.markFormGroupTouched(this.missionTypeForm);
      return;
    }

    const formValue = this.missionTypeForm.value;

    if (!this.validateMissionTypeData(formValue.displayName, formValue.actualValue, formValue.description)) {
      return;
    }

    const request: MissionTypeCreateRequest = {
      displayName: formValue.displayName.trim(),
      actualValue: formValue.actualValue.trim(),
      description: formValue.description?.trim() || '',
      isActive: formValue.isActive
    };

    this.missionTypesService.createMissionType(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetForm();
        },
        error: (error) => {
          console.error('Error creating mission type:', error);
        }
      });
  }

  /**
   * Validate mission type data
   */
  private validateMissionTypeData(displayName: string, actualValue: string, description: string): boolean {
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
    this.missionTypeForm.reset({
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
  getCellValue(row: MissionTypeDisplayData, column: any): string {
    const key = column.key as keyof MissionTypeDisplayData;
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
   * Get mission types count
   */
  getMissionTypesCount(): { active: number; inactive: number; total: number } {
    return this.missionTypesService.getMissionTypesCount();
  }
}