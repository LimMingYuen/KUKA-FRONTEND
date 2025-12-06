import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { WorkflowTemplateService } from '../../services/workflow-template.service';
import { AuthService } from '../../services/auth.service';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';
import { getWorkflowTemplateTableConfig } from './workflow-template-table.config';
import { ActionEvent, TableConfig } from '../../shared/models/table.models';

@Component({
  selector: 'app-create-workflow-template',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    GenericTableComponent
  ],
  templateUrl: './create-workflow-template.component.html',
  styleUrl: './create-workflow-template.component.scss'
})
export class CreateWorkflowTemplateComponent implements OnInit, OnDestroy {
  // Table data
  public workflowTemplates: SavedCustomMissionsDisplayData[] = [];

  // Table configuration - dynamically generated based on user role
  public tableConfig: TableConfig<SavedCustomMissionsDisplayData>;

  // UI state
  public isLoading = false;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(
    private workflowTemplateService: WorkflowTemplateService,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    // Configure table based on user role (SuperAdmin sees status column and toggle action)
    this.tableConfig = getWorkflowTemplateTableConfig(this.authService.isSuperAdmin());

    // Configure empty state action
    this.tableConfig.empty!.action = () => this.openCreateDialog();
  }

  ngOnInit(): void {
    this.loadWorkflowTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load workflow templates from the service
   */
  private loadWorkflowTemplates(): void {
    this.isLoading = true;
    this.workflowTemplateService.getAllSavedCustomMissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          this.workflowTemplates = templates;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading workflow templates:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle table actions
   */
  onTableAction(event: ActionEvent): void {
    switch (event.action) {
      case 'view':
        this.viewTemplate(event.row);
        break;
      case 'edit':
        this.openEditDialog(event.row);
        break;
      case 'delete':
        this.deleteTemplate(event.row);
        break;
      case 'toggle-status':
        this.toggleTemplateStatus(event.row);
        break;
      case 'create':
        this.openCreateDialog();
        break;
      case 'refresh':
        this.refreshTemplates();
        break;
      default:
        console.log('Unknown action:', event.action);
    }
  }

  /**
   * Navigate to create template page
   */
  private openCreateDialog(): void {
    this.router.navigate(['/workflow-template-form']);
  }

  /**
   * Navigate to edit template page
   */
  private openEditDialog(template: SavedCustomMissionsDisplayData): void {
    this.router.navigate(['/workflow-template-form', template.id], {
      queryParams: { mode: 'edit' }
    });
  }

  /**
   * Navigate to view template page
   */
  private viewTemplate(template: SavedCustomMissionsDisplayData): void {
    this.router.navigate(['/workflow-template-form', template.id], {
      queryParams: { mode: 'view' }
    });
  }

  /**
   * Delete template with confirmation
   */
  private deleteTemplate(template: SavedCustomMissionsDisplayData): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Template',
      message: `Are you sure you want to delete workflow template "${template.missionName}"? This action cannot be undone.`,
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
        this.workflowTemplateService.deleteSavedCustomMission(template.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.refreshTemplates();
            },
            error: (error) => {
              console.error('Error deleting template:', error);
            }
          });
      }
    });
  }

  /**
   * Toggle template status (SuperAdmin only)
   */
  private toggleTemplateStatus(template: SavedCustomMissionsDisplayData): void {
    const newStatus = template.isActive ? 'inactive' : 'active';
    const dialogData: ConfirmationDialogData = {
      title: 'Change Template Status',
      message: `Are you sure you want to set workflow template "${template.missionName}" to ${newStatus}?`,
      icon: 'warning',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      showCancel: true,
      confirmColor: 'primary'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result === true) {
        this.workflowTemplateService.toggleTemplateStatus(template.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.refreshTemplates();
            },
            error: (error) => {
              console.error('Error toggling template status:', error);
            }
          });
      }
    });
  }

  /**
   * Refresh templates list
   */
  private refreshTemplates(): void {
    this.loadWorkflowTemplates();
  }
}
