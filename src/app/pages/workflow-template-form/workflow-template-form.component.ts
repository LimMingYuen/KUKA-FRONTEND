import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
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
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowTemplateService } from '../../services/workflow-template.service';
import { OrganizationIdsService } from '../../services/organization-ids.service';
import { MissionTypeDisplayData } from '../../models/mission-types.models';
import { RobotTypeDisplayData } from '../../models/robot-types.models';
import { ResumeStrategyDisplayData } from '../../models/resume-strategies.models';
import { OrganizationIdDisplayData } from '../../models/organization-ids.models';
import { createQrCodeUniqueIds } from '../../models/qr-code.models';
import { WorkflowDisplayData } from '../../models/workflow.models';
import { MissionFlowchartComponent, MissionStepFlowData } from '../../shared/components/mission-flowchart/mission-flowchart.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from './confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-workflow-template-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
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
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MissionFlowchartComponent
  ],
  templateUrl: './workflow-template-form.component.html',
  styleUrl: './workflow-template-form.component.scss'
})
export class WorkflowTemplateFormComponent implements OnInit, OnDestroy {
  templateForm!: FormGroup;

  // Mode and data signals
  public mode = signal<'create' | 'edit' | 'view'>('create');
  public templateId = signal<number | null>(null);
  public template = signal<SavedCustomMissionsDisplayData | null>(null);

  // Configuration data signals
  public activeMissionTypes = signal<MissionTypeDisplayData[]>([]);
  public activeRobotTypes = signal<RobotTypeDisplayData[]>([]);
  public activeResumeStrategies = signal<ResumeStrategyDisplayData[]>([]);
  public activeOrganizationIds = signal<OrganizationIdDisplayData[]>([]);
  public activeAreas = signal<string[]>([]);
  public activeShelfRules = signal<string[]>([]);
  public qrCodePositions = signal<string[]>([]);
  public mapZonePositions = signal<{ name: string; code: string }[]>([]);
  public availableRobotModels = signal<string[]>([]);
  public availableRobotIds = signal<string[]>([]);
  public availableWorkflows = signal<WorkflowDisplayData[]>([]);
  public isLoadingConfig = signal<boolean>(false);
  public isLoadingTemplate = signal<boolean>(false);
  public isWorkflowSelected = signal<boolean>(false);
  public isSaving = signal<boolean>(false);

  // View mode signal
  public viewMode = signal<'form' | 'flowchart'>('form');

  // Computed signals
  public pageTitle = computed<string>(() => {
    switch (this.mode()) {
      case 'create': return 'Create Workflow Template';
      case 'edit': return 'Edit Workflow Template';
      case 'view': return 'View Workflow Template';
    }
  });

  public isViewMode = computed<boolean>(() => this.mode() === 'view');

