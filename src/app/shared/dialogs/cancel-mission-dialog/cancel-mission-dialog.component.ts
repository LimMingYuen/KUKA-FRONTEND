import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ThemePalette } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { CancelMode } from '../../../models/missions.models';

export interface CancelMissionDialogData {
  missionName: string;
  missionCode: string;
}

export interface CancelMissionDialogResult {
  cancelMode: CancelMode;
  reason: string;
}

@Component({
  selector: 'app-cancel-mission-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule
  ],
  templateUrl: './cancel-mission-dialog.component.html',
  styleUrl: './cancel-mission-dialog.component.scss'
})
export class CancelMissionDialogComponent {
  public selectedMode: CancelMode = 'NORMAL';
  public reason: string = '';

  public cancelModes: Array<{
    value: CancelMode;
    label: string;
    description: string;
    icon: string;
    color: ThemePalette;
  }> = [
    {
      value: 'FORCE' as CancelMode,
      label: 'Force Cancel',
      description: 'Immediately terminate the current mission',
      icon: 'cancel',
      color: 'warn'
    },
    {
      value: 'NORMAL' as CancelMode,
      label: 'Normal Cancel',
      description: 'Wait for the robot to complete the current task before canceling',
      icon: 'pause_circle',
      color: 'accent'
    },
    {
      value: 'REDIRECT_START' as CancelMode,
      label: 'Redirect to Start',
      description: 'Wait for current task to complete, then redirect robot to start node',
      icon: 'u_turn_left',
      color: 'primary'
    }
  ];

  constructor(
    public dialogRef: MatDialogRef<CancelMissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelMissionDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    const result: CancelMissionDialogResult = {
      cancelMode: this.selectedMode,
      reason: this.reason.trim()
    };
    this.dialogRef.close(result);
  }
}
