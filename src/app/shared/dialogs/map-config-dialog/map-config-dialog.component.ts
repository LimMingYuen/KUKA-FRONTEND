import { Component, Inject, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  RobotMonitoringMap,
  CreateMapRequest,
  UpdateMapRequest,
  DisplaySettings,
  DEFAULT_DISPLAY_SETTINGS
} from '../../../models/robot-monitoring.models';
import { RobotMonitoringService } from '../../../services/robot-monitoring.service';
import { ConfigService } from '../../../services/config.service';

export interface MapConfigDialogData {
  mode: 'create' | 'edit';
  map?: RobotMonitoringMap;
  mapCodes: string[];
  floorNumbers: string[];
}

@Component({
  selector: 'app-map-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSliderModule,
    MatTabsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './map-config-dialog.component.html',
  styleUrls: ['./map-config-dialog.component.scss']
})
export class MapConfigDialogComponent implements OnInit {
  private config = inject(ConfigService);

  form!: FormGroup;
  isSubmitting = signal(false);
  isUploadingImage = signal(false);
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MapConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MapConfigDialogData,
    private robotMonitoringService: RobotMonitoringService
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.data.map?.backgroundImagePath) {
      this.previewUrl = this.getFullImageUrl(this.data.map.backgroundImagePath);
    }
  }

  private initForm(): void {
    const map = this.data.map;
    const displaySettings = map?.displaySettings || DEFAULT_DISPLAY_SETTINGS;

    this.form = this.fb.group({
      // Basic Info
      name: [map?.name || '', [Validators.required, Validators.maxLength(256)]],
      description: [map?.description || '', [Validators.maxLength(1000)]],
      mapCode: [map?.mapCode || ''],
      floorNumber: [map?.floorNumber || ''],
      isDefault: [map?.isDefault || false],

      // Display Settings
      showNodes: [displaySettings.showNodes],
      showZones: [displaySettings.showZones],
      showLabels: [displaySettings.showLabels],
      nodeSize: [displaySettings.nodeSize, [Validators.required, Validators.min(4), Validators.max(50)]],
      zoneOpacity: [displaySettings.zoneOpacity, [Validators.required, Validators.min(0), Validators.max(1)]]
    });
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get dialogTitle(): string {
    return this.isEditMode ? 'Edit Map Configuration' : 'Create Map Configuration';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];

      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;

    const displaySettings: DisplaySettings = {
      showNodes: formValue.showNodes,
      showZones: formValue.showZones,
      showLabels: formValue.showLabels,
      nodeSize: formValue.nodeSize,
      zoneOpacity: formValue.zoneOpacity
    };

    this.isSubmitting.set(true);

    if (this.isEditMode && this.data.map) {
      const updateRequest: UpdateMapRequest = {
        name: formValue.name,
        description: formValue.description,
        mapCode: formValue.mapCode,
        floorNumber: formValue.floorNumber,
        displaySettings,
        isDefault: formValue.isDefault
      };

      this.robotMonitoringService.updateMap(this.data.map.id, updateRequest).subscribe({
        next: (updatedMap) => {
          if (this.selectedFile) {
            this.uploadImage(updatedMap.id, () => {
              this.dialogRef.close({ success: true, map: updatedMap });
            });
          } else {
            this.dialogRef.close({ success: true, map: updatedMap });
          }
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    } else {
      const createRequest: CreateMapRequest = {
        name: formValue.name,
        description: formValue.description,
        mapCode: formValue.mapCode,
        floorNumber: formValue.floorNumber,
        displaySettings,
        isDefault: formValue.isDefault
      };

      this.robotMonitoringService.createMap(createRequest).subscribe({
        next: (createdMap) => {
          if (this.selectedFile) {
            this.uploadImage(createdMap.id, () => {
              this.dialogRef.close({ success: true, map: createdMap });
            });
          } else {
            this.dialogRef.close({ success: true, map: createdMap });
          }
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
    }
  }

  private uploadImage(mapId: number, callback: () => void): void {
    if (!this.selectedFile) {
      callback();
      return;
    }

    this.isUploadingImage.set(true);
    this.robotMonitoringService.uploadBackgroundImage(mapId, this.selectedFile).subscribe({
      next: () => {
        this.isUploadingImage.set(false);
        callback();
      },
      error: () => {
        this.isUploadingImage.set(false);
        callback(); // Still close dialog on image upload failure
      }
    });
  }

  private getFullImageUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    return `${this.config.apiUrl}${path}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  resetDisplay(): void {
    this.form.patchValue({
      showNodes: DEFAULT_DISPLAY_SETTINGS.showNodes,
      showZones: DEFAULT_DISPLAY_SETTINGS.showZones,
      showLabels: DEFAULT_DISPLAY_SETTINGS.showLabels,
      nodeSize: DEFAULT_DISPLAY_SETTINGS.nodeSize,
      zoneOpacity: DEFAULT_DISPLAY_SETTINGS.zoneOpacity
    });
  }
}
