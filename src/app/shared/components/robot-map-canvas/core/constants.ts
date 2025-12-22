/**
 * Canvas Constants - Colors, sizes, spring configurations
 */

import { SpringConfig, CanvasConfig } from './canvas-types';

// ============================================================================
// Spring Configurations
// ============================================================================

/** Default spring for general animations */
export const SPRING_DEFAULT: SpringConfig = {
  stiffness: 170,
  damping: 26,
  mass: 1
};

/** Snappy spring for quick responses (hover effects) */
export const SPRING_SNAPPY: SpringConfig = {
  stiffness: 300,
  damping: 30,
  mass: 1
};

/** Bouncy spring for playful effects (add/delete) */
export const SPRING_BOUNCY: SpringConfig = {
  stiffness: 200,
  damping: 15,
  mass: 1
};

/** Gentle spring for smooth transitions (zoom, pan) */
export const SPRING_GENTLE: SpringConfig = {
  stiffness: 100,
  damping: 20,
  mass: 1
};

/** Stiff spring for drag following */
export const SPRING_DRAG: SpringConfig = {
  stiffness: 400,
  damping: 35,
  mass: 1
};

// ============================================================================
// Animation Values
// ============================================================================

/** Threshold below which spring animation is considered complete */
export const SPRING_REST_THRESHOLD = 0.001;

/** Hover scale multiplier */
export const HOVER_SCALE = 1.1;

/** Selected scale multiplier */
export const SELECTED_SCALE = 1.05;

/** Glow intensity on hover (0-1) */
export const HOVER_GLOW_INTENSITY = 0.6;

/** Glow intensity on selection (0-1) */
export const SELECTED_GLOW_INTENSITY = 0.8;

/** Fade out duration for delete animation (ms) */
export const DELETE_ANIMATION_DURATION = 200;

/** Pop in duration for add animation (ms) */
export const ADD_ANIMATION_DURATION = 300;

// ============================================================================
// Interaction Constants
// ============================================================================

/** Minimum pixels to move before starting a drag */
export const DRAG_THRESHOLD = 5;

/** Time to wait before triggering long press (ms) */
export const LONG_PRESS_DURATION = 500;

/** Time window for double-click detection (ms) */
export const DOUBLE_CLICK_DELAY = 300;

/** Tap tolerance in pixels (for touch) */
export const TAP_TOLERANCE = 10;

/** Momentum friction coefficient (0-1, higher = more friction) */
export const MOMENTUM_FRICTION = 0.92;

/** Minimum velocity to continue momentum (pixels/second) */
export const MOMENTUM_MIN_VELOCITY = 10;

// ============================================================================
// Viewport Constants
// ============================================================================

/** Default zoom level */
export const DEFAULT_ZOOM = 1;

/** Minimum zoom level */
export const MIN_ZOOM = 0.1;

/** Maximum zoom level */
export const MAX_ZOOM = 5;

/** Zoom step per scroll wheel tick */
export const ZOOM_STEP = 0.1;

/** Padding when fitting to content (pixels) */
export const FIT_PADDING = 50;

// ============================================================================
// Element Sizes
// ============================================================================

/** Node circle radius in world units */
export const NODE_RADIUS = 16;

/** Node circle radius when hovered */
export const NODE_RADIUS_HOVER = NODE_RADIUS * HOVER_SCALE;

/** Line hit detection tolerance (pixels) */
export const LINE_HIT_TOLERANCE = 8;

/** Zone vertex handle radius */
export const ZONE_VERTEX_RADIUS = 6;

/** Robot icon size */
export const ROBOT_SIZE = 44;

/** Selection box handle size */
export const SELECTION_HANDLE_SIZE = 8;

// ============================================================================
// Colors
// ============================================================================

/** Primary selection color */
export const COLOR_SELECTION = '#2196f3';

/** Selection glow color */
export const COLOR_SELECTION_GLOW = 'rgba(33, 150, 243, 0.4)';

/** Hover highlight color */
export const COLOR_HOVER = '#42a5f5';

