import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import { UserDto, UserCreateRequest, UserUpdateRequest } from '../../models/user.models';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../services/permission.service';
import { SavedCustomMissionsService } from '../../services/saved-custom-missions.service';
import { RoleDto } from '../../models/role.models';
import { PageDto, UserPermissionBulkSetRequest, UserTemplatePermissionBulkSetRequest } from '../../models/permission.models';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';
import { USER_MANAGEMENT_TABLE_CONFIG } from './user-management-table.config';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';

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
      case 'view':
        this.openViewDialog(event.row as UserDto);
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
      width: '900px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createUser(result);
      }
    });
  }

  /**
   * Open dialog to view user details (read-only)
   */
  private openViewDialog(user: UserDto): void {
    this.dialog.open(UserFormDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      data: { mode: 'view', user }
    });
  }

  /**
   * Open dialog to edit an existing user
   */
  private openEditDialog(user: UserDto): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
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
    const dialogData: ConfirmationDialogData = {
      title: 'Delete User',
      message: `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`,
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
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule,
    MatListModule,
    MatButtonToggleModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Add User' : (data.mode === 'view' ? 'View User' : 'Edit User') }}</h2>
    <mat-dialog-content>
      <mat-tab-group>
        <!-- Basic Info Tab -->
        <mat-tab label="Basic Info">
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
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="hidePassword ? 'password' : 'text'"
                formControlName="password"
                [placeholder]="data.mode === 'create' ? 'Enter password' : 'Enter new password (leave blank to keep current)'"
                [required]="data.mode === 'create'"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword = !hidePassword"
                [attr.aria-label]="'Hide password'"
                [attr.aria-pressed]="hidePassword"
              >
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="userForm.get('password')?.hasError('required')">
                Password is required
              </mat-error>
              <mat-hint *ngIf="data.mode === 'edit'">Leave blank to keep current password</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Roles</mat-label>
              <mat-select formControlName="roles" multiple>
                <mat-option *ngFor="let role of availableRoles" [value]="role.roleCode">
                  {{ role.name }}
                </mat-option>
              </mat-select>
              <mat-hint>Select one or more roles</mat-hint>
            </mat-form-field>

            <div class="checkbox-field">
              <mat-checkbox formControlName="isSuperAdmin" (change)="onSuperAdminChange($event.checked)">
                Super Admin
              </mat-checkbox>
              <p class="checkbox-hint">Super admins have access to all pages</p>
            </div>
          </form>
        </mat-tab>

        <!-- Page Permissions Tab -->
        <mat-tab label="Page Permissions">
          <div class="permissions-container">
            <div *ngIf="data.mode === 'create'" class="permissions-disabled-message">
              <mat-icon>info</mat-icon>
              <p>Save the user first to assign page permissions</p>
            </div>

            <div *ngIf="userForm.get('isSuperAdmin')?.value" class="permissions-disabled-message">
              <mat-icon>admin_panel_settings</mat-icon>
              <p>Super Admin users have access to all pages. Permission overrides are disabled.</p>
            </div>

            <div *ngIf="(data.mode === 'edit' || data.mode === 'view') && !userForm.get('isSuperAdmin')?.value && !isLoadingPages">
              <h3>Page Access Overrides</h3>
              <p class="permissions-hint" *ngIf="data.mode === 'edit'">Override role-based permissions for specific pages</p>
              <p class="permissions-hint" *ngIf="data.mode === 'view'">View page access permissions</p>

              <!-- Search Field -->
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search pages</mat-label>
                <input matInput
                       [(ngModel)]="pageSearchTerm"
                       (ngModelChange)="onPageSearchChange($event)"
                       placeholder="Type to search...">
                <mat-icon matSuffix *ngIf="!pageSearchTerm">search</mat-icon>
                <button mat-icon-button matSuffix *ngIf="pageSearchTerm" (click)="clearPageSearch()">
                  <mat-icon>clear</mat-icon>
                </button>
              </mat-form-field>

              <div class="template-permissions-list">
                <div class="permission-item" *ngFor="let page of filteredPages">
                  <div class="permission-item-info">
                    <mat-icon>{{ page.pageIcon || 'web' }}</mat-icon>
                    <div class="permission-item-text">
                      <div class="permission-item-title">{{ page.pageName }}</div>
                      <div class="permission-item-subtitle">
                        <span class="path">{{ page.pagePath }}</span>
                        <div class="access-indicators">
                          <span class="role-access" [class.granted]="getRoleAccess(page.id)" [class.denied]="!getRoleAccess(page.id)">
                            From Roles: {{ getRoleAccess(page.id) ? '✓' : '✗' }}
                          </span>
                          <span class="effective-access" [class.granted]="getEffectiveAccess(page.id)" [class.denied]="!getEffectiveAccess(page.id)">
                            Effective: {{ getEffectiveAccess(page.id) ? '✓ Allowed' : '✗ Denied' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <mat-button-toggle-group
                    [value]="getUserPermissionOverride(page.id)"
                    (change)="onPermissionOverrideChange(page.id, $event.value)"
                    class="permission-toggle"
                    [disabled]="isViewMode">
                    <mat-button-toggle value="inherit">Inherit</mat-button-toggle>
                    <mat-button-toggle value="allow">Allow</mat-button-toggle>
                    <mat-button-toggle value="deny">Deny</mat-button-toggle>
                  </mat-button-toggle-group>
                </div>
                <div *ngIf="filteredPages.length === 0 && pageSearchTerm" class="no-results">
                  <mat-icon>search_off</mat-icon>
                  <span>No pages match "{{ pageSearchTerm }}"</span>
                </div>
              </div>
            </div>

            <div *ngIf="isLoadingPages" class="loading-container">
              <p>Loading pages...</p>
            </div>
          </div>
        </mat-tab>

        <!-- Template Permissions Tab -->
        <mat-tab label="Template Permissions">
          <div class="permissions-container">
            <div *ngIf="data.mode === 'create'" class="permissions-disabled-message">
              <mat-icon>info</mat-icon>
              <p>Save the user first to assign template permissions</p>
            </div>

            <div *ngIf="userForm.get('isSuperAdmin')?.value" class="permissions-disabled-message">
              <mat-icon>admin_panel_settings</mat-icon>
              <p>Super Admin users have access to all templates. Permission overrides are disabled.</p>
            </div>

            <div *ngIf="(data.mode === 'edit' || data.mode === 'view') && !userForm.get('isSuperAdmin')?.value && !isLoadingTemplates">
              <h3>Template Access Overrides</h3>
              <p class="permissions-hint" *ngIf="data.mode === 'edit'">Override role-based permissions for specific mission templates</p>
              <p class="permissions-hint" *ngIf="data.mode === 'view'">View mission template access permissions</p>

              <div *ngIf="allTemplates.length === 0" class="empty-message">
                <mat-icon>assignment</mat-icon>
                <p>No templates available. Create templates in the Saved Custom Missions page first.</p>
              </div>

              <!-- Search Field -->
              <mat-form-field appearance="outline" class="search-field" *ngIf="allTemplates.length > 0">
                <mat-label>Search templates</mat-label>
                <input matInput
                       [(ngModel)]="templateSearchTerm"
                       (ngModelChange)="onTemplateSearchChange($event)"
                       placeholder="Type to search...">
                <mat-icon matSuffix *ngIf="!templateSearchTerm">search</mat-icon>
                <button mat-icon-button matSuffix *ngIf="templateSearchTerm" (click)="clearTemplateSearch()">
                  <mat-icon>clear</mat-icon>
                </button>
              </mat-form-field>

              <div class="template-permissions-list" *ngIf="allTemplates.length > 0">
                <div class="permission-item" *ngFor="let template of filteredTemplates">
                  <div class="permission-item-info">
                    <mat-icon>assignment</mat-icon>
                    <div class="permission-item-text">
                      <div class="permission-item-title">{{ template.missionName }}</div>
                      <div class="permission-item-subtitle">
                        <span class="path">{{ template.robotType }} - {{ template.missionType }}</span>
                        <div class="access-indicators">
                          <span class="role-access" [class.granted]="getRoleTemplateAccess(template.id)" [class.denied]="!getRoleTemplateAccess(template.id)">
                            From Roles: {{ getRoleTemplateAccess(template.id) ? '✓' : '✗' }}
                          </span>
                          <span class="effective-access" [class.granted]="getEffectiveTemplateAccess(template.id)" [class.denied]="!getEffectiveTemplateAccess(template.id)">
                            Effective: {{ getEffectiveTemplateAccess(template.id) ? '✓ Allowed' : '✗ Denied' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <mat-button-toggle-group
                    [value]="getUserTemplatePermissionOverride(template.id)"
                    (change)="onTemplatePermissionOverrideChange(template.id, $event.value)"
                    class="permission-toggle"
                    [disabled]="isViewMode">
                    <mat-button-toggle value="inherit">Inherit</mat-button-toggle>
                    <mat-button-toggle value="allow">Allow</mat-button-toggle>
                    <mat-button-toggle value="deny">Deny</mat-button-toggle>
                  </mat-button-toggle-group>
                </div>
                <div *ngIf="filteredTemplates.length === 0 && templateSearchTerm" class="no-results">
                  <mat-icon>search_off</mat-icon>
                  <span>No templates match "{{ templateSearchTerm }}"</span>
                </div>
              </div>
            </div>

            <div *ngIf="isLoadingTemplates" class="loading-container">
              <p>Loading templates...</p>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">{{ data.mode === 'view' ? 'Close' : 'Cancel' }}</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSave()"
        [disabled]="!userForm.valid || isSaving"
        *ngIf="data.mode !== 'view'"
      >
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        padding: 0;
        min-height: 450px;
        overflow: visible !important;
      }

      ::ng-deep .mat-mdc-dialog-content {
        overflow: visible !important;
      }

      mat-tab-group {
        min-height: 450px;
      }

      .user-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-width: 400px;
        padding: 1.5rem 1rem;
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

      .permissions-container {
        padding: 1.5rem 1rem;
        min-height: 400px;
        overflow: visible;
      }

      .permissions-disabled-message {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        background-color: #f5f5f5;
        border-radius: 4px;
        color: rgba(0, 0, 0, 0.6);
      }

      .permissions-disabled-message mat-icon {
        color: #ff9800;
      }

      .permissions-hint {
        margin: 0 0 1rem 0;
        font-size: 0.875rem;
        color: rgba(0, 0, 0, 0.6);
      }

      .permissions-list {
        max-height: 450px;
        overflow-y: auto;
        overflow-x: visible;
      }

      .permissions-list mat-list-item {
        height: auto;
        min-height: 80px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      }

      ::ng-deep .permissions-list .mdc-list-item {
        padding-right: 16px;
      }

      ::ng-deep .permissions-list .mdc-list-item__content {
        overflow: visible;
      }

      .permissions-list mat-list-item:last-child {
        border-bottom: none;
      }

      .page-path {
        font-size: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .page-path .path {
        color: rgba(0, 0, 0, 0.6);
      }

      .page-path .role-access {
        font-weight: 500;
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 3px;
        display: inline-block;
        width: fit-content;
      }

      .page-path .role-access.granted {
        color: #4caf50;
        background-color: #e8f5e9;
      }

      .page-path .role-access.denied {
        color: #f44336;
        background-color: #ffebee;
      }

      .permission-toggle {
        font-size: 0.7rem;
        flex-shrink: 0;
        white-space: nowrap;
      }

      ::ng-deep .permission-toggle .mat-button-toggle-label-content {
        padding: 0 8px !important;
        font-size: 0.7rem;
        line-height: 32px !important;
      }

      ::ng-deep .permissions-list .mdc-list-item__end {
        flex-shrink: 0;
        margin-left: 8px;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 3rem;
        color: rgba(0, 0, 0, 0.6);
      }

      .empty-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem;
        text-align: center;
        color: rgba(0, 0, 0, 0.6);
      }

      .empty-message mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: rgba(0, 0, 0, 0.3);
      }

      h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        font-weight: 500;
      }

      .search-field {
        width: 100%;
        margin-bottom: 1rem;
      }

      .no-results {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 2rem;
        color: rgba(0, 0, 0, 0.6);
        font-style: italic;
      }

      .no-results mat-icon {
        color: rgba(0, 0, 0, 0.3);
      }

      .template-permissions-list {
        max-height: 400px;
        overflow-y: auto;
      }

      .permission-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        gap: 16px;
      }

      .permission-item:last-child {
        border-bottom: none;
      }

      .permission-item-info {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
        min-width: 0;
      }

      .permission-item-info mat-icon {
        color: rgba(0, 0, 0, 0.54);
        flex-shrink: 0;
      }

      .permission-item-text {
        flex: 1;
        min-width: 0;
      }

      .permission-item-title {
        font-size: 0.95rem;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .permission-item-subtitle {
        font-size: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-top: 4px;
      }

      .permission-item-subtitle .path {
        color: rgba(0, 0, 0, 0.6);
      }

      .access-indicators {
        display: flex;
        gap: 8px;
        margin-top: 4px;
        flex-wrap: wrap;
      }

      .role-access,
      .effective-access {
        font-weight: 500;
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 3px;
        display: inline-block;
      }

      .role-access.granted,
      .effective-access.granted {
        color: #4caf50;
        background-color: #e8f5e9;
      }

      .role-access.denied,
      .effective-access.denied {
        color: #f44336;
        background-color: #ffebee;
      }

      .effective-access {
        font-weight: 600;
      }
    `
  ]
})
export class UserFormDialogComponent implements OnInit, OnDestroy {
  userForm: FormGroup;
  availableRoles: RoleDto[] = [];
  allPages: PageDto[] = [];
  allTemplates: SavedCustomMissionsDisplayData[] = [];
  rolePermissions = new Map<number, boolean>(); // pageId -> canAccess (from roles)
  roleTemplatePermissions = new Map<number, boolean>(); // templateId -> canAccess (from roles)
  userPermissions = new Map<number, 'inherit' | 'allow' | 'deny'>(); // pageId -> override
  userTemplatePermissions = new Map<number, 'inherit' | 'allow' | 'deny'>(); // templateId -> override
  hidePassword = true;
  isLoadingPages = false;
  isLoadingTemplates = false;
  isSaving = false;
  private destroy$ = new Subject<void>();

  // Search and filtering for pages
  pageSearchTerm = '';
  filteredPages: PageDto[] = [];

  // Search and filtering for templates
  templateSearchTerm = '';
  filteredTemplates: SavedCustomMissionsDisplayData[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserFormDialogComponent>,
    private roleService: RoleService,
    private permissionService: PermissionService,
    private savedCustomMissionsService: SavedCustomMissionsService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit' | 'view'; user?: UserDto }
  ) {
    const passwordValidators = data.mode === 'create'
      ? [Validators.required]
      : [];

    this.userForm = this.fb.group({
      username: [data.user?.username || '', Validators.required],
      password: ['', passwordValidators],
      nickname: [data.user?.nickname || '', Validators.required],
      roles: [data.user?.roles || []],
      isSuperAdmin: [data.user?.isSuperAdmin || false]
    });

    // Disable form in view mode
    if (data.mode === 'view') {
      this.userForm.disable();
    }
  }

  get isViewMode(): boolean {
    return this.data.mode === 'view';
  }

  ngOnInit(): void {
    this.loadRoles();
    if ((this.data.mode === 'edit' || this.data.mode === 'view') && this.data.user) {
      this.loadPermissionsData();
      this.loadTemplatePermissionsData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load available roles from the API
   */
  private loadRoles(): void {
    this.roleService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => {
          this.availableRoles = roles;
        },
        error: (err) => {
          console.error('Error loading roles:', err);
          this.snackBar.open(err.message || 'Failed to load roles', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  /**
   * Load all permissions data (pages, role permissions, user permissions)
   */
  private loadPermissionsData(): void {
    if (!this.data.user) return;

    this.isLoadingPages = true;

    forkJoin({
      pages: this.permissionService.getAllPages(),
      userPerms: this.permissionService.getUserPermissionsByUserId(this.data.user.id)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ pages, userPerms }) => {
          this.allPages = pages;
          this.filteredPages = pages;

          // Store user permission overrides
          this.userPermissions.clear();
          userPerms.forEach((perm) => {
            this.userPermissions.set(perm.pageId, perm.canAccess ? 'allow' : 'deny');
          });

          // Load role permissions for this user's roles
          this.loadRolePermissionsForUser();

          this.isLoadingPages = false;
        },
        error: (err) => {
          console.error('Error loading permissions:', err);
          this.snackBar.open('Failed to load permissions', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isLoadingPages = false;
        }
      });
  }

  /**
   * Load role permissions for the user's assigned roles
   */
  private loadRolePermissionsForUser(): void {
    const userRoles = this.userForm.get('roles')?.value || [];
    if (userRoles.length === 0) {
      this.rolePermissions.clear();
      return;
    }

    // Get role IDs from role codes
    const roleIds = this.availableRoles
      .filter((r) => userRoles.includes(r.roleCode))
      .map((r) => r.id);

    if (roleIds.length === 0) {
      this.rolePermissions.clear();
      return;
    }

    // Load permissions for all the user's roles
    const rolePermRequests = roleIds.map((roleId) =>
      this.permissionService.getRolePermissionsByRoleId(roleId)
    );

    forkJoin(rolePermRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rolePermsArray) => {
          this.rolePermissions.clear();

          // Merge all role permissions (if ANY role grants access, user gets access)
          rolePermsArray.forEach((rolePerms) => {
            rolePerms.forEach((perm) => {
              if (perm.canAccess) {
                this.rolePermissions.set(perm.pageId, true);
              }
            });
          });
        },
        error: (err) => {
          console.error('Error loading role permissions:', err);
        }
      });
  }

  /**
   * Load template permissions data (templates, role template permissions, user template permissions)
   */
  private loadTemplatePermissionsData(): void {
    if (!this.data.user) return;

    this.isLoadingTemplates = true;

    forkJoin({
      templates: this.savedCustomMissionsService.getAllSavedMissions(),
      userPerms: this.permissionService.getUserTemplatePermissionsByUserId(this.data.user.id)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ templates, userPerms }) => {
          this.allTemplates = templates;
          this.filteredTemplates = templates;

          // Store user template permission overrides
          this.userTemplatePermissions.clear();
          userPerms.forEach((perm) => {
            this.userTemplatePermissions.set(perm.savedCustomMissionId, perm.canAccess ? 'allow' : 'deny');
          });

          // Load role template permissions for this user's roles
          this.loadRoleTemplatePermissionsForUser();

          this.isLoadingTemplates = false;
        },
        error: (err) => {
          console.error('Error loading template permissions:', err);
          this.snackBar.open('Failed to load template permissions', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isLoadingTemplates = false;
        }
      });
  }

  /**
   * Load role template permissions for the user's assigned roles
   */
  private loadRoleTemplatePermissionsForUser(): void {
    const userRoles = this.userForm.get('roles')?.value || [];
    if (userRoles.length === 0) {
      this.roleTemplatePermissions.clear();
      return;
    }

    // Get role IDs from role codes
    const roleIds = this.availableRoles
      .filter((r) => userRoles.includes(r.roleCode))
      .map((r) => r.id);

    if (roleIds.length === 0) {
      this.roleTemplatePermissions.clear();
      return;
    }

    // Load template permissions for all the user's roles
    const rolePermRequests = roleIds.map((roleId) =>
      this.permissionService.getRoleTemplatePermissionsByRoleId(roleId)
    );

    forkJoin(rolePermRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rolePermsArray) => {
          this.roleTemplatePermissions.clear();

          // Merge all role template permissions (if ANY role grants access, user gets access)
          rolePermsArray.forEach((rolePerms) => {
            rolePerms.forEach((perm) => {
              if (perm.canAccess) {
                this.roleTemplatePermissions.set(perm.savedCustomMissionId, true);
              }
            });
          });
        },
        error: (err) => {
          console.error('Error loading role template permissions:', err);
        }
      });
  }

  /**
   * Get role-based access for a page (what access the user gets from their roles)
   */
  getRoleAccess(pageId: number): boolean {
    return this.rolePermissions.get(pageId) || false;
  }

  /**
   * Get role-based access for a template (what access the user gets from their roles)
   */
  getRoleTemplateAccess(templateId: number): boolean {
    return this.roleTemplatePermissions.get(templateId) || false;
  }

  /**
   * Get effective access for a page (considering role access + user override)
   */
  getEffectiveAccess(pageId: number): boolean {
    const override = this.userPermissions.get(pageId) || 'inherit';
    if (override === 'allow') return true;
    if (override === 'deny') return false;
    // inherit - use role access
    return this.getRoleAccess(pageId);
  }

  /**
   * Get effective access for a template (considering role access + user override)
   */
  getEffectiveTemplateAccess(templateId: number): boolean {
    const override = this.userTemplatePermissions.get(templateId) || 'inherit';
    if (override === 'allow') return true;
    if (override === 'deny') return false;
    // inherit - use role access
    return this.getRoleTemplateAccess(templateId);
  }

  /**
   * Get user's permission override for a page
   */
  getUserPermissionOverride(pageId: number): 'inherit' | 'allow' | 'deny' {
    return this.userPermissions.get(pageId) || 'inherit';
  }

  /**
   * Handle permission override change
   */
  onPermissionOverrideChange(pageId: number, value: 'inherit' | 'allow' | 'deny'): void {
    this.userPermissions.set(pageId, value);
  }

  /**
   * Get user's template permission override
   */
  getUserTemplatePermissionOverride(templateId: number): 'inherit' | 'allow' | 'deny' {
    return this.userTemplatePermissions.get(templateId) || 'inherit';
  }

  /**
   * Handle template permission override change
   */
  onTemplatePermissionOverrideChange(templateId: number, value: 'inherit' | 'allow' | 'deny'): void {
    this.userTemplatePermissions.set(templateId, value);
  }

  // ==================== Page Search Methods ====================

  /**
   * Handle page search input change
   */
  onPageSearchChange(searchTerm: string): void {
    this.pageSearchTerm = searchTerm;
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredPages = this.allPages;
      return;
    }

    this.filteredPages = this.allPages.filter(
      (page) =>
        page.pageName.toLowerCase().includes(term) ||
        page.pagePath.toLowerCase().includes(term)
    );
  }

  /**
   * Clear page search
   */
  clearPageSearch(): void {
    this.pageSearchTerm = '';
    this.filteredPages = this.allPages;
  }

  // ==================== Template Search Methods ====================

  /**
   * Handle template search input change
   */
  onTemplateSearchChange(searchTerm: string): void {
    this.templateSearchTerm = searchTerm;
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredTemplates = this.allTemplates;
      return;
    }

    this.filteredTemplates = this.allTemplates.filter(
      (template) =>
        template.missionName.toLowerCase().includes(term) ||
        template.robotType.toLowerCase().includes(term) ||
        template.missionType.toLowerCase().includes(term)
    );
  }

  /**
   * Clear template search
   */
  clearTemplateSearch(): void {
    this.templateSearchTerm = '';
    this.filteredTemplates = this.allTemplates;
  }

  /**
   * Handle SuperAdmin checkbox change
   */
  onSuperAdminChange(isSuperAdmin: boolean): void {
    // When SuperAdmin is enabled, permissions are bypassed
    if (isSuperAdmin) {
      // Could clear overrides or just disable the UI (which we do in template)
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.userForm.valid) {
      const formValue = this.userForm.value;
      const currentUser = localStorage.getItem('user_data');
      const username = currentUser ? JSON.parse(currentUser).username : 'system';

      if (this.data.mode === 'create') {
        const request: UserCreateRequest = {
          username: formValue.username,
          password: formValue.password,
          nickname: formValue.nickname,
          isSuperAdmin: formValue.isSuperAdmin,
          roles: formValue.roles || [],
          createBy: username,
          createApp: 'KUKA-GUI'
        };
        this.dialogRef.close(request);
      } else {
        // Edit mode - save both user info and permissions
        this.isSaving = true;

        const request: UserUpdateRequest = {
          username: formValue.username,
          nickname: formValue.nickname,
          isSuperAdmin: formValue.isSuperAdmin,
          roles: formValue.roles || [],
          lastUpdateBy: username,
          lastUpdateApp: 'KUKA-GUI'
        };

        // Only include password if it was provided
        if (formValue.password && formValue.password.trim() !== '') {
          request.password = formValue.password;
        }

        // Save user permissions if not SuperAdmin
        if (!formValue.isSuperAdmin) {
          this.saveUserPermissions()
            .then(() => {
              this.dialogRef.close(request);
            })
            .catch(() => {
              this.isSaving = false;
            });
        } else {
          // SuperAdmin - skip permissions save
          this.dialogRef.close(request);
        }
      }
    }
  }

  /**
   * Save user permission overrides to backend
   */
  private async saveUserPermissions(): Promise<void> {
    if (!this.data.user) {
      return Promise.resolve();
    }

    const promises: Promise<void>[] = [];

    // Save page permission overrides (not 'inherit')
    const pageOverrides = Array.from(this.userPermissions.entries())
      .filter(([_, value]) => value !== 'inherit')
      .map(([pageId, value]) => ({
        pageId,
        canAccess: value === 'allow'
      }));

    if (pageOverrides.length > 0) {
      const pagePermissionRequest: UserPermissionBulkSetRequest = {
        userId: this.data.user.id,
        pagePermissions: pageOverrides
      };

      promises.push(new Promise((resolve, reject) => {
        this.permissionService
          .bulkSetUserPermissions(pagePermissionRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => resolve(),
            error: (err) => reject(err)
          });
      }));
    }

    // Save template permission overrides (not 'inherit')
    const templateOverrides = Array.from(this.userTemplatePermissions.entries())
      .filter(([_, value]) => value !== 'inherit')
      .map(([savedCustomMissionId, value]) => ({
        savedCustomMissionId,
        canAccess: value === 'allow'
      }));

    if (templateOverrides.length > 0) {
      const templatePermissionRequest: UserTemplatePermissionBulkSetRequest = {
        userId: this.data.user.id,
        templatePermissions: templateOverrides
      };

      promises.push(new Promise((resolve, reject) => {
        this.permissionService
          .bulkSetUserTemplatePermissions(templatePermissionRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => resolve(),
            error: (err) => reject(err)
          });
      }));
    }

    if (promises.length === 0) {
      return Promise.resolve();
    }

    return Promise.all(promises)
      .then(() => {
        this.snackBar.open('Permissions updated successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      })
      .catch((err) => {
        console.error('Error saving permissions:', err);
        this.snackBar.open('Failed to save permissions', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        throw err;
      });
  }
}
