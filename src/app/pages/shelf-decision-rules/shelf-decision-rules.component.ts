import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ShelfDecisionRulesService } from '../../services/shelf-decision-rules.service';
import {
  ShelfDecisionRuleDisplayData,
  getStatusClass,
  getValueClass
} from '../../models/shelf-decision-rules.models';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { SHELF_DECISION_RULES_TABLE_CONFIG } from './shelf-decision-rules-table.config';
import { ActionEvent, SortEvent, PageEvent, FilterEvent } from '../../shared/models/table.models';
import { ShelfDecisionRuleDialogComponent, ShelfDecisionRuleDialogData } from './shelf-decision-rule-dialog.component';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';

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
    GenericTableComponent
  ],
  templateUrl: './shelf-decision-rules.component.html',
  styleUrl: './shelf-decision-rules.component.css'
})
export class ShelfDecisionRulesComponent implements OnInit, OnDestroy {
  // Table configuration
  public tableConfig = SHELF_DECISION_RULES_TABLE_CONFIG;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(
    public shelfDecisionRulesService: ShelfDecisionRulesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Configure empty state action
    this.tableConfig.empty!.action = () => this.openCreateDialog();
  }

  ngOnInit(): void {
    this.loadShelfDecisionRules();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    const dialogData: ShelfDecisionRuleDialogData = {
      mode: 'view',
      rule: rule
    };

    this.dialog.open(ShelfDecisionRuleDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      data: dialogData
    });
  }

  /**
   * Edit rule
   */
  private editRule(rule: ShelfDecisionRuleDisplayData): void {
    this.openEditDialog(rule);
  }

  /**
   * Delete rule with confirmation
   */
  private deleteRule(rule: ShelfDecisionRuleDisplayData): void {
    if (rule.isActive) {
      this.snackBar.open('Cannot delete an active shelf decision rule. Please set it to inactive first.', 'Dismiss', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const dialogData: ConfirmationDialogData = {
      title: 'Delete Rule',
      message: `Are you sure you want to delete rule "${rule.displayName}"?`,
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
        this.shelfDecisionRulesService.deleteShelfDecisionRule(rule.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (error) => {
              console.error('Error deleting rule:', error);
            }
          });
      }
    });
  }

  /**
   * Toggle rule active/inactive status
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
   * Refresh rules
   */
  private refreshRules(): void {
    this.loadShelfDecisionRules();
  }

  /**
   * Open create dialog
   */
  private openCreateDialog(): void {
    const dialogData: ShelfDecisionRuleDialogData = {
      mode: 'create'
    };

    const dialogRef = this.dialog.open(ShelfDecisionRuleDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createRule(result);
      }
    });
  }


  /**
   * Create new rule
   */
  private createRule(request: any): void {
    this.shelfDecisionRulesService.createShelfDecisionRule(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Rule created successfully
        },
        error: (error) => {
          console.error('Error creating rule:', error);
        }
      });
  }

  /**
   * Open edit dialog
   */
  private openEditDialog(rule: ShelfDecisionRuleDisplayData): void {
    const dialogData: ShelfDecisionRuleDialogData = {
      mode: 'edit',
      rule: rule
    };

    const dialogRef = this.dialog.open(ShelfDecisionRuleDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateRule(rule.id, result);
      }
    });
  }

  /**
   * Update existing rule
   */
  private updateRule(id: number, request: any): void {
    this.shelfDecisionRulesService.updateShelfDecisionRule(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Rule updated successfully
        },
        error: (error) => {
          console.error('Error updating rule:', error);
        }
      });
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
  getValueClass(value: string): string {
    return getValueClass(value);
  }

  /**
   * Get rules count
   */
  getRulesCount(): { active: number; inactive: number; total: number } {
    return this.shelfDecisionRulesService.getRulesCount();
  }
}