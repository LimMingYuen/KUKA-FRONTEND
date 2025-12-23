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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import {
  EmailRecipientDto,
  EmailRecipientCreateRequest,
  EmailRecipientUpdateRequest,
  NOTIFICATION_TYPE_OPTIONS,
  parseNotificationTypes,
  joinNotificationTypes
} from '../../models/email-recipients.models';
import { EmailRecipientsService } from '../../services/email-recipients.service';
import { EMAIL_RECIPIENTS_TABLE_CONFIG } from './email-recipients-table.config';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-email-recipients',
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
  templateUrl: './email-recipients.component.html',
  styleUrl: './email-recipients.component.scss'
})
export class EmailRecipientsComponent implements OnInit, OnDestroy {
  tableData: EmailRecipientDto[] = [];
  tableConfig: TableConfig<EmailRecipientDto> = EMAIL_RECIPIENTS_TABLE_CONFIG;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private emailRecipientsService: EmailRecipientsService,
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
   * Load all email recipients from the API
   */
  loadData(): void {
    this.isLoading = true;
    this.emailRecipientsService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.tableData = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading email recipients:', err);
          this.snackBar.open(err.message || 'Failed to load email recipients', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle table actions (edit, delete, add, test-email)
   */
  handleAction(event: ActionEvent): void {
    switch (event.action) {
      case 'add':
        this.openAddDialog();
        break;
      case 'view':
        this.openViewDialog(event.row as EmailRecipientDto);
        break;
      case 'edit':
        this.openEditDialog(event.row as EmailRecipientDto);
        break;
      case 'test-email':
        this.sendTestEmail(event.row as EmailRecipientDto);
        break;
      case 'delete':
        this.deleteRecipient(event.row as EmailRecipientDto);
        break;
      default:
        console.warn('Unknown action:', event.action);
    }
  }

  /**
   * Open dialog to add a new recipient
   */
  private openAddDialog(): void {
    const dialogRef = this.dialog.open(EmailRecipientDialogComponent, {
      width: '500px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createRecipient(result);
      }
    });
  }

  /**
   * Open dialog to view recipient details (read-only)
   */
  private openViewDialog(recipient: EmailRecipientDto): void {
    this.dialog.open(EmailRecipientDialogComponent, {
      width: '500px',
      data: { mode: 'view', recipient }
    });
  }

  /**
   * Open dialog to edit an existing recipient
   */
  private openEditDialog(recipient: EmailRecipientDto): void {
    const dialogRef = this.dialog.open(EmailRecipientDialogComponent, {
      width: '500px',
      data: { mode: 'edit', recipient }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateRecipient(recipient.id, result);
      }
    });
  }

  /**
   * Create a new recipient
   */
  private createRecipient(request: EmailRecipientCreateRequest): void {
    this.isLoading = true;
    this.emailRecipientsService
      .create(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Email recipient created successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error creating email recipient:', err);
          this.snackBar.open(err.message || 'Failed to create email recipient', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Update an existing recipient
   */
  private updateRecipient(id: number, request: EmailRecipientUpdateRequest): void {
    this.isLoading = true;
    this.emailRecipientsService
      .update(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Email recipient updated successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error updating email recipient:', err);
          this.snackBar.open(err.message || 'Failed to update email recipient', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Delete a recipient
   */
  private deleteRecipient(recipient: EmailRecipientDto): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Email Recipient',
      message: `Are you sure you want to delete "${recipient.displayName}" (${recipient.emailAddress})? This action cannot be undone.`,
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

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result === true) {
          this.isLoading = true;
          this.emailRecipientsService
            .delete(recipient.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.snackBar.open('Email recipient deleted successfully', 'Close', {
                  duration: 3000,
                  panelClass: ['success-snackbar']
                });
                this.loadData();
              },
              error: (err) => {
                console.error('Error deleting email recipient:', err);
                this.snackBar.open(err.message || 'Failed to delete email recipient', 'Close', {
                  duration: 5000,
                  panelClass: ['error-snackbar']
                });
                this.isLoading = false;
              }
            });
        }
      });
  }

