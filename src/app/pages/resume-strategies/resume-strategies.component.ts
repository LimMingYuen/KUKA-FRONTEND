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

import { ResumeStrategiesService } from '../../services/resume-strategies.service';
import {
  ResumeStrategyDisplayData,
  ResumeStrategyCreateRequest,
  ResumeStrategyUpdateRequest,
  getStatusClass,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription
} from '../../models/resume-strategies.models';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { RESUME_STRATEGIES_TABLE_CONFIG } from './resume-strategies-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';
import { ResumeStrategyDialogComponent } from './resume-strategy-dialog.component';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-resume-strategies',
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
  templateUrl: './resume-strategies.component.html',
  styleUrl: './resume-strategies.component.css'
})
export class ResumeStrategiesComponent implements OnInit, OnDestroy {
  // Table configuration
  public tableConfig = RESUME_STRATEGIES_TABLE_CONFIG;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Form for create/edit
  public resumeStrategyForm!: FormGroup;

  constructor(
    public resumeStrategiesService: ResumeStrategiesService,
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
    this.loadResumeStrategies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    this.resumeStrategyForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      actualValue: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  /**
   * Load resume strategies from the service
   */
  private loadResumeStrategies(): void {
    this.resumeStrategiesService.getResumeStrategies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading resume strategies:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewResumeStrategy(event.row);
        break;
      case 'edit':
        this.editResumeStrategy(event.row);
        break;
      case 'toggle-status':
        this.toggleResumeStrategyStatus(event.row);
        break;
      case 'delete':
        this.deleteResumeStrategy(event.row);
        break;
      case 'refresh':
        this.refreshResumeStrategies();
        break;
      case 'create-resume-strategy':
        this.openCreateDialog();
        break;
      case 'export':
        this.exportResumeStrategies();
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
   * View resume strategy details
   */
  private viewResumeStrategy(resumeStrategy: ResumeStrategyDisplayData): void {
    this.dialog.open(ResumeStrategyDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      data: {
        mode: 'view',
        resumeStrategy: resumeStrategy
      }
    });
  }

  /**
   * Edit resume strategy
   */
  private editResumeStrategy(resumeStrategy: ResumeStrategyDisplayData): void {
    const dialogRef = this.dialog.open(ResumeStrategyDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        mode: 'edit',
        resumeStrategy: resumeStrategy
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateResumeStrategy(resumeStrategy.id, result);
      }
    });
  }

  /**
   * Toggle resume strategy status
   */
  private toggleResumeStrategyStatus(resumeStrategy: ResumeStrategyDisplayData): void {
    this.resumeStrategiesService.toggleResumeStrategyStatus(resumeStrategy.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error toggling resume strategy status:', error);
        }
      });
  }

  /**
   * Delete resume strategy with confirmation
   */
  private deleteResumeStrategy(resumeStrategy: ResumeStrategyDisplayData): void {
    if (resumeStrategy.isActive) {
      this.snackBar.open('Cannot delete an active resume strategy. Please set it to inactive first.', 'Dismiss', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }
    this.showDeleteResumeStrategyConfirmation(resumeStrategy);
  }

  /**
   * Show delete confirmation dialog for resume strategy
   */
  private showDeleteResumeStrategyConfirmation(resumeStrategy: ResumeStrategyDisplayData): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Resume Strategy',
      message: `Are you sure you want to delete resume strategy "${resumeStrategy.displayName}"?`,
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
        this.resumeStrategiesService.deleteResumeStrategy(resumeStrategy.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (error) => {
              console.error('Error deleting resume strategy:', error);
            }
          });
      }
    });
  }

  /**
   * Refresh resume strategies
   */
  public refreshResumeStrategies(): void {
    this.loadResumeStrategies();
  }

  /**
   * Open create dialog
   */
  public openCreateDialog(): void {
    const dialogRef = this.dialog.open(ResumeStrategyDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createResumeStrategy(result);
      }
    });
  }

  /**
   * Export resume strategies data
   */
  public exportResumeStrategies(): void {
    this.resumeStrategiesService.exportResumeStrategies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'resume-strategies-export.csv');
        },
        error: (error) => {
          console.error('Error exporting resume strategies:', error);
        }
      });
  }

  /**
   * Create new resume strategy
   */
  private createResumeStrategy(request: ResumeStrategyCreateRequest): void {
    this.resumeStrategiesService.createResumeStrategy(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error creating resume strategy:', error);
        }
      });
  }

  /**
   * Update resume strategy
   */
  private updateResumeStrategy(id: number, request: ResumeStrategyUpdateRequest): void {
    this.resumeStrategiesService.updateResumeStrategy(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error updating resume strategy:', error);
        }
      });
  }

  /**
   * Validate resume strategy data
   */
  private validateResumeStrategyData(displayName: string, actualValue: string, description: string): boolean {
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
    this.resumeStrategyForm.reset({
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
   * Get resume strategies count
   */
  getResumeStrategiesCount(): { active: number; inactive: number; total: number } {
    return this.resumeStrategiesService.getResumeStrategiesCount();
  }
}
