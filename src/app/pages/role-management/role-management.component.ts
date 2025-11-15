import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import { RoleDto, RoleCreateRequest, RoleUpdateRequest } from '../../models/role.models';
import { RoleService } from '../../services/role.service';
import { ROLE_MANAGEMENT_TABLE_CONFIG } from './role-management-table.config';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [
    CommonModule,
    GenericTableComponent,
    MatSnackBarModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  templateUrl: './role-management.component.html',
  styleUrl: './role-management.component.scss'
})
export class RoleManagementComponent implements OnInit, OnDestroy {
  tableData: RoleDto[] = [];
  tableConfig: TableConfig<RoleDto> = ROLE_MANAGEMENT_TABLE_CONFIG;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private roleService: RoleService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all roles from the API
   */
  loadData(): void {
    this.isLoading = true;
    this.roleService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.tableData = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading roles:', err);
          this.snackBar.open(err.message || 'Failed to load roles', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle table actions (edit, delete, add)
   */
  handleAction(event: ActionEvent): void {
    switch (event.action) {
      case 'add':
        this.openAddDialog();
        break;
      case 'edit':
        this.openEditDialog(event.row as RoleDto);
        break;
      case 'delete':
        this.deleteRole(event.row as RoleDto);
        break;
      default:
        console.warn('Unknown action:', event.action);
    }
  }

  /**
   * Open dialog to add a new role
   */
  private openAddDialog(): void {
    const dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '500px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createRole(result);
      }
    });
  }

  /**
   * Open dialog to edit an existing role
   */
  private openEditDialog(role: RoleDto): void {
    const dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '500px',
      data: { mode: 'edit', role }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateRole(role.id, result);
      }
    });
  }

  /**
   * Create a new role
   */
  private createRole(request: RoleCreateRequest): void {
    this.isLoading = true;
    this.roleService
      .create(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Role created successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error creating role:', err);
          this.snackBar.open(err.message || 'Failed to create role', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Update an existing role
   */
  private updateRole(id: number, request: RoleUpdateRequest): void {
    this.isLoading = true;
    this.roleService
      .update(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Role updated successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error updating role:', err);
          this.snackBar.open(err.message || 'Failed to update role', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Delete a role
   */
  private deleteRole(role: RoleDto): void {
    if (role.isProtected) {
      this.snackBar.open('Cannot delete protected role', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (
      !confirm(`Are you sure you want to delete role "${role.name}"? This action cannot be undone.`)
    ) {
      return;
    }

    this.isLoading = true;
    this.roleService
      .delete(role.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Role deleted successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error deleting role:', err);
          this.snackBar.open(err.message || 'Failed to delete role', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }
}

/**
 * Dialog component for creating/editing roles
 */
@Component({
  selector: 'app-role-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Add Role' : 'Edit Role' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="roleForm" class="role-form">
        <mat-form-field appearance="outline">
          <mat-label>Role Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter role name" required />
          <mat-error *ngIf="roleForm.get('name')?.hasError('required')">
            Role name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Role Code</mat-label>
          <input
            matInput
            formControlName="roleCode"
            placeholder="e.g., ADMIN, OPERATOR"
            required
          />
          <mat-error *ngIf="roleForm.get('roleCode')?.hasError('required')">
            Role code is required
          </mat-error>
          <mat-hint>Unique identifier for the role (uppercase recommended)</mat-hint>
        </mat-form-field>

        <div class="checkbox-field">
          <mat-checkbox formControlName="isProtected">Protected Role</mat-checkbox>
          <p class="checkbox-hint">Protected roles cannot be deleted</p>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!roleForm.valid">
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .role-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-width: 400px;
        padding: 1rem 0;
      }

      mat-form-field {
        width: 100%;
      }

      .checkbox-field {
        padding: 0.5rem 0;
      }

      .checkbox-hint {
        margin: 0.5rem 0 0 0;
        font-size: 0.75rem;
        color: rgba(0, 0, 0, 0.6);
      }
    `
  ]
})
export class RoleFormDialogComponent {
  roleForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RoleFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; role?: RoleDto }
  ) {
    this.roleForm = this.fb.group({
      name: [data.role?.name || '', Validators.required],
      roleCode: [data.role?.roleCode || '', Validators.required],
      isProtected: [data.role?.isProtected || false]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.roleForm.valid) {
      const formValue = this.roleForm.value;

      if (this.data.mode === 'create') {
        const request: RoleCreateRequest = {
          name: formValue.name,
          roleCode: formValue.roleCode,
          isProtected: formValue.isProtected
        };
        this.dialogRef.close(request);
      } else {
        const request: RoleUpdateRequest = {
          name: formValue.name,
          roleCode: formValue.roleCode,
          isProtected: formValue.isProtected
        };
        this.dialogRef.close(request);
      }
    }
  }
}
