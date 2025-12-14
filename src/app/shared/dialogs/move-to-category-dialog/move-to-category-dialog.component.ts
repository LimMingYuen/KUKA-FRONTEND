import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';

import { TemplateCategoryDto } from '../../../models/template-category.models';
import { SavedCustomMissionsDisplayData } from '../../../models/saved-custom-missions.models';

export interface MoveToCategoryDialogData {
  template: SavedCustomMissionsDisplayData;
  categories: TemplateCategoryDto[];
  currentCategoryId: number | null;
}

export interface MoveToCategoryDialogResult {
  categoryId: number | null;
}

@Component({
  selector: 'app-move-to-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatRadioModule
  ],
  templateUrl: './move-to-category-dialog.component.html',
  styleUrl: './move-to-category-dialog.component.scss'
})
export class MoveToCategoryDialogComponent {
  selectedCategoryId: number | null;
  categories: TemplateCategoryDto[];
  templateName: string;

  constructor(
    public dialogRef: MatDialogRef<MoveToCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MoveToCategoryDialogData
  ) {
    this.selectedCategoryId = data.currentCategoryId;
    this.categories = data.categories;
    this.templateName = data.template.missionName;
  }

  selectCategory(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
  }

  isSelected(categoryId: number | null): boolean {
    return this.selectedCategoryId === categoryId;
  }

  confirm(): void {
    this.dialogRef.close({ categoryId: this.selectedCategoryId } as MoveToCategoryDialogResult);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
