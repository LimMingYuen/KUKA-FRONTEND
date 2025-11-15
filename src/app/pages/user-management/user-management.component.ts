import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import { UserDto, UserCreateRequest, UserUpdateRequest } from '../../models/user.models';
import { UserService } from '../../services/user.service';
import { USER_MANAGEMENT_TABLE_CONFIG } from './user-management-table.config';

@Component({
  selector: 'app-user-management',
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
    MatChipsModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit, OnDestroy {
  tableData: UserDto[] = [];
  tableConfig: TableConfig<UserDto> = USER_MANAGEMENT_TABLE_CONFIG;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
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
   * Load all users from the API
   */
  loadData(): void {
    this.isLoading = true;
    this.userService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.tableData = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading users:', err);
          this.snackBar.open(err.message || 'Failed to load users', 'Close', {
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
        this.openEditDialog(event.row as UserDto);
        break;
      case 'delete':
        this.deleteUser(event.row as UserDto);
        break;
      default:
        console.warn('Unknown action:', event.action);
    }
  }

  /**
   * Open dialog to add a new user
   */
  private openAddDialog(): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createUser(result);
      }
    });
  }

  /**
   * Open dialog to edit an existing user
   */
  private openEditDialog(user: UserDto): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '600px',
      data: { mode: 'edit', user }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateUser(user.id, result);
      }
    });
  }

  /**
   * Create a new user
   */
  private createUser(request: UserCreateRequest): void {
    this.isLoading = true;
    this.userService
      .create(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('User created successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error creating user:', err);
          this.snackBar.open(err.message || 'Failed to create user', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Update an existing user
   */
  private updateUser(id: number, request: UserUpdateRequest): void {
    this.isLoading = true;
    this.userService
      .update(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('User updated successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error updating user:', err);
          this.snackBar.open(err.message || 'Failed to update user', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Delete a user
   */
  private deleteUser(user: UserDto): void {
    if (
      !confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)
    ) {
      return;
    }

    this.isLoading = true;
    this.userService
      .delete(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('User deleted successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error deleting user:', err);
          this.snackBar.open(err.message || 'Failed to delete user', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }
}

/**
 * Dialog component for creating/editing users
 */
@Component({
  selector: 'app-user-form-dialog',
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
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Add User' : 'Edit User' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="userForm" class="user-form">
        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" placeholder="Enter username" required />
          <mat-error *ngIf="userForm.get('username')?.hasError('required')">
            Username is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nickname</mat-label>
          <input matInput formControlName="nickname" placeholder="Enter nickname" required />
          <mat-error *ngIf="userForm.get('nickname')?.hasError('required')">
            Nickname is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Roles (comma-separated)</mat-label>
          <input matInput formControlName="rolesString" placeholder="e.g., admin, operator" />
          <mat-hint>Enter roles separated by commas</mat-hint>
        </mat-form-field>

        <div class="checkbox-field">
          <mat-checkbox formControlName="isSuperAdmin">Super Admin</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSave()"
        [disabled]="!userForm.valid"
      >
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .user-form {
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
    `
  ]
})
export class UserFormDialogComponent {
  userForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; user?: UserDto }
  ) {
    this.userForm = this.fb.group({
      username: [data.user?.username || '', Validators.required],
      nickname: [data.user?.nickname || '', Validators.required],
      rolesString: [data.user?.roles?.join(', ') || ''],
      isSuperAdmin: [data.user?.isSuperAdmin || false]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.userForm.valid) {
      const formValue = this.userForm.value;
      const roles = formValue.rolesString
        ? formValue.rolesString.split(',').map((r: string) => r.trim()).filter((r: string) => r)
        : [];

      const currentUser = localStorage.getItem('user_data');
      const username = currentUser ? JSON.parse(currentUser).username : 'system';

      if (this.data.mode === 'create') {
        const request: UserCreateRequest = {
          username: formValue.username,
          nickname: formValue.nickname,
          isSuperAdmin: formValue.isSuperAdmin,
          roles,
          createBy: username,
          createApp: 'KUKA-GUI'
        };
        this.dialogRef.close(request);
      } else {
        const request: UserUpdateRequest = {
          username: formValue.username,
          nickname: formValue.nickname,
          isSuperAdmin: formValue.isSuperAdmin,
          roles,
          lastUpdateBy: username,
          lastUpdateApp: 'KUKA-GUI'
        };
        this.dialogRef.close(request);
      }
    }
  }
}
