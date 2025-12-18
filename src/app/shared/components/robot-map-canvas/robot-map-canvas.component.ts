import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  signal,
  computed,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import {
  RobotMonitoringMap,
  DisplaySettings,
  CustomNode,
  CustomZone,
  CustomLine,
  DrawingMode,
  Point,
  CUSTOM_NODE_COLORS,
  DEFAULT_DISPLAY_SETTINGS
} from '../../../models/robot-monitoring.models';
import { RobotRealtimeSignalRService } from '../../../services/robot-realtime-signalr.service';
import {
  AnimatedRobotState,
  getRobotStatusColor,
  getBatteryColor
} from '../../../models/robot-realtime.models';

@Component({
  selector: 'app-robot-map-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './robot-map-canvas.component.html',
  styleUrls: ['./robot-map-canvas.component.scss']
})
export class RobotMapCanvasComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // Inject robot realtime service for live robot positions
  public robotRealtimeService = inject(RobotRealtimeSignalRService);

  @Input() mapConfig: RobotMonitoringMap | null = null;
  @Input() backgroundImageUrl: string | null = null;
  @Input() imageWidth: number = 1000;
  @Input() imageHeight: number = 800;
  @Input() showRobots: boolean = false; // Enable/disable robot display

  // Placed robot IDs - only these robots will be shown
  // Map: robotId -> { nodeId, nodeLabel }
  @Input() placedRobotIds: Map<string, { nodeId: string; nodeLabel: string }> = new Map();

  // Coordinate system mapping (AMR coordinates to map pixels)
  // If not set, robot coordinates are used directly
  @Input() coordinateScale: number = 1; // Multiply robot coords by this factor

  // Drawing mode inputs
  @Input() drawingMode: DrawingMode = 'none';
  @Input() customNodes: CustomNode[] = [];
  @Input() customZones: CustomZone[] = [];
  @Input() customLines: CustomLine[] = [];
  @Input() lineStartNodeId: string | null = null;

  // Drawing mode outputs
  @Output() nodeAdded = new EventEmitter<CustomNode>();
  @Output() zoneAdded = new EventEmitter<CustomZone>();
  @Output() nodeDeleted = new EventEmitter<string>();
  @Output() zoneDeleted = new EventEmitter<string>();
  @Output() lineDeleted = new EventEmitter<string>();
  @Output() nodeMoved = new EventEmitter<{ nodeId: string; x: number; y: number }>();
  @Output() zoneMoved = new EventEmitter<{ zoneId: string; points: Point[] }>();
  @Output() nodeClickForLine = new EventEmitter<string>();
  @Output() customNodeClick = new EventEmitter<CustomNode>();
  @Output() customZoneClick = new EventEmitter<CustomZone>();
  @Output() zonePointAdded = new EventEmitter<Point>();

  private map: L.Map | null = null;
  private imageOverlay: L.ImageOverlay | null = null;

  // Custom elements layer groups
  private customLineLayerGroup: L.LayerGroup = L.layerGroup();
  private customZoneLayerGroup: L.LayerGroup = L.layerGroup();
  private customNodeLayerGroup: L.LayerGroup = L.layerGroup();
  private zoneVertexLayerGroup: L.LayerGroup = L.layerGroup();
  private customNodeMarkers: Map<string, L.Marker> = new Map();
  private customZonePolygons: Map<string, L.Polygon> = new Map();
  private customLinePolylines: Map<string, L.Polyline> = new Map();
  private zoneVertexMarkers: Map<string, L.Marker[]> = new Map();

  // Robot markers layer group (above all other layers)
  private robotMarkersLayerGroup: L.LayerGroup = L.layerGroup();
  private robotMarkers: Map<string, L.Marker> = new Map();

  // Zone drawing state
  private tempZonePoints: L.LatLng[] = [];
  private tempZonePolyline: L.Polyline | null = null;
  private tempZoneMarkers: L.CircleMarker[] = [];
  private nodeCounter = 1;

  public isMapReady = signal(false);
  public isDrawingZone = signal(false);

  private get displaySettings(): DisplaySettings {
    return this.mapConfig?.displaySettings || DEFAULT_DISPLAY_SETTINGS;
  }

  constructor() {
    // React to robot position updates from SignalR
    effect(() => {
      const positions = this.robotRealtimeService.robotPositions();
      if (this.map && this.showRobots) {
        this.updateRobotMarkers(positions);
      }
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes['backgroundImageUrl'] || changes['imageWidth'] || changes['imageHeight']) {
      this.updateBackgroundImage();
    }

    if (changes['customNodes']) {
      this.updateCustomNodes();
      // Also update lines since they depend on node positions
      this.updateCustomLines();
    }

    if (changes['customZones']) {
      this.updateCustomZones();
    }

    if (changes['customLines']) {
      this.updateCustomLines();
    }

    if (changes['drawingMode'] || changes['lineStartNodeId']) {
      this.updateCursor();
      this.updateNodeHighlights();
    }

    // Clear robot markers when showRobots is turned off
    if (changes['showRobots'] && !this.showRobots) {
      this.clearRobotMarkers();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initializeMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    // Create map with simple coordinate system (no geographic projection)
    this.map = L.map(this.mapContainer.nativeElement, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 3,
      zoomControl: true,
      attributionControl: false
    });

    // Add click handler for drawing mode
    this.map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e));

    // Add layer groups (order matters for z-index)
    // Zones at bottom, then lines, then zone vertices, then nodes, then robots on top
    this.customZoneLayerGroup.addTo(this.map);
    this.customLineLayerGroup.addTo(this.map);
    this.zoneVertexLayerGroup.addTo(this.map);
    this.customNodeLayerGroup.addTo(this.map);
    this.robotMarkersLayerGroup.addTo(this.map);

    // Set initial view
    this.updateBackgroundImage();
    this.isMapReady.set(true);
  }

  private updateBackgroundImage(): void {
    if (!this.map) return;

    // Remove existing image overlay
    if (this.imageOverlay) {
      this.imageOverlay.remove();
      this.imageOverlay = null;
    }

    // Calculate bounds based on image dimensions
    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [this.imageHeight, this.imageWidth]
    ];

    // Only create image overlay if URL is valid (non-empty and starts with http)
    if (this.backgroundImageUrl &&
        this.backgroundImageUrl.trim() !== '' &&
        this.backgroundImageUrl.startsWith('http')) {
      this.imageOverlay = L.imageOverlay(this.backgroundImageUrl, bounds).addTo(this.map);
    }

    // Fit map to bounds
    this.map.fitBounds(bounds);

    // Set max bounds with more generous padding for panning
    // This allows panning beyond the image bounds
    this.map.setMaxBounds(L.latLngBounds(
      L.latLng(-this.imageHeight * 2, -this.imageWidth * 2),
      L.latLng(this.imageHeight * 3, this.imageWidth * 3)
    ));
  }

  // Public methods for external control
  public fitToContent(): void {
    if (!this.map) return;

    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [this.imageHeight, this.imageWidth]
    ];
    this.map.fitBounds(bounds);
  }

  public setZoom(level: number): void {
    if (this.map) {
      this.map.setZoom(level);
    }
  }

  /**
   * Fit the map view to show all robots currently on the map
   */
  public fitToRobots(): void {
    if (!this.map) return;

    const positions = this.robotRealtimeService.robotPositions();
    if (positions.size === 0) return;

    const bounds: L.LatLng[] = [];
    positions.forEach((robot, robotId) => {
      const pos = this.robotRealtimeService.getInterpolatedPosition(robotId);
      if (pos) {
        const scaledX = pos.x * this.coordinateScale;
        const scaledY = pos.y * this.coordinateScale;
        bounds.push(L.latLng(scaledY, scaledX));
      }
    });

    if (bounds.length > 0) {
      const latLngBounds = L.latLngBounds(bounds);
      // Add padding around the robots
      this.map.fitBounds(latLngBounds, { padding: [50, 50], maxZoom: 2 });
    }
  }

  /**
   * Pan to a specific robot
   */
  public panToRobot(robotId: string): void {
    if (!this.map) return;

    const pos = this.robotRealtimeService.getInterpolatedPosition(robotId);
    if (pos) {
      const scaledX = pos.x * this.coordinateScale;
      const scaledY = pos.y * this.coordinateScale;
      this.map.setView([scaledY, scaledX], 1);
    }
  }

  // ==================== Drawing Mode Methods ====================

  private onMapClick(e: L.LeafletMouseEvent): void {
    switch (this.drawingMode) {
      case 'addNode':
        this.addCustomNodeAtPoint(e.latlng);
        break;
      case 'drawZone':
        this.addZonePoint(e.latlng);
        break;
      // select and delete modes handle clicks on existing elements
    }
  }

  private addCustomNodeAtPoint(latlng: L.LatLng): void {
    const colorIndex = this.nodeCounter % CUSTOM_NODE_COLORS.length;
    const newNode: CustomNode = {
      id: this.generateUUID(),
      label: `Node ${this.nodeCounter}`,
      x: latlng.lng,  // In CRS.Simple, lng = x
      y: latlng.lat,  // In CRS.Simple, lat = y
      color: CUSTOM_NODE_COLORS[colorIndex]
    };

    this.nodeCounter++;
    this.nodeAdded.emit(newNode);
  }

  private addZonePoint(latlng: L.LatLng): void {
    this.tempZonePoints.push(latlng);
    this.isDrawingZone.set(true);

    // Add marker for the point
    const marker = L.circleMarker(latlng, {
      radius: 6,
      fillColor: '#ff9800',
      fillOpacity: 1,
      color: '#f57c00',
      weight: 2
    });
    marker.addTo(this.map!);
    this.tempZoneMarkers.push(marker);

    // Update polyline
    this.updateTempZonePolyline();

    // Emit point added event
    this.zonePointAdded.emit({ x: latlng.lng, y: latlng.lat });
  }

  private updateTempZonePolyline(): void {
    if (!this.map) return;

    // Remove existing polyline
    if (this.tempZonePolyline) {
      this.tempZonePolyline.remove();
    }

    if (this.tempZonePoints.length >= 2) {
      // Create polyline from points
      this.tempZonePolyline = L.polyline(this.tempZonePoints, {
        color: '#ff9800',
        weight: 2,
        dashArray: '5, 5'
      }).addTo(this.map);
    }
  }

  public finishZoneDrawing(): void {
    if (this.tempZonePoints.length < 3) {
      // Need at least 3 points for a polygon
      this.cancelZoneDrawing();
      return;
    }

    const points: Point[] = this.tempZonePoints.map(latlng => ({
      x: latlng.lng,
      y: latlng.lat
    }));

    const newZone: CustomZone = {
      id: this.generateUUID(),
      name: `Zone ${this.customZones.length + 1}`,
      color: '#4caf50',
      opacity: 0.3,
      points: points
    };

    this.zoneAdded.emit(newZone);
    this.clearTempZone();
  }

  public cancelZoneDrawing(): void {
    this.clearTempZone();
  }

  private clearTempZone(): void {
    // Remove temp markers
    this.tempZoneMarkers.forEach(marker => marker.remove());
    this.tempZoneMarkers = [];

    // Remove temp polyline
    if (this.tempZonePolyline) {
      this.tempZonePolyline.remove();
      this.tempZonePolyline = null;
    }

    // Clear points
    this.tempZonePoints = [];
    this.isDrawingZone.set(false);
  }

  private updateCustomNodes(): void {
    if (!this.map) return;

    // Clear existing custom node markers
    this.customNodeLayerGroup.clearLayers();
    this.customNodeMarkers.clear();

    // Draw custom nodes
    this.customNodes.forEach(node => this.drawCustomNode(node));
  }

  private drawCustomNode(node: CustomNode): void {
    const size = this.displaySettings.nodeSize + 8;
    const color = node.color || '#4a5db8';
    const isLineStart = this.lineStartNodeId === node.id;

    // Create a custom div icon for draggable marker
    const icon = L.divIcon({
      html: `
        <div class="custom-node-marker ${isLineStart ? 'line-start' : ''}" style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border-radius: 50%;
          border: 3px solid ${isLineStart ? '#ff9800' : '#fff'};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: ${this.drawingMode === 'select' ? 'move' : 'pointer'};
        ">
          <span style="color: white; font-size: ${size * 0.5}px; font-weight: bold;">
            ${node.label.substring(0, 2).toUpperCase()}
          </span>
        </div>
      `,
      className: 'custom-node-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });

    // Create draggable marker
    const marker = L.marker([node.y, node.x], {
      icon: icon,
      draggable: this.drawingMode === 'select'
    });

    marker.bindTooltip(node.label, {
      permanent: false,
      direction: 'top',
      offset: [0, -size / 2]
    });

    // Handle drag end - emit new position
    marker.on('dragend', (e: L.DragEndEvent) => {
      const newPos = marker.getLatLng();
      this.nodeMoved.emit({
        nodeId: node.id,
        x: newPos.lng,
        y: newPos.lat
      });
    });

    // Handle click based on drawing mode
    marker.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      if (this.drawingMode === 'delete') {
        this.nodeDeleted.emit(node.id);
      } else if (this.drawingMode === 'drawLine') {
        this.nodeClickForLine.emit(node.id);
      } else if (this.drawingMode === 'select') {
        this.customNodeClick.emit(node);
      } else if (this.drawingMode === 'placeRobot') {
        // Emit node click for robot placement
        this.customNodeClick.emit(node);
      }
    });

    marker.addTo(this.customNodeLayerGroup);
    this.customNodeMarkers.set(node.id, marker);
  }

  private updateCustomZones(): void {
    if (!this.map) return;

    // Clear existing custom zone polygons and vertex markers
    this.customZoneLayerGroup.clearLayers();
    this.customZonePolygons.clear();
    this.zoneVertexLayerGroup.clearLayers();
    this.zoneVertexMarkers.clear();

    // Draw custom zones
    this.customZones.forEach(zone => this.drawCustomZone(zone));
  }

  private drawCustomZone(zone: CustomZone): void {
    if (!zone.points || zone.points.length < 3) return;

    const color = zone.color || '#4caf50';
    const latLngs: L.LatLngExpression[] = zone.points.map(p => [p.y, p.x] as L.LatLngTuple);

    const polygon = L.polygon(latLngs, {
      fillColor: color,
      fillOpacity: zone.opacity,
      color: color,
      weight: 2
    });

    polygon.bindTooltip(zone.name, {
      permanent: false,
      direction: 'center'
    });

    // Handle click based on drawing mode
    polygon.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      if (this.drawingMode === 'delete') {
        this.zoneDeleted.emit(zone.id);
      } else if (this.drawingMode === 'select') {
        this.customZoneClick.emit(zone);
      }
    });

    polygon.addTo(this.customZoneLayerGroup);
    this.customZonePolygons.set(zone.id, polygon);

    // Add draggable vertex markers when in select mode
    if (this.drawingMode === 'select') {
      this.addZoneVertexMarkers(zone, polygon);
    }
  }

  private addZoneVertexMarkers(zone: CustomZone, polygon: L.Polygon): void {
    const vertexMarkers: L.Marker[] = [];
    const color = zone.color || '#4caf50';

    zone.points.forEach((point, index) => {
      // Create a custom div icon for the vertex marker
      const icon = L.divIcon({
        html: `
          <div class="zone-vertex-marker" style="
            width: 14px;
            height: 14px;
            background-color: ${color};
            border: 2px solid #fff;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: move;
          "></div>
        `,
        className: 'zone-vertex-icon',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([point.y, point.x], {
        icon: icon,
        draggable: true
      });

      // Handle drag - update polygon shape in real-time
      marker.on('drag', () => {
        const newLatLngs = vertexMarkers.map(m => m.getLatLng());
        polygon.setLatLngs(newLatLngs);
      });

      // Handle drag end - emit updated zone
      marker.on('dragend', () => {
        const newPoints: Point[] = vertexMarkers.map(m => {
          const pos = m.getLatLng();
          return { x: pos.lng, y: pos.lat };
        });
        this.zoneMoved.emit({ zoneId: zone.id, points: newPoints });
      });

      marker.addTo(this.zoneVertexLayerGroup);
      vertexMarkers.push(marker);
    });

    this.zoneVertexMarkers.set(zone.id, vertexMarkers);
  }

  private updateCustomLines(): void {
    if (!this.map) return;

    // Clear existing line polylines
    this.customLineLayerGroup.clearLayers();
    this.customLinePolylines.clear();

    // Draw custom lines
    this.customLines.forEach(line => this.drawCustomLine(line));
  }

  private drawCustomLine(line: CustomLine): void {
    // Find the nodes for this line
    const fromNode = this.customNodes.find(n => n.id === line.fromNodeId);
    const toNode = this.customNodes.find(n => n.id === line.toNodeId);

    if (!fromNode || !toNode) return;

    const color = line.color || '#666666';
    const weight = line.weight || 2;

    const polyline = L.polyline(
      [[fromNode.y, fromNode.x], [toNode.y, toNode.x]],
      {
        color: color,
        weight: weight,
        opacity: 0.8
      }
    );

    polyline.bindTooltip(`${fromNode.label} → ${toNode.label}`, {
      permanent: false,
      direction: 'center'
    });

    // Handle click for delete mode
    polyline.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      if (this.drawingMode === 'delete') {
        this.lineDeleted.emit(line.id);
      }
    });

    polyline.addTo(this.customLineLayerGroup);
    this.customLinePolylines.set(line.id, polyline);
  }

  private updateNodeHighlights(): void {
    // Re-render nodes to update highlight state and draggable property
    // Always update when drawingMode changes to ensure draggable state is correct
    this.updateCustomNodes();
    // Also update zones to show/hide vertex markers based on mode
    this.updateCustomZones();
  }

  private updateCursor(): void {
    if (!this.mapContainer?.nativeElement) return;

    const container = this.mapContainer.nativeElement;
    container.classList.remove('cursor-crosshair', 'cursor-pointer', 'cursor-not-allowed');

    switch (this.drawingMode) {
      case 'addNode':
      case 'drawZone':
        container.classList.add('cursor-crosshair');
        break;
      case 'drawLine':
        container.classList.add('cursor-pointer');
        break;
      case 'delete':
        container.classList.add('cursor-not-allowed');
        break;
      case 'select':
        container.classList.add('cursor-pointer');
        break;
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Public method to get drawing zone state
  public getIsDrawingZone(): boolean {
    return this.isDrawingZone();
  }

  // Public method to clear all custom elements from the map
  public clearCustomElements(): void {
    // Clear custom node markers
    this.customNodeMarkers.forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker);
      }
    });
    this.customNodeMarkers.clear();

    // Clear custom zone polygons
    this.customZonePolygons.forEach(polygon => {
      if (this.map) {
        this.map.removeLayer(polygon);
      }
    });
    this.customZonePolygons.clear();

    // Clear zone vertex markers
    this.zoneVertexMarkers.forEach(markers => {
      markers.forEach(marker => {
        if (this.map) {
          this.map.removeLayer(marker);
        }
      });
    });
    this.zoneVertexMarkers.clear();

    // Clear custom line polylines
    this.customLinePolylines.forEach(polyline => {
      if (this.map) {
        this.map.removeLayer(polyline);
      }
    });
    this.customLinePolylines.clear();

    // Cancel any active drawing
    this.cancelZoneDrawing();
  }

  // ==================== Robot Rendering Methods ====================

  /**
   * Update robot markers based on current positions from SignalR
   * Only shows robots that are in the placedRobotIds list
   */
  private updateRobotMarkers(positions: Map<string, AnimatedRobotState>): void {
    if (!this.map) return;

    // Only render robots that have been placed by the user
    positions.forEach((robot, robotId) => {
      // Skip robots that haven't been placed
      if (!this.placedRobotIds.has(robotId)) {
        // Remove marker if it exists but robot is no longer placed
        const existingMarker = this.robotMarkers.get(robotId);
        if (existingMarker) {
          existingMarker.remove();
          this.robotMarkers.delete(robotId);
        }
        return;
      }

      const interpolatedPos = this.robotRealtimeService.getInterpolatedPosition(robotId);
      if (!interpolatedPos) return;

      // Apply coordinate scaling
      const scaledX = interpolatedPos.x * this.coordinateScale;
      const scaledY = interpolatedPos.y * this.coordinateScale;

      let marker = this.robotMarkers.get(robotId);

      if (marker) {
        // Update existing marker position
        marker.setLatLng([scaledY, scaledX]);
        // Update icon if status changed
        marker.setIcon(this.createRobotIcon(robot, interpolatedPos.orientation));
        // Update tooltip content
        marker.setTooltipContent(this.createRobotTooltip(robot));
      } else {
        // Create new marker
        marker = L.marker([scaledY, scaledX], {
          icon: this.createRobotIcon(robot, interpolatedPos.orientation),
          zIndexOffset: 1000 // Above other markers
        });

        marker.bindTooltip(this.createRobotTooltip(robot), {
          permanent: false,
          direction: 'top',
          offset: [0, -25],
          className: 'robot-tooltip'
        });

        marker.addTo(this.robotMarkersLayerGroup);
        this.robotMarkers.set(robotId, marker);
      }
    });

    // Remove markers for robots no longer in the placed list
    this.robotMarkers.forEach((marker, robotId) => {
      if (!this.placedRobotIds.has(robotId)) {
        marker.remove();
        this.robotMarkers.delete(robotId);
      }
    });
  }

  /**
   * Create a custom div icon for robot marker
   */
  private createRobotIcon(robot: AnimatedRobotState, orientation: number): L.DivIcon {
    const statusColor = getRobotStatusColor(robot.robotStatus);
    const batteryColor = getBatteryColor(robot.batteryLevel, robot.batteryIsCharging);
    const size = 44;
    const batteryWidth = Math.max(4, robot.batteryLevel * 0.28);

    return L.divIcon({
      html: `
        <div class="robot-marker" style="
          width: ${size}px;
          height: ${size}px;
          position: relative;
          transform: rotate(${orientation}deg);
        ">
          <!-- Robot body -->
          <div style="
            width: 100%;
            height: 100%;
            background-color: ${statusColor};
            border-radius: 50%;
            border: 3px solid ${robot.connectionState === 1 ? '#fff' : '#666'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            <!-- Direction indicator (arrow) -->
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-bottom: 10px solid white;
              position: absolute;
              top: 4px;
            "></div>
            <!-- Robot ID (last 4 chars) -->
            <span style="
              color: white;
              font-size: 9px;
              font-weight: bold;
              margin-top: 6px;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            ">${robot.robotId.slice(-4)}</span>
          </div>
          <!-- Battery indicator -->
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%) rotate(-${orientation}deg);
            width: 28px;
            height: 8px;
            background-color: #333;
            border-radius: 2px;
            overflow: hidden;
            border: 1px solid #555;
          ">
            <div style="
              width: ${batteryWidth}px;
              height: 100%;
              background-color: ${batteryColor};
              transition: width 0.3s ease;
            "></div>
            ${robot.batteryIsCharging ? `
              <span style="
                position: absolute;
                top: -1px;
                left: 50%;
                transform: translateX(-50%);
                color: white;
                font-size: 7px;
              ">⚡</span>
            ` : ''}
          </div>
          <!-- Warning indicator -->
          ${robot.warningLevel > 0 ? `
            <div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 14px;
              height: 14px;
              background-color: ${robot.warningLevel === 2 ? '#f44336' : '#ff9800'};
              border-radius: 50%;
              border: 2px solid white;
              transform: rotate(-${orientation}deg);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              color: white;
              font-weight: bold;
            ">!</div>
          ` : ''}
        </div>
      `,
      className: 'robot-marker-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  /**
   * Create tooltip content for robot marker
   */
  private createRobotTooltip(robot: AnimatedRobotState): string {
    return `
      <div style="text-align: left; min-width: 120px;">
        <strong style="font-size: 12px;">${robot.robotId}</strong><br/>
        <span style="color: #666;">Status:</span> ${robot.robotStatusText}<br/>
        <span style="color: #666;">Battery:</span> ${robot.batteryLevel.toFixed(1)}%${robot.batteryIsCharging ? ' ⚡' : ''}<br/>
        <span style="color: #666;">Speed:</span> ${robot.velocity.toFixed(2)} m/s
        ${robot.robotTypeCode ? `<br/><span style="color: #666;">Type:</span> ${robot.robotTypeCode}` : ''}
      </div>
    `;
  }

  /**
   * Clear all robot markers from the map
   */
  public clearRobotMarkers(): void {
    this.robotMarkersLayerGroup.clearLayers();
    this.robotMarkers.clear();
  }

  /**
   * Public method to connect to real-time updates for a specific map
   */
  public connectToRealtime(mapCode?: string, floorNumber?: string): void {
    this.robotRealtimeService.connect(mapCode, floorNumber);
  }

  /**
   * Public method to disconnect from real-time updates
   */
  public disconnectFromRealtime(): void {
    this.robotRealtimeService.stopConnection();
    this.clearRobotMarkers();
  }
}