  public flowchartData = computed<MissionStepFlowData[]>(() => {
    if (!this.templateForm) return [];

    const missionData = this.missionData;
    if (!missionData || missionData.length === 0) return [];

    return missionData.controls.map((control, index) => {
      const value = control.value;
      return {
        sequence: index,
        position: value.position || '',
        type: value.type || '',
        putDown: value.putDown || '',
        passStrategy: value.passStrategy || '',
        waitingMillis: value.waitingMillis || 0
      };
    });
  });

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private missionTypesService: MissionTypesService,
    private robotTypesService: RobotTypesService,
    private resumeStrategiesService: ResumeStrategiesService,
    private mobileRobotsService: MobileRobotsService,
    private areasService: AreasService,
    private shelfDecisionRulesService: ShelfDecisionRulesService,
    private qrCodesService: QrCodesService,
    private mapZonesService: MapZonesService,
    private workflowService: WorkflowService,
    private workflowTemplateService: WorkflowTemplateService,
    private organizationIdsService: OrganizationIdsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.extractRouteParams();
    this.loadConfigurationData();
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
   * Extract route parameters and query parameters
   */
  private extractRouteParams(): void {
    // Get route params (id)
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.templateId.set(parseInt(id, 10));
      }
    });

    // Get query params (mode)
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const mode = params.get('mode') as 'create' | 'edit' | 'view';
      if (mode && ['create', 'edit', 'view'].includes(mode)) {
        this.mode.set(mode);
      } else if (this.templateId()) {
        // Default to view if ID present but no mode specified
        this.mode.set('view');
      } else {
        this.mode.set('create');
      }

      // Load template if in edit/view mode
      const id = this.templateId();
      if (id && (this.mode() === 'edit' || this.mode() === 'view')) {
        this.loadTemplateById(id);
      }
    });
  }

  /**
   * Load template by ID for edit/view modes
   */
  private loadTemplateById(id: number): void {
    this.isLoadingTemplate.set(true);

    this.workflowTemplateService.getSavedCustomMissionById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (template) => {
          this.template.set(template);
          // Wait a bit for configuration data to load first
          setTimeout(() => {
            this.populateForm(template);
            if (this.mode() === 'view') {
              this.templateForm.disable();
            }
            this.isLoadingTemplate.set(false);
          }, 300);
        },
        error: (error) => {
          console.error('Error loading template:', error);
          this.snackBar.open('Error loading template', 'Close', { duration: 5000 });
          this.isLoadingTemplate.set(false);
          this.navigateToList();
        }
      });
  }

  /**
   * Get available positions for a specific step based on the selected type
   */
  getAvailablePositionsForStep(stepIndex: number): string[] {
    const step = this.missionData.at(stepIndex);
    if (!step) return [];

    const selectedType = step.get('type')?.value;

    if (selectedType === 'NODE_POINT') {
      return this.qrCodePositions();
    } else if (selectedType === 'NODE_AREA') {
      return this.mapZonePositions().map(z => z.name);
    }

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
      mapZones: this.mapZonesService.getMapZones(),
      workflows: this.workflowService.getWorkflows(),
      organizationIds: this.organizationIdsService.getOrganizationIds()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ missionTypes, robotTypes, resumeStrategies, mobileRobots, areas, shelfRules, qrCodes, mapZones, workflows, organizationIds }) => {
          // Filter for active items only
          this.activeMissionTypes.set(missionTypes.filter(mt => mt.isActive));
          this.activeRobotTypes.set(robotTypes.filter(rt => rt.isActive));
          this.activeResumeStrategies.set(resumeStrategies.filter(rs => rs.isActive));
          this.activeOrganizationIds.set(organizationIds.filter(oid => oid.isActive));

          // Store synced workflows (only active ones)
          const activeWorkflows = workflows.filter(w => w.status === 1);
          this.availableWorkflows.set(activeWorkflows);

          // Extract unique robot models and IDs (only from licensed robots)
          const licensedRobots = mobileRobots.filter(r => r.isLicensed);
          const uniqueRobotModels = [...new Set(licensedRobots.map(r => r.robotTypeCode))].filter(Boolean).sort();
          const uniqueRobotIds = [...new Set(licensedRobots.map(r => r.robotId))].filter(Boolean).sort();

          this.availableRobotModels.set(uniqueRobotModels);
          this.availableRobotIds.set(uniqueRobotIds);

          // Extract active areas
          const activeAreaValues = areas.filter(a => a.isActive).map(a => a.actualValue).sort();
          this.activeAreas.set(activeAreaValues);

          // Extract active shelf decision rules
          const activeShelfRuleValues = shelfRules.filter(r => r.isActive).map(r => r.actualValue).sort();
          this.activeShelfRules.set(activeShelfRuleValues);

          // Store QR codes
          const qrCodes_positions = createQrCodeUniqueIds(qrCodes).sort((a, b) => a.localeCompare(b));
          this.qrCodePositions.set(qrCodes_positions);

          // Store map zones
          const zonePositions = mapZones
            .map(mz => ({ name: mz.name, code: mz.code }))
            .filter(z => z.name && z.code)
            .sort((a, b) => a.name.localeCompare(b.name));
          this.mapZonePositions.set(zonePositions);

          this.isLoadingConfig.set(false);
        },
        error: (error) => {
          console.error('Error loading configuration data:', error);
          this.snackBar.open('Error loading configuration data', 'Close', { duration: 5000 });
          this.isLoadingConfig.set(false);
        }
      });
  }

  private initializeForm(): void {
    this.templateForm = this.fb.group({
      missionName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      concurrencyMode: ['Unlimited'], // 'Unlimited' or 'Wait'
      missionTemplate: this.fb.group({
        orgId: ['', [Validators.required]],
        missionType: ['', [Validators.required]],
        viewBoardType: [''],
        robotModels: [[]],
        robotIds: [[]],
        robotType: ['', [Validators.required]],
        priority: [1, [Validators.required]],
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

      // Check if this template has a workflow reference
      if (template.templateCode && template.templateCode !== '-') {
        this.isWorkflowSelected.set(true);
      }

      this.templateForm.patchValue({
        missionName: template.missionName,
        description: template.description !== '-' ? template.description : '',
        concurrencyMode: template.concurrencyMode || 'Unlimited'
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

      // Add mission steps only for custom templates (not workflow-based)
      if (!this.isWorkflowSelected()) {
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
      }
    } catch (error) {
      console.error('Error populating form:', error);
    }
  }

  private parsePriority(priority: string | null | undefined): number {
    if (!priority) return 1;

    const numericPriority = parseInt(priority, 10);
    if (!isNaN(numericPriority)) {
      return numericPriority;
    }

    const priorityMap: { [key: string]: number } = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4
    };
    return priorityMap[priority.toUpperCase()] || 1;
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

  onTypeChange(stepIndex: number): void {
    const step = this.missionData.at(stepIndex);
    if (step) {
      step.get('position')?.setValue('');
    }
  }

  private convertZoneNameToCode(zoneName: string): string {
    const zone = this.mapZonePositions().find(z => z.name === zoneName);
    return zone ? zone.code : zoneName;
  }

  private convertZoneCodeToName(zoneCode: string): string {
    const zone = this.mapZonePositions().find(z => z.code === zoneCode);
    return zone ? zone.name : zoneCode;
  }

  onViewModeChange(mode: 'form' | 'flowchart'): void {
    this.viewMode.set(mode);
  }

  onConcurrencyModeChange(isWaitMode: boolean): void {
    this.templateForm.get('concurrencyMode')?.setValue(isWaitMode ? 'Wait' : 'Unlimited');
  }

  onWorkflowSelected(workflow: WorkflowDisplayData | null): void {
    if (workflow) {
      this.isWorkflowSelected.set(true);

      this.templateForm.patchValue({
        missionName: workflow.name
      });
      this.missionTemplate.patchValue({
        templateCode: workflow.code
      });

      while (this.missionData.length > 0) {
        this.missionData.removeAt(0);
      }
    } else {
      this.isWorkflowSelected.set(false);

      this.templateForm.patchValue({
        missionName: ''
      });
      this.missionTemplate.patchValue({
        templateCode: ''
      });

      if (this.missionData.length === 0) {
        this.addMissionStep();
      }
    }
  }

  onSubmit(): void {
    if (!this.templateForm.valid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isSaving.set(true);
    const formValue = this.templateForm.value;

    // Convert zone names to zone codes for NODE_AREA type steps
    const missionDataWithConvertedPositions = formValue.missionTemplate.missionData.map((step: any) => {
      let convertedStep = { ...step };

      if (step.type === 'NODE_AREA' && step.position) {
        convertedStep.position = this.convertZoneNameToCode(step.position);
      }

      if (typeof step.putDown === 'string') {
        convertedStep.putDown = step.putDown.toUpperCase() === 'TRUE';
      }

      return convertedStep;
    });

    const request: SaveMissionAsTemplateRequest = {
      missionName: formValue.missionName,
      description: formValue.description,
      concurrencyMode: formValue.concurrencyMode || 'Unlimited',
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

    if (this.mode() === 'create') {
      this.createTemplate(request);
    } else {
      this.updateTemplate(request);
    }
  }

  private createTemplate(request: SaveMissionAsTemplateRequest): void {
    this.workflowTemplateService.saveMissionAsTemplate(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showConfirmationAndNavigateBack('Template Created', request.missionName);
        },
        error: (error) => {
          console.error('Error creating template:', error);
          this.snackBar.open('Error creating template', 'Close', { duration: 5000 });
          this.isSaving.set(false);
        }
      });
  }

  private updateTemplate(request: SaveMissionAsTemplateRequest): void {
    const id = this.templateId();
    if (!id) return;

    this.workflowTemplateService.updateWorkflowTemplate(id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showConfirmationAndNavigateBack('Template Updated', request.missionName);
        },
        error: (error) => {
          console.error('Error updating template:', error);
          this.snackBar.open('Error updating template', 'Close', { duration: 5000 });
          this.isSaving.set(false);
        }
      });
  }

  private showConfirmationAndNavigateBack(title: string, templateName: string): void {
    const dialogData: ConfirmationDialogData = {
      title,
      message: `Workflow template "${templateName}" has been saved successfully.`,
      icon: 'check_circle',
      confirmText: 'Return to List'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(() => {
      this.navigateToList();
    });
  }

  onCancel(): void {
    this.navigateToList();
  }

  private navigateToList(): void {
    this.router.navigate(['/workflow-templates']);
  }

  // Autocomplete filter methods
  filterTypes(value: unknown): string[] {
    const filterValue = (typeof value === 'string' ? value : '').toLowerCase();
    return this.activeAreas().filter(area =>
      area.toLowerCase().includes(filterValue)
    );
  }

  filterPositions(stepIndex: number, value: unknown): string[] {
    const filterValue = (typeof value === 'string' ? value : '').toLowerCase();
    const positions = this.getAvailablePositionsForStep(stepIndex);
    return positions.filter(pos =>
      pos.toLowerCase().includes(filterValue)
    );
  }

  filterStrategies(value: unknown): { displayName: string; actualValue: string }[] {
    const filterValue = (typeof value === 'string' ? value : '').toLowerCase();
    return this.activeResumeStrategies().filter(strategy =>
      strategy.displayName.toLowerCase().includes(filterValue) ||
      strategy.actualValue.toLowerCase().includes(filterValue)
    );
  }

  filterShelfRules(value: unknown): string[] {
    const filterValue = (typeof value === 'string' ? value : '').toLowerCase();
    return this.activeShelfRules().filter(rule =>
      rule.toLowerCase().includes(filterValue)
    );
  }

  // Display functions for autocomplete
  displayStrategy(value: unknown): string {
    if (!value || typeof value !== 'string') return '';
    const strategy = this.activeResumeStrategies().find(s => s.actualValue === value);
    return strategy ? strategy.displayName : value;
  }
}
