import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { MissionsService } from '../../../services/missions.service';
import { SubmitMissionRequest, MissionPriority } from '../../../models/missions.models';

export interface MissionSubmitDialogData {
  missionCode?: string;
  templateCode?: string;
}

@Component({
  selector: 'app-mission-submit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './mission-submit-dialog.component.html',
  styleUrl: './mission-submit-dialog.component.scss'
})
export class MissionSubmitDialogComponent implements OnInit {
  public form: FormGroup;
  public isSubmitting = false;

  public priorityOptions = [
    { value: MissionPriority.LOW, label: 'Low' },
    { value: MissionPriority.MEDIUM, label: 'Medium' },
    { value: MissionPriority.HIGH, label: 'High' },
    { value: MissionPriority.CRITICAL, label: 'Critical' }
  ];

  constructor(
    private fb: FormBuilder,
    private missionsService: MissionsService,
    public dialogRef: MatDialogRef<MissionSubmitDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MissionSubmitDialogData
  ) {
    this.form = this.fb.group({
      missionCode: [data?.missionCode || '', Validators.required],
      templateCode: [data?.templateCode || ''],
      priority: [MissionPriority.MEDIUM, Validators.required],
      orgId: [''],
      viewBoardType: [''],
      robotType: [''],
      robotModels: [''],
      robotIds: [''],
      containerModelCode: [''],
      containerCode: [''],
      idleNode: [''],
      lockRobotAfterFinish: [false],
      unlockRobotId: [''],
      unlockMissionCode: ['']
    });
  }

  ngOnInit(): void {
    if (this.data?.missionCode) {
      this.form.patchValue({
        missionCode: this.data.missionCode
      });
    }

    if (this.data?.templateCode) {
      this.form.patchValue({
        templateCode: this.data.templateCode
      });
    }
  }

  /**
   * Submit the mission
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const formValue = this.form.value;

    // Convert comma-separated strings to arrays
    const robotModels = formValue.robotModels
      ? formValue.robotModels.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : [];

    const robotIds = formValue.robotIds
      ? formValue.robotIds.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : [];

    const request: SubmitMissionRequest = {
      missionCode: formValue.missionCode,
      templateCode: formValue.templateCode || undefined,
      priority: formValue.priority,
      orgId: formValue.orgId || undefined,
      viewBoardType: formValue.viewBoardType || undefined,
      robotType: formValue.robotType || undefined,
      robotModels: robotModels.length > 0 ? robotModels : undefined,
      robotIds: robotIds.length > 0 ? robotIds : undefined,
      containerModelCode: formValue.containerModelCode || undefined,
      containerCode: formValue.containerCode || undefined,
      idleNode: formValue.idleNode || undefined,
      lockRobotAfterFinish: formValue.lockRobotAfterFinish,
      unlockRobotId: formValue.unlockRobotId || undefined,
      unlockMissionCode: formValue.unlockMissionCode || undefined,
      requestId: this.generateRequestId()
    };

    this.missionsService.submitMission(request).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.dialogRef.close(response);
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Cancel and close dialog
   */
  onCancel(): void {
    this.dialogRef.close(null);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
