import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DrawingMode, MapNode } from '../../../models/robot-monitoring.models';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../../../pages/workflow-template-form/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-drawing-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule
  ],
  templateUrl: './drawing-toolbar.component.html',
  styleUrls: ['./drawing-toolbar.component.scss']
})
export class DrawingToolbarComponent {
  @Input() currentMode: DrawingMode = 'none';
  @Input() isDrawingZone: boolean = false;
  @Input() hasUnsavedChanges: boolean = false;
  @Input() disabled: boolean = false;
  @Input() availableNodes: MapNode[] = [];

  @Output() modeChange = new EventEmitter<DrawingMode>();
  @Output() finishZone = new EventEmitter<void>();
  @Output() cancelDrawing = new EventEmitter<void>();
  @Output() uploadImage = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() placeNode = new EventEmitter<MapNode>();

  selectedNodeId: number | null = null;

  constructor(private dialog: MatDialog) {}

  setMode(mode: DrawingMode): void {
    if (this.disabled) return;
    this.modeChange.emit(mode);
  }

  onFinishZone(): void {
    this.finishZone.emit();
  }

  onCancelDrawing(): void {
    this.cancelDrawing.emit();
  }

  onUploadImage(): void {
    this.uploadImage.emit();
  }

  onSave(): void {
    this.save.emit();
  }

  onClearAll(): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Clear All',
      message: 'Are you sure you want to clear all custom nodes and zones?',
      icon: 'warning',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      showCancel: true,
      confirmColor: 'warn'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.clearAll.emit();
      }
    });
  }

  isActive(mode: DrawingMode): boolean {
    return this.currentMode === mode;
  }

  onNodeSelected(): void {
    if (this.selectedNodeId === null) return;
    const node = this.availableNodes.find(n => n.id === this.selectedNodeId);
    if (node) {
      this.placeNode.emit(node);
      this.selectedNodeId = null; // Reset selection after placing
    }
  }
}
