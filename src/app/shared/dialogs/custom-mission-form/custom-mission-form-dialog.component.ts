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
import { MatTabsModule } from '@angular/material/tabs';

import { SavedCustomMissionsService } from '../../../services/saved-custom-missions.service';
import {
  SavedCustomMissionCreateRequest,
  SavedCustomMissionUpdateRequest
} from '../../../models/saved-custom-missions.models';

export interface CustomMissionFormDialogData {
  mode: 'create' | 'edit';
  mission?: any;
}

@Component({
  selector: 'app-custom-mission-form-dialog',
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
    MatIconModule,
    MatTabsModule
  ],
  templateUrl: './custom-mission-form-dialog.component.html',
  styleUrl: './custom-mission-form-dialog.component.scss'
})
export class CustomMissionFormDialogComponent implements OnInit {
  public form: FormGroup;
  public isSubmitting = false;
  public mode: 'create' | 'edit';

  public priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];

  constructor(
    private fb: FormBuilder,
    private savedCustomMissionsService: SavedCustomMissionsService,
    public dialogRef: MatDialogRef<CustomMissionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CustomMissionFormDialogData
  ) {
    this.mode = data.mode;

    this.form = this.fb.group({
      // Basic Information
      missionName: ['', Validators.required],
      description: [''],
      missionType: ['', Validators.required],
      robotType: ['', Validators.required],
      priority: ['MEDIUM', Validators.required],

      // Robot Configuration
      robotModels: [''],
      robotIds: [''],

      // Container Configuration
      containerModelCode: [''],
      containerCode: [''],

      // Advanced Configuration
      idleNode: [''],
      orgId: [''],
      viewBoardType: [''],
      templateCode: [''],

      // Lock/Unlock Options
      lockRobotAfterFinish: [false],
      unlockRobotId: [''],
      unlockMissionCode: [''],

      // Mission Steps (JSON)
      missionStepsJson: ['[]', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.mode === 'edit' && this.data.mission) {
      this.populateForm(this.data.mission);
    }
  }

  /**
   * Populate form with existing mission data
   */
  private populateForm(mission: any): void {
    this.form.patchValue({
      missionName: mission.missionName,
      description: mission.description === '-' ? '' : mission.description,
      missionType: mission.missionType,
      robotType: mission.robotType,
      priority: mission.priority,
      robotModels: mission.robotModels === '-' ? '' : mission.robotModels,
      robotIds: mission.robotIds === '-' ? '' : mission.robotIds,
      containerModelCode: mission.containerModelCode === '-' ? '' : mission.containerModelCode,
      containerCode: mission.containerCode === '-' ? '' : mission.containerCode,
      idleNode: mission.idleNode === '-' ? '' : mission.idleNode,
      orgId: mission.orgId === '-' ? '' : mission.orgId,
      viewBoardType: mission.viewBoardType === '-' ? '' : mission.viewBoardType,
      templateCode: mission.templateCode === '-' ? '' : mission.templateCode,
      lockRobotAfterFinish: mission.lockRobotAfterFinish || false,
      unlockRobotId: mission.unlockRobotId === '-' ? '' : mission.unlockRobotId,
      unlockMissionCode: mission.unlockMissionCode === '-' ? '' : mission.unlockMissionCode,
      missionStepsJson: mission.missionStepsJson || '[]'
    });
  }

  /**
   * Submit the form
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    if (this.mode === 'create') {
      this.createMission();
    } else {
      this.updateMission();
    }
  }

  /**
   * Create new custom mission
   */
  private createMission(): void {
    const formValue = this.form.value;

    // Convert comma-separated strings to arrays
    const robotModels = formValue.robotModels
      ? formValue.robotModels.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : [];

    const robotIds = formValue.robotIds
      ? formValue.robotIds.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : [];

    const request: SavedCustomMissionCreateRequest = {
      missionName: formValue.missionName,
      description: formValue.description || null,
      missionType: formValue.missionType,
      robotType: formValue.robotType,
      priority: formValue.priority,
      robotModels,
      robotIds,
      containerModelCode: formValue.containerModelCode || null,
      containerCode: formValue.containerCode || null,
      idleNode: formValue.idleNode || null,
      missionStepsJson: formValue.missionStepsJson
    };

    this.savedCustomMissionsService.createSavedCustomMission(request).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        this.dialogRef.close(result);
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Update existing custom mission
   */
  private updateMission(): void {
    const formValue = this.form.value;

    // Convert comma-separated strings to arrays
    const robotModels = formValue.robotModels
      ? formValue.robotModels.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : [];

    const robotIds = formValue.robotIds
      ? formValue.robotIds.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : [];

    const request: SavedCustomMissionUpdateRequest = {
      missionName: formValue.missionName,
      description: formValue.description || null,
      missionType: formValue.missionType,
      robotType: formValue.robotType,
      priority: formValue.priority,
      robotModels,
      robotIds,
      containerModelCode: formValue.containerModelCode || null,
      containerCode: formValue.containerCode || null,
      idleNode: formValue.idleNode || null,
      orgId: formValue.orgId || null,
      viewBoardType: formValue.viewBoardType || null,
      templateCode: formValue.templateCode || null,
      lockRobotAfterFinish: formValue.lockRobotAfterFinish,
      unlockRobotId: formValue.unlockRobotId || null,
      unlockMissionCode: formValue.unlockMissionCode || null,
      missionStepsJson: formValue.missionStepsJson
    };

    this.savedCustomMissionsService.updateSavedCustomMission(this.data.mission.id, request).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        this.dialogRef.close(result);
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
   * Validate and format JSON
   */
  formatJson(): void {
    try {
      const json = this.form.get('missionStepsJson')?.value;
      const parsed = JSON.parse(json);
      const formatted = JSON.stringify(parsed, null, 2);
      this.form.patchValue({ missionStepsJson: formatted });
    } catch (error) {
      // Invalid JSON - do nothing
    }
  }

  /**
   * Get dialog title
   */
  getTitle(): string {
    return this.mode === 'create' ? 'Create Custom Mission' : 'Edit Custom Mission';
  }
}
