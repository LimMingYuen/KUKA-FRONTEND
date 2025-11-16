import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { SavedCustomMissionsService } from '../../services/saved-custom-missions.service';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';
import { WORKFLOW_TEMPLATE_TABLE_CONFIG } from './workflow-template-table.config';
import { WorkflowTemplateDialogComponent, WorkflowTemplateDialogData } from './workflow-template-dialog.component';
import { ActionEvent } from '../../shared/models/table.models';

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

  // Table configuration
  public tableConfig = WORKFLOW_TEMPLATE_TABLE_CONFIG;

  // UI state
  public isLoading = false;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(
    private savedCustomMissionsService: SavedCustomMissionsService,
    private dialog: MatDialog
  ) {
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
    this.savedCustomMissionsService.getAllSavedCustomMissions()
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
   * Open create template dialog
   */
  private openCreateDialog(): void {
    const dialogData: WorkflowTemplateDialogData = {
      mode: 'create'
    };

    const dialogRef = this.dialog.open(WorkflowTemplateDialogComponent, {
      width: '95vw',
      maxWidth: '1400px',
      maxHeight: '90vh',
      disableClose: true,
      data: dialogData,
      panelClass: 'workflow-template-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createTemplate(result);
      }
    });
  }

  /**
   * Open edit template dialog
   */
  private openEditDialog(template: SavedCustomMissionsDisplayData): void {
    const dialogData: WorkflowTemplateDialogData = {
      mode: 'edit',
      template: template
    };

    const dialogRef = this.dialog.open(WorkflowTemplateDialogComponent, {
      width: '95vw',
      maxWidth: '1400px',
      maxHeight: '90vh',
      disableClose: true,
      data: dialogData,
      panelClass: 'workflow-template-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateTemplate(template.id, result);
      }
    });
  }

  /**
   * Create new template
   */
  private createTemplate(request: any): void {
    this.savedCustomMissionsService.saveMissionAsTemplate(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.refreshTemplates();
        },
        error: (error) => {
          console.error('Error creating template:', error);
        }
      });
  }

  /**
   * Update existing template
   */
  private updateTemplate(id: number, request: any): void {
    this.savedCustomMissionsService.updateWorkflowTemplate(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.refreshTemplates();
        },
        error: (error) => {
          console.error('Error updating template:', error);
        }
      });
  }

  /**
   * View template details
   */
  private viewTemplate(template: SavedCustomMissionsDisplayData): void {
    // Open read-only dialog or navigate to detail view
    const dialogData: WorkflowTemplateDialogData = {
      mode: 'edit',
      template: template
    };

    this.dialog.open(WorkflowTemplateDialogComponent, {
      width: '95vw',
      maxWidth: '1400px',
      maxHeight: '90vh',
      data: dialogData,
      panelClass: 'workflow-template-dialog'
    });
  }

  /**
   * Delete template with confirmation
   */
  private deleteTemplate(template: SavedCustomMissionsDisplayData): void {
    const message = `Are you sure you want to delete workflow template "${template.missionName}"? This action cannot be undone.`;

    if (confirm(message)) {
      this.savedCustomMissionsService.deleteSavedCustomMission(template.id)
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
  }

  /**
   * Refresh templates list
   */
  private refreshTemplates(): void {
    this.loadWorkflowTemplates();
  }
}
