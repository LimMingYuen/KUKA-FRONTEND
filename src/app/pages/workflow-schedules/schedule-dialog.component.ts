import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subject, takeUntil, Observable, startWith, map } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { WorkflowScheduleService } from '../../services/workflow-schedule.service';
import { SavedCustomMissionsService } from '../../services/saved-custom-missions.service';
import {
  WorkflowSchedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ScheduleType,
  INTERVAL_OPTIONS,
  CRON_EXAMPLES
} from '../../models/workflow-schedule.models';
import { SavedCustomMissionsDisplayData } from '../../models/saved-custom-missions.models';

export interface ScheduleDialogData {
  mode: 'create' | 'edit';
  schedule?: WorkflowSchedule;
}

@Component({
  selector: 'app-schedule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatExpansionModule,
    MatAutocompleteModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create Schedule' : 'Edit Schedule' }}</h2>

    <mat-dialog-content>
      <div *ngIf="isLoadingMissions" class="loading-missions">
        <mat-spinner diameter="24"></mat-spinner>
        <span>Loading workflow templates...</span>
      </div>

      <form [formGroup]="form" *ngIf="!isLoadingMissions">
        <!-- Schedule Name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Schedule Name</mat-label>
          <input matInput formControlName="scheduleName" placeholder="e.g., Morning Sync">
          <mat-error *ngIf="form.get('scheduleName')?.hasError('required')">
            Schedule name is required
          </mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput formControlName="description" rows="2"
                    placeholder="Brief description of what this schedule does"></textarea>
        </mat-form-field>

        <!-- Workflow Template -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Workflow Template</mat-label>
          <input matInput
                 [formControl]="workflowSearchControl"
                 [matAutocomplete]="workflowAuto"
                 placeholder="Type to search...">
          <mat-icon matSuffix>search</mat-icon>
          <mat-autocomplete #workflowAuto="matAutocomplete"
                            [displayWith]="displayWorkflow.bind(this)"
                            (optionSelected)="onWorkflowSelected($event)">
            <mat-option *ngFor="let mission of filteredMissions$ | async"
                        [value]="mission"
                        [disabled]="!mission.isActive">
              {{ mission.missionName }}
              <span *ngIf="!mission.isActive" class="inactive-badge">(Inactive)</span>
            </mat-option>
          </mat-autocomplete>
          <mat-hint *ngIf="hasInactiveMissions">Inactive workflows cannot be scheduled</mat-hint>
          <mat-error *ngIf="form.get('savedMissionId')?.hasError('required')">
            Workflow template is required
          </mat-error>
        </mat-form-field>

        <!-- Schedule Type -->
        <div class="form-section">
          <label class="section-label">Schedule Type</label>
          <mat-radio-group formControlName="scheduleType" class="schedule-type-group">
            <mat-radio-button value="OneTime">One-time</mat-radio-button>
            <mat-radio-button value="Interval">Recurring Interval</mat-radio-button>
            <mat-radio-button value="Cron">Cron Expression</mat-radio-button>
          </mat-radio-group>
        </div>

        <!-- One-Time Date/Time -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="form.get('scheduleType')?.value === 'OneTime'">
          <mat-label>Run Date/Time (UTC)</mat-label>
          <input matInput type="datetime-local" formControlName="oneTimeUtc">
          <mat-hint>Schedule will run once at this time</mat-hint>
          <mat-error *ngIf="form.get('oneTimeUtc')?.hasError('required')">
            Date/time is required for one-time schedules
          </mat-error>
        </mat-form-field>

        <!-- Interval Selection -->
        <div class="interval-section" *ngIf="form.get('scheduleType')?.value === 'Interval'">
          <label class="section-label">Run Every</label>
          <div class="interval-row">
            <mat-form-field appearance="outline" class="interval-field">
              <mat-label>Hours</mat-label>
              <input matInput type="number" formControlName="intervalHours" min="0" max="720" placeholder="0">
            </mat-form-field>
            <mat-form-field appearance="outline" class="interval-field">
              <mat-label>Minutes</mat-label>
              <input matInput type="number" formControlName="intervalMinutesInput" min="0" max="59" placeholder="0">
            </mat-form-field>
          </div>
          <div class="interval-hint" [class.error]="!isIntervalValid()">
            <span *ngIf="isIntervalValid()">
              Schedule will repeat every {{ getIntervalDisplay() }} (max: 30 days)
            </span>
            <span *ngIf="!isIntervalValid()" class="error-text">
              Please enter at least 1 minute. Maximum is 30 days (720 hours).
            </span>
          </div>
        </div>

        <!-- Cron Expression -->
        <div *ngIf="form.get('scheduleType')?.value === 'Cron'">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Cron Expression</mat-label>
            <input matInput formControlName="cronExpression" placeholder="0 9 * * MON-FRI">
            <mat-hint>Standard 5-field cron expression (minute hour day-of-month month day-of-week)</mat-hint>
            <mat-error *ngIf="form.get('cronExpression')?.hasError('required')">
              Cron expression is required
            </mat-error>
          </mat-form-field>

          <mat-expansion-panel class="cron-help">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>help_outline</mat-icon>
                Cron Examples
              </mat-panel-title>
            </mat-expansion-panel-header>
            <div class="cron-examples">
              <div *ngFor="let example of cronExamples" class="example-row"
                   (click)="applyCronExample(example.expression)">
                <code>{{ example.expression }}</code>
                <span>{{ example.label }}</span>
              </div>
            </div>
          </mat-expansion-panel>
        </div>

        <!-- Max Executions -->
        <mat-form-field appearance="outline" class="half-width">
          <mat-label>Max Executions (optional)</mat-label>
          <input matInput type="number" formControlName="maxExecutions" min="1">
          <mat-hint>Leave empty for unlimited</mat-hint>
        </mat-form-field>

        <!-- Skip If Running Toggle -->
        <div class="toggle-section">
          <mat-slide-toggle formControlName="skipIfRunning" color="accent">
            Skip if already running
          </mat-slide-toggle>
          <div class="toggle-hint">
            When enabled, skips triggering if the same workflow is already running (Queued, Processing, or Assigned)
          </div>
        </div>

        <!-- Enabled Toggle -->
        <div class="toggle-section">
          <mat-slide-toggle formControlName="isEnabled" color="primary">
            Enable schedule immediately
          </mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary"
              (click)="onSave()"
              [disabled]="!form.valid || isSaving">
        <mat-spinner *ngIf="isSaving" diameter="20"></mat-spinner>
        <span *ngIf="!isSaving">{{ data.mode === 'create' ? 'Create' : 'Save' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      max-height: 70vh;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .half-width {
      width: 50%;
      margin-bottom: 16px;
    }

    .interval-section {
      margin-bottom: 16px;
    }

    .interval-row {
      display: flex;
      gap: 16px;
    }

    .interval-field {
      flex: 1;
    }

    .interval-hint {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: -8px;
      margin-bottom: 8px;
    }

    .interval-hint.error {
      color: #f44336;
    }

    .error-text {
      color: #f44336;
    }

    .loading-missions {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px;
      justify-content: center;
      color: rgba(0, 0, 0, 0.6);
    }

    .form-section {
      margin-bottom: 24px;
    }

    .section-label {
      display: block;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 8px;
    }

    .schedule-type-group {
      display: flex;
      gap: 24px;
    }

    .toggle-section {
      margin: 24px 0 16px;
    }

    .toggle-hint {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 4px;
      margin-left: 52px;
    }

    .cron-help {
      margin-bottom: 16px;
    }

    .cron-help mat-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .cron-help mat-panel-title mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .cron-examples {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .example-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .example-row:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }

    .example-row code {
      background-color: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      min-width: 150px;
    }

    .example-row span {
      color: rgba(0, 0, 0, 0.6);
      font-size: 13px;
    }

    mat-dialog-actions button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .inactive-badge {
      color: rgba(0, 0, 0, 0.38);
      font-size: 12px;
      font-style: italic;
      margin-left: 8px;
    }
  `]
})
export class ScheduleDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  missions: SavedCustomMissionsDisplayData[] = [];
  intervalOptions = INTERVAL_OPTIONS;
  cronExamples = CRON_EXAMPLES;

  isLoadingMissions = false;
  isSaving = false;

  // Autocomplete for workflow template
  workflowSearchControl = new FormControl<string | SavedCustomMissionsDisplayData>('');
  filteredMissions$!: Observable<SavedCustomMissionsDisplayData[]>;

  /** Returns true if any mission in the list is inactive */
  get hasInactiveMissions(): boolean {
    return this.missions.some(m => !m.isActive);
  }

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ScheduleDialogData,
    private scheduleService: WorkflowScheduleService,
    private missionsService: SavedCustomMissionsService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      scheduleName: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(500)],
      savedMissionId: [null, Validators.required],
      scheduleType: ['OneTime', Validators.required],
      oneTimeUtc: [''],
      intervalHours: [1, [Validators.min(0), Validators.max(720)]],
      intervalMinutesInput: [0, [Validators.min(0), Validators.max(59)]],
      cronExpression: [''],
      maxExecutions: [null],
      skipIfRunning: [false],
      isEnabled: [true]
    });

    // Add conditional validation
    this.form.get('scheduleType')?.valueChanges.subscribe(type => {
      this.updateValidation(type);
    });
  }

  ngOnInit(): void {
    this.loadMissions();

    // Pre-populate form if editing
    if (this.data.mode === 'edit' && this.data.schedule) {
      this.populateForm(this.data.schedule);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMissions(): void {
    this.isLoadingMissions = true;
    this.missionsService.getAllSavedMissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (missions) => {
          this.missions = missions;
          this.isLoadingMissions = false;
          this.setupAutocomplete();

          // If editing, set the initial workflow in autocomplete
          if (this.data.mode === 'edit' && this.data.schedule) {
            const selectedMission = this.missions.find(m => m.id === this.data.schedule!.savedMissionId);
            if (selectedMission) {
              this.workflowSearchControl.setValue(selectedMission);
            }
          }
        },
        error: (err) => {
          console.error('Error loading missions:', err);
          this.snackBar.open('Failed to load workflow templates', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoadingMissions = false;
        }
      });
  }

  private setupAutocomplete(): void {
    this.filteredMissions$ = this.workflowSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const searchText = typeof value === 'string' ? value : value?.missionName || '';
        return this.filterMissions(searchText);
      })
    );
  }

  private filterMissions(searchText: string): SavedCustomMissionsDisplayData[] {
    if (!searchText) {
      return this.missions;
    }
    const lowerSearch = searchText.toLowerCase();
    return this.missions.filter(mission =>
      mission.missionName.toLowerCase().includes(lowerSearch)
    );
  }

  displayWorkflow(mission: SavedCustomMissionsDisplayData | string): string {
    if (!mission) return '';
    if (typeof mission === 'string') return mission;
    return mission.missionName;
  }

  onWorkflowSelected(event: any): void {
    const selectedMission = event.option.value as SavedCustomMissionsDisplayData;
    if (selectedMission && selectedMission.isActive) {
      this.form.patchValue({ savedMissionId: selectedMission.id });
    }
  }

  private populateForm(schedule: WorkflowSchedule): void {
    // Convert intervalMinutes to hours and minutes
    const interval = this.minutesToHoursAndMinutes(schedule.intervalMinutes || 60);

    this.form.patchValue({
      scheduleName: schedule.scheduleName,
      description: schedule.description,
      savedMissionId: schedule.savedMissionId,
      scheduleType: schedule.scheduleType,
      oneTimeUtc: schedule.oneTimeUtc ? this.formatDateTimeLocal(schedule.oneTimeUtc) : '',
      intervalHours: interval.hours,
      intervalMinutesInput: interval.minutes,
      cronExpression: schedule.cronExpression || '',
      maxExecutions: schedule.maxExecutions,
      skipIfRunning: schedule.skipIfRunning || false,
      isEnabled: schedule.isEnabled
    });
  }

  private formatDateTimeLocal(isoString: string): string {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16);
  }

  private updateValidation(type: ScheduleType): void {
    const oneTimeCtrl = this.form.get('oneTimeUtc');
    const cronCtrl = this.form.get('cronExpression');

    // Reset validators
    oneTimeCtrl?.clearValidators();
    cronCtrl?.clearValidators();

    switch (type) {
      case 'OneTime':
        oneTimeCtrl?.setValidators(Validators.required);
        break;
      case 'Interval':
        // Interval validation is handled by isIntervalValid()
        break;
      case 'Cron':
        cronCtrl?.setValidators([Validators.required, Validators.maxLength(100)]);
        break;
    }

    oneTimeCtrl?.updateValueAndValidity();
    cronCtrl?.updateValueAndValidity();
  }

  /** Check if interval is valid (at least 1 minute, max 30 days) */
  isIntervalValid(): boolean {
    const totalMinutes = this.calculateIntervalMinutes();
    return totalMinutes >= 1 && totalMinutes <= 43200;
  }

  /** Get display text for current interval setting */
  getIntervalDisplay(): string {
    const hours = this.form.get('intervalHours')?.value || 0;
    const minutes = this.form.get('intervalMinutesInput')?.value || 0;

    const parts: string[] = [];
    if (hours > 0) {
      parts.push(hours === 1 ? '1 hour' : `${hours} hours`);
    }
    if (minutes > 0) {
      parts.push(minutes === 1 ? '1 minute' : `${minutes} minutes`);
    }

    if (parts.length === 0) {
      return '0 minutes';
    }

    return parts.join(' ');
  }

  /** Calculate total minutes from hours and minutes fields */
  private calculateIntervalMinutes(): number {
    const hours = this.form.get('intervalHours')?.value || 0;
    const minutes = this.form.get('intervalMinutesInput')?.value || 0;
    return (hours * 60) + minutes;
  }

  /** Convert total minutes to hours and minutes for form */
  private minutesToHoursAndMinutes(totalMinutes: number): { hours: number; minutes: number } {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  }

  applyCronExample(expression: string): void {
    this.form.patchValue({ cronExpression: expression });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.form.valid) return;

    // Additional validation for Interval type
    const formValue = this.form.value;
    if (formValue.scheduleType === 'Interval' && !this.isIntervalValid()) {
      this.snackBar.open('Please enter a valid interval (1 minute to 30 days)', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isSaving = true;

    if (this.data.mode === 'create') {
      const request: CreateScheduleRequest = {
        scheduleName: formValue.scheduleName,
        description: formValue.description || undefined,
        savedMissionId: formValue.savedMissionId,
        scheduleType: formValue.scheduleType,
        oneTimeUtc: formValue.scheduleType === 'OneTime' ? new Date(formValue.oneTimeUtc).toISOString() : undefined,
        intervalMinutes: formValue.scheduleType === 'Interval' ? this.calculateIntervalMinutes() : undefined,
        cronExpression: formValue.scheduleType === 'Cron' ? formValue.cronExpression : undefined,
        maxExecutions: formValue.maxExecutions || undefined,
        skipIfRunning: formValue.skipIfRunning || false,
        isEnabled: formValue.isEnabled
      };

      this.scheduleService.create(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.snackBar.open(`Schedule "${created.scheduleName}" created`, 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.dialogRef.close(created);
          },
          error: (err) => {
            console.error('Error creating schedule:', err);
            this.snackBar.open(err.message || 'Failed to create schedule', 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            this.isSaving = false;
          }
        });
    } else {
      const request: UpdateScheduleRequest = {
        scheduleName: formValue.scheduleName,
        description: formValue.description,
        scheduleType: formValue.scheduleType,
        oneTimeUtc: formValue.scheduleType === 'OneTime' ? new Date(formValue.oneTimeUtc).toISOString() : undefined,
        intervalMinutes: formValue.scheduleType === 'Interval' ? this.calculateIntervalMinutes() : undefined,
        cronExpression: formValue.scheduleType === 'Cron' ? formValue.cronExpression : undefined,
        maxExecutions: formValue.maxExecutions,
        skipIfRunning: formValue.skipIfRunning,
        isEnabled: formValue.isEnabled
      };

      this.scheduleService.update(this.data.schedule!.id, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.snackBar.open(`Schedule "${updated.scheduleName}" updated`, 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.dialogRef.close(updated);
          },
          error: (err) => {
            console.error('Error updating schedule:', err);
            this.snackBar.open(err.message || 'Failed to update schedule', 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            this.isSaving = false;
          }
        });
    }
  }
}
