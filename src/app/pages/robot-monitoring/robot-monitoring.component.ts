import { Component, OnInit, OnDestroy, ViewChild, signal, effect, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { RobotMonitoringService } from '../../services/robot-monitoring.service';
import { RobotRealtimeSignalRService } from '../../services/robot-realtime-signalr.service';
import { MobileRobotsService } from '../../services/mobile-robots.service';
import { MobileRobotDisplayData } from '../../models/mobile-robot.models';
import { RobotMapCanvasComponent } from '../../shared/components/robot-map-canvas/robot-map-canvas.component';
import { DrawingToolbarComponent } from '../../shared/components/drawing-toolbar/drawing-toolbar.component';
import { MapConfigDialogComponent, MapConfigDialogData } from '../../shared/dialogs/map-config-dialog/map-config-dialog.component';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../workflow-template-form/confirmation-dialog/confirmation-dialog.component';
import {
  RobotMonitoringMap,
  RobotMonitoringMapSummary,
  MapNode,
  CustomNode,
  CustomZone,
  CustomLine,
  DrawingMode,
  Point
} from '../../models/robot-monitoring.models';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-robot-monitoring',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatToolbarModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    RobotMapCanvasComponent,
    DrawingToolbarComponent
  ],
  templateUrl: './robot-monitoring.component.html',
  styleUrl: './robot-monitoring.component.scss'
})
export class RobotMonitoringComponent implements OnInit, OnDestroy {
  @ViewChild(RobotMapCanvasComponent) mapCanvas!: RobotMapCanvasComponent;

  // State
  public maps = signal<RobotMonitoringMapSummary[]>([]);
  public selectedMapId = signal<number | null>(null);
  public selectedMap = signal<RobotMonitoringMap | null>(null);

  // Loading states
  public isLoadingMaps = signal<boolean>(false);
  public isLoadingMapData = signal<boolean>(false);

  // Dropdown options
  public mapCodes = signal<string[]>([]);
  public floorNumbers = signal<string[]>([]);

  // Drawing mode state
  public drawingMode = signal<DrawingMode>('none');
  public customNodes = signal<CustomNode[]>([]);
  public customZones = signal<CustomZone[]>([]);
  public customLines = signal<CustomLine[]>([]);
  public hasUnsavedChanges = signal<boolean>(false);

  // Available nodes from QrCode table (for dropdown selection)
  public availableNodes = signal<MapNode[]>([]);

  // Line drawing state
  public lineStartNodeId = signal<string | null>(null);

  // Robot placement - track which robots user has added to this map
  // Key: robotId, Value: node position for manual placement display
  public placedRobots = signal<Map<string, { nodeId: string; nodeLabel: string; x: number; y: number }>>(new Map());

  // Robot realtime SignalR service
  public robotRealtimeService = inject(RobotRealtimeSignalRService);

  // Mobile robots service - for fetching robot list from API
  public mobileRobotsService = inject(MobileRobotsService);

  // All mobile robots from API (for dropdown)
  public allMobileRobots = signal<MobileRobotDisplayData[]>([]);
  public isLoadingRobots = signal<boolean>(false);

  // Robot placement state
  public isPlacingRobot = signal<boolean>(false);
  public selectedRobotToPlace = signal<string | null>(null);

  // Computed
  public backgroundImageUrl = signal<string | null>(null);
  public isDrawingZone = computed(() => {
    return this.drawingMode() === 'drawZone' && this.mapCanvas?.getIsDrawingZone();
  });

  // Available robots from API that haven't been placed yet
  public availableRobotsToPlace = computed(() => {
    const allRobots = this.allMobileRobots();
    const placed = this.placedRobots();

    return allRobots
      .filter(robot => !placed.has(robot.robotId))
      .map(robot => ({
        robotId: robot.robotId,
        robotTypeCode: robot.robotTypeCode,
        mapCode: robot.mapCode,
        floorNumber: robot.floorNumber
      }));
  });

  // Robots that are placed and should be shown on map
  public robotsToShow = computed(() => {
    const allRobots = this.robotRealtimeService.robotPositions();
    const placed = this.placedRobots();
    const toShow = new Map<string, any>();

    placed.forEach((nodeInfo, robotId) => {
      const robot = allRobots.get(robotId);
      if (robot) {
        toShow.set(robotId, robot);
      }
    });

    return toShow;
  });

  private destroy$ = new Subject<void>();
  private config = inject(ConfigService);
  private get API_BASE(): string {
    return this.config.apiUrl;
  }

