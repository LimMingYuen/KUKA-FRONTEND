import { Component, Inject, OnInit, OnDestroy, signal } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import {
  SaveMissionAsTemplateRequest,
  SavedCustomMissionsDisplayData
} from '../../models/saved-custom-missions.models';
import { MissionTypesService } from '../../services/mission-types.service';
import { RobotTypesService } from '../../services/robot-types.service';
import { ResumeStrategiesService } from '../../services/resume-strategies.service';
import { MobileRobotsService } from '../../services/mobile-robots.service';
import { AreasService } from '../../services/areas.service';
import { ShelfDecisionRulesService } from '../../services/shelf-decision-rules.service';
import { QrCodesService } from '../../services/qr-codes.service';
import { MapZonesService } from '../../services/map-zones.service';
import { MissionTypeDisplayData } from '../../models/mission-types.models';
import { RobotTypeDisplayData } from '../../models/robot-types.models';
import { ResumeStrategyDisplayData } from '../../models/resume-strategies.models';
import { createQrCodeUniqueIds } from '../../models/qr-code.models';

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
    MatCardModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.mode === 'create' ? 'add_task' : 'edit' }}</mat-icon>
      {{ data.mode === 'create' ? 'Create Workflow Template' : 'Edit Workflow Template' }}
    </h2>

    <mat-dialog-content>
      <div *ngIf="isLoadingConfig()" class="loading-overlay">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading configuration options...</p>
      </div>

      <form [formGroup]="templateForm" class="template-form" [class.loading]="isLoadingConfig()">
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
              <mat-select formControlName="missionType">
                <mat-option *ngFor="let type of activeMissionTypes()" [value]="type.actualValue">
                  {{ type.displayName }} ({{ type.actualValue }})
                </mat-option>
              </mat-select>
              <mat-icon matPrefix>category</mat-icon>
              <mat-hint *ngIf="activeMissionTypes().length === 0" class="warning-hint">
                No active mission types available
              </mat-hint>
              <mat-error>Mission type is required</mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Robot Type</mat-label>
              <mat-select formControlName="robotType">
                <mat-option *ngFor="let type of activeRobotTypes()" [value]="type.actualValue">
                  {{ type.displayName }} ({{ type.actualValue }})
                </mat-option>
              </mat-select>
              <mat-icon matPrefix>precision_manufacturing</mat-icon>
              <mat-hint *ngIf="activeRobotTypes().length === 0" class="warning-hint">
                No active robot types available
              </mat-hint>
              <mat-error>Robot type is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <input matInput type="number" formControlName="priority" min="1" max="10" placeholder="Enter priority (1-10)" />
              <mat-icon matPrefix>flag</mat-icon>
              <mat-hint>Enter a number between 1-10</mat-hint>
              <mat-error>Priority is required</mat-error>
            </mat-form-field>
          </div>

          <!-- Robot Models -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Robot Models</mat-label>
            <mat-select formControlName="robotModels" multiple>
              <mat-option *ngFor="let model of availableRobotModels()" [value]="model">
                {{ model }}
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>smart_toy</mat-icon>
            <mat-hint *ngIf="availableRobotModels().length === 0" class="warning-hint">
              No robot models available from mobile robots
            </mat-hint>
            <mat-hint *ngIf="availableRobotModels().length > 0">
              Select one or more robot models
            </mat-hint>
          </mat-form-field>

          <!-- Robot IDs -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Robot IDs</mat-label>
            <mat-select formControlName="robotIds" multiple>
              <mat-option *ngFor="let robotId of availableRobotIds()" [value]="robotId">
                {{ robotId }}
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>pin</mat-icon>
            <mat-hint *ngIf="availableRobotIds().length === 0" class="warning-hint">
              No robot IDs available from mobile robots
            </mat-hint>
            <mat-hint *ngIf="availableRobotIds().length > 0">
              Select one or more robot IDs
            </mat-hint>
          </mat-form-field>
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
                    <mat-label>Type (Area)</mat-label>
                    <mat-select formControlName="type" (selectionChange)="onTypeChange(i)">
                      <mat-option *ngFor="let area of activeAreas()" [value]="area">
                        {{ area }}
                      </mat-option>
                    </mat-select>
                    <mat-hint *ngIf="activeAreas().length === 0" class="warning-hint">
                      No active areas available
                    </mat-hint>
                    <mat-hint *ngIf="activeAreas().length > 0">
                      Select type first to load positions
                    </mat-hint>
                    <mat-error>Type is required</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Position</mat-label>
                    <mat-select formControlName="position">
                      <mat-optgroup *ngIf="step.get('type')?.value === 'NODE_POINT'" label="QR Codes">
                        <mat-option *ngFor="let position of getAvailablePositionsForStep(i)" [value]="position">
                          {{ position }}
                        </mat-option>
                      </mat-optgroup>
                      <mat-optgroup *ngIf="step.get('type')?.value === 'NODE_AREA'" label="Map Zones">
                        <mat-option *ngFor="let position of getAvailablePositionsForStep(i)" [value]="position">
                          {{ position }}
                        </mat-option>
                      </mat-optgroup>
                    </mat-select>
                    <mat-hint *ngIf="!step.get('type')?.value" class="warning-hint">
                      Select a type first
                    </mat-hint>
                    <mat-hint *ngIf="step.get('type')?.value && getAvailablePositionsForStep(i).length === 0" class="warning-hint">
                      No positions available for selected type
                    </mat-hint>
                    <mat-error>Position is required</mat-error>
                  </mat-form-field>
                </div>
                <div class="step-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Pass Strategy</mat-label>
                    <mat-select formControlName="passStrategy">
                      <mat-option *ngFor="let strategy of activeResumeStrategies()" [value]="strategy.actualValue">
                        {{ strategy.displayName }} ({{ strategy.actualValue }})
                      </mat-option>
                    </mat-select>
                    <mat-hint *ngIf="activeResumeStrategies().length === 0" class="warning-hint">
                      No active resume strategies available
                    </mat-hint>
                    <mat-error>Pass strategy is required</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Shelf Decision Rule</mat-label>
                    <mat-select formControlName="putDown">
                      <mat-option *ngFor="let rule of activeShelfRules()" [value]="rule">
                        {{ rule }}
                      </mat-option>
                    </mat-select>
                    <mat-hint *ngIf="activeShelfRules().length === 0" class="warning-hint">
                      No active shelf decision rules available
                    </mat-hint>
                    <mat-error>Shelf decision rule is required</mat-error>
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Wait Time (ms)</mat-label>
                  <input matInput type="number" formControlName="waitingMillis" min="0" placeholder="Enter wait time in milliseconds" />
                  <mat-hint>Optional waiting time in milliseconds</mat-hint>
                </mat-form-field>
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
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmit()"
        [disabled]="!templateForm.valid || isLoadingConfig()">
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

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      gap: 16px;

      p {
        margin: 0;
        font-size: 14px;
        color: #666;
      }
    }

    .template-form {
      width: 100%;
      max-width: 100%;

      &.loading {
        opacity: 0.5;
        pointer-events: none;
      }
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

    .warning-hint {
      color: #ff9800 !important;
      font-weight: 500;
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
export class WorkflowTemplateDialogComponent implements OnInit, OnDestroy {
  templateForm!: FormGroup;

  // Configuration data signals
  public activeMissionTypes = signal<MissionTypeDisplayData[]>([]);
  public activeRobotTypes = signal<RobotTypeDisplayData[]>([]);
  public activeResumeStrategies = signal<ResumeStrategyDisplayData[]>([]);
  public activeAreas = signal<string[]>([]);
  public activeShelfRules = signal<string[]>([]);
  public qrCodePositions = signal<string[]>([]);
  public mapZonePositions = signal<{ name: string; code: string }[]>([]);
  public availableRobotModels = signal<string[]>([]);
  public availableRobotIds = signal<string[]>([]);
  public isLoadingConfig = signal<boolean>(false);

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<WorkflowTemplateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkflowTemplateDialogData,
    private missionTypesService: MissionTypesService,
    private robotTypesService: RobotTypesService,
    private resumeStrategiesService: ResumeStrategiesService,
    private mobileRobotsService: MobileRobotsService,
    private areasService: AreasService,
    private shelfDecisionRulesService: ShelfDecisionRulesService,
    private qrCodesService: QrCodesService,
    private mapZonesService: MapZonesService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadConfigurationData();

    if (this.data.mode === 'edit' && this.data.template) {
      // Wait for configuration to load before populating form
      setTimeout(() => this.populateForm(this.data.template!), 500);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get missionTemplate(): FormGroup {
    return this.templateForm.get('missionTemplate') as FormGroup;
  }

  get missionData(): FormArray {
    return this.missionTemplate.get('missionData') as FormArray;
  }

  /**
   * Get available positions for a specific step based on the selected type
   * @param stepIndex The index of the mission step
   * @returns Array of position options (QR codes or zone names)
   */
  getAvailablePositionsForStep(stepIndex: number): string[] {
    const step = this.missionData.at(stepIndex);
    if (!step) return [];

    const selectedType = step.get('type')?.value;

    if (selectedType === 'NODE_POINT') {
      // Return QR code positions
      return this.qrCodePositions();
    } else if (selectedType === 'NODE_AREA') {
      // Return zone names for display
      return this.mapZonePositions().map(z => z.name);
    }

    // If no type selected, return empty array
    return [];
  }

  /**
   * Load configuration data from services
   */
  private loadConfigurationData(): void {
    this.isLoadingConfig.set(true);

    forkJoin({
      missionTypes: this.missionTypesService.getMissionTypes(),
      robotTypes: this.robotTypesService.getRobotTypes(),
      resumeStrategies: this.resumeStrategiesService.getResumeStrategies(),
      mobileRobots: this.mobileRobotsService.getMobileRobots(),
      areas: this.areasService.getAreas(),
      shelfRules: this.shelfDecisionRulesService.getShelfDecisionRules(),
      qrCodes: this.qrCodesService.getQrCodes(),
      mapZones: this.mapZonesService.getMapZones()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ missionTypes, robotTypes, resumeStrategies, mobileRobots, areas, shelfRules, qrCodes, mapZones }) => {
          // Filter for active items only
          this.activeMissionTypes.set(missionTypes.filter(mt => mt.isActive));
          this.activeRobotTypes.set(robotTypes.filter(rt => rt.isActive));
          this.activeResumeStrategies.set(resumeStrategies.filter(rs => rs.isActive));

          // Extract unique robot models (robotTypeCode) and robot IDs from mobile robots
          const uniqueRobotModels = [...new Set(mobileRobots.map(r => r.robotTypeCode))].filter(Boolean).sort();
          const uniqueRobotIds = [...new Set(mobileRobots.map(r => r.robotId))].filter(Boolean).sort();

          this.availableRobotModels.set(uniqueRobotModels);
          this.availableRobotIds.set(uniqueRobotIds);

          // Extract active areas (actualValue)
          const activeAreaValues = areas.filter(a => a.isActive).map(a => a.actualValue).sort();
          this.activeAreas.set(activeAreaValues);

          // Extract active shelf decision rules (actualValue)
          const activeShelfRuleValues = shelfRules.filter(r => r.isActive).map(r => r.actualValue).sort();
          this.activeShelfRules.set(activeShelfRuleValues);

          // Store QR codes (using unique mapCode-Floor-Node format) - sorted ascending
          const qrCodes_positions = createQrCodeUniqueIds(qrCodes).sort((a, b) => a.localeCompare(b));
          this.qrCodePositions.set(qrCodes_positions);

          // Store map zones with both name (for display) and code (for API) - sorted by name ascending
          const zonePositions = mapZones
            .map(mz => ({ name: mz.name, code: mz.code }))
            .filter(z => z.name && z.code)
            .sort((a, b) => a.name.localeCompare(b.name));
          this.mapZonePositions.set(zonePositions);

          this.isLoadingConfig.set(false);
        },
        error: (error) => {
          console.error('Error loading configuration data:', error);
          this.isLoadingConfig.set(false);
        }
      });
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
          // Convert zone code to zone name for display if type is NODE_AREA
          let positionValue = step.position || '';
          if (step.type === 'NODE_AREA' && positionValue) {
            positionValue = this.convertZoneCodeToName(positionValue);
          }

          this.missionData.push(this.fb.group({
            sequence: [step.sequence || 0],
            position: [positionValue, Validators.required],
            type: [step.type || '', Validators.required],
            putDown: [step.putDown || '', Validators.required],
            passStrategy: [step.passStrategy || '', Validators.required],
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
    if (!priority) return 2; // Default to 2

    // If it's already a number string, parse it
    const numericPriority = parseInt(priority, 10);
    if (!isNaN(numericPriority)) {
      return numericPriority;
    }

    // Legacy: Map old string priorities to numbers
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
      type: ['', Validators.required],
      putDown: ['', Validators.required],
      passStrategy: ['', Validators.required],
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

  /**
   * Handle type (Area) change - clear position when type changes
   */
  onTypeChange(stepIndex: number): void {
    const step = this.missionData.at(stepIndex);
    if (step) {
      // Clear position when type changes
      step.get('position')?.setValue('');
    }
  }

  /**
   * Convert zone name to zone code for API submission
   */
  private convertZoneNameToCode(zoneName: string): string {
    const zone = this.mapZonePositions().find(z => z.name === zoneName);
    return zone ? zone.code : zoneName;
  }

  /**
   * Convert zone code to zone name for display when editing
   */
  private convertZoneCodeToName(zoneCode: string): string {
    const zone = this.mapZonePositions().find(z => z.code === zoneCode);
    return zone ? zone.name : zoneCode;
  }

  onSubmit(): void {
    if (this.templateForm.valid) {
      const formValue = this.templateForm.value;

      // Convert zone names to zone codes for NODE_AREA type steps
      const missionDataWithConvertedPositions = formValue.missionTemplate.missionData.map((step: any) => {
        if (step.type === 'NODE_AREA' && step.position) {
          // Convert zone name to zone code
          return {
            ...step,
            position: this.convertZoneNameToCode(step.position)
          };
        }
        return step;
      });

      const request: SaveMissionAsTemplateRequest = {
        missionName: formValue.missionName,
        description: formValue.description,
        missionTemplate: {
          ...formValue.missionTemplate,
          missionData: missionDataWithConvertedPositions,
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
