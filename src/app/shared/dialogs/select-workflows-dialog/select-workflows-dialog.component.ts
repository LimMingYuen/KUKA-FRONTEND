import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { WorkflowDisplayData } from '../../../models/workflow.models';

export interface SelectWorkflowsDialogData {
  workflowsByZone: Map<string, WorkflowDisplayData[]>;
  selectedIds: Set<number>;
}

export interface SelectWorkflowsDialogResult {
  selectedIds: Set<number>;
}

@Component({
  selector: 'app-select-workflows-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
    MatDividerModule
  ],
  templateUrl: './select-workflows-dialog.component.html',
  styleUrl: './select-workflows-dialog.component.scss'
})
export class SelectWorkflowsDialogComponent {
  public searchText = '';
  public selectedIds: Set<number>;
  public workflowsByZone: Map<string, WorkflowDisplayData[]>;
  public filteredWorkflowsByZone: Map<string, WorkflowDisplayData[]>;
  public totalWorkflows = 0;

  constructor(
    public dialogRef: MatDialogRef<SelectWorkflowsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SelectWorkflowsDialogData
  ) {
    this.workflowsByZone = data.workflowsByZone;
    this.selectedIds = new Set(data.selectedIds);
    this.filteredWorkflowsByZone = new Map(data.workflowsByZone);

    // Calculate total workflows
    data.workflowsByZone.forEach(workflows => {
      this.totalWorkflows += workflows.length;
    });
  }

  /**
   * Filter workflows by search text
   */
  onSearchChange(): void {
    if (!this.searchText.trim()) {
      this.filteredWorkflowsByZone = new Map(this.workflowsByZone);
      return;
    }

    const searchLower = this.searchText.toLowerCase().trim();
    const filtered = new Map<string, WorkflowDisplayData[]>();

    this.workflowsByZone.forEach((workflows, zoneName) => {
      const matchingWorkflows = workflows.filter(w =>
        w.name.toLowerCase().includes(searchLower) ||
        w.code.toLowerCase().includes(searchLower)
      );
      if (matchingWorkflows.length > 0) {
        filtered.set(zoneName, matchingWorkflows);
      }
    });

    this.filteredWorkflowsByZone = filtered;
  }

  /**
   * Toggle workflow selection
   */
  toggleWorkflow(workflowId: number): void {
    if (this.selectedIds.has(workflowId)) {
      this.selectedIds.delete(workflowId);
    } else {
      this.selectedIds.add(workflowId);
    }
  }

  /**
   * Check if workflow is selected
   */
  isSelected(workflowId: number): boolean {
    return this.selectedIds.has(workflowId);
  }

  /**
   * Select all workflows
   */
  selectAll(): void {
    this.workflowsByZone.forEach(workflows => {
      workflows.forEach(w => this.selectedIds.add(w.id));
    });
  }

  /**
   * Deselect all workflows
   */
  deselectAll(): void {
    this.selectedIds.clear();
  }

  /**
   * Toggle all workflows in a zone
   */
  toggleZone(zoneName: string): void {
    const workflows = this.workflowsByZone.get(zoneName);
    if (!workflows) return;

    const allSelected = workflows.every(w => this.selectedIds.has(w.id));

    if (allSelected) {
      workflows.forEach(w => this.selectedIds.delete(w.id));
    } else {
      workflows.forEach(w => this.selectedIds.add(w.id));
    }
  }

  /**
   * Check if all workflows in zone are selected
   */
  isZoneAllSelected(zoneName: string): boolean {
    const workflows = this.workflowsByZone.get(zoneName);
    if (!workflows || workflows.length === 0) return false;
    return workflows.every(w => this.selectedIds.has(w.id));
  }

  /**
   * Check if some workflows in zone are selected
   */
  isZoneIndeterminate(zoneName: string): boolean {
    const workflows = this.workflowsByZone.get(zoneName);
    if (!workflows || workflows.length === 0) return false;
    const selectedCount = workflows.filter(w => this.selectedIds.has(w.id)).length;
    return selectedCount > 0 && selectedCount < workflows.length;
  }

  /**
   * Get selected count
   */
  get selectedCount(): number {
    return this.selectedIds.size;
  }

  /**
   * Cancel and close dialog
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Apply selection and close dialog
   */
  onApply(): void {
    this.dialogRef.close({
      selectedIds: this.selectedIds
    } as SelectWorkflowsDialogResult);
  }
}
