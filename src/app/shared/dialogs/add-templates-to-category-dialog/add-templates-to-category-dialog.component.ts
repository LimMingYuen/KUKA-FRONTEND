import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { SavedCustomMissionsDisplayData } from '../../../models/saved-custom-missions.models';

export interface AddTemplatesToCategoryDialogData {
  categoryName: string;
  categoryId: number | null;  // null for Uncategorized
  allTemplates: SavedCustomMissionsDisplayData[];
}

export interface AddTemplatesToCategoryDialogResult {
  selectedTemplateIds: number[];
}

@Component({
  selector: 'app-add-templates-to-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatDividerModule
  ],
  templateUrl: './add-templates-to-category-dialog.component.html',
  styleUrl: './add-templates-to-category-dialog.component.scss'
})
export class AddTemplatesToCategoryDialogComponent {
  searchText = '';
  selectedIds: Set<number> = new Set();
  availableTemplates: SavedCustomMissionsDisplayData[] = [];
  filteredTemplates: SavedCustomMissionsDisplayData[] = [];

  constructor(
    public dialogRef: MatDialogRef<AddTemplatesToCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddTemplatesToCategoryDialogData
  ) {
    // Filter templates based on target category:
    // - If adding to a named category: only show Uncategorized templates
    // - If adding to Uncategorized: show templates from other categories
    if (data.categoryName === 'Uncategorized') {
      // Show templates that are in other categories (have a categoryName)
      this.availableTemplates = data.allTemplates.filter(t => t.categoryName && t.categoryName !== 'Uncategorized');
    } else {
      // Show only Uncategorized templates (not assigned to any category)
      this.availableTemplates = data.allTemplates.filter(t => !t.categoryName || t.categoryName === 'Uncategorized');
    }
    this.filteredTemplates = [...this.availableTemplates];
  }

  onSearchChange(): void {
    if (!this.searchText.trim()) {
      this.filteredTemplates = [...this.availableTemplates];
      return;
    }

    const searchLower = this.searchText.toLowerCase().trim();
    this.filteredTemplates = this.availableTemplates.filter(t =>
      t.missionName.toLowerCase().includes(searchLower) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(searchLower))
    );
  }

  toggleTemplate(templateId: number): void {
    if (this.selectedIds.has(templateId)) {
      this.selectedIds.delete(templateId);
    } else {
      this.selectedIds.add(templateId);
    }
  }

  isSelected(templateId: number): boolean {
    return this.selectedIds.has(templateId);
  }

  selectAll(): void {
    this.filteredTemplates.forEach(t => this.selectedIds.add(t.id));
  }

  deselectAll(): void {
    this.selectedIds.clear();
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    this.dialogRef.close({
      selectedTemplateIds: Array.from(this.selectedIds)
    } as AddTemplatesToCategoryDialogResult);
  }
}