  constructor(
    private robotMonitoringService: RobotMonitoringService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Effect to update background image URL when selected map changes
    effect(() => {
      const map = this.selectedMap();
      if (map?.backgroundImagePath) {
        this.backgroundImageUrl.set(`${this.API_BASE}${map.backgroundImagePath}`);
      } else {
        this.backgroundImageUrl.set(null);
      }
    });

    // Effect to sync custom nodes/zones/lines when map changes
    effect(() => {
      const map = this.selectedMap();
      if (map) {
        this.customNodes.set(map.customNodes || []);
        this.customZones.set(map.customZones || []);
        this.customLines.set(map.customLines || []);
        this.hasUnsavedChanges.set(false);
      } else {
        this.customNodes.set([]);
        this.customZones.set([]);
        this.customLines.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.loadMobileRobots();
  }

  /**
   * Load all mobile robots from API for the dropdown
   */
  private loadMobileRobots(): void {
    this.isLoadingRobots.set(true);
    this.mobileRobotsService.getMobileRobots().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (robots) => {
        this.allMobileRobots.set(robots);
        this.isLoadingRobots.set(false);
      },
      error: () => {
        this.isLoadingRobots.set(false);
      }
    });
  }

  /**
   * Sync robots from external API and reload list
   */
  syncAndReloadRobots(): void {
    this.mobileRobotsService.syncMobileRobots().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loadMobileRobots();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Disconnect from robot realtime SignalR
    this.robotRealtimeService.stopConnection();
  }

  private loadInitialData(): void {
    this.isLoadingMaps.set(true);

    forkJoin({
      maps: this.robotMonitoringService.getMaps(),
      mapCodes: this.robotMonitoringService.getMapCodes(),
      floorNumbers: this.robotMonitoringService.getFloorNumbers()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.maps.set(result.maps);
        this.mapCodes.set(result.mapCodes);
        this.floorNumbers.set(result.floorNumbers);
        this.isLoadingMaps.set(false);

        // Load default map if exists
        const defaultMap = result.maps.find(m => m.isDefault);
        if (defaultMap) {
          this.selectMap(defaultMap.id);
        } else if (result.maps.length > 0) {
          this.selectMap(result.maps[0].id);
        }
      },
      error: () => {
        this.isLoadingMaps.set(false);
      }
    });
  }

