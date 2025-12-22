/**
 * Robot Map Canvas V2 Component - Custom HTML5 Canvas with direct manipulation
 *
 * This component replaces the Leaflet-based implementation with a custom
 * canvas solution featuring spring animations, touch gestures, and undo/redo.
 */

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
  inject,
  effect,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Models
import {
  RobotMonitoringMap,
  CustomNode,
  CustomZone,
  CustomLine,
  Point
} from '../../../models/robot-monitoring.models';
import { AnimatedRobotState } from '../../../models/robot-realtime.models';

// Services
import { RobotRealtimeSignalRService } from '../../../services/robot-realtime-signalr.service';
import { CanvasEngineService } from './core/canvas-engine.service';
import { AnimationEngineService } from './animation/animation-engine.service';
import { ViewportService } from './services/viewport.service';
import { HitTestService } from './services/hit-test.service';
import { InteractionService } from './services/interaction.service';
import { GestureRecognizerService } from './services/gesture-recognizer.service';
import { SelectionManagerService } from './services/selection-manager.service';
import { CommandManagerService } from './commands/command-manager.service';
import { SnapService } from './services/snap.service';

// Renderers
import { BackgroundRenderer } from './renderers/background-renderer';
import { NodeRenderer, NodeRenderData } from './renderers/node-renderer';
import { ZoneRenderer, ZoneRenderData } from './renderers/zone-renderer';
import { LineRenderer, LineRenderData } from './renderers/line-renderer';
import { RobotRenderer, RobotRenderData } from './renderers/robot-renderer';
import { SelectionRenderer } from './renderers/selection-renderer';

// Commands
import { DeleteNodeCommand, MoveNodeCommand, AddZoneCommand, AddLineCommand } from './commands/base-command';

// Components
import { CanvasContextMenuComponent } from './context-menu/context-menu.component';

// Types
import { RenderContext, Selection, Vec2, ElementState, ContextMenuTarget, SnapGuide } from './core/canvas-types';
import { ZONE_COLORS, DEFAULT_ZONE_OPACITY } from './core/constants';

@Component({
  selector: 'app-robot-map-canvas-v2',
  standalone: true,
  imports: [CommonModule, CanvasContextMenuComponent],
  providers: [
    CanvasEngineService,
    AnimationEngineService,
    ViewportService,
    HitTestService,
    InteractionService,
    GestureRecognizerService,
    SelectionManagerService,
    CommandManagerService,
    SnapService
  ],
  template: `
    <div class="canvas-container" #container>
      <canvas #canvas></canvas>

      @if (isLoading()) {
        <div class="loading-overlay">
          <div class="spinner"></div>
        </div>
      }

      <app-canvas-context-menu
        [state]="selectionManager.contextMenu()"
        (itemClick)="onContextMenuItemClick($event)"
        (close)="selectionManager.closeContextMenu()">
      </app-canvas-context-menu>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .canvas-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: default;
    }

    canvas.grabbing { cursor: grabbing; }
    canvas.grab { cursor: grab; }
    canvas.crosshair { cursor: crosshair; }
    canvas.pointer { cursor: pointer; }
    canvas.move { cursor: move; }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e0e0e0;
      border-top-color: #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class RobotMapCanvasV2Component implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  // Injected services
  private robotRealtimeService = inject(RobotRealtimeSignalRService);
  private canvasEngine = inject(CanvasEngineService);
  private animationEngine = inject(AnimationEngineService);
  private viewportService = inject(ViewportService);
  private hitTestService = inject(HitTestService);
  private interactionService = inject(InteractionService);
  private gestureRecognizer = inject(GestureRecognizerService);
  public selectionManager = inject(SelectionManagerService);
  public commandManager = inject(CommandManagerService);
  private snapService = inject(SnapService);

  // Inputs
  @Input() mapConfig: RobotMonitoringMap | null = null;
  @Input() backgroundImageUrl: string | null = null;
  @Input() imageWidth = 1000;
  @Input() imageHeight = 800;
  @Input() showRobots = false;
  @Input() placedRobotIds: Map<string, { nodeId: string; nodeLabel: string; x: number; y: number }> = new Map();
  @Input() coordinateScale = 1;
  @Input() isDrawingZone = false;
  @Input() isDrawingRect = false;
  @Input() isConnectingNodes = false;

  // Data inputs (two-way binding via signals)
  @Input() set customNodes(value: CustomNode[]) { this._customNodes.set(value); }
  @Input() set customZones(value: CustomZone[]) { this._customZones.set(value); }
  @Input() set customLines(value: CustomLine[]) { this._customLines.set(value); }

  // Outputs
  @Output() nodesChange = new EventEmitter<CustomNode[]>();
  @Output() zonesChange = new EventEmitter<CustomZone[]>();
  @Output() linesChange = new EventEmitter<CustomLine[]>();
  @Output() selectionChange = new EventEmitter<Selection>();

  // Internal state signals
  public _customNodes = signal<CustomNode[]>([]);
  public _customZones = signal<CustomZone[]>([]);
  public _customLines = signal<CustomLine[]>([]);
  public isLoading = signal(false);
  public snapGuides = signal<SnapGuide[]>([]);

  // Zone drawing state
  private tempZonePoints: Point[] = [];

  // Rectangle drawing state
  private rectDrawStart: Vec2 | null = null;
  private rectDrawCurrent: Vec2 | null = null;

  // Line drawing state (connecting nodes)
  private connectingFromNodeId: string | null = null;

  // Robot status tracking for animation triggers
  private previousRobotStatuses = new Map<string, number>();

  // Renderers
  private backgroundRenderer = new BackgroundRenderer();
  private nodeRenderer!: NodeRenderer;
  private zoneRenderer!: ZoneRenderer;
  private lineRenderer!: LineRenderer;
  private robotRenderer!: RobotRenderer;
  private selectionRenderer = new SelectionRenderer();

  private resizeObserver?: ResizeObserver;

  constructor() {
    // React to robot position updates and detect status changes
    effect(() => {
      const positions = this.robotRealtimeService.robotPositions();
      if (this.showRobots) {
        // Check for status changes and trigger pulse animations
        positions.forEach((robot, robotId) => {
          const previousStatus = this.previousRobotStatuses.get(robotId);
          if (previousStatus !== undefined && previousStatus !== robot.robotStatus) {
            // Status changed - trigger pulse animation
            this.animationEngine.triggerStatusChange(robotId, robot.robotStatus);
          }
          this.previousRobotStatuses.set(robotId, robot.robotStatus);
        });

        this.canvasEngine.requestRender();
      }
    });

    // React to selection changes
    effect(() => {
      const selection = this.selectionManager.selection();
      this.selectionChange.emit(selection);
    });

    // React to data changes for output
    effect(() => {
      this.nodesChange.emit(this._customNodes());
    });
    effect(() => {
      this.zonesChange.emit(this._customZones());
    });
    effect(() => {
      this.linesChange.emit(this._customLines());
    });
  }

  ngOnInit(): void {
    this.nodeRenderer = new NodeRenderer(this.animationEngine);
    this.zoneRenderer = new ZoneRenderer(this.animationEngine);
    this.lineRenderer = new LineRenderer(this.animationEngine);
    this.robotRenderer = new RobotRenderer(this.animationEngine);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;

    // Initialize services
    this.canvasEngine.initialize(canvas);
    this.interactionService.initialize(canvas);
    this.gestureRecognizer.initialize(canvas);
    this.viewportService.setCanvasSize(canvas.clientWidth, canvas.clientHeight);

    // Register render callback
    this.canvasEngine.addRenderCallback(this.render.bind(this));

    // Subscribe to interaction events
    this.setupInteractionHandlers();

    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.canvasEngine.updateCanvasSize();
      this.viewportService.setCanvasSize(canvas.clientWidth, canvas.clientHeight);
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);

    // Load background if provided
    if (this.backgroundImageUrl) {
      this.loadBackgroundImage();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['backgroundImageUrl'] || changes['imageWidth'] || changes['imageHeight']) {
      this.loadBackgroundImage();
    }

    if (changes['customNodes'] || changes['customZones'] || changes['customLines'] || changes['placedRobotIds']) {
      this.updateHitTestData();
    }

    // Clear connecting state when exiting connect mode
    if (changes['isConnectingNodes'] && !this.isConnectingNodes) {
      this.connectingFromNodeId = null;
    }
  }

  ngOnDestroy(): void {
    this.canvasEngine.destroy();
    this.interactionService.destroy();
    this.resizeObserver?.disconnect();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Undo/Redo
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.commandManager.redo();
      } else {
        this.commandManager.undo();
      }
    }

    // Delete selected
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.deleteSelected();
    }

    // Escape - cancel current operation
    if (event.key === 'Escape') {
      // Clear connecting node state
      if (this.connectingFromNodeId) {
        this.connectingFromNodeId = null;
      }
      // Clear zone drawing
      if (this.tempZonePoints.length > 0) {
        this.tempZonePoints = [];
      }
    }
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  undo(): void {
    this.commandManager.undo();
  }

  redo(): void {
    this.commandManager.redo();
  }

  fitToContent(): void {
    const bounds = this.hitTestService.getBounds([
      ...this._customNodes().map(n => ({ x: n.x, y: n.y })),
      ...this._customZones().flatMap(z => z.points)
    ]);
    if (bounds) {
      this.viewportService.fitToBounds(bounds);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async loadBackgroundImage(): Promise<void> {
    if (this.backgroundImageUrl) {
      this.isLoading.set(true);
      try {
        await this.backgroundRenderer.setImage(
          this.backgroundImageUrl,
          this.imageWidth,
          this.imageHeight
        );
      } catch (error) {
        console.error('Failed to load background image:', error);
      }
      this.isLoading.set(false);
    } else {
      this.backgroundRenderer.clearImage();
    }
  }

  private updateHitTestData(): void {
    this.hitTestService.setData(
      this._customNodes(),
      this._customZones(),
      this._customLines(),
      this.robotRealtimeService.robotPositions(),
      this.placedRobotIds
    );
  }

  private setupInteractionHandlers(): void {
    // Click handler
    this.interactionService.onClick.subscribe(event => {
      if (this.isDrawingZone) {
        this.addZonePoint(event.worldPos);
        return;
      }

      const hit = this.hitTestService.hitTest(event.worldPos.x, event.worldPos.y);

      // Check if we're in connect mode (toolbar button)
      if (this.isConnectingNodes) {
        if (hit && (hit.type === 'node' || hit.type === 'node-edge')) {
          if (this.connectingFromNodeId) {
            // Create line from previous node to this one
            this.createLineBetweenNodes(this.connectingFromNodeId, hit.id);
            // Set this node as the new "from" node for chaining
            this.connectingFromNodeId = hit.id;
          } else {
            // First node - set as "from" node
            this.connectingFromNodeId = hit.id;
          }
          this.animationEngine.setSelected(hit.id, true);
        }
        // Don't clear mode on empty click - let user continue
        return;
      }

      // Check if we're in one-time connecting mode (from right-click "Connect to...")
      if (this.connectingFromNodeId) {
        if (hit && (hit.type === 'node' || hit.type === 'node-edge')) {
          // Clicked on a node - create the line
          this.createLineBetweenNodes(this.connectingFromNodeId, hit.id);
        }
        // Clear connecting mode (one-time mode)
        this.connectingFromNodeId = null;
        return;
      }

      if (hit) {
        if (event.shiftKey) {
          this.selectionManager.toggleSelection(hit);
        } else {
          this.selectionManager.select(hit);
        }
        this.animationEngine.setSelected(hit.id, true);
      } else {
        this.selectionManager.clearSelection();
      }
    });

    // Double-click handler - only used for finishing zone drawing
    this.interactionService.onDoubleClick.subscribe(event => {
      if (this.isDrawingZone) {
        this.finishZoneDrawing();
      }
      // Nodes are placed from the toolbar dropdown, not by double-clicking
    });

    // Right-click handler
    this.interactionService.onRightClick.subscribe(event => {
      const hit = this.hitTestService.hitTest(event.worldPos.x, event.worldPos.y);
      let target: ContextMenuTarget;

      if (hit) {
        switch (hit.type) {
          case 'node':
          case 'node-edge':
            target = { type: 'node', node: hit.element as CustomNode };
            break;
          case 'zone':
          case 'zone-vertex':
            target = { type: 'zone', zone: hit.element as CustomZone };
            break;
          case 'line':
            target = { type: 'line', line: hit.element as CustomLine };
            break;
          default:
            target = { type: 'canvas', worldPos: event.worldPos };
        }
      } else {
        target = { type: 'canvas', worldPos: event.worldPos };
      }

      this.selectionManager.openContextMenu(event.screenPos, target);
    });

    // Hover handler
    this.interactionService.onHoverChange.subscribe(hit => {
      // Update cursor
      const canvas = this.canvasRef.nativeElement;
      canvas.className = hit ? 'pointer' : '';

      // Update hover animation
      this._customNodes().forEach(n => {
        this.animationEngine.setHovered(n.id, hit?.id === n.id);
      });
      this._customZones().forEach(z => {
        this.animationEngine.setHovered(z.id, hit?.id === z.id);
      });
    });

    // Drag handlers - real-time position update with snapping
    this.interactionService.onDragStart.subscribe(event => {
      // Start rectangle drawing when in rect mode and clicking empty space
      if (this.isDrawingRect && !event.target) {
        this.rectDrawStart = event.startWorld;
        this.rectDrawCurrent = event.startWorld;
      }
    });

    this.interactionService.onDrag.subscribe(event => {
      // Handle rectangle drawing preview
      if (this.isDrawingRect && this.rectDrawStart) {
        this.rectDrawCurrent = event.currentWorld;
        return;
      }

      if (event.target?.type === 'node') {
        const node = event.target.element as CustomNode;
        const dragOffset = this.interactionService.dragState().offset;

        // Calculate raw position
        let newX = event.currentWorld.x - dragOffset.x;
        let newY = event.currentWorld.y - dragOffset.y;

        // Apply smart snapping to align with other nodes
        const snap = this.snapService.calculateSnap(
          { x: newX, y: newY },
          this._customNodes(),
          node.id
        );
        newX = snap.snappedPos.x;
        newY = snap.snappedPos.y;
        this.snapGuides.set(snap.guides);

        // Update node position in real-time
        this._customNodes.update(nodes =>
          nodes.map(n => n.id === node.id ? { ...n, x: newX, y: newY } : n)
        );
      }
    });

    this.interactionService.onDragEnd.subscribe(event => {
      // Clear snap guides when drag ends
      this.snapGuides.set([]);

      // Handle rectangle drawing completion
      if (this.isDrawingRect && this.rectDrawStart && this.rectDrawCurrent) {
        this.createRectangleZone(this.rectDrawStart, this.rectDrawCurrent);
        this.rectDrawStart = null;
        this.rectDrawCurrent = null;
        return;
      }

      if (event.target?.type === 'node') {
        const nodeId = event.target.id;
        // Get the current node position (already snapped from onDrag)
        const currentNode = this._customNodes().find(n => n.id === nodeId);
        if (!currentNode) return;

        // Calculate original position before drag started
        const originalNode = event.target.element as CustomNode;
        const previousX = originalNode.x;
        const previousY = originalNode.y;

        // Use current (snapped) position, not raw event coordinates
        const cmd = new MoveNodeCommand(
          this._customNodes,
          nodeId,
          previousX,
          previousY,
          currentNode.x,
          currentNode.y
        );
        this.commandManager.execute(cmd);
      }
    });

    // Long press handler (context menu on touch)
    this.gestureRecognizer.onLongPress.subscribe(event => {
      const hit = this.hitTestService.hitTest(event.worldPos.x, event.worldPos.y);
      let target: ContextMenuTarget;

      if (hit) {
        switch (hit.type) {
          case 'node':
          case 'node-edge':
            target = { type: 'node', node: hit.element as CustomNode };
            break;
          case 'zone':
          case 'zone-vertex':
            target = { type: 'zone', zone: hit.element as CustomZone };
            break;
          case 'line':
            target = { type: 'line', line: hit.element as CustomLine };
            break;
          default:
            target = { type: 'canvas', worldPos: event.worldPos };
        }
      } else {
        target = { type: 'canvas', worldPos: event.worldPos };
      }

      this.selectionManager.openContextMenu(event.screenPos, target);
    });

    // Double-tap handler - nodes are placed from toolbar dropdown only
    this.gestureRecognizer.onDoubleTap.subscribe(event => {
      // No action - nodes should only be placed from toolbar dropdown
    });
  }

  private addZonePoint(worldPos: Vec2): void {
    this.tempZonePoints.push({ x: worldPos.x, y: worldPos.y });
  }

  private finishZoneDrawing(): void {
    if (this.tempZonePoints.length >= 3) {
      const zone: CustomZone = {
        id: crypto.randomUUID(),
        name: `Zone ${this._customZones().length + 1}`,
        color: ZONE_COLORS[this._customZones().length % ZONE_COLORS.length].color,
        opacity: DEFAULT_ZONE_OPACITY,
        points: [...this.tempZonePoints]
      };

      const cmd = new AddZoneCommand(this._customZones, zone);
      this.commandManager.execute(cmd);
      this.animationEngine.animateAppear(zone.id);
    }
    this.tempZonePoints = [];
  }

  private createRectangleZone(start: Vec2, end: Vec2): void {
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);

    // Minimum size check
    if (maxX - minX < 20 || maxY - minY < 20) return;

    // Create 4-point polygon from rectangle
    const zone: CustomZone = {
      id: crypto.randomUUID(),
      name: `Zone ${this._customZones().length + 1}`,
      color: ZONE_COLORS[this._customZones().length % ZONE_COLORS.length].color,
      opacity: DEFAULT_ZONE_OPACITY,
      points: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ]
    };

    const cmd = new AddZoneCommand(this._customZones, zone);
    this.commandManager.execute(cmd);
    this.animationEngine.animateAppear(zone.id);
  }

  private createLineBetweenNodes(fromNodeId: string, toNodeId: string): void {
    // Don't create line to same node
    if (fromNodeId === toNodeId) return;

    // Check if line already exists between these nodes
    const existingLine = this._customLines().find(
      l => (l.fromNodeId === fromNodeId && l.toNodeId === toNodeId) ||
           (l.fromNodeId === toNodeId && l.toNodeId === fromNodeId)
    );
    if (existingLine) return;

    const line: CustomLine = {
      id: crypto.randomUUID(),
      fromNodeId,
      toNodeId,
      color: '#666666'
    };

    const cmd = new AddLineCommand(this._customLines, line);
    this.commandManager.execute(cmd);
    this.animationEngine.animateAppear(line.id);
  }

  private startConnectingFromNode(nodeId: string): void {
    this.connectingFromNodeId = nodeId;
    // Highlight the source node
    this.animationEngine.setSelected(nodeId, true);
  }

  private deleteSelected(): void {
    const selection = this.selectionManager.selection();
    selection.nodes.forEach(id => {
      const cmd = new DeleteNodeCommand(this._customNodes, this._customLines, id);
      this.commandManager.execute(cmd);
    });
    this.selectionManager.clearSelection();
  }

  onContextMenuItemClick(item: any): void {
    const target = this.selectionManager.contextMenu().target;
    if (!target) return;

    switch (item.id) {
      case 'connect':
        if (target.type === 'node') {
          this.startConnectingFromNode(target.node.id);
        }
        break;
      case 'delete':
        if (target.type === 'node') {
          const cmd = new DeleteNodeCommand(this._customNodes, this._customLines, target.node.id);
          this.commandManager.execute(cmd);
        }
        break;
    }
  }

  // ============================================================================
  // Render Method
  // ============================================================================

  private render(context: RenderContext): void {
    const { ctx, viewport } = context;
    const nodes = this._customNodes();
    const zones = this._customZones();
    const lines = this._customLines();
    const selection = this.selectionManager.selection();
    const hoveredElement = this.interactionService.hoveredElement();

    // Update hit test data
    this.updateHitTestData();

    // 1. Background
    this.backgroundRenderer.render(context, true);

    // 2. Zones
    const zoneRenderData: ZoneRenderData[] = zones.map(zone => ({
      zone,
      state: this.getElementState(zone.id, selection.zones.has(zone.id), hoveredElement?.id === zone.id),
      hoveredVertex: null,
      draggingVertex: null
    }));
    this.zoneRenderer.render(context, zoneRenderData);

    // Temp zone while drawing polygon
    if (this.tempZonePoints.length > 0) {
      const pointerPos = this.interactionService.pointerState().worldPos;
      this.zoneRenderer.renderTempZone(ctx, this.tempZonePoints, pointerPos);
    }

    // Rectangle preview while drawing
    if (this.rectDrawStart && this.rectDrawCurrent) {
      this.zoneRenderer.renderRectPreview(ctx, this.rectDrawStart, this.rectDrawCurrent);
    }

    // 3. Lines
    const lineRenderData: LineRenderData[] = lines.map(line => {
      const fromNode = nodes.find(n => n.id === line.fromNodeId);
      const toNode = nodes.find(n => n.id === line.toNodeId);
      return {
        line,
        from: fromNode ? { x: fromNode.x, y: fromNode.y } : { x: 0, y: 0 },
        to: toNode ? { x: toNode.x, y: toNode.y } : { x: 0, y: 0 },
        state: this.getElementState(line.id, selection.lines.has(line.id), hoveredElement?.id === line.id)
      };
    });
    this.lineRenderer.render(context, lineRenderData);

    // 4. Nodes
    const nodeRenderData: NodeRenderData[] = nodes.map(node => ({
      node,
      state: this.getElementState(node.id, selection.nodes.has(node.id), hoveredElement?.id === node.id),
      isLineStart: node.id === this.connectingFromNodeId
    }));
    this.nodeRenderer.render(context, nodeRenderData);

    // 5. Robots - using real-time interpolated positions from SignalR
    if (this.showRobots) {
      const robotPositions = this.robotRealtimeService.robotPositions();
      const robotRenderData: RobotRenderData[] = [];

      robotPositions.forEach((robot, robotId) => {
        // Get interpolated position for smooth movement
        const interpolated = this.robotRealtimeService.getInterpolatedPosition(robotId);
        if (interpolated) {
          // Apply coordinate scale (convert from robot coordinates to canvas coordinates)
          const scaledX = interpolated.x * this.coordinateScale;
          const scaledY = interpolated.y * this.coordinateScale;

          robotRenderData.push({
            robot,
            position: { x: scaledX, y: scaledY },
            orientation: interpolated.orientation,
            state: selection.robots.has(robotId) ? 'selected' :
                   hoveredElement?.id === robotId ? 'hovered' : 'normal'
          });
        }
      });

      this.robotRenderer.render(context, robotRenderData);
    }

    // 6. Selection box
    this.selectionRenderer.renderSelectionBox(context, this.selectionManager.selectionBox());

    // 7. Snap guides (shown during node dragging)
    this.selectionRenderer.renderSnapGuides(context, this.snapGuides());
  }

  private getElementState(id: string, isSelected: boolean, isHovered: boolean): ElementState {
    if (this.interactionService.dragState().target?.id === id) return 'dragging';
    if (isSelected) return 'selected';
    if (isHovered) return 'hovered';
    return 'normal';
  }
}
