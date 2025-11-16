import { Component, Inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { SavedCustomMissionsService } from '../../../services/saved-custom-missions.service';
import { MissionTypesService } from '../../../services/mission-types.service';
import { RobotTypesService } from '../../../services/robot-types.service';
import { ResumeStrategiesService } from '../../../services/resume-strategies.service';
import { MobileRobotsService } from '../../../services/mobile-robots.service';
import { AreasService } from '../../../services/areas.service';
import { QrCodesService } from '../../../services/qr-codes.service';
import { MapZonesService } from '../../../services/map-zones.service';

import {
  SavedCustomMissionCreateRequest,
  SavedCustomMissionUpdateRequest,
  MissionStepData
} from '../../../models/saved-custom-missions.models';

import { MissionTypeDisplayData } from '../../../models/mission-types.models';
import { RobotTypeDisplayData } from '../../../models/robot-types.models';
import { ResumeStrategyDisplayData } from '../../../models/resume-strategies.models';

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
    MatTooltipModule,
    MatSnackBarModule,
    MatCardModule
  ],
  templateUrl: './custom-mission-form-dialog.component.html',
  styleUrl: './custom-mission-form-dialog.component.scss'
})
export class CustomMissionFormDialogComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public isSubmitting = false;
  public mode: 'create' | 'edit';
  private destroy$ = new Subject<void>();

  // Signals for configuration data
  public isLoadingConfig = signal<boolean>(false);
  public activeMissionTypes = signal<MissionTypeDisplayData[]>([]);
  public activeRobotTypes = signal<RobotTypeDisplayData[]>([]);
  public activeResumeStrategies = signal<ResumeStrategyDisplayData[]>([]);
  public qrCodePositions = signal<string[]>([]);
  public mapZonePositions = signal<{ name: string; code: string }[]>([]);
  public availableRobotModels = signal<string[]>([]);
  public availableRobotIds = signal<string[]>([]);

  public priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];

  public stepTypeOptions = [
    { value: 'NODE_POINT', label: 'QR Code (NODE_POINT)' },
    { value: 'NODE_AREA', label: 'Map Zone (NODE_AREA)' }
  ];

  constructor(
    private fb: FormBuilder,
    private savedCustomMissionsService: SavedCustomMissionsService,
    private missionTypesService: MissionTypesService,
    private robotTypesService: RobotTypesService,
    private resumeStrategiesService: ResumeStrategiesService,
    private mobileRobotsService: MobileRobotsService,
    private areasService: AreasService,
    private qrCodesService: QrCodesService,
    private mapZonesService: MapZonesService,
    private snackBar: MatSnackBar,
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
      robotModels: [[]],
      robotIds: [[]],

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

      // Mission Steps (FormArray)
      missionSteps: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadConfigurationData();

    if (this.mode === 'edit' && this.data.mission) {
      this.populateForm(this.data.mission);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all configuration data from services
   */
  private loadConfigurationData(): void {
    this.isLoadingConfig.set(true);

    forkJoin({
      missionTypes: this.missionTypesService.getMissionTypes(),
      robotTypes: this.robotTypesService.getRobotTypes(),
      resumeStrategies: this.resumeStrategiesService.getResumeStrategies(),
      robots: this.mobileRobotsService.getMobileRobots(),
      qrCodes: this.qrCodesService.getQrCodes(),
      mapZones: this.mapZonesService.getMapZones()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Set mission types (active only)
          this.activeMissionTypes.set(
            data.missionTypes.filter(mt => mt.isActive)
          );

          // Set robot types (active only)
          this.activeRobotTypes.set(
            data.robotTypes.filter(rt => rt.isActive)
          );

          // Set resume strategies (active only)
          this.activeResumeStrategies.set(
            data.resumeStrategies.filter(rs => rs.isActive)
          );

          // Extract unique robot models (robotTypeCode) and IDs
          const uniqueModels = [...new Set(data.robots.map(r => r.robotTypeCode).filter(Boolean))];
          const uniqueIds = [...new Set(data.robots.map(r => r.robotId).filter(Boolean))];
          this.availableRobotModels.set(uniqueModels);
          this.availableRobotIds.set(uniqueIds);

          // Set QR code positions - use unique ID format (mapCode-floor-node)
          this.qrCodePositions.set(data.qrCodes.map(qr =>
            `${qr.mapCode}-${qr.floorNumber}-${qr.nodeNumber}`
          ));

          // Set map zone positions
          this.mapZonePositions.set(
            data.mapZones.map(zone => ({
              name: zone.name,
              code: zone.code
            }))
          );

          this.isLoadingConfig.set(false);
        },
        error: (error) => {
          console.error('Error loading configuration data:', error);
          this.snackBar.open('Failed to load configuration data', 'Close', { duration: 5000 });
          this.isLoadingConfig.set(false);
        }
      });
  }

  /**
   * Get FormArray for mission steps
   */
  get missionSteps(): FormArray {
    return this.form.get('missionSteps') as FormArray;
  }

  /**
   * Create a new mission step FormGroup
   */
  private createMissionStep(stepData?: MissionStepData): FormGroup {
    return this.fb.group({
      sequence: [stepData?.sequence || this.missionSteps.length + 1, [Validators.required, Validators.min(1)]],
      position: [stepData?.position || '', Validators.required],
      type: [stepData?.type || 'NODE_POINT', Validators.required],
      putDown: [stepData?.putDown || false],
      passStrategy: [stepData?.passStrategy || 'NORMAL', Validators.required],
      waitingMillis: [stepData?.waitingMillis || 0, [Validators.required, Validators.min(0)]]
    });
  }

  /**
   * Add a new mission step
   */
  addMissionStep(): void {
    this.missionSteps.push(this.createMissionStep());
  }

  /**
   * Remove a mission step
   */
  removeMissionStep(index: number): void {
    this.missionSteps.removeAt(index);
    this.resequenceSteps();
  }

  /**
   * Move step up
   */
  moveStepUp(index: number): void {
    if (index > 0) {
      const step = this.missionSteps.at(index);
      this.missionSteps.removeAt(index);
      this.missionSteps.insert(index - 1, step);
      this.resequenceSteps();
    }
  }

  /**
   * Move step down
   */
  moveStepDown(index: number): void {
    if (index < this.missionSteps.length - 1) {
      const step = this.missionSteps.at(index);
      this.missionSteps.removeAt(index);
      this.missionSteps.insert(index + 1, step);
      this.resequenceSteps();
    }
  }

  /**
   * Resequence all steps after add/remove/move
   */
  private resequenceSteps(): void {
    this.missionSteps.controls.forEach((control, index) => {
      control.patchValue({ sequence: index + 1 });
    });
  }

  /**
   * Get available positions for a step based on its type
   */
  getAvailablePositionsForStep(stepIndex: number): string[] {
    const step = this.missionSteps.at(stepIndex);
    const selectedType = step.get('type')?.value;

    if (selectedType === 'NODE_POINT') {
      return this.qrCodePositions();
    } else if (selectedType === 'NODE_AREA') {
      return this.mapZonePositions().map(z => z.name);
    }

    return [];
  }

  /**
   * Handle step type change - clear position when type changes
   */
  onStepTypeChange(stepIndex: number): void {
    const step = this.missionSteps.at(stepIndex);
    step.patchValue({ position: '' });
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
      robotModels: this.parseStringArray(mission.robotModels),
      robotIds: this.parseStringArray(mission.robotIds),
      containerModelCode: mission.containerModelCode === '-' ? '' : mission.containerModelCode,
      containerCode: mission.containerCode === '-' ? '' : mission.containerCode,
      idleNode: mission.idleNode === '-' ? '' : mission.idleNode,
      orgId: mission.orgId === '-' ? '' : mission.orgId,
      viewBoardType: mission.viewBoardType === '-' ? '' : mission.viewBoardType,
      templateCode: mission.templateCode === '-' ? '' : mission.templateCode,
      lockRobotAfterFinish: mission.lockRobotAfterFinish || false,
      unlockRobotId: mission.unlockRobotId === '-' ? '' : mission.unlockRobotId,
      unlockMissionCode: mission.unlockMissionCode === '-' ? '' : mission.unlockMissionCode
    });

    // Parse and populate mission steps
    try {
      const stepsJson = mission.missionStepsJson || '[]';
      const steps: MissionStepData[] = JSON.parse(stepsJson);
      steps.forEach(stepData => {
        this.missionSteps.push(this.createMissionStep(stepData));
      });
    } catch (error) {
      console.error('Error parsing mission steps JSON:', error);
      this.snackBar.open('Error loading mission steps', 'Close', { duration: 5000 });
    }
  }

  /**
   * Parse string or array to array
   */
  private parseStringArray(value: string | string[]): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Remove '-' placeholder and split by comma
      if (value === '-') return [];
      return value.split(',').map(s => s.trim()).filter(s => s);
    }
    return [];
  }

  /**
   * Submit the form
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    if (this.missionSteps.length === 0) {
      this.snackBar.open('Please add at least one mission step', 'Close', { duration: 3000 });
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

    // Convert mission steps to JSON string
    const missionStepsJson = JSON.stringify(formValue.missionSteps);

    const request: SavedCustomMissionCreateRequest = {
      missionName: formValue.missionName,
      description: formValue.description || null,
      missionType: formValue.missionType,
      robotType: formValue.robotType,
      priority: formValue.priority,
      robotModels: formValue.robotModels || [],
      robotIds: formValue.robotIds || [],
      containerModelCode: formValue.containerModelCode || null,
      containerCode: formValue.containerCode || null,
      idleNode: formValue.idleNode || null,
      orgId: formValue.orgId || null,
      viewBoardType: formValue.viewBoardType || null,
      templateCode: formValue.templateCode || null,
      lockRobotAfterFinish: formValue.lockRobotAfterFinish || false,
      unlockRobotId: formValue.unlockRobotId || null,
      unlockMissionCode: formValue.unlockMissionCode || null,
      missionStepsJson
    };

    this.savedCustomMissionsService.createSavedCustomMission(request).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        this.snackBar.open('Custom mission created successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(result);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error creating mission:', error);
        this.snackBar.open('Failed to create custom mission', 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Update existing custom mission
   */
  private updateMission(): void {
    const formValue = this.form.value;

    // Convert mission steps to JSON string
    const missionStepsJson = JSON.stringify(formValue.missionSteps);

    const request: SavedCustomMissionUpdateRequest = {
      missionName: formValue.missionName,
      description: formValue.description || null,
      missionType: formValue.missionType,
      robotType: formValue.robotType,
      priority: formValue.priority,
      robotModels: formValue.robotModels || [],
      robotIds: formValue.robotIds || [],
      containerModelCode: formValue.containerModelCode || null,
      containerCode: formValue.containerCode || null,
      idleNode: formValue.idleNode || null,
      orgId: formValue.orgId || null,
      viewBoardType: formValue.viewBoardType || null,
      templateCode: formValue.templateCode || null,
      lockRobotAfterFinish: formValue.lockRobotAfterFinish,
      unlockRobotId: formValue.unlockRobotId || null,
      unlockMissionCode: formValue.unlockMissionCode || null,
      missionStepsJson
    };

    this.savedCustomMissionsService.updateSavedCustomMission(this.data.mission.id, request).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        this.snackBar.open('Custom mission updated successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(result);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error updating mission:', error);
        this.snackBar.open('Failed to update custom mission', 'Close', { duration: 5000 });
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
   * Get dialog title
   */
  getTitle(): string {
    return this.mode === 'create' ? 'Create Custom Mission' : 'Edit Custom Mission';
  }
}