  selectMap(mapId: number): void {
    if (this.selectedMapId() === mapId) return;

    this.selectedMapId.set(mapId);
    this.isLoadingMapData.set(true);
    this.availableNodes.set([]);

    this.robotMonitoringService.getMapById(mapId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (map) => {
        this.selectedMap.set(map);

        // Connect to robot realtime SignalR for this map
        this.connectToRobotRealtime(map.mapCode, map.floorNumber);

        // Fetch available nodes from QrCode table if mapCode and floorNumber are set
        if (map.mapCode && map.floorNumber) {
          this.loadAvailableNodes(map.mapCode, map.floorNumber);
        } else {
          this.isLoadingMapData.set(false);
        }
      },
      error: () => {
        this.isLoadingMapData.set(false);
      }
    });
  }

  /**
   * Connect to robot realtime SignalR for a specific map/floor
   * Always connects so we have robot data available for placement
   */
  private connectToRobotRealtime(mapCode?: string, floorNumber?: string): void {
    this.robotRealtimeService.connect(mapCode, floorNumber);
  }

  /**
   * Fit map to show all placed robots
   */
  fitToRobots(): void {
    if (this.mapCanvas) {
      this.mapCanvas.fitToRobots();
    }
  }

  // ==================== Robot Placement Methods ====================

  /**
   * Start robot placement mode - select a robot to place
   */
  startRobotPlacement(robotId: string): void {
    this.selectedRobotToPlace.set(robotId);
    this.isPlacingRobot.set(true);
    this.snackBar.open(`Click a node to place robot ${robotId}`, 'Cancel', {
      duration: 10000
    }).onAction().subscribe(() => {
      this.cancelRobotPlacement();
    });
  }

  /**
   * Place selected robot at a node
   */
  placeRobotAtNode(node: CustomNode): void {
    const robotId = this.selectedRobotToPlace();
    if (!robotId) return;

    const nodeId = node.id;
    const nodeLabel = node.label;

    // Add robot to placed robots with node coordinates for manual placement display
    this.placedRobots.update(map => {
      const newMap = new Map(map);
      newMap.set(robotId, { nodeId, nodeLabel, x: node.x, y: node.y });
      return newMap;
    });

    this.snackBar.open(`Robot ${robotId} placed at ${nodeLabel}`, 'Dismiss', { duration: 3000 });
    this.cancelRobotPlacement();
  }

  /**
   * Cancel robot placement mode
   */
  cancelRobotPlacement(): void {
    this.selectedRobotToPlace.set(null);
    this.isPlacingRobot.set(false);
  }

  /**
   * Remove a robot from the map
   */
  removeRobotFromMap(robotId: string): void {
    this.placedRobots.update(map => {
      const newMap = new Map(map);
      newMap.delete(robotId);
      return newMap;
    });
    this.snackBar.open(`Robot ${robotId} removed from map`, 'Dismiss', { duration: 2000 });
  }

  /**
   * Clear all robots from the map
   */
  clearAllRobots(): void {
    this.placedRobots.set(new Map());
    this.snackBar.open('All robots removed from map', 'Dismiss', { duration: 2000 });
  }

  /**
   * Handle node click when placing a robot
   */
  onCustomNodeClickForRobot(node: CustomNode): void {
    if (this.isPlacingRobot()) {
      this.placeRobotAtNode(node);
    }
  }

  private loadAvailableNodes(mapCode: string, floorNumber: string): void {
    this.robotMonitoringService.getMapNodes(mapCode, floorNumber).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (nodes) => {
        this.availableNodes.set(nodes);
        this.isLoadingMapData.set(false);
      },
      error: () => {
        this.availableNodes.set([]);
        this.isLoadingMapData.set(false);
      }
    });
  }

  fitMapToContent(): void {
    if (this.mapCanvas) {
      this.mapCanvas.fitToContent();
    }
  }

  openCreateMapDialog(): void {
    const dialogData: MapConfigDialogData = {
      mode: 'create',
      mapCodes: this.mapCodes(),
      floorNumbers: this.floorNumbers()
    };

    const dialogRef = this.dialog.open(MapConfigDialogComponent, {
      width: '650px',
      maxHeight: '90vh',
      data: dialogData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result?.success) {
        this.loadMaps();
        if (result.map) {
          this.selectMap(result.map.id);
        }
      }
    });
  }

  openEditMapDialog(): void {
    const currentMap = this.selectedMap();
    if (!currentMap) return;

    const dialogData: MapConfigDialogData = {
      mode: 'edit',
      map: currentMap,
      mapCodes: this.mapCodes(),
      floorNumbers: this.floorNumbers()
    };

    const dialogRef = this.dialog.open(MapConfigDialogComponent, {
      width: '650px',
      maxHeight: '90vh',
      data: dialogData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result?.success) {
        // Refresh map
        this.selectMap(currentMap.id);
        this.loadMaps();
      }
    });
  }

  deleteCurrentMap(): void {
    const currentMap = this.selectedMap();
    if (!currentMap) return;

    const dialogData: ConfirmationDialogData = {
      title: 'Delete Map',
      message: `Are you sure you want to delete map "${currentMap.name}"?`,
      icon: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      confirmColor: 'warn'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result === true) {
        this.robotMonitoringService.deleteMap(currentMap.id).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this.snackBar.open('Map deleted successfully', 'Dismiss', { duration: 3000 });
            this.selectedMapId.set(null);
            this.selectedMap.set(null);
            this.customNodes.set([]);
            this.customZones.set([]);
            this.customLines.set([]);
            this.loadMaps();
          }
        });
      }
    });
  }

  private loadMaps(): void {
    this.robotMonitoringService.getMaps().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (maps) => {
        this.maps.set(maps);
      }
    });
  }

  get imageWidth(): number {
    return this.selectedMap()?.imageWidth || 1000;
  }

  get imageHeight(): number {
    return this.selectedMap()?.imageHeight || 800;
  }

  // Drawing mode methods
  onDrawingModeChange(mode: DrawingMode): void {
    this.drawingMode.set(mode);
  }

  onFinishZone(): void {
    if (this.mapCanvas) {
      this.mapCanvas.finishZoneDrawing();
    }
  }

  onCancelDrawing(): void {
    if (this.mapCanvas) {
      this.mapCanvas.cancelZoneDrawing();
    }
    this.drawingMode.set('select');
  }

  onUploadImage(): void {
    // Trigger file input for image upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadBackgroundImage(file);
      }
    };
    input.click();
  }

  private uploadBackgroundImage(file: File): void {
    const currentMap = this.selectedMap();
    if (!currentMap) {
      this.snackBar.open('Please select a map first', 'Dismiss', { duration: 3000 });
      return;
    }

    this.robotMonitoringService.uploadBackgroundImage(currentMap.id, file).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Background image uploaded', 'Dismiss', { duration: 3000 });
          // Refresh the map to show new image
          this.selectMap(currentMap.id);
        } else {
          this.snackBar.open(response.message || 'Upload failed', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => {
        this.snackBar.open('Failed to upload image', 'Dismiss', { duration: 3000 });
      }
    });
  }

  onSaveDrawing(): void {
    const currentMap = this.selectedMap();
    if (!currentMap) return;

    const updateRequest = {
      customNodes: this.customNodes(),
      customZones: this.customZones(),
      customLines: this.customLines()
    };

    this.robotMonitoringService.updateMap(currentMap.id, updateRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.snackBar.open('Map saved', 'Dismiss', { duration: 3000 });
        this.hasUnsavedChanges.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to save', 'Dismiss', { duration: 3000 });
      }
    });
  }

  onClearAllDrawing(): void {
    this.customNodes.set([]);
    this.customZones.set([]);
    this.customLines.set([]);
    this.hasUnsavedChanges.set(true);
    if (this.mapCanvas) {
      this.mapCanvas.clearCustomElements();
    }
  }

  onZoneAdded(zone: CustomZone): void {
    this.customZones.update(zones => [...zones, zone]);
    this.hasUnsavedChanges.set(true);
    this.drawingMode.set('select');
  }

  onNodeDeleted(nodeId: string): void {
    this.customNodes.update(nodes => nodes.filter(n => n.id !== nodeId));
    this.hasUnsavedChanges.set(true);
  }

  onZoneDeleted(zoneId: string): void {
    this.customZones.update(zones => zones.filter(z => z.id !== zoneId));
    this.hasUnsavedChanges.set(true);
  }

  // Handle zone vertex drag - update zone points
  onZoneMoved(event: { zoneId: string; points: Point[] }): void {
    this.customZones.update(zones =>
      zones.map(z => z.id === event.zoneId ? { ...z, points: event.points } : z)
    );
    this.hasUnsavedChanges.set(true);
  }

  onPlaceNodeFromDropdown(mapNode: MapNode): void {
    // Check if node already exists on canvas
    const existingNodes = this.customNodes();
    if (existingNodes.some(n => n.id === `qr-${mapNode.id}`)) {
      this.snackBar.open(`Node "${mapNode.nodeLabel}" already on canvas`, 'Dismiss', { duration: 2000 });
      return;
    }

    // Place immediately at center of canvas
    const centerX = this.imageWidth / 2;
    const centerY = this.imageHeight / 2;

    const customNode: CustomNode = {
      id: `qr-${mapNode.id}`,
      label: mapNode.nodeLabel,
      nodeNumber: mapNode.nodeNumber,
      x: centerX,
      y: centerY,
      color: '#4a5db8'
    };

    this.customNodes.update(nodes => [...nodes, customNode]);
    this.hasUnsavedChanges.set(true);
    this.drawingMode.set('select'); // Switch to select mode so user can drag
    this.snackBar.open(`Node "${mapNode.nodeLabel}" placed - drag to position`, 'Dismiss', { duration: 3000 });
  }

  // Handle node added from canvas click (manual node placement)
  onNodeAdded(node: CustomNode): void {
    this.customNodes.update(nodes => [...nodes, node]);
    this.hasUnsavedChanges.set(true);
  }

  // Handle node drag - update node position
  onNodeMoved(event: { nodeId: string; x: number; y: number }): void {
    this.customNodes.update(nodes =>
      nodes.map(n => n.id === event.nodeId ? { ...n, x: event.x, y: event.y } : n)
    );
    this.hasUnsavedChanges.set(true);
  }

  // Handle node click for line drawing
  onNodeClickForLine(nodeId: string): void {
    const mode = this.drawingMode();
    if (mode !== 'drawLine') return;

    const startId = this.lineStartNodeId();
    if (!startId) {
      // First node selected
      this.lineStartNodeId.set(nodeId);
      this.snackBar.open('Click another node to complete the line', 'Dismiss', { duration: 2000 });
    } else if (startId !== nodeId) {
      // Second node selected - create line
      const newLine: CustomLine = {
        id: this.generateUUID(),
        fromNodeId: startId,
        toNodeId: nodeId,
        color: '#666666',
        weight: 2
      };
      this.customLines.update(lines => [...lines, newLine]);
      this.hasUnsavedChanges.set(true);
      this.lineStartNodeId.set(null);
      this.drawingMode.set('select'); // Switch back to select mode so nodes become draggable
      this.snackBar.open('Line created - drag nodes to reposition', 'Dismiss', { duration: 2000 });
    }
  }

  // Delete a line
  onLineDeleted(lineId: string): void {
    this.customLines.update(lines => lines.filter(l => l.id !== lineId));
    this.hasUnsavedChanges.set(true);
  }

  // Cancel line drawing
  onCancelLineDrawing(): void {
    this.lineStartNodeId.set(null);
    this.drawingMode.set('select');
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
