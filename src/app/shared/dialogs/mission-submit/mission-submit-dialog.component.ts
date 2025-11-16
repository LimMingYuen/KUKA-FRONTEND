import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';

import { MissionsService } from '../../../services/missions.service';
import { WorkflowService } from '../../../services/workflow.service';
import { SubmitMissionRequest, MissionPriority, MissionStepData, JobData, MissionsUtils } from '../../../models/missions.models';
import { WorkflowDisplayData } from '../../../models/workflow.models';
import { Subject, takeUntil, interval } from 'rxjs';

export interface MissionSubmitDialogData {
  missionCode?: string;
  templateCode?: string;
  workflowType?: 'sync' | 'custom';
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
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule
  ],
  templateUrl: './mission-submit-dialog.component.html',
  styleUrl: './mission-submit-dialog.component.scss'
})
export class MissionSubmitDialogComponent implements OnInit, OnDestroy {
  // Forms
  public syncForm: FormGroup;
  public customForm: FormGroup;

  // UI State
  public selectedTab = 0; // 0 = Sync Workflow, 1 = Custom Mission
  public isSubmitting = false;
  public isLoadingWorkflows = false;
  public isPollingJobs = false;

  // Data
  public workflows: WorkflowDisplayData[] = [];
  public submittedMissionCode: string | null = null;
  public jobStatus: JobData | null = null;

  // Options
  public priorityOptions = [
    { value: MissionPriority.LOW, label: 'Low' },
    { value: MissionPriority.MEDIUM, label: 'Medium' },
    { value: MissionPriority.HIGH, label: 'High' },
    { value: MissionPriority.CRITICAL, label: 'Critical' }
  ];

  public missionTypeOptions = [
    { value: 'RACK_MOVE', label: 'Rack Move' },
    { value: 'PICK', label: 'Pick' },
    { value: 'PLACE', label: 'Place' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'CHARGE', label: 'Charge' },
    { value: 'CUSTOM', label: 'Custom' }
  ];

  public passStrategyOptions = [
    { value: 'AUTO', label: 'Auto' },
    { value: 'MANUAL', label: 'Manual' },
    { value: 'SKIP', label: 'Skip' }
  ];

  public nodeTypeOptions = [
    { value: 'NODE_POINT', label: 'Node Point' },
    { value: 'RACK_POINT', label: 'Rack Point' },
    { value: 'CHARGING_POINT', label: 'Charging Point' },
    { value: 'PARKING_POINT', label: 'Parking Point' }
  ];

  // Cleanup
  private destroy$ = new Subject<void>();
  private pollingSubscription: any;

  constructor(
    private fb: FormBuilder,
    private missionsService: MissionsService,
    private workflowService: WorkflowService,
    public dialogRef: MatDialogRef<MissionSubmitDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MissionSubmitDialogData
  ) {
    // Initialize Sync Workflow Form
    this.syncForm = this.fb.group({
      orgId: ['UNIVERSAL', Validators.required],
      missionType: ['RACK_MOVE', Validators.required],
      viewBoardType: [''],
      robotModels: [['KMP600I']],
      robotIds: [['14']],
      robotType: ['LIFT', Validators.required],
      priority: [50, Validators.required], // Priority range: 0-100 (50 = normal)
      containerModelCode: [''],
      containerCode: [''],
      templateCode: ['', Validators.required],
      lockRobotAfterFinish: [false],
      unlockRobotId: [''],
      unlockMissionCode: [''],
      idleNode: ['']
    });

    // Initialize Custom Mission Form
    this.customForm = this.fb.group({
      orgId: ['UNIVERSAL', Validators.required],
      missionType: ['RACK_MOVE', Validators.required],
      viewBoardType: [''],
      robotModels: [['KMP600I']],
      robotIds: [['14']],
      robotType: ['LIFT', Validators.required],
      priority: [50, Validators.required], // Priority range: 0-100 (50 = normal)
      containerModelCode: [''],
      containerCode: [''],
      lockRobotAfterFinish: [false],
      unlockRobotId: [''],
      unlockMissionCode: [''],
      idleNode: [''],
      missionSteps: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Set initial tab based on data
    if (this.data?.workflowType) {
      this.selectedTab = this.data.workflowType === 'custom' ? 1 : 0;
    }

    // Pre-fill templateCode if provided
    if (this.data?.templateCode) {
      this.syncForm.patchValue({ templateCode: this.data.templateCode });
    }

    // Load workflows for sync workflow dropdown
    this.loadWorkflows();

    // Add initial mission step for custom form
    this.addMissionStep();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  /**
   * Load workflows for sync workflow dropdown
   */
  loadWorkflows(): void {
    this.isLoadingWorkflows = true;
    this.workflowService.getWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflows) => {
          this.workflows = workflows;
          this.isLoadingWorkflows = false;
        },
        error: (error) => {
          console.error('Error loading workflows:', error);
          this.isLoadingWorkflows = false;
        }
      });
  }

  /**
   * Get mission steps FormArray
   */
  get missionSteps(): FormArray {
    return this.customForm.get('missionSteps') as FormArray;
  }

  /**
   * Create mission step form group
   */
  createMissionStep(sequence?: number): FormGroup {
    return this.fb.group({
      sequence: [sequence || this.missionSteps.length + 1, Validators.required],
      position: ['', Validators.required],
      type: ['NODE_POINT', Validators.required],
      putDown: [false],
      passStrategy: ['AUTO', Validators.required],
      waitingMillis: [0, [Validators.required, Validators.min(0)]]
    });
  }