/** Hover glow color */
export const COLOR_HOVER_GLOW = 'rgba(66, 165, 245, 0.3)';

/** Grid dot color */
export const COLOR_GRID = '#e0e0e0';

/** Grid background color */
export const COLOR_BACKGROUND = '#fafafa';

/** Line preview color (during drawing) */
export const COLOR_LINE_PREVIEW = '#90caf9';

/** Zone preview color (during drawing) */
export const COLOR_ZONE_PREVIEW = 'rgba(33, 150, 243, 0.2)';

/** Error/warning color */
export const COLOR_ERROR = '#f44336';

/** Success color */
export const COLOR_SUCCESS = '#4caf50';

/** Default node colors (cycle through these) */
export const NODE_COLORS = [
  '#3f51b5',  // Indigo
  '#f44336',  // Red
  '#4caf50',  // Green
  '#ff9800',  // Orange
  '#9c27b0',  // Purple
  '#00bcd4',  // Cyan
  '#795548',  // Brown
  '#607d8b'   // Blue Grey
];

/** Default zone colors with names */
export const ZONE_COLORS = [
  { color: '#3f51b5', name: 'Indigo' },
  { color: '#f44336', name: 'Red' },
  { color: '#4caf50', name: 'Green' },
  { color: '#ff9800', name: 'Orange' },
  { color: '#9c27b0', name: 'Purple' },
  { color: '#00bcd4', name: 'Cyan' },
  { color: '#795548', name: 'Brown' },
  { color: '#607d8b', name: 'Blue Grey' }
];

/** Default zone opacity */
export const DEFAULT_ZONE_OPACITY = 0.3;

/** Default line color */
export const DEFAULT_LINE_COLOR = '#666666';

/** Default line weight */
export const DEFAULT_LINE_WEIGHT = 2;

// ============================================================================
// Robot Status Colors
// ============================================================================

export const ROBOT_STATUS_COLORS: Record<number, string> = {
  0: '#9e9e9e',  // Unknown - Grey
  1: '#ff9800',  // Departure - Orange
  2: '#9e9e9e',  // Offline - Grey
  3: '#4caf50',  // Idle - Green
  4: '#2196f3',  // Executing - Blue
  5: '#ffeb3b',  // Charging - Yellow
  6: '#9c27b0',  // Updating - Purple
  7: '#f44336'   // Abnormal - Red
};

// ============================================================================
// Canvas Configuration
// ============================================================================

/** Default canvas configuration */
export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  debug: false,
  backgroundColor: COLOR_BACKGROUND,
  showGrid: true
};

/** Grid spacing in world units */
export const GRID_SPACING = 20;

/** Grid dot radius */
export const GRID_DOT_RADIUS = 1;

// ============================================================================
// Z-Index Layers (render order)
// ============================================================================

export const Z_INDEX = {
  BACKGROUND: 0,
  ZONES: 1,
  LINES: 2,
  NODES: 3,
  ROBOTS: 4,
  SELECTION: 5,
  PREVIEW: 6,
  UI: 7
} as const;

// ============================================================================
// Undo/Redo
// ============================================================================

/** Maximum number of undo steps to keep */
export const MAX_UNDO_STACK_SIZE = 50;

/** Time window for merging rapid similar commands (ms) */
export const COMMAND_MERGE_WINDOW = 500;

// ============================================================================
// Touch Gestures
// ============================================================================

/** Minimum distance change to trigger pinch zoom */
export const PINCH_THRESHOLD = 10;

/** Minimum movement to trigger two-finger pan */
export const TWO_FINGER_PAN_THRESHOLD = 5;

// ============================================================================
// Performance
// ============================================================================

/** Target frame rate */
export const TARGET_FPS = 60;

/** Frame budget in milliseconds */
export const FRAME_BUDGET_MS = 1000 / TARGET_FPS;

/** Maximum elements before enabling spatial indexing */
export const SPATIAL_INDEX_THRESHOLD = 100;
