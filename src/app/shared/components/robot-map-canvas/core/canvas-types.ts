/**
 * Canvas Types - Core interfaces for the custom map canvas
 */

import { CustomNode, CustomZone, CustomLine, Point } from '../../../../models/robot-monitoring.models';
import { AnimatedRobotState } from '../../../../models/robot-realtime.models';

// ============================================================================
// Viewport & Transform Types
// ============================================================================

export interface ViewportState {
  /** Current zoom scale (1 = 100%) */
  scale: number;
  /** Pan offset X in screen pixels */
  offsetX: number;
  /** Pan offset Y in screen pixels */
  offsetY: number;
  /** Minimum zoom level */
  minScale: number;
  /** Maximum zoom level */
  maxScale: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ============================================================================
// Hit Testing Types
// ============================================================================

export type HitTargetType = 'node' | 'zone' | 'line' | 'robot' | 'zone-vertex' | 'node-edge';

export interface HitTestResult {
  type: HitTargetType;
  id: string;
  element: CustomNode | CustomZone | CustomLine | AnimatedRobotState;
  /** For zone vertices, the index of the vertex */
  vertexIndex?: number;
  /** World coordinates of the hit point */
  worldPoint: Vec2;
}

// ============================================================================
// Selection Types
// ============================================================================

export interface Selection {
  nodes: Set<string>;
  zones: Set<string>;
  lines: Set<string>;
  robots: Set<string>;
}

export interface SelectionBox {
  startWorld: Vec2;
  endWorld: Vec2;
  isActive: boolean;
}

// ============================================================================
// Interaction Types
// ============================================================================

export type PointerButton = 'left' | 'middle' | 'right' | 'none';

export interface PointerState {
  /** Current screen position */
  screenPos: Vec2;
  /** Current world position */
  worldPos: Vec2;
  /** Button currently pressed */
  button: PointerButton;
  /** Is any button currently pressed */
  isDown: boolean;
  /** Is this a touch event */
  isTouch: boolean;
}

export interface DragState {
  isDragging: boolean;
  /** World position where drag started */
  startWorld: Vec2;
  /** Current world position */
  currentWorld: Vec2;
  /** What is being dragged */
  target: HitTestResult | null;
  /** Drag offset from element center */
  offset: Vec2;
}

export interface GestureState {
  /** Number of active touch points */
  touchCount: number;
  /** Is pinch gesture active */
  isPinching: boolean;
  /** Initial distance between two fingers */
  initialPinchDistance: number;
  /** Current distance between two fingers */
  currentPinchDistance: number;
  /** Center point of pinch gesture */
  pinchCenter: Vec2;
  /** Is panning with two fingers */
  isTwoFingerPan: boolean;
  /** Long press timer ID */
  longPressTimer: number | null;
  /** Long press detected */
  isLongPress: boolean;
}

// ============================================================================
// Animation Types
// ============================================================================

export interface SpringConfig {
  /** Spring stiffness (higher = faster) */
  stiffness: number;
  /** Damping ratio (higher = less bounce) */
  damping: number;
  /** Mass (higher = more inertia) */
  mass: number;
}

export interface AnimatedValue {
  current: number;
  target: number;
  velocity: number;
}

export interface AnimatedVec2 {
  x: AnimatedValue;
  y: AnimatedValue;
}

export interface ElementAnimationState {
  /** Scale factor (1 = normal, 1.1 = hover) */
  scale: AnimatedValue;
  /** Opacity (0-1) */
  opacity: AnimatedValue;
  /** Glow intensity (0-1) */
  glow: AnimatedValue;
  /** Position offset for drag lag effect */
  positionOffset: AnimatedVec2;
}

// ============================================================================
// Render State Types
// ============================================================================

export type ElementState = 'normal' | 'hovered' | 'selected' | 'dragging';

export interface NodeRenderState {
  node: CustomNode;
  state: ElementState;
  animation: ElementAnimationState;
  /** Is this node the start of a line being drawn */
  isLineStart: boolean;
}

export interface ZoneRenderState {
  zone: CustomZone;
  state: ElementState;
  animation: ElementAnimationState;
  /** Which vertex is being hovered (for resize handles) */
  hoveredVertex: number | null;
  /** Which vertex is being dragged */
  draggingVertex: number | null;
}

export interface LineRenderState {
  line: CustomLine;
  state: ElementState;
  animation: ElementAnimationState;
  /** Start node position */
  from: Vec2;
  /** End node position */
  to: Vec2;
}

export interface RobotRenderState {
  robot: AnimatedRobotState;
  state: ElementState;
  animation: ElementAnimationState;
  /** Pulse animation phase (0-1) */
  pulsePhase: number;
}

// ============================================================================
// Context Menu Types
// ============================================================================

export type ContextMenuTarget =
  | { type: 'node'; node: CustomNode }
  | { type: 'zone'; zone: CustomZone }
  | { type: 'line'; line: CustomLine }
  | { type: 'canvas'; worldPos: Vec2 };

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  divider?: boolean;
}

