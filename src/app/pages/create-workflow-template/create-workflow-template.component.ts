import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { SavedCustomMissionsService } from '../../services/saved-custom-missions.service';
import {
  SaveMissionAsTemplateRequest,
  MissionStepData
} from '../../models/saved-custom-missions.models';

@Component({
  selector: 'app-create-workflow-template',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './create-workflow-template.component.html',
  styleUrl: './create-workflow-template.component.scss'
})
export class CreateWorkflowTemplateComponent implements OnInit, OnDestroy {
  templateForm!: FormGroup;
  isSubmitting = false;
  private destroy$ = new Subject<void>();

  // Form options
  priorityOptions = [
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
    { value: 4, label: 'Critical' }
  ];

  stepTypeOptions = [
    'PICKUP',
    'DROPOFF',
    'NAVIGATE',
    'WAIT',
    'CHARGE'
  ];

  passStrategyOptions = [
    'CONTINUE',
    'WAIT',
    'ABORT'
  ];

  constructor(
    private fb: FormBuilder,
    private savedCustomMissionsService: SavedCustomMissionsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the reactive form
   */
  private initializeForm(): void {
    this.templateForm = this.fb.group({
      // Basic information
      missionName: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],

      // Mission template
      missionTemplate: this.fb.group({
        orgId: ['', [Validators.required]],
        missionType: ['', [Validators.required]],
        viewBoardType: [''],
        robotModels: [[]],
        robotIds: [[]],
        robotType: ['', [Validators.required]],
        priority: [2, [Validators.required, Validators.min(1), Validators.max(4)]],
        containerModelCode: [''],
        containerCode: [''],
        templateCode: [''],
        lockRobotAfterFinish: [false],
        unlockRobotId: [''],
        unlockMissionCode: [''],
        idleNode: [''],
        missionData: this.fb.array([])
      })
    });

    // Add one mission step by default
    this.addMissionStep();
  }

  /**
   * Get mission template form group
   */
  get missionTemplate(): FormGroup {
    return this.templateForm.get('missionTemplate') as FormGroup;
  }

  /**
   * Get mission data form array
   */
  get missionData(): FormArray {
    return this.missionTemplate.get('missionData') as FormArray;
  }

  /**
   * Create a new mission step form group
   */
  private createMissionStepFormGroup(sequence: number = 0): FormGroup {
    return this.fb.group({
      sequence: [sequence, [Validators.required, Validators.min(0)]],
      position: ['', [Validators.required]],
      type: ['NAVIGATE', [Validators.required]],
      putDown: [false],
      passStrategy: ['CONTINUE', [Validators.required]],
      waitingMillis: [0, [Validators.min(0)]]
    });
  }

  /**
   * Add a new mission step
   */
  addMissionStep(): void {
    const newSequence = this.missionData.length;
    this.missionData.push(this.createMissionStepFormGroup(newSequence));
  }

  /**
   * Remove a mission step
   */
  removeMissionStep(index: number): void {
    if (this.missionData.length > 1) {
      this.missionData.removeAt(index);
      // Update sequence numbers
      this.updateSequenceNumbers();
    }
  }

  /**
   * Move mission step up
   */
  moveStepUp(index: number): void {
    if (index > 0) {
      const step = this.missionData.at(index);
      this.missionData.removeAt(index);
      this.missionData.insert(index - 1, step);
      this.updateSequenceNumbers();
    }
  }

  /**
   * Move mission step down
   */
  moveStepDown(index: number): void {
    if (index < this.missionData.length - 1) {
      const step = this.missionData.at(index);
      this.missionData.removeAt(index);
      this.missionData.insert(index + 1, step);
      this.updateSequenceNumbers();
    }
  }

  /**
   * Update sequence numbers after reordering
   */
  private updateSequenceNumbers(): void {
    this.missionData.controls.forEach((control, index) => {
      control.get('sequence')?.setValue(index);
    });
  }

  /**
   * Add robot model to the list
   */
  addRobotModel(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value) {
      const currentModels = this.missionTemplate.get('robotModels')?.value || [];
      if (!currentModels.includes(value)) {
        this.missionTemplate.get('robotModels')?.setValue([...currentModels, value]);
      }
      input.value = '';
    }
  }

  /**
   * Remove robot model from the list
   */
  removeRobotModel(model: string): void {
    const currentModels = this.missionTemplate.get('robotModels')?.value || [];
    this.missionTemplate.get('robotModels')?.setValue(
      currentModels.filter((m: string) => m !== model)
    );
  }

  /**
   * Add robot ID to the list
   */
  addRobotId(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value) {
      const currentIds = this.missionTemplate.get('robotIds')?.value || [];
      if (!currentIds.includes(value)) {
        this.missionTemplate.get('robotIds')?.setValue([...currentIds, value]);
      }
      input.value = '';
    }
  }

  /**
   * Remove robot ID from the list
   */
  removeRobotId(id: string): void {
    const currentIds = this.missionTemplate.get('robotIds')?.value || [];
    this.missionTemplate.get('robotIds')?.setValue(
      currentIds.filter((robotId: string) => robotId !== id)
    );
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.templateForm.valid) {
      this.isSubmitting = true;

      const formValue = this.templateForm.value;
      const request: SaveMissionAsTemplateRequest = {
        missionName: formValue.missionName,
        description: formValue.description,
        missionTemplate: {
          ...formValue.missionTemplate,
          robotModels: formValue.missionTemplate.robotModels || [],
          robotIds: formValue.missionTemplate.robotIds || [],
          containerModelCode: formValue.missionTemplate.containerModelCode || null,
          containerCode: formValue.missionTemplate.containerCode || null,
          templateCode: formValue.missionTemplate.templateCode || null,
          unlockRobotId: formValue.missionTemplate.unlockRobotId || null,
          unlockMissionCode: formValue.missionTemplate.unlockMissionCode || null,
          idleNode: formValue.missionTemplate.idleNode || null
        }
      };

      this.savedCustomMissionsService.saveMissionAsTemplate(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Template saved successfully:', response);
            this.isSubmitting = false;
            // Navigate to saved custom missions page
            this.router.navigate(['/saved-custom-missions']);
          },
          error: (error) => {
            console.error('Failed to save template:', error);
            this.isSubmitting = false;
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.templateForm);
    }
  }

  /**
   * Mark all form fields as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          }
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  /**
   * Reset the form
   */
  resetForm(): void {
    this.templateForm.reset();
    // Clear mission steps and add one default
    while (this.missionData.length > 0) {
      this.missionData.removeAt(0);
    }
    this.addMissionStep();
    // Reset default values
    this.missionTemplate.get('priority')?.setValue(2);
    this.missionTemplate.get('lockRobotAfterFinish')?.setValue(false);
    this.missionTemplate.get('robotModels')?.setValue([]);
    this.missionTemplate.get('robotIds')?.setValue([]);
  }

  /**
   * Cancel and navigate back
   */
  cancel(): void {
    this.router.navigate(['/saved-custom-missions']);
  }
}
