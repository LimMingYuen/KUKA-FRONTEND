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
  RobotTypeDisplayData,
  RobotTypeCreateRequest,
  RobotTypeUpdateRequest
} from '../../models/robot-types.models';

export interface RobotTypeDialogData {
  mode: 'create' | 'edit' | 'view';
  robotType?: RobotTypeDisplayData;
}

@Component({
  selector: 'app-robot-type-dialog',
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
      <form [formGroup]="robotTypeForm" class="robot-type-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Display Name</mat-label>
          <input matInput formControlName="displayName" placeholder="Enter robot type display name" />
          <mat-icon matPrefix>title</mat-icon>
          <mat-error *ngIf="robotTypeForm.get('displayName')?.hasError('required')">
            Display name is required
          </mat-error>
          <mat-error *ngIf="robotTypeForm.get('displayName')?.hasError('minlength')">
            Display name must be at least 3 characters
          </mat-error>
          <mat-error *ngIf="robotTypeForm.get('displayName')?.hasError('maxlength')">
            Display name must not exceed 100 characters
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Actual Value</mat-label>
          <input matInput formControlName="actualValue" placeholder="Enter actual value" />
          <mat-icon matPrefix>code</mat-icon>
          <mat-error *ngIf="robotTypeForm.get('actualValue')?.hasError('required')">
            Actual value is required
          </mat-error>
          <mat-error *ngIf="robotTypeForm.get('actualValue')?.hasError('minlength')">
            Actual value must be at least 1 character
          </mat-error>
          <mat-error *ngIf="robotTypeForm.get('actualValue')?.hasError('maxlength')">
            Actual value must not exceed 50 characters
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            placeholder="Enter robot type description (optional)"
            rows="3"
          ></textarea>
          <mat-icon matPrefix>description</mat-icon>
          <mat-error *ngIf="robotTypeForm.get('description')?.hasError('maxlength')">
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
      <button *ngIf="data.mode !== 'view'" mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!robotTypeForm.valid">
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

    .robot-type-form {
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
      .robot-type-form {
        min-width: 300px;
      }
    }
  `]
})
export class RobotTypeDialogComponent implements OnInit {
  robotTypeForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RobotTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RobotTypeDialogData
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    if ((this.data.mode === 'edit' || this.data.mode === 'view') && this.data.robotType) {
      this.populateForm(this.data.robotType);
    }
    if (this.data.mode === 'view') {
      this.robotTypeForm.disable();
    }
  }

  getDialogIcon(): string {
    switch (this.data.mode) {
      case 'create': return 'add';
      case 'edit': return 'edit';
      case 'view': return 'visibility';
      default: return 'smart_toy';
    }
  }

  getDialogTitle(): string {
    switch (this.data.mode) {
      case 'create': return 'Create Robot Type';
      case 'edit': return 'Edit Robot Type';
      case 'view': return 'View Robot Type';
      default: return 'Robot Type';
    }
  }

  private initializeForm(): void {
    this.robotTypeForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      actualValue: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  private populateForm(robotType: RobotTypeDisplayData): void {
    this.robotTypeForm.patchValue({
      displayName: robotType.displayName,
      actualValue: robotType.actualValue,
      description: robotType.description || '',
      isActive: robotType.isActive
    });
  }

  onSubmit(): void {
    if (this.robotTypeForm.valid) {
      const formValue = this.robotTypeForm.value;
      const request: RobotTypeCreateRequest | RobotTypeUpdateRequest = {
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
