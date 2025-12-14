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
import { SavedCustomMissionsDisplayData } from '../../../models/saved-custom-missions.models';

export interface SelectTemplatesDialogData {
  templatesByZone: Map<string, SavedCustomMissionsDisplayData[]>;
  selectedIds: Set<number>;
}

export interface SelectTemplatesDialogResult {
  selectedIds: Set<number>;
}

@Component({
  selector: 'app-select-templates-dialog',
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
  templateUrl: './select-templates-dialog.component.html',
  styleUrl: './select-templates-dialog.component.scss'
})
export class SelectTemplatesDialogComponent {
  public searchText = '';
  public selectedIds: Set<number>;
  public templatesByZone: Map<string, SavedCustomMissionsDisplayData[]>;
  public filteredTemplatesByZone: Map<string, SavedCustomMissionsDisplayData[]>;
  public totalTemplates = 0;

  constructor(
    public dialogRef: MatDialogRef<SelectTemplatesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SelectTemplatesDialogData
  ) {
    this.templatesByZone = data.templatesByZone;
    this.selectedIds = new Set(data.selectedIds);
    this.filteredTemplatesByZone = new Map(data.templatesByZone);

    // Calculate total templates
    data.templatesByZone.forEach(templates => {
      this.totalTemplates += templates.length;
    });
  }

  /**
   * Filter templates by search text
   */
  onSearchChange(): void {
    if (!this.searchText.trim()) {
      this.filteredTemplatesByZone = new Map(this.templatesByZone);
      return;
    }

    const searchLower = this.searchText.toLowerCase().trim();
    const filtered = new Map<string, SavedCustomMissionsDisplayData[]>();

    this.templatesByZone.forEach((templates, zoneName) => {
      const matchingTemplates = templates.filter(t =>
        t.missionName.toLowerCase().includes(searchLower) ||
        (t.templateCode && t.templateCode.toLowerCase().includes(searchLower))
      );
      if (matchingTemplates.length > 0) {
        filtered.set(zoneName, matchingTemplates);
      }
    });

    this.filteredTemplatesByZone = filtered;
  }

  /**
   * Toggle template selection
   */
  toggleTemplate(templateId: number): void {
    if (this.selectedIds.has(templateId)) {
      this.selectedIds.delete(templateId);
    } else {
      this.selectedIds.add(templateId);
    }
  }

  /**
   * Check if template is selected
   */
  isSelected(templateId: number): boolean {
    return this.selectedIds.has(templateId);
  }

  /**
   * Select all templates
   */
  selectAll(): void {
    this.templatesByZone.forEach(templates => {
      templates.forEach(t => this.selectedIds.add(t.id));
    });
  }

  /**
   * Deselect all templates
   */
  deselectAll(): void {
    this.selectedIds.clear();
  }

  /**
   * Toggle all templates in a zone
   */
  toggleZone(zoneName: string): void {
    const templates = this.templatesByZone.get(zoneName);
    if (!templates) return;

    const allSelected = templates.every(t => this.selectedIds.has(t.id));

    if (allSelected) {
      templates.forEach(t => this.selectedIds.delete(t.id));
    } else {
      templates.forEach(t => this.selectedIds.add(t.id));
    }
  }

  /**
   * Check if all templates in zone are selected
   */
  isZoneAllSelected(zoneName: string): boolean {
    const templates = this.templatesByZone.get(zoneName);
    if (!templates || templates.length === 0) return false;
    return templates.every(t => this.selectedIds.has(t.id));
  }

  /**
   * Check if some templates in zone are selected
   */
  isZoneIndeterminate(zoneName: string): boolean {
    const templates = this.templatesByZone.get(zoneName);
    if (!templates || templates.length === 0) return false;
    const selectedCount = templates.filter(t => this.selectedIds.has(t.id)).length;
    return selectedCount > 0 && selectedCount < templates.length;
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
    } as SelectTemplatesDialogResult);
  }
}