  /**
   * Send a test email to the recipient
   */
  private sendTestEmail(recipient: EmailRecipientDto): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Send Test Email',
      message: `Send a test email to "${recipient.displayName}" (${recipient.emailAddress}) to verify SMTP configuration?`,
      icon: 'email',
      confirmText: 'Send',
      cancelText: 'Cancel',
      showCancel: true,
      confirmColor: 'primary'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result === true) {
          this.snackBar.open('Sending test email...', '', {
            duration: 0 // Keep open until response
          });

          this.emailRecipientsService
            .sendTestEmail(recipient.emailAddress)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (message) => {
                this.snackBar.open(message, 'Close', {
                  duration: 5000,
                  panelClass: ['success-snackbar']
                });
              },
              error: (err) => {
                console.error('Error sending test email:', err);
                this.snackBar.open(err.message || 'Failed to send test email', 'Close', {
                  duration: 5000,
                  panelClass: ['error-snackbar']
                });
              }
            });
        }
      });
  }
}

/**
 * Dialog component for creating/editing email recipients
 */
@Component({
  selector: 'app-email-recipient-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Add Email Recipient' : data.mode === 'view' ? 'View Email Recipient' : 'Edit Email Recipient' }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="recipientForm" class="recipient-form">
        <mat-form-field appearance="outline">
          <mat-label>Email Address</mat-label>
          <input
            matInput
            formControlName="emailAddress"
            placeholder="user@example.com"
            type="email"
            required
          />
          <mat-icon matPrefix>email</mat-icon>
          <mat-error *ngIf="recipientForm.get('emailAddress')?.hasError('required')">
            Email address is required
          </mat-error>
          <mat-error *ngIf="recipientForm.get('emailAddress')?.hasError('email')">
            Please enter a valid email address
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Display Name</mat-label>
          <input
            matInput
            formControlName="displayName"
            placeholder="John Doe"
            required
          />
          <mat-icon matPrefix>person</mat-icon>
          <mat-error *ngIf="recipientForm.get('displayName')?.hasError('required')">
            Display name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            placeholder="Optional description"
            rows="2"
          ></textarea>
          <mat-icon matPrefix>description</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Notification Types</mat-label>
          <mat-select formControlName="notificationTypes" multiple>
            <mat-option *ngFor="let option of notificationTypeOptions" [value]="option.value">
              {{ option.label }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>notifications</mat-icon>
          <mat-hint>Select which error types should trigger email notifications</mat-hint>
        </mat-form-field>

        <div class="toggle-field">
          <mat-slide-toggle formControlName="isActive" color="primary">
            Active
          </mat-slide-toggle>
          <p class="toggle-hint">Only active recipients will receive email notifications</p>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">{{ data.mode === 'view' ? 'Close' : 'Cancel' }}</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSave()"
        [disabled]="!recipientForm.valid"
        *ngIf="data.mode !== 'view'"
      >
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        padding: 0 24px !important;
        min-height: 300px;
        overflow: visible !important;
      }

      .recipient-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        min-width: 400px;
        padding-top: 16px;
      }

      mat-form-field {
        width: 100%;
      }

      .toggle-field {
        padding: 0.5rem 0;
      }

      .toggle-hint {
        margin: 0.5rem 0 0 0;
        font-size: 0.75rem;
        color: rgba(0, 0, 0, 0.6);
      }
    `
  ]
})
export class EmailRecipientDialogComponent {
  recipientForm: FormGroup;
  notificationTypeOptions = NOTIFICATION_TYPE_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EmailRecipientDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { mode: 'create' | 'edit' | 'view'; recipient?: EmailRecipientDto }
  ) {
    const recipient = data.recipient;
    const notificationTypesArray = recipient
      ? parseNotificationTypes(recipient.notificationTypes)
      : ['MissionError', 'JobQueryError', 'RobotQueryError']; // Default to all types

    this.recipientForm = this.fb.group({
      emailAddress: [recipient?.emailAddress || '', [Validators.required, Validators.email]],
      displayName: [recipient?.displayName || '', Validators.required],
      description: [recipient?.description || ''],
      notificationTypes: [notificationTypesArray],
      isActive: [recipient?.isActive ?? true]
    });

    // Disable form in view mode
    if (data.mode === 'view') {
      this.recipientForm.disable();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.recipientForm.valid) {
      const formValue = this.recipientForm.value;

      const request: EmailRecipientCreateRequest | EmailRecipientUpdateRequest = {
        emailAddress: formValue.emailAddress,
        displayName: formValue.displayName,
        description: formValue.description || undefined,
        notificationTypes: joinNotificationTypes(formValue.notificationTypes || []),
        isActive: formValue.isActive
      };

      this.dialogRef.close(request);
    }
  }
}
