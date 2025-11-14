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

import { ShelfDecisionRulesService } from '../../services/shelf-decision-rules.service';
import {
  ShelfDecisionRuleDisplayData,
  ShelfDecisionRuleCreateRequest,
  ShelfDecisionRuleUpdateRequest,
  getStatusClass,
  getValueClass,
  isValidDisplayName,
  isValidActualValue,
  isValidDescription
} from '../../models/shelf-decision-rules.models';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { SHELF_DECISION_RULES_TABLE_CONFIG } from './shelf-decision-rules-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';

@Component({
  selector: 'app-shelf-decision-rules',
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
  templateUrl: './shelf-decision-rules.component.html',
  styleUrl: './shelf-decision-rules.component.css'
})
export class ShelfDecisionRulesComponent implements OnInit, OnDestroy {
  // Table data
  public shelfDecisionRules: ShelfDecisionRuleDisplayData[] = [];

  // Table configuration
  public tableConfig = SHELF_DECISION_RULES_TABLE_CONFIG;

  // UI state
  public isLoading = false;
  public isCreating = false;
  public isUpdating = false;
  public isDeleting = false;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Form for create/edit
  public ruleForm!: FormGroup;

  constructor(
    public shelfDecisionRulesService: ShelfDecisionRulesService,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    // Initialize form
    this.initializeForm();

    // Configure empty state action
    this.tableConfig.empty!.action = () => this.openCreateDialog();

    // Set up reactive effects for service state changes
    effect(() => {
      this.isLoading = this.shelfDecisionRulesService.isLoading();
    });

    effect(() => {
      this.isCreating = this.shelfDecisionRulesService.isCreating();
      // Update header action loading state
      const createAction = this.tableConfig.headerActions?.find(action => action.action === 'create-rule');
      if (createAction) {
        createAction.loading = this.isCreating;
      }
    });

    effect(() => {
      this.isUpdating = this.shelfDecisionRulesService.isUpdating();
    });

    effect(() => {
      this.isDeleting = this.shelfDecisionRulesService.isDeleting();
    });

    effect(() => {
      this.shelfDecisionRules = this.shelfDecisionRulesService.rules();
    });
  }

  ngOnInit(): void {
    this.loadShelfDecisionRules();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form
   */
  private initializeForm(): void {
    this.ruleForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      actualValue: [0, [Validators.required, Validators.min(-999999), Validators.max(999999)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  
  /**
   * Load shelf decision rules from the service
   */
  private loadShelfDecisionRules(): void {
    this.shelfDecisionRulesService.getShelfDecisionRules()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading shelf decision rules:', error);
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewRule(event.row);
        break;
      case 'edit':
        this.editRule(event.row);
        break;
      case 'toggle-status':
        this.toggleRuleStatus(event.row);
        break;
      case 'delete':
        this.deleteRule(event.row);
        break;
      case 'refresh':
        this.refreshRules();
        break;
      case 'create-rule':
        this.openCreateDialog();
        break;
      case 'export':
        this.exportRules();
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
   * View rule details
   */
  private viewRule(rule: ShelfDecisionRuleDisplayData): void {
    // TODO: Implement view dialog
    console.log('View rule:', rule);
  }

  /**
   * Edit rule
   */
  private editRule(rule: ShelfDecisionRuleDisplayData): void {
    // TODO: Implement edit dialog
    console.log('Edit rule:', rule);
  }

  /**
   * Toggle rule status
   */
  private toggleRuleStatus(rule: ShelfDecisionRuleDisplayData): void {
    this.shelfDecisionRulesService.toggleRuleStatus(rule.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error toggling rule status:', error);
        }
      });
  }

  /**
   * Delete rule with confirmation
   */
  private deleteRule(rule: ShelfDecisionRuleDisplayData): void {
    if (confirm(`Are you sure you want to delete rule "${rule.displayName}"?`)) {
      this.shelfDecisionRulesService.deleteShelfDecisionRule(rule.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {
            console.error('Error deleting rule:', error);
          }
        });
    }
  }

  /**
   * Refresh rules
   */
  private refreshRules(): void {
    this.loadShelfDecisionRules();
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
   * Export rules data
   */
  private exportRules(): void {
    this.shelfDecisionRulesService.exportShelfDecisionRules()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'shelf-decision-rules-export.csv');
        },
        error: (error) => {
          console.error('Error exporting rules:', error);
        }
      });
  }

  /**
   * Create new rule
   */
  createRule(): void {
    if (this.ruleForm.invalid) {
      this.markFormGroupTouched(this.ruleForm);
      return;
    }

    const formValue = this.ruleForm.value;

    if (!this.validateRuleData(formValue.displayName, formValue.actualValue, formValue.description)) {
      return;
    }

    const request: ShelfDecisionRuleCreateRequest = {
      displayName: formValue.displayName.trim(),
      actualValue: formValue.actualValue,
      description: formValue.description?.trim() || '',
      isActive: formValue.isActive
    };

    this.shelfDecisionRulesService.createShelfDecisionRule(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetForm();
        },
        error: (error) => {
          console.error('Error creating rule:', error);
        }
      });
  }

  /**
   * Validate rule data
   */
  private validateRuleData(displayName: string, actualValue: number, description: string): boolean {
    if (!isValidDisplayName(displayName)) {
      this.showErrorMessage('Display name must be between 3 and 100 characters');
      return false;
    }

    if (!isValidActualValue(actualValue)) {
      this.showErrorMessage('Actual value must be a valid number');
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
    this.ruleForm.reset({
      displayName: '',
      actualValue: 0,
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
  getCellValue(row: ShelfDecisionRuleDisplayData, column: any): string {
    const key = column.key as keyof ShelfDecisionRuleDisplayData;
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
   * Get CSS class for value display
   */
  getValueClass(value: number): string {
    return getValueClass(value);
  }

  /**
   * Get rules count
   */
  getRulesCount(): { active: number; inactive: number; total: number } {
    return this.shelfDecisionRulesService.getRulesCount();
  }
}