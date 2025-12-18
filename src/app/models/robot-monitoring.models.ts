/**
 * Robot Monitoring Models
 */

// Map configuration
export interface RobotMonitoringMap {
  id: number;
  name: string;
  description?: string;
  mapCode?: string;
  floorNumber?: string;
  backgroundImagePath?: string;
  backgroundImageOriginalName?: string;
  imageWidth?: number;
  imageHeight?: number;
  displaySettings?: DisplaySettings;
  customNodes?: CustomNode[];
  customZones?: CustomZone[];
  customLines?: CustomLine[];
  isDefault: boolean;
  createdBy: string;
  createdUtc: string;
  lastUpdatedBy?: string;
  lastUpdatedUtc?: string;
}

export interface RobotMonitoringMapSummary {
  id: number;
  name: string;
  description?: string;
  mapCode?: string;
  floorNumber?: string;
  hasBackgroundImage: boolean;
  isDefault: boolean;
  createdBy: string;
  createdUtc: string;
  lastUpdatedUtc?: string;
}

export interface DisplaySettings {
  showNodes: boolean;
  showZones: boolean;
  showLabels: boolean;
  nodeSize: number;
  zoneOpacity: number;
}

export interface CreateMapRequest {
  name: string;
  description?: string;
  mapCode?: string;
  floorNumber?: string;
  displaySettings?: DisplaySettings;
  customNodes?: CustomNode[];
  customZones?: CustomZone[];
  customLines?: CustomLine[];
  isDefault?: boolean;
}

export interface UpdateMapRequest {
  name?: string;
  description?: string;
  mapCode?: string;
  floorNumber?: string;
  displaySettings?: DisplaySettings;
  customNodes?: CustomNode[];
  customZones?: CustomZone[];
  customLines?: CustomLine[];
  isDefault?: boolean;
}

export interface ImageUploadResponse {
  success: boolean;
  imagePath?: string;
  originalName?: string;
  width?: number;
  height?: number;
  message?: string;
}

// Map data
export interface MapData {
  nodes: MapNode[];
  zones: MapZone[];
}

export interface MapNode {
  id: number;
  nodeLabel: string;
  nodeUuid?: string;
  nodeNumber: number;
  x: number;
  y: number;
  nodeType?: number;
  mapCode: string;
  floorNumber: string;
}

export interface MapZone {
  id: number;
  zoneName: string;
  zoneCode: string;
  zoneColor?: string;
  zoneType: string;
  points: Point[];
  nodeLabels: string[];
  mapCode: string;
  floorNumber: string;
}

export interface Point {
  x: number;
  y: number;
}

// Custom nodes and zones (user-drawn)
export interface CustomNode {
  id: string;           // UUID
  label: string;
  nodeNumber?: number;  // For display on map
  x: number;
  y: number;
  color?: string;
}

export interface CustomZone {
  id: string;           // UUID
  name: string;
  color?: string;
  opacity: number;
  points: Point[];
}

export interface CustomLine {
  id: string;           // UUID
  fromNodeId: string;   // ID of start node
  toNodeId: string;     // ID of end node
  color?: string;
  weight?: number;      // Line thickness
}

// Drawing mode types
export type DrawingMode = 'none' | 'addNode' | 'drawZone' | 'drawLine' | 'select' | 'delete' | 'placeRobot';

// Default colors for custom elements
export const CUSTOM_NODE_COLORS = [
  '#3f51b5',  // Indigo
  '#f44336',  // Red
  '#4caf50',  // Green
  '#ff9800',  // Orange
  '#9c27b0',  // Purple
  '#00bcd4',  // Cyan
  '#795548',  // Brown
  '#607d8b'   // Blue Grey
];

export const CUSTOM_ZONE_COLORS = [
  { color: '#3f51b5', name: 'Indigo' },
  { color: '#f44336', name: 'Red' },
  { color: '#4caf50', name: 'Green' },
  { color: '#ff9800', name: 'Orange' },
  { color: '#9c27b0', name: 'Purple' },
  { color: '#00bcd4', name: 'Cyan' },
  { color: '#795548', name: 'Brown' },
  { color: '#607d8b', name: 'Blue Grey' }
];

// Zone type constants
export const ZONE_TYPE_MAP: { [key: string]: { text: string; color: string } } = {
  '1': { text: 'Parking Area', color: '#3f51b5' },
  '2': { text: 'Charging Area', color: '#ff9800' },
  '3': { text: 'Workflow Area', color: '#4caf50' },
  '4': { text: 'Loading Area', color: '#2196f3' },
  '5': { text: 'Unloading Area', color: '#9c27b0' },
  '6': { text: 'Robot Zone', color: '#00bcd4' },
  '7': { text: 'Restricted Area', color: '#f44336' },
  '8': { text: 'Safety Zone', color: '#ffeb3b' }
};

// Helper functions
export function getZoneInfo(zoneType: string): { text: string; color: string } {
  return ZONE_TYPE_MAP[zoneType] || { text: 'Unknown', color: '#9e9e9e' };
}

// Default settings
export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showNodes: true,
  showZones: true,
  showLabels: true,
  nodeSize: 10,
  zoneOpacity: 0.3
};
