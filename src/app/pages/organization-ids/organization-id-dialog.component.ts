import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  OrganizationIdDisplayData,
  OrganizationIdCreateRequest,
  OrganizationIdUpdateRequest
} from '../../models/organization-ids.models';

export interface OrganizationIdDialogData {
  mode: 'create' | 'edit' | 'view';
  organizationId?: OrganizationIdDisplayData;
}

@Component({
  selector: 'app-organization-id-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ getDialogIcon() }}</mat-icon>
      {{ getDialogTitle() }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="organizationIdForm" class="organization-id-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Display Name</mat-label>
          <input matInput formControlName="displayName" placeholder="Enter organization ID display name" />
          <mat-icon matPrefix>title</mat-icon>
          <mat-error *ngIf="organizationIdForm.get('displayName')?.hasError('required')">
            Display name is required
          </mat-error>
          <mat-error *ngIf="organizationIdForm.get('displayName')?.hasError('minlength')">
            Display name must be at least 3 characters
          </mat-error>
          <mat-error *ngIf="organizationIdForm.get('displayName')?.hasError('maxlength')">
            Display name must not exceed 100 characters
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Actual Value</mat-label>
          <input matInput formControlName="actualValue" placeholder="Enter actual value" />
          <mat-icon matPrefix>code</mat-icon>
          <mat-error *ngIf="organizationIdForm.get('actualValue')?.hasError('required')">
            Actual value is required
          </mat-error>
          <mat-error *ngIf="organizationIdForm.get('actualValue')?.hasError('minlength')">
            Actual value must be at least 1 character
          </mat-error>
          <mat-error *ngIf="organizationIdForm.get('actualValue')?.hasError('maxlength')">
            Actual value must not exceed 50 characters
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            placeholder="Enter organization ID description (optional)"
            rows="3"
          ></textarea>
          <mat-icon matPrefix>description</mat-icon>
          <mat-error *ngIf="organizationIdForm.get('description')?.hasError('maxlength')">
            Description must not exceed 500 characters
          </mat-error>
        </mat-form-field>

        <div class="checkbox-field">
          <mat-checkbox formControlName="isActive">
            Active
          </mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        <mat-icon>{{ data.mode === 'view' ? 'close' : 'cancel' }}</mat-icon>
        {{ data.mode === 'view' ? 'Close' : 'Cancel' }}
      </button>
      <button *ngIf="data.mode !== 'view'" mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!organizationIdForm.valid">
        <mat-icon>save</mat-icon>
        {{ data.mode === 'create' ? 'Create' : 'Update' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .organization-id-form {
      width: 100%;
      max-width: 100%;
      min-width: 400px;
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .checkbox-field {
      margin: 16px 0;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        color: var(--mat-sys-primary);
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      margin: 0;

      button {
        mat-icon {
          margin-right: 4px;
        }
      }
    }

    @media (max-width: 600px) {
      .organization-id-form {
        min-width: 300px;
      }
    }
  `]
})
export class OrganizationIdDialogComponent implements OnInit {
  organizationIdForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<OrganizationIdDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OrganizationIdDialogData
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    if ((this.data.mode === 'edit' || this.data.mode === 'view') && this.data.organizationId) {
      this.populateForm(this.data.organizationId);
    }
    if (this.data.mode === 'view') {
      this.organizationIdForm.disable();
    }
  }

  getDialogIcon(): string {
    switch (this.data.mode) {
      case 'create': return 'add';
      case 'edit': return 'edit';
      case 'view': return 'visibility';
      default: return 'business';
    }
  }

  getDialogTitle(): string {
    switch (this.data.mode) {
      case 'create': return 'Create Organization ID';
      case 'edit': return 'Edit Organization ID';
      case 'view': return 'View Organization ID';
      default: return 'Organization ID';
    }
  }

  private initializeForm(): void {
    this.organizationIdForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      actualValue: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  private populateForm(organizationId: OrganizationIdDisplayData): void {
    this.organizationIdForm.patchValue({
      displayName: organizationId.displayName,
      actualValue: organizationId.actualValue,
      description: organizationId.description || '',
      isActive: organizationId.isActive
    });
  }

  onSubmit(): void {
    if (this.organizationIdForm.valid) {
      const formValue = this.organizationIdForm.value;
      const request: OrganizationIdCreateRequest | OrganizationIdUpdateRequest = {
        displayName: formValue.displayName.trim(),
        actualValue: formValue.actualValue.trim(),
        description: formValue.description?.trim() || '',
        isActive: formValue.isActive
      };
      this.dialogRef.close(request);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
