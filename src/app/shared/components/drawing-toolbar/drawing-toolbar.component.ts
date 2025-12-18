import { Component, Input, Output, EventEmitter, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, map, startWith } from 'rxjs';
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
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatDialogModule
  ],
  templateUrl: './drawing-toolbar.component.html',
  styleUrls: ['./drawing-toolbar.component.scss']
})
export class DrawingToolbarComponent implements OnChanges {
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

  // Autocomplete
  nodeSearchControl = new FormControl<string | MapNode>('');
  filteredNodes$!: Observable<MapNode[]>;
  private sortedNodes: MapNode[] = [];

  constructor(private dialog: MatDialog) {
    this.initFilteredNodes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['availableNodes']) {
      // Sort nodes by nodeNumber in ascending order
      this.sortedNodes = [...this.availableNodes].sort((a, b) =>
        (a.nodeNumber ?? 0) - (b.nodeNumber ?? 0)
      );
      // Re-initialize filtered nodes when availableNodes changes
      this.initFilteredNodes();
    }
  }

  private initFilteredNodes(): void {
    this.filteredNodes$ = this.nodeSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterNodes(value))
    );
  }

  private filterNodes(value: string | MapNode | null): MapNode[] {
    if (!value) {
      return this.sortedNodes;
    }

    const filterValue = typeof value === 'string'
      ? value
      : String(value.nodeNumber ?? '');

    return this.sortedNodes.filter(node =>
      String(node.nodeNumber ?? '').includes(filterValue)
    );
  }

  displayFn(node: MapNode | null): string {
    return node?.nodeNumber != null ? String(node.nodeNumber) : '';
  }

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

  onAutocompleteNodeSelected(node: MapNode): void {
    if (node) {
      this.placeNode.emit(node);
      // Reset the autocomplete input after placing
      this.nodeSearchControl.setValue('');
    }
  }
}