  /**
   * Add mission step
   */
  addMissionStep(): void {
    this.missionSteps.push(this.createMissionStep());
  }

  /**
   * Remove mission step
   */
  removeMissionStep(index: number): void {
    this.missionSteps.removeAt(index);
    // Update sequence numbers
    this.missionSteps.controls.forEach((control, idx) => {
      control.patchValue({ sequence: idx + 1 });
    });
  }

  /**
   * Move mission step up
   */
  moveStepUp(index: number): void {
    if (index === 0) return;
    const step = this.missionSteps.at(index);
    this.missionSteps.removeAt(index);
    this.missionSteps.insert(index - 1, step);
    // Update sequence numbers
    this.missionSteps.controls.forEach((control, idx) => {
      control.patchValue({ sequence: idx + 1 });
    });
  }

  /**
   * Move mission step down
   */
  moveStepDown(index: number): void {
    if (index === this.missionSteps.length - 1) return;
    const step = this.missionSteps.at(index);
    this.missionSteps.removeAt(index);
    this.missionSteps.insert(index + 1, step);
    // Update sequence numbers
    this.missionSteps.controls.forEach((control, idx) => {
      control.patchValue({ sequence: idx + 1 });
    });
  }

  /**
   * Submit the mission based on selected tab
   */
  onSubmit(): void {
    if (this.selectedTab === 0) {
      this.submitSyncWorkflow();
    } else {
      this.submitCustomMission();
    }
  }

  /**
   * Submit sync workflow mission
   */
  submitSyncWorkflow(): void {
    if (this.syncForm.invalid) {
      this.syncForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.syncForm.value;

    const request = {
      orgId: formValue.orgId,
      requestId: this.generateRequestId(),
      missionCode: this.generateMissionCode(),
      missionType: formValue.missionType,
      viewBoardType: formValue.viewBoardType || '',
      robotModels: formValue.robotModels || [],
      robotIds: formValue.robotIds || [],
      robotType: formValue.robotType,
      priority: formValue.priority,
      containerModelCode: formValue.containerModelCode || '',
      containerCode: formValue.containerCode || '',
      templateCode: formValue.templateCode,
      lockRobotAfterFinish: formValue.lockRobotAfterFinish,
      unlockRobotId: formValue.unlockRobotId || '',
      unlockMissionCode: formValue.unlockMissionCode || '',
      idleNode: formValue.idleNode || ''
    };

    this.missionsService.submitMission(request).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.submittedMissionCode = request.missionCode;
          this.startJobPolling(request.missionCode);
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Submit custom mission
   */
  submitCustomMission(): void {
    if (this.customForm.invalid) {
      this.customForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.customForm.value;

    const request = {
      orgId: formValue.orgId,
      requestId: this.generateRequestId(),
      missionCode: this.generateMissionCode(),
      missionType: formValue.missionType,
      viewBoardType: formValue.viewBoardType || '',
      robotModels: formValue.robotModels || [],
      robotIds: formValue.robotIds || [],
      robotType: formValue.robotType,
      priority: formValue.priority,
      containerModelCode: formValue.containerModelCode || '',
      containerCode: formValue.containerCode || '',
      templateCode: '',
      lockRobotAfterFinish: formValue.lockRobotAfterFinish,
      unlockRobotId: formValue.unlockRobotId || '',
      unlockMissionCode: formValue.unlockMissionCode || '',
      idleNode: formValue.idleNode || '',
      missionData: formValue.missionSteps.map((step: any) => ({
        sequence: step.sequence,
        position: step.position,
        type: step.type,
        putDown: step.putDown,
        passStrategy: step.passStrategy,
        waitingMillis: step.waitingMillis
      }))
    };

    this.missionsService.submitMission(request).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.submittedMissionCode = request.missionCode;
          this.startJobPolling(request.missionCode);
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Start polling for job status
   */
  startJobPolling(missionCode: string): void {
    this.isPollingJobs = true;

    // Poll every 3 seconds (as per API recommendation)
    this.pollingSubscription = interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.missionsService.queryJobs({
          missionCodes: [missionCode],
          limit: 1
        }).subscribe({
          next: (response) => {
            if (response.success && response.data && response.data.length > 0) {
              this.jobStatus = response.data[0];

              // Stop polling if job is in terminal state
              if (MissionsUtils.isJobTerminal(this.jobStatus.status)) {
                this.stopJobPolling();
              }
            }
          },
          error: (error) => {
            console.error('Error polling job status:', error);
          }
        });
      });
  }

  /**
   * Stop job polling
   */
  stopJobPolling(): void {
    this.isPollingJobs = false;
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  /**
   * Close dialog with result
   */
  closeWithResult(): void {
    this.stopJobPolling();
    this.dialogRef.close({
      missionCode: this.submittedMissionCode,
      jobStatus: this.jobStatus
    });
  }

  /**
   * Cancel and close dialog
   */
  onCancel(): void {
    this.stopJobPolling();
    this.dialogRef.close(null);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0') +
      now.getMilliseconds().toString().padStart(3, '0');
    return `request${timestamp}`;
  }

  /**
   * Generate unique mission code
   */
  private generateMissionCode(): string {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0') +
      now.getMilliseconds().toString().padStart(3, '0');
    return `mission${timestamp}`;
  }

  /**
   * Get status color for job status
   */
  getStatusColor(status: number | string): string {
    return MissionsUtils.getJobStatusColor(status);
  }

  /**
   * Get status text for job status
   */
  getStatusText(status: number | string): string {
    return MissionsUtils.getJobStatusText(status);
  }
}
