import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import cytoscape, { Core, ElementDefinition, NodeSingular, EventObject } from 'cytoscape';

import { WarehouseMapService } from '../../services/warehouse-map.service';
import { MapSignalRService } from '../../services/map-signalr.service';
import {
  FloorInfo,
  MapNode,
  MapZoneDisplay,
  MapRealtimeData,
  RobotPosition,
  ContainerPosition,
  MapEdge,
  getRobotStatusColor,
  getRobotStatusText,
  getBatteryColor,
  getBatteryIcon,
  getZoneColor,
} from '../../models/warehouse-map.models';

@Component({
  selector: 'app-warehouse-map',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './warehouse-map.component.html',
  styleUrl: './warehouse-map.component.scss',
})
export class WarehouseMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cyContainer', { static: false }) cyContainer!: ElementRef;

  // State signals
  public floors = signal<FloorInfo[]>([]);
  public selectedFloorIndex = signal<number>(0);
  public isLoading = signal<boolean>(false);
  public connectionState = signal<string>('disconnected');

  // Map data
  public currentNodes = signal<MapNode[]>([]);
  public currentZones = signal<MapZoneDisplay[]>([]);
  public currentEdges = signal<MapEdge[]>([]);
  public currentRobots = signal<RobotPosition[]>([]);
  public currentContainers = signal<ContainerPosition[]>([]);
  public lastUpdated = signal<Date | null>(null);

  // Statistics
  public stats = signal({
    totalRobots: 0,
    activeRobots: 0,
    errorRobots: 0,
    totalContainers: 0,
  });

  private cy: Core | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private mapService: WarehouseMapService,
    private signalRService: MapSignalRService,
    private snackBar: MatSnackBar
  ) {
    // Effect to update map when SignalR receives data
    effect(() => {
      const data = this.signalRService.robotPositionsUpdated();
      if (data) {
        this.handleRealtimeUpdate(data);
      }
    });

    // Effect to track connection state
    effect(() => {
      this.connectionState.set(this.signalRService.connectionState());
    });
  }

  ngOnInit(): void {
    this.loadFloors();
  }

  ngAfterViewInit(): void {
    // Initialize cytoscape after view is ready
    setTimeout(() => this.initCytoscape(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.cy) {
      this.cy.destroy();
    }

    this.signalRService.stopConnection();
  }

  /**
   * Load available floors
   */
  loadFloors(): void {
    this.isLoading.set(true);
    this.mapService
      .getFloors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: floors => {
          this.floors.set(floors);
          this.isLoading.set(false);

          if (floors.length > 0) {
            this.selectFloor(0);
          }
        },
        error: err => {
          console.error('Failed to load floors:', err);
          this.isLoading.set(false);
          this.snackBar.open('Failed to load floors', 'Close', { duration: 5000 });
        },
      });
  }

  /**
   * Select a floor tab
   */
  selectFloor(index: number): void {
    const floors = this.floors();
    if (index < 0 || index >= floors.length) return;

    this.selectedFloorIndex.set(index);
    const floor = floors[index];

    this.loadMapData(floor);

    // Connect to SignalR and join floor
    this.signalRService.startConnection().then(() => {
      this.signalRService.joinFloor(floor.floorNumber, floor.mapCode);
    });
  }

  /**
   * Load map data for a floor
   */
  loadMapData(floor: FloorInfo): void {
    this.isLoading.set(true);

    forkJoin({
      nodes: this.mapService.getNodes(floor.floorNumber, floor.mapCode),
      zones: this.mapService.getZones(floor.floorNumber, floor.mapCode),
      edges: this.mapService.getEdges(floor.floorNumber, floor.mapCode),
      realtime: this.mapService.getRealtimeData(floor.floorNumber, floor.mapCode),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.currentNodes.set(result.nodes);
          this.currentZones.set(result.zones);
          this.currentEdges.set(result.edges);
          this.handleRealtimeUpdate(result.realtime);
          this.isLoading.set(false);
          this.renderMap();
        },
        error: err => {
          console.error('Failed to load map data:', err);
          this.isLoading.set(false);
          this.snackBar.open('Failed to load map data', 'Close', { duration: 5000 });
        },
      });
  }

  /**
   * Handle realtime data update
   */
  handleRealtimeUpdate(data: MapRealtimeData): void {
    if (!data) return;

    this.currentRobots.set(data.robots || []);
    this.currentContainers.set(data.containers || []);
    this.lastUpdated.set(data.lastUpdated ? new Date(data.lastUpdated) : new Date());

    // Update stats
    this.stats.set({
      totalRobots: data.robots?.length || 0,
      activeRobots: data.robots?.filter(r => r.robotStatus === 1).length || 0,
      errorRobots: data.errorRobots?.length || 0,
      totalContainers: data.containers?.length || 0,
    });

    // Update dynamic elements on map
    if (this.cy) {
      this.updateDynamicElements();
    }
  }

  /**
   * Refresh map data
   */
  refreshMap(): void {
    const floors = this.floors();
    const index = this.selectedFloorIndex();
    if (index >= 0 && index < floors.length) {
      this.loadMapData(floors[index]);
    }
  }

  /**
   * Handle file input selection for map upload
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadMap(input.files[0]);
    }
  }

  /**
   * Upload map JSON file
   */
  uploadMap(file: File): void {
    this.isLoading.set(true);
    this.mapService
      .uploadMapFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isLoading.set(false);
          if (result.success) {
            this.snackBar.open(
              `Map imported: ${result.stats.nodesImported} nodes, ${result.stats.edgesImported} edges`,
              'Close',
              { duration: 5000 }
            );
            // Refresh floors and map
            this.loadFloors();
          } else {
            this.snackBar.open(`Import failed: ${result.message}`, 'Close', { duration: 5000 });
          }
        },
        error: err => {
          this.isLoading.set(false);
          const errorMsg = err.error?.message || err.message || 'Unknown error';
          this.snackBar.open(`Import failed: ${errorMsg}`, 'Close', { duration: 5000 });
        },
      });
  }

  /**
   * Initialize Cytoscape
   */
  private initCytoscape(): void {
    if (!this.cyContainer || !this.cyContainer.nativeElement) {
      return;
    }

    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements: [],
      style: this.getCytoscapeStyles(),
      layout: { name: 'preset' },
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.2,
      boxSelectionEnabled: false,
    });

    // Add event handlers
    this.addTooltips();
  }

  /**
   * Get Cytoscape styles
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getCytoscapeStyles(): any[] {
    return [
      // QR code nodes (waypoints) - no labels by default, small dots
      {
        selector: 'node.qr-node',
        style: {
          'background-color': '#2196F3',
          label: '', // Hide label by default
          width: '8px',
          height: '8px',
          shape: 'ellipse',
          'border-width': 1,
          'border-color': '#1565C0',
        },
      },
      // Robot nodes
      {
        selector: 'node.robot',
        style: {
          'background-color': 'data(statusColor)',
          label: 'data(label)',
          'text-valign': 'bottom',
          'text-halign': 'center',
          color: '#333',
          'font-size': '12px',
          'font-weight': 'bold',
          width: '30px',
          height: '30px',
          shape: 'ellipse',
          'border-width': 3,
          'border-color': '#333',
          'z-index': 100,
        },
      },
      // Robot with warning
      {
        selector: 'node.robot.warning',
        style: {
          'border-color': '#F44336',
          'border-width': 4,
        },
      },
      // Robot with container
      {
        selector: 'node.robot.carrying',
        style: {
          'border-style': 'double',
          'border-width': 5,
        },
      },
      // Container nodes
      {
        selector: 'node.container',
        style: {
          'background-color': '#9C27B0',
          label: 'data(label)',
          'text-valign': 'bottom',
          'text-halign': 'center',
          color: '#333',
          'font-size': '10px',
          width: '20px',
          height: '20px',
          shape: 'rectangle',
          'border-width': 2,
          'border-color': '#6A1B9A',
          'z-index': 50,
        },
      },
      // Zone compound nodes
      {
        selector: 'node.zone',
        style: {
          'background-color': 'data(zoneColor)',
          'background-opacity': 0.3,
          label: 'data(label)',
          'text-valign': 'top',
          'text-halign': 'center',
          color: '#666',
          'font-size': '14px',
          'font-weight': 'bold',
          shape: 'roundrectangle',
          'border-width': 2,
          'border-color': 'data(zoneColor)',
          'border-opacity': 0.6,
          'z-index': 1,
          padding: '10px',
        },
      },
      // Edges (paths between nodes) - straight lines
      {
        selector: 'edge',
        style: {
          width: 1,
          'line-color': '#666',
          'curve-style': 'straight',
        },
      },
    ];
  }

  /**
   * Render the map
   */
  private renderMap(): void {
    if (!this.cy) return;

    const elements: ElementDefinition[] = [];
    const nodes = this.currentNodes();
    const zones = this.currentZones();

    // Calculate bounds for scaling
    const bounds = this.calculateBounds(nodes);

    // Add zone backgrounds first (lower z-index)
    zones.forEach(zone => {
      if (zone.polygonPoints.length > 0) {
        // Calculate zone center from polygon points
        const centerX =
          zone.polygonPoints.reduce((sum, p) => sum + p.x, 0) / zone.polygonPoints.length;
        const centerY =
          zone.polygonPoints.reduce((sum, p) => sum + p.y, 0) / zone.polygonPoints.length;

        elements.push({
          data: {
            id: `zone-${zone.id}`,
            label: zone.zoneName,
            zoneColor: getZoneColor(zone),
            zone: zone,
          },
          position: this.scalePosition(centerX, centerY, bounds),
          classes: 'zone',
        });
      }
    });

    // Add QR code nodes (only those with nodeUuid)
    // Build a map for quick lookup: nodeLabel -> cytoscape node id
    const nodeLabelToId = new Map<string, string>();

    nodes
      .filter(node => node.nodeUuid) // Extra safety filter
      .forEach(node => {
        const cyId = `node-${node.id}`;
        // Map by nodeLabel for edge connections (edges use nodeLabel not nodeUuid)
        nodeLabelToId.set(node.nodeLabel, cyId);

        elements.push({
          data: {
            id: cyId,
            label: node.nodeUuid, // Use nodeUuid as label
            node: node,
          },
          position: this.scalePosition(node.xCoordinate, node.yCoordinate, bounds),
          classes: 'qr-node',
        });
      });

    // Add edges (connections between nodes)
    const edges = this.currentEdges();
    edges.forEach(edge => {
      const sourceId = nodeLabelToId.get(edge.beginNodeLabel);
      const targetId = nodeLabelToId.get(edge.endNodeLabel);

      if (sourceId && targetId) {
        elements.push({
          data: {
            id: `edge-${edge.id}`,
            source: sourceId,
            target: targetId,
            length: edge.edgeLength,
          },
        });
      }
    });

    // Clear and add elements
    this.cy.elements().remove();
    this.cy.add(elements);

    // Add dynamic elements (robots, containers)
    this.updateDynamicElements();

    // Fit to view
    this.cy.fit(undefined, 50);
  }

  /**
   * Update dynamic elements (robots, containers)
   */
  private updateDynamicElements(): void {
    if (!this.cy) return;

    // Get bounds from current nodes
    const bounds = this.calculateBounds(this.currentNodes());

    // Remove existing dynamic elements
    this.cy.elements('node.robot, node.container').remove();

    const elements: ElementDefinition[] = [];

    // Add robots
    this.currentRobots().forEach(robot => {
      const classes = ['robot'];
      if (robot.warningLevel > 0) classes.push('warning');
      if (robot.liftState) classes.push('carrying');

      elements.push({
        data: {
          id: `robot-${robot.robotId}`,
          label: robot.robotId,
          statusColor: getRobotStatusColor(robot.robotStatus),
          robot: robot,
        },
        position: this.scalePosition(robot.xCoordinate, robot.yCoordinate, bounds),
        classes: classes.join(' '),
      });
    });

    // Add containers (not being carried)
    this.currentContainers()
      .filter(c => !c.isCarry)
      .forEach(container => {
        elements.push({
          data: {
            id: `container-${container.containerCode}`,
            label: container.containerCode,
            container: container,
          },
          position: this.scalePosition(container.xCoordinate, container.yCoordinate, bounds),
          classes: 'container',
        });
      });

    // Add new elements
    this.cy.add(elements);
  }

  /**
   * Calculate bounds from nodes
   */
  private calculateBounds(nodes: MapNode[]): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.xCoordinate);
      maxX = Math.max(maxX, node.xCoordinate);
      minY = Math.min(minY, node.yCoordinate);
      maxY = Math.max(maxY, node.yCoordinate);
    });

    // Add padding
    const paddingX = (maxX - minX) * 0.1 || 100;
    const paddingY = (maxY - minY) * 0.1 || 100;

    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
    };
  }

  /**
   * Scale position to fit canvas
   */
  private scalePosition(
    x: number,
    y: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): { x: number; y: number } {
    const canvasWidth = 800;
    const canvasHeight = 600;

    const scaleX = canvasWidth / (bounds.maxX - bounds.minX || 1);
    const scaleY = canvasHeight / (bounds.maxY - bounds.minY || 1);
    const scale = Math.min(scaleX, scaleY);

    return {
      x: (x - bounds.minX) * scale + 50,
      y: (y - bounds.minY) * scale + 50,
    };
  }

  /**
   * Add tooltips on hover
   */
  private addTooltips(): void {
    if (!this.cy) return;

    // QR node hover - show label
    this.cy.on('mouseover', 'node.qr-node', (event: EventObject) => {
      const node = event.target as NodeSingular;
      const mapNode = node.data('node') as MapNode;
      if (mapNode) {
        node.style('label', mapNode.nodeUuid || mapNode.nodeLabel);
        node.style('font-size', '10px');
        node.style('text-valign', 'bottom');
        node.style('text-halign', 'center');
        node.style('color', '#333');
      }
    });

    this.cy.on('mouseout', 'node.qr-node', (event: EventObject) => {
      const node = event.target as NodeSingular;
      node.style('label', '');
    });

    // Robot tooltip
    this.cy.on('mouseover', 'node.robot', (event: EventObject) => {
      const node = event.target as NodeSingular;
      const robot = node.data('robot') as RobotPosition;

      if (robot) {
        const tooltip = this.createRobotTooltip(robot);
        node.style('label', tooltip);
      }
    });

    this.cy.on('mouseout', 'node.robot', (event: EventObject) => {
      const node = event.target as NodeSingular;
      const robot = node.data('robot') as RobotPosition;
      if (robot) {
        node.style('label', robot.robotId);
      }
    });

    // Container tooltip
    this.cy.on('mouseover', 'node.container', (event: EventObject) => {
      const node = event.target as NodeSingular;
      const container = node.data('container') as ContainerPosition;

      if (container) {
        const tooltip = this.createContainerTooltip(container);
        node.style('label', tooltip);
      }
    });

    this.cy.on('mouseout', 'node.container', (event: EventObject) => {
      const node = event.target as NodeSingular;
      const container = node.data('container') as ContainerPosition;
      if (container) {
        node.style('label', container.containerCode);
      }
    });
  }

  /**
   * Create robot tooltip text
   */
  private createRobotTooltip(robot: RobotPosition): string {
    const lines = [
      robot.robotId,
      `Status: ${getRobotStatusText(robot.robotStatus)}`,
      `Battery: ${Math.round(robot.batteryLevel)}%`,
    ];

    if (robot.missionCode) {
      lines.push(`Mission: ${robot.missionCode}`);
    }

    if (robot.warningMessage) {
      lines.push(`Warning: ${robot.warningMessage}`);
    }

    return lines.join('\n');
  }

  /**
   * Create container tooltip text
   */
  private createContainerTooltip(container: ContainerPosition): string {
    return [container.containerCode, `Node: ${container.stayNodeNumber}`, `Status: ${container.status}`].join('\n');
  }

  // Helper methods for template
  getBatteryIcon = getBatteryIcon;
  getBatteryColor = getBatteryColor;
  getRobotStatusText = getRobotStatusText;
}
