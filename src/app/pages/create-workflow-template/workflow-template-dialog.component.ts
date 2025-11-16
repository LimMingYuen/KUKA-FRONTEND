import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import {
  SaveMissionAsTemplateRequest,
  SavedCustomMissionsDisplayData
} from '../../models/saved-custom-missions.models';

export interface WorkflowTemplateDialogData {
  mode: 'create' | 'edit';
  template?: SavedCustomMissionsDisplayData;
}

@Component({
  selector: 'app-workflow-template-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatCardModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.mode === 'create' ? 'add_task' : 'edit' }}</mat-icon>
      {{ data.mode === 'create' ? 'Create Workflow Template' : 'Edit Workflow Template' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="templateForm" class="template-form">
        <!-- Basic Information -->
        <section class="form-section">
          <h3>Basic Information</h3>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Template Name</mat-label>
            <input matInput formControlName="missionName" placeholder="Enter template name" />
            <mat-icon matPrefix>label</mat-icon>
            <mat-error *ngIf="templateForm.get('missionName')?.hasError('required')">
              Template name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea
              matInput
              formControlName="description"
              placeholder="Enter description"
              rows="2"
            ></textarea>
            <mat-icon matPrefix>description</mat-icon>
            <mat-error *ngIf="templateForm.get('description')?.hasError('required')">
              Description is required
            </mat-error>
          </mat-form-field>
        </section>

        <mat-divider></mat-divider>

        <!-- Mission Configuration -->
        <section class="form-section" [formGroup]="missionTemplate">
          <h3>Mission Configuration</h3>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Organization ID</mat-label>
              <input matInput formControlName="orgId" />
              <mat-icon matPrefix>business</mat-icon>
              <mat-error>Required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Mission Type</mat-label>
              <input matInput formControlName="missionType" />
              <mat-icon matPrefix>category</mat-icon>
              <mat-error>Required</mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Robot Type</mat-label>
              <input matInput formControlName="robotType" />
              <mat-icon matPrefix>precision_manufacturing</mat-icon>
              <mat-error>Required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <mat-select formControlName="priority">
                <mat-option [value]="1">Low</mat-option>
                <mat-option [value]="2">Medium</mat-option>
                <mat-option [value]="3">High</mat-option>
                <mat-option [value]="4">Critical</mat-option>
              </mat-select>
              <mat-icon matPrefix>flag</mat-icon>
            </mat-form-field>
          </div>

          <!-- Robot Models -->
          <div class="chip-input-container">
            <label class="chip-label">Robot Models</label>
            <div class="chips-display">
              <mat-chip-set>
                <mat-chip
                  *ngFor="let model of missionTemplate.get('robotModels')?.value"
                  (removed)="removeRobotModel(model)"
                >
                  {{ model }}
                  <button matChipRemove [attr.aria-label]="'Remove ' + model">
                    <mat-icon>cancel</mat-icon>
                  </button>
                </mat-chip>
              </mat-chip-set>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Add Robot Model</mat-label>
              <input
                matInput
                placeholder="Enter robot model and press Enter"
                #robotModelInput
                (keyup.enter)="addRobotModel(robotModelInput); $event.preventDefault()"
              />
              <mat-icon matPrefix>smart_toy</mat-icon>
              <mat-hint>Press Enter to add</mat-hint>
            </mat-form-field>
          </div>

          <!-- Robot IDs -->
          <div class="chip-input-container">
            <label class="chip-label">Robot IDs</label>
            <div class="chips-display">
              <mat-chip-set>
                <mat-chip
                  *ngFor="let id of missionTemplate.get('robotIds')?.value"
                  (removed)="removeRobotId(id)"
                >
                  {{ id }}
                  <button matChipRemove [attr.aria-label]="'Remove ' + id">
                    <mat-icon>cancel</mat-icon>
                  </button>
                </mat-chip>
              </mat-chip-set>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Add Robot ID</mat-label>
              <input
                matInput
                placeholder="Enter robot ID and press Enter"
                #robotIdInput
                (keyup.enter)="addRobotId(robotIdInput); $event.preventDefault()"
              />
              <mat-icon matPrefix>pin</mat-icon>
              <mat-hint>Press Enter to add</mat-hint>
            </mat-form-field>
          </div>
        </section>

        <mat-divider></mat-divider>

        <!-- Mission Steps -->
        <section class="form-section" [formGroup]="missionTemplate">
          <div class="section-header">
            <h3>Mission Steps</h3>
            <button mat-mini-fab color="primary" type="button" (click)="addMissionStep()">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <div class="mission-steps" formArrayName="missionData">
            <mat-card
              class="step-card"
              *ngFor="let step of missionData.controls; let i = index"
              [formGroupName]="i"
            >
              <mat-card-header>
                <mat-card-title>Step {{ i + 1 }}</mat-card-title>
                <div class="step-actions">
                  <button mat-icon-button (click)="moveStepUp(i)" [disabled]="i === 0">
                    <mat-icon>arrow_upward</mat-icon>
                  </button>
                  <button mat-icon-button (click)="moveStepDown(i)" [disabled]="i === missionData.length - 1">
                    <mat-icon>arrow_downward</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="removeMissionStep(i)" [disabled]="missionData.length === 1">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </mat-card-header>
              <mat-card-content>
                <div class="step-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Position</mat-label>
                    <input matInput formControlName="position" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Type</mat-label>
                    <mat-select formControlName="type">
                      <mat-option value="PICKUP">PICKUP</mat-option>
                      <mat-option value="DROPOFF">DROPOFF</mat-option>
                      <mat-option value="NAVIGATE">NAVIGATE</mat-option>
                      <mat-option value="WAIT">WAIT</mat-option>
                      <mat-option value="CHARGE">CHARGE</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                <div class="step-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Pass Strategy</mat-label>
                    <mat-select formControlName="passStrategy">
                      <mat-option value="CONTINUE">CONTINUE</mat-option>
                      <mat-option value="WAIT">WAIT</mat-option>
                      <mat-option value="ABORT">ABORT</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Wait Time (ms)</mat-label>
                    <input matInput type="number" formControlName="waitingMillis" min="0" />
                  </mat-form-field>
                </div>
                <mat-checkbox formControlName="putDown">Put Down</mat-checkbox>
              </mat-card-content>
            </mat-card>
          </div>
        </section>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        <mat-icon>cancel</mat-icon>
        Cancel
      </button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!templateForm.valid">
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

    .template-form {
      width: 100%;
      max-width: 100%;
    }

    .form-section {
      margin-bottom: 24px;

      h3 {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 16px;
        color: #555;
      }
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 12px;
    }

    .form-row {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;

      mat-form-field {
        flex: 1;
      }
    }

    .mission-steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
    }

    .step-card {
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #f5f5f5;

        mat-card-title {
          font-size: 14px;
          margin: 0;
        }

        .step-actions {
          display: flex;
          gap: 4px;
        }
      }

      mat-card-content {
        padding: 16px;
      }
    }

    .step-row {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;

      mat-form-field {
        flex: 1;
      }
    }

    mat-divider {
      margin: 20px 0;
    }

    .chip-input-container {
      margin-bottom: 16px;

      .chip-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #555;
        margin-bottom: 8px;
      }

      .chips-display {
        margin-bottom: 8px;
        min-height: 40px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #fafafa;

        mat-chip-set {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        mat-chip {
          background-color: #ff6f00;
          color: white;

          button[matChipRemove] {
            color: white;
            opacity: 0.8;

            &:hover {
              opacity: 1;
            }
          }
        }
      }
    }

    @media (max-width: 1200px) {
      .form-row {
        flex-direction: column;
        gap: 0;
      }
    }

    @media (max-width: 768px) {
      .template-form {
        min-width: 100%;
      }

      .step-form-row {
        flex-direction: column;
        gap: 0;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;

        button {
          width: 100%;
        }
      }
    }
  `]
})
export class WorkflowTemplateDialogComponent implements OnInit {
  templateForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<WorkflowTemplateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkflowTemplateDialogData
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    if (this.data.mode === 'edit' && this.data.template) {
      this.populateForm(this.data.template);
    }
  }

  get missionTemplate(): FormGroup {
    return this.templateForm.get('missionTemplate') as FormGroup;
  }

  get missionData(): FormArray {
    return this.missionTemplate.get('missionData') as FormArray;
  }

  private initializeForm(): void {
    this.templateForm = this.fb.group({
      missionName: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      missionTemplate: this.fb.group({
        orgId: ['', [Validators.required]],
        missionType: ['', [Validators.required]],
        viewBoardType: [''],
        robotModels: [[]],
        robotIds: [[]],
        robotType: ['', [Validators.required]],
        priority: [2, [Validators.required]],
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

    // Add one default step
    this.addMissionStep();
  }

  private populateForm(template: SavedCustomMissionsDisplayData): void {
    try {
      const missionSteps = JSON.parse(template.missionStepsJson || '[]');
      const robotModels = template.robotModels ? template.robotModels.split(', ').filter(m => m !== '-') : [];
      const robotIds = template.robotIds ? template.robotIds.split(', ').filter(id => id !== '-') : [];

      this.templateForm.patchValue({
        missionName: template.missionName,
        description: template.description !== '-' ? template.description : ''
      });

      this.missionTemplate.patchValue({
        orgId: template.orgId !== '-' ? template.orgId : '',
        missionType: template.missionType,
        viewBoardType: template.viewBoardType !== '-' ? template.viewBoardType : '',
        robotType: template.robotType,
        priority: this.parsePriority(template.priority),
        robotModels,
        robotIds,
        containerModelCode: template.containerModelCode !== '-' ? template.containerModelCode : '',
        containerCode: template.containerCode !== '-' ? template.containerCode : '',
        templateCode: template.templateCode !== '-' ? template.templateCode : '',
        lockRobotAfterFinish: template.lockRobotAfterFinish,
        unlockRobotId: template.unlockRobotId !== '-' ? template.unlockRobotId : '',
        unlockMissionCode: template.unlockMissionCode !== '-' ? template.unlockMissionCode : '',
        idleNode: template.idleNode !== '-' ? template.idleNode : ''
      });

      // Clear existing steps
      while (this.missionData.length > 0) {
        this.missionData.removeAt(0);
      }

      // Add mission steps
      if (missionSteps.length > 0) {
        missionSteps.forEach((step: any) => {
          this.missionData.push(this.fb.group({
            sequence: [step.sequence || 0],
            position: [step.position || '', Validators.required],
            type: [step.type || 'NAVIGATE', Validators.required],
            putDown: [step.putDown || false],
            passStrategy: [step.passStrategy || 'CONTINUE', Validators.required],
            waitingMillis: [step.waitingMillis || 0, Validators.min(0)]
          }));
        });
      } else {
        this.addMissionStep();
      }
    } catch (error) {
      console.error('Error populating form:', error);
    }
  }

  private parsePriority(priority: string | null | undefined): number {
    if (!priority) return 2; // Default to MEDIUM

    const priorityMap: { [key: string]: number } = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4
    };
    return priorityMap[priority.toUpperCase()] || 2;
  }

  addMissionStep(): void {
    this.missionData.push(this.fb.group({
      sequence: [this.missionData.length],
      position: ['', Validators.required],
      type: ['NAVIGATE', Validators.required],
      putDown: [false],
      passStrategy: ['CONTINUE', Validators.required],
      waitingMillis: [0, Validators.min(0)]
    }));
  }

  removeMissionStep(index: number): void {
    if (this.missionData.length > 1) {
      this.missionData.removeAt(index);
      this.updateSequenceNumbers();
    }
  }

  moveStepUp(index: number): void {
    if (index > 0) {
      const step = this.missionData.at(index);
      this.missionData.removeAt(index);
      this.missionData.insert(index - 1, step);
      this.updateSequenceNumbers();
    }
  }

  moveStepDown(index: number): void {
    if (index < this.missionData.length - 1) {
      const step = this.missionData.at(index);
      this.missionData.removeAt(index);
      this.missionData.insert(index + 1, step);
      this.updateSequenceNumbers();
    }
  }

  private updateSequenceNumbers(): void {
    this.missionData.controls.forEach((control, index) => {
      control.get('sequence')?.setValue(index);
    });
  }

  addRobotModel(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value) {
      const current = this.missionTemplate.get('robotModels')?.value || [];
      if (!current.includes(value)) {
        this.missionTemplate.get('robotModels')?.setValue([...current, value]);
      }
      input.value = '';
    }
  }

  removeRobotModel(model: string): void {
    const current = this.missionTemplate.get('robotModels')?.value || [];
    this.missionTemplate.get('robotModels')?.setValue(current.filter((m: string) => m !== model));
  }

  addRobotId(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value) {
      const current = this.missionTemplate.get('robotIds')?.value || [];
      if (!current.includes(value)) {
        this.missionTemplate.get('robotIds')?.setValue([...current, value]);
      }
      input.value = '';
    }
  }

  removeRobotId(id: string): void {
    const current = this.missionTemplate.get('robotIds')?.value || [];
    this.missionTemplate.get('robotIds')?.setValue(current.filter((robotId: string) => robotId !== id));
  }

  onSubmit(): void {
    if (this.templateForm.valid) {
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
      this.dialogRef.close(request);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