export interface ContextMenuState {
  isOpen: boolean;
  screenPos: Vec2;
  target: ContextMenuTarget | null;
  items: ContextMenuItem[];
}

// ============================================================================
// Command Types (for Undo/Redo)
// ============================================================================

export interface Command {
  execute(): void;
  undo(): void;
  readonly description: string;
  /** Can this command be merged with the next one of the same type? */
  canMerge?(other: Command): boolean;
  /** Merge with another command of the same type */
  merge?(other: Command): void;
}

// ============================================================================
// Canvas Engine Types
// ============================================================================

export interface CanvasSize {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  viewport: ViewportState;
  canvasSize: CanvasSize;
  timestamp: number;
  deltaTime: number;
}

export interface CanvasConfig {
  /** Enable debug rendering (bounding boxes, etc.) */
  debug: boolean;
  /** Background color when no image is set */
  backgroundColor: string;
  /** Show dot grid when no background image */
  showGrid: boolean;
}

// ============================================================================
// Drawing State Types
// ============================================================================

export type DrawingTool = 'none' | 'zone';

export interface DrawingState {
  /** Current tool selected */
  tool: DrawingTool;
  /** Points collected for zone drawing */
  zonePoints: Point[];
  /** Is currently drawing a line (from a node edge) */
  isDrawingLine: boolean;
  /** Node ID where line drawing started */
  lineStartNodeId: string | null;
  /** Current mouse position for preview */
  previewPoint: Vec2 | null;
}

// ============================================================================
// Event Types (emitted to parent)
// ============================================================================

export interface CanvasNodeEvent {
  type: 'add' | 'move' | 'delete' | 'edit';
  node: CustomNode;
  previousPosition?: Vec2;
}

export interface CanvasZoneEvent {
  type: 'add' | 'move' | 'delete' | 'edit' | 'vertex-move';
  zone: CustomZone;
  vertexIndex?: number;
  previousPoints?: Point[];
}

export interface CanvasLineEvent {
  type: 'add' | 'delete' | 'edit';
  line: CustomLine;
}

export interface CanvasSelectionEvent {
  selection: Selection;
}

// ============================================================================
// Snap Guide Types (for alignment during drag)
// ============================================================================

export type SnapGuideType = 'horizontal' | 'vertical' | 'diagonal';

export interface SnapGuideHorizontal {
  type: 'horizontal';
  y: number;
  x1: number;
  x2: number;
}

export interface SnapGuideVertical {
  type: 'vertical';
  x: number;
  y1: number;
  y2: number;
}

export interface SnapGuideDiagonal {
  type: 'diagonal';
  from: Vec2;
  to: Vec2;
}

export type SnapGuide = SnapGuideHorizontal | SnapGuideVertical | SnapGuideDiagonal;

export interface SnapResult {
  snappedPos: Vec2;
  guides: SnapGuide[];
}
