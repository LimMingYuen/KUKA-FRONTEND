import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { SavedCustomMissionsDisplayData } from '../../../models/saved-custom-missions.models';

export interface SelectCustomMissionsDialogData {
  missionsByZone: Map<string, SavedCustomMissionsDisplayData[]>;
  selectedIds: Set<number>;
}

export interface SelectCustomMissionsDialogResult {
  selectedIds: Set<number>;
}

@Component({
  selector: 'app-select-custom-missions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
    MatDividerModule
  ],
  templateUrl: './select-custom-missions-dialog.component.html',
  styleUrl: './select-custom-missions-dialog.component.scss'
})
export class SelectCustomMissionsDialogComponent {
  public searchText = '';
  public selectedIds: Set<number>;
  public missionsByZone: Map<string, SavedCustomMissionsDisplayData[]>;
  public filteredMissionsByZone: Map<string, SavedCustomMissionsDisplayData[]>;
  public totalMissions = 0;

  constructor(
    public dialogRef: MatDialogRef<SelectCustomMissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SelectCustomMissionsDialogData
  ) {
    this.missionsByZone = data.missionsByZone;
    this.selectedIds = new Set(data.selectedIds);
    this.filteredMissionsByZone = new Map(data.missionsByZone);

    // Calculate total missions
    data.missionsByZone.forEach(missions => {
      this.totalMissions += missions.length;
    });
  }

  /**
   * Filter missions by search text
   */
  onSearchChange(): void {
    if (!this.searchText.trim()) {
      this.filteredMissionsByZone = new Map(this.missionsByZone);
      return;
    }

    const searchLower = this.searchText.toLowerCase().trim();
    const filtered = new Map<string, SavedCustomMissionsDisplayData[]>();

    this.missionsByZone.forEach((missions, zoneName) => {
      const matchingMissions = missions.filter(m =>
        m.missionName.toLowerCase().includes(searchLower)
      );
      if (matchingMissions.length > 0) {
        filtered.set(zoneName, matchingMissions);
      }
    });

    this.filteredMissionsByZone = filtered;
  }

  /**
   * Toggle mission selection
   */
  toggleMission(missionId: number): void {
    if (this.selectedIds.has(missionId)) {
      this.selectedIds.delete(missionId);
    } else {
      this.selectedIds.add(missionId);
    }
  }

  /**
   * Check if mission is selected
   */
  isSelected(missionId: number): boolean {
    return this.selectedIds.has(missionId);
  }

  /**
   * Select all missions
   */
  selectAll(): void {
    this.missionsByZone.forEach(missions => {
      missions.forEach(m => this.selectedIds.add(m.id));
    });
  }

  /**
   * Deselect all missions
   */
  deselectAll(): void {
    this.selectedIds.clear();
  }

  /**
   * Toggle all missions in a zone
   */
  toggleZone(zoneName: string): void {
    const missions = this.missionsByZone.get(zoneName);
    if (!missions) return;

    const allSelected = missions.every(m => this.selectedIds.has(m.id));

    if (allSelected) {
      missions.forEach(m => this.selectedIds.delete(m.id));
    } else {
      missions.forEach(m => this.selectedIds.add(m.id));
    }
  }

  /**
   * Check if all missions in zone are selected
   */
  isZoneAllSelected(zoneName: string): boolean {
    const missions = this.missionsByZone.get(zoneName);
    if (!missions || missions.length === 0) return false;
    return missions.every(m => this.selectedIds.has(m.id));
  }

  /**
   * Check if some missions in zone are selected
   */
  isZoneIndeterminate(zoneName: string): boolean {
    const missions = this.missionsByZone.get(zoneName);
    if (!missions || missions.length === 0) return false;
    const selectedCount = missions.filter(m => this.selectedIds.has(m.id)).length;
    return selectedCount > 0 && selectedCount < missions.length;
  }

  /**
   * Get selected count
   */
  get selectedCount(): number {
    return this.selectedIds.size;
  }

  /**
   * Cancel and close dialog
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Apply selection and close dialog
   */
  onApply(): void {
    this.dialogRef.close({
      selectedIds: this.selectedIds
    } as SelectCustomMissionsDialogResult);
  }
}
