import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { RobotTypeDialogComponent } from './robot-type-dialog.component';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';

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
  // Table configuration
  public tableConfig = ROBOT_TYPES_TABLE_CONFIG;

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
    this.dialog.open(RobotTypeDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      data: {
        mode: 'view',
        robotType: robotType
      }
    });
  }

  /**
   * Edit robot type
   */
  private editRobotType(robotType: RobotTypeDisplayData): void {
    const dialogRef = this.dialog.open(RobotTypeDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        mode: 'edit',
        robotType: robotType
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateRobotType(robotType.id, result);
      }
    });
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
   * Delete robot type with confirmation and usage check
   */
  private deleteRobotType(robotType: RobotTypeDisplayData): void {
    // First check if this robot type is in use
    this.robotTypesService.checkUsageInTemplates(robotType.actualValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usage) => {
          if (usage.isUsed) {
            // Show warning about templates using this robot type
            const templateList = usage.templateNames.join('\n  - ');
            const alertData: ConfirmationDialogData = {
              title: 'Cannot Delete',
              message: `Cannot delete robot type "${robotType.displayName}" because it is used by ${usage.usageCount} workflow template(s):\n\n  - ${templateList}\n\nPlease update or delete these templates first, or deactivate this robot type instead.`,
              icon: 'error',
              confirmText: 'OK',
              showCancel: false,
              confirmColor: 'primary'
            };
            this.dialog.open(ConfirmationDialogComponent, {
              width: '450px',
              data: alertData
            });
          } else {
            // Not in use, proceed with deletion after confirmation
            this.showDeleteRobotTypeConfirmation(robotType);
          }
        },
        error: (error) => {
          console.error('Error checking robot type usage:', error);
          // On error, still allow deletion with a warning
          this.showDeleteRobotTypeConfirmationWithWarning(robotType);
        }
      });
  }

  /**
   * Show delete confirmation dialog for robot type
   */
  private showDeleteRobotTypeConfirmation(robotType: RobotTypeDisplayData): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Robot Type',
      message: `Are you sure you want to delete robot type "${robotType.displayName}"?`,
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
        this.robotTypesService.deleteRobotType(robotType.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (error) => {
              console.error('Error deleting robot type:', error);
            }
          });
      }
    });
  }

  /**
   * Show delete confirmation with warning about unable to verify usage
   */
  private showDeleteRobotTypeConfirmationWithWarning(robotType: RobotTypeDisplayData): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Robot Type',
      message: `Unable to verify usage. Delete robot type "${robotType.displayName}" anyway?`,
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
        this.robotTypesService.deleteRobotType(robotType.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (error) => {
              console.error('Error deleting robot type:', error);
            }
          });
      }
    });
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
    const dialogRef = this.dialog.open(RobotTypeDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createRobotType(result);
      }
    });
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
  private createRobotType(request: RobotTypeCreateRequest): void {
    this.robotTypesService.createRobotType(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error creating robot type:', error);
        }
      });
  }

  /**
   * Update robot type
   */
  private updateRobotType(id: number, request: RobotTypeUpdateRequest): void {
    this.robotTypesService.updateRobotType(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error updating robot type:', error);
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