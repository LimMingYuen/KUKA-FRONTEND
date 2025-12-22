/**
 * Selection Manager Service - Multi-select, context menu, and selection state
 */

import { Injectable, signal, computed, EventEmitter } from '@angular/core';
import {
  Selection,
  SelectionBox,
  HitTestResult,
  ContextMenuState,
  ContextMenuTarget,
  ContextMenuItem,
  Vec2
} from '../core/canvas-types';
import { CustomNode, CustomZone, CustomLine } from '../../../../models/robot-monitoring.models';

@Injectable()
export class SelectionManagerService {
  // Selection state
  public readonly selection = signal<Selection>({
    nodes: new Set(),
    zones: new Set(),
    lines: new Set(),
    robots: new Set()
  });

  // Selection box (for drag selection)
  public readonly selectionBox = signal<SelectionBox>({
    startWorld: { x: 0, y: 0 },
    endWorld: { x: 0, y: 0 },
    isActive: false
  });

  // Context menu state
  public readonly contextMenu = signal<ContextMenuState>({
    isOpen: false,
    screenPos: { x: 0, y: 0 },
    target: null,
    items: []
  });

  // Computed properties
  public readonly hasSelection = computed(() => {
    const sel = this.selection();
    return sel.nodes.size > 0 || sel.zones.size > 0 || sel.lines.size > 0;
  });

  public readonly selectedCount = computed(() => {
    const sel = this.selection();
    return sel.nodes.size + sel.zones.size + sel.lines.size;
  });

  public readonly selectedNodeIds = computed(() => Array.from(this.selection().nodes));
  public readonly selectedZoneIds = computed(() => Array.from(this.selection().zones));
  public readonly selectedLineIds = computed(() => Array.from(this.selection().lines));

  // Events
  public readonly onSelectionChange = new EventEmitter<Selection>();
  public readonly onContextMenuAction = new EventEmitter<{ action: string; target: ContextMenuTarget }>();

  // ============================================================================
  // Selection Methods
  // ============================================================================

  /**
   * Select a single element (replaces current selection)
   */
  select(hit: HitTestResult): void {
    const newSelection: Selection = {
      nodes: new Set(),
      zones: new Set(),
      lines: new Set(),
      robots: new Set()
    };

    this.addToSelection(newSelection, hit);
    this.selection.set(newSelection);
    this.onSelectionChange.emit(newSelection);
  }

  /**
   * Add element to current selection
   */
  addToSelection(selection: Selection, hit: HitTestResult): void {
    switch (hit.type) {
      case 'node':
      case 'node-edge':
        selection.nodes.add(hit.id);
        break;
      case 'zone':
      case 'zone-vertex':
        selection.zones.add(hit.id);
        break;
      case 'line':
        selection.lines.add(hit.id);
        break;
      case 'robot':
        selection.robots.add(hit.id);
        break;
    }
  }

  /**
   * Toggle element in selection (for Shift+click)
   */
  toggleSelection(hit: HitTestResult): void {
    const sel = this.selection();
    const newSelection: Selection = {
      nodes: new Set(sel.nodes),
      zones: new Set(sel.zones),
      lines: new Set(sel.lines),
      robots: new Set(sel.robots)
    };

    const isSelected = this.isSelected(hit);

    if (isSelected) {
      this.removeFromSelection(newSelection, hit);
    } else {
      this.addToSelection(newSelection, hit);
    }

    this.selection.set(newSelection);
    this.onSelectionChange.emit(newSelection);
  }

  /**
   * Remove element from selection
   */
  removeFromSelection(selection: Selection, hit: HitTestResult): void {
    switch (hit.type) {
      case 'node':
      case 'node-edge':
        selection.nodes.delete(hit.id);
        break;
      case 'zone':
      case 'zone-vertex':
        selection.zones.delete(hit.id);
        break;
      case 'line':
        selection.lines.delete(hit.id);
        break;
      case 'robot':
        selection.robots.delete(hit.id);
        break;
    }
  }

  /**
   * Check if element is selected
   */
  isSelected(hit: HitTestResult): boolean {
    const sel = this.selection();
    switch (hit.type) {
      case 'node':
      case 'node-edge':
        return sel.nodes.has(hit.id);
      case 'zone':
      case 'zone-vertex':
        return sel.zones.has(hit.id);
      case 'line':
        return sel.lines.has(hit.id);
      case 'robot':
        return sel.robots.has(hit.id);
      default:
        return false;
    }
  }

  /**
   * Check if element ID is selected
   */
  isNodeSelected(id: string): boolean {
    return this.selection().nodes.has(id);
  }

  isZoneSelected(id: string): boolean {
    return this.selection().zones.has(id);
  }

  isLineSelected(id: string): boolean {
    return this.selection().lines.has(id);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    const newSelection: Selection = {
      nodes: new Set(),
      zones: new Set(),
      lines: new Set(),
      robots: new Set()
    };
    this.selection.set(newSelection);
    this.onSelectionChange.emit(newSelection);
  }

  /**
   * Select multiple elements from hit test results
   */
  selectMultiple(hits: HitTestResult[]): void {
    const newSelection: Selection = {
      nodes: new Set(),
      zones: new Set(),
      lines: new Set(),
      robots: new Set()
    };

    for (const hit of hits) {
      this.addToSelection(newSelection, hit);
    }

    this.selection.set(newSelection);
    this.onSelectionChange.emit(newSelection);
  }

  /**
   * Select all nodes
   */
  selectAllNodes(nodes: CustomNode[]): void {
    const sel = this.selection();
    const newSelection: Selection = {
      nodes: new Set(nodes.map(n => n.id)),
      zones: sel.zones,
      lines: sel.lines,
      robots: sel.robots
    };
    this.selection.set(newSelection);
    this.onSelectionChange.emit(newSelection);
  }

  /**
   * Select all elements
   */
  selectAll(nodes: CustomNode[], zones: CustomZone[], lines: CustomLine[]): void {
    const newSelection: Selection = {
      nodes: new Set(nodes.map(n => n.id)),
      zones: new Set(zones.map(z => z.id)),
      lines: new Set(lines.map(l => l.id)),
      robots: new Set()  // Robots are typically not user-created, so don't select all
    };
    this.selection.set(newSelection);
    this.onSelectionChange.emit(newSelection);
  }

  // ============================================================================
  // Selection Box Methods
  // ============================================================================

  /**
   * Start selection box
   */
  startSelectionBox(worldPos: Vec2): void {
    this.selectionBox.set({
      startWorld: worldPos,
      endWorld: worldPos,
      isActive: true
    });
  }

  /**
   * Update selection box end position
   */
  updateSelectionBox(worldPos: Vec2): void {
    this.selectionBox.update(box => ({
      ...box,
      endWorld: worldPos
    }));
  }

  /**
   * End selection box and return bounds
   */
  endSelectionBox(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const box = this.selectionBox();
    if (!box.isActive) return null;

    this.selectionBox.update(b => ({
      ...b,
      isActive: false
    }));

    const minX = Math.min(box.startWorld.x, box.endWorld.x);
    const minY = Math.min(box.startWorld.y, box.endWorld.y);
    const maxX = Math.max(box.startWorld.x, box.endWorld.x);
    const maxY = Math.max(box.startWorld.y, box.endWorld.y);

    return { minX, minY, maxX, maxY };
  }

  /**
   * Cancel selection box
   */
  cancelSelectionBox(): void {
    this.selectionBox.update(b => ({
      ...b,
      isActive: false
    }));
  }

  // ============================================================================
  // Context Menu Methods
  // ============================================================================

  /**
   * Open context menu for a specific target
   */
  openContextMenu(screenPos: Vec2, target: ContextMenuTarget): void {
    const items = this.getContextMenuItems(target);

    this.contextMenu.set({
      isOpen: true,
      screenPos,
      target,
      items
    });
  }

  /**
   * Close context menu
   */
  closeContextMenu(): void {
    this.contextMenu.update(cm => ({
      ...cm,
      isOpen: false
    }));
  }

  /**
   * Handle context menu item click
   */
  handleContextMenuAction(action: string): void {
    const target = this.contextMenu().target;
    if (target) {
      this.onContextMenuAction.emit({ action, target });
    }
    this.closeContextMenu();
  }

  /**
   * Get menu items based on target type
   */
  private getContextMenuItems(target: ContextMenuTarget): ContextMenuItem[] {
    switch (target.type) {
      case 'node':
        return [
          { id: 'edit-label', label: 'Edit Label', icon: 'edit' },
          { id: 'change-color', label: 'Change Color', icon: 'palette' },
          { id: 'connect', label: 'Connect to...', icon: 'link' },
          { id: 'divider-1', label: '', divider: true },
          { id: 'delete', label: 'Delete', icon: 'delete' }
        ];

      case 'zone':
        return [
          { id: 'edit-name', label: 'Edit Name', icon: 'edit' },
          { id: 'change-color', label: 'Change Color', icon: 'palette' },
          { id: 'change-opacity', label: 'Change Opacity', icon: 'opacity' },
          { id: 'divider-1', label: '', divider: true },
          { id: 'delete', label: 'Delete', icon: 'delete' }
        ];

      case 'line':
        return [
          { id: 'change-color', label: 'Change Color', icon: 'palette' },
          { id: 'reverse', label: 'Reverse Direction', icon: 'swap_horiz' },
          { id: 'divider-1', label: '', divider: true },
          { id: 'delete', label: 'Delete', icon: 'delete' }
        ];

      case 'canvas':
        return [
          { id: 'start-zone', label: 'Start Drawing Zone', icon: 'crop_square' }
        ];

      default:
        return [];
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get selected elements from arrays
   */
  getSelectedElements(
    nodes: CustomNode[],
    zones: CustomZone[],
    lines: CustomLine[]
  ): {
    selectedNodes: CustomNode[];
    selectedZones: CustomZone[];
    selectedLines: CustomLine[];
  } {
    const sel = this.selection();
    return {
      selectedNodes: nodes.filter(n => sel.nodes.has(n.id)),
      selectedZones: zones.filter(z => sel.zones.has(z.id)),
      selectedLines: lines.filter(l => sel.lines.has(l.id))
    };
  }

  /**
   * Get bounding box of selected elements
   */
  getSelectionBounds(
    nodes: CustomNode[],
    zones: CustomZone[]
  ): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const sel = this.selection();
    const selectedNodes = nodes.filter(n => sel.nodes.has(n.id));
    const selectedZones = zones.filter(z => sel.zones.has(z.id));

    if (selectedNodes.length === 0 && selectedZones.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of selectedNodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }

    for (const zone of selectedZones) {
      for (const point of zone.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }

    return { minX, minY, maxX, maxY };
  }
}
