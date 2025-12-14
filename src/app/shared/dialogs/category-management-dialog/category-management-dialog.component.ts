import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';

import { TemplateCategoryService } from '../../../services/template-category.service';
import { TemplateCategoryDto } from '../../../models/template-category.models';

export interface CategoryManagementDialogData {
  categories: TemplateCategoryDto[];
}

export interface CategoryManagementDialogResult {
  refreshNeeded: boolean;
}

@Component({
  selector: 'app-category-management-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './category-management-dialog.component.html',
  styleUrl: './category-management-dialog.component.scss'
})
export class CategoryManagementDialogComponent implements OnInit, OnDestroy {
  categories: TemplateCategoryDto[] = [];
  isLoading = false;
  isSaving = false;
  hasChanges = false;

  // Form for adding/editing category
  categoryForm: FormGroup;
  editingCategory: TemplateCategoryDto | null = null;
  showForm = false;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<CategoryManagementDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CategoryManagementDialogData | null,
    private categoryService: TemplateCategoryService,
    private fb: FormBuilder
  ) {
    // Initialize with passed data or empty array (will be loaded in ngOnInit)
    this.categories = data?.categories ? [...data.categories] : [];
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(128)]],
      description: ['', [Validators.maxLength(512)]]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  showAddForm(): void {
    this.editingCategory = null;
    this.categoryForm.reset({
      name: '',
      description: ''
    });
    this.showForm = true;
  }

  showEditForm(category: TemplateCategoryDto): void {
    this.editingCategory = category;
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description || ''
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingCategory = null;
    this.categoryForm.reset();
  }

  saveCategory(): void {
    if (this.categoryForm.invalid || this.isSaving) {
      return;
    }

    this.isSaving = true;
    const formValue = this.categoryForm.value;

    if (this.editingCategory) {
      // Update existing category (preserve existing displayOrder)
      this.categoryService.update(this.editingCategory.id, {
        name: formValue.name,
        description: formValue.description || null,
        displayOrder: this.editingCategory.displayOrder
      }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.hasChanges = true;
            this.cancelForm();
            this.loadCategories();
          },
          error: () => {
            this.isSaving = false;
          }
        });
    } else {
      // Create new category (use 0 as default displayOrder)
      this.categoryService.create({
        name: formValue.name,
        description: formValue.description || null,
        displayOrder: 0
      }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.hasChanges = true;
            this.cancelForm();
            this.loadCategories();
          },
          error: () => {
            this.isSaving = false;
          }
        });
    }
  }

  deleteCategory(category: TemplateCategoryDto): void {
    if (!confirm(`Are you sure you want to delete "${category.name}"?\n\nTemplates in this category will be moved to Uncategorized.`)) {
      return;
    }

    this.categoryService.delete(category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.hasChanges = true;
          this.loadCategories();
        }
      });
  }

  close(): void {
    this.dialogRef.close({ refreshNeeded: this.hasChanges } as CategoryManagementDialogResult);
  }
}
