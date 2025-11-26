/**
 * Models for Warehouse Live Map visualization
 */

/**
 * Floor/map tab information
 */
export interface FloorInfo {
  floorNumber: string;
  mapCode: string;
  displayName: string;
  nodeCount: number;
  zoneCount: number;
}

/**
 * QR code node for map visualization
 */
export interface MapNode {
  id: number;
  nodeLabel: string;
  xCoordinate: number;
  yCoordinate: number;
  nodeNumber: number;
  nodeType?: number;
  mapCode: string;
  floorNumber: string;
  nodeUuid?: string;
  transitOrientations?: string;
}

/**
 * Zone polygon for map visualization
 */
export interface MapZoneDisplay {
  id: number;
  zoneName: string;
  zoneCode: string;
  zoneColor: string;
  zoneType: string;
  mapCode: string;
  floorNumber: string;
  polygonPoints: PolygonPoint[];
  nodeIds: string[];
  status: number;
}

/**
 * Polygon point
 */
export interface PolygonPoint {
  x: number;
  y: number;
}

/**
 * Realtime data from backend cache
 */
export interface MapRealtimeData {
  robots: RobotPosition[];
  containers: ContainerPosition[];
  errorRobots: RobotPosition[];
  lastUpdated: string;
}

/**
 * Robot position on map
 */
export interface RobotPosition {
  robotId: string;
  xCoordinate: number;
  yCoordinate: number;
  orientation: number;
  batteryLevel: number;
  robotStatus: number;
  warningLevel: number;
  warningCode?: string;
  warningMessage?: string;
  mapCode?: string;
  floorNumber?: string;
  missionCode?: string;
  jobId?: string;
  robotTypeCode?: string;
  connectionState: number;
  liftState: boolean;
  containerCode?: string;
}

/**
 * Container position on map
 */
export interface ContainerPosition {
  containerCode: string;
  xCoordinate: number;
  yCoordinate: number;
  orientation: number;
  mapCode?: string;
  floorNumber?: string;
  stayNodeNumber: number;
  status: number;
  isCarry: boolean;
  modelCode?: string;
}

/**
 * Cache status response
 */
export interface CacheStatus {
  lastUpdated: string | null;
  hasData: boolean;
  ageSeconds: number | null;
}

/**
 * Map edge (connection between nodes)
 */
export interface MapEdge {
  id: number;
  beginNodeLabel: string;
  endNodeLabel: string;
  edgeLength: number;
  edgeType: number;
  mapCode: string;
  floorNumber: string;
}

/**
 * Map import response from upload
 */
export interface MapImportResponse {
  success: boolean;
  message: string;
  stats: MapImportStats;
  errors: string[];
  warnings: string[];
}

/**
 * Map import statistics
 */
export interface MapImportStats {
  mapCode: string;
  totalNodesInFile: number;
  nodesImported: number;
  nodesUpdated: number;
  nodesSkipped: number;
  nodesFailed: number;
  totalEdgesInFile: number;
  edgesImported: number;
  floorsImported: number;
  importedAt: string;
}

// ============ Helper Functions ============

/**
 * Robot status codes and colors
 */
export const ROBOT_STATUS = {
  IDLE: 0,
  WORKING: 1,
  CHARGING: 2,
  ERROR: 3,
  OFFLINE: 4,
  MANUAL: 5,
} as const;

/**
 * Get color based on robot status
 */
export function getRobotStatusColor(status: number): string {
  switch (status) {
    case ROBOT_STATUS.IDLE:
      return '#4CAF50'; // Green
    case ROBOT_STATUS.WORKING:
      return '#2196F3'; // Blue
    case ROBOT_STATUS.CHARGING:
      return '#FF9800'; // Orange
    case ROBOT_STATUS.ERROR:
      return '#F44336'; // Red
    case ROBOT_STATUS.OFFLINE:
      return '#9E9E9E'; // Gray
    case ROBOT_STATUS.MANUAL:
      return '#9C27B0'; // Purple
    default:
      return '#607D8B'; // Blue-gray
  }
}

/**
 * Get status text
 */
export function getRobotStatusText(status: number): string {
  switch (status) {
    case ROBOT_STATUS.IDLE:
      return 'Idle';
    case ROBOT_STATUS.WORKING:
      return 'Working';
    case ROBOT_STATUS.CHARGING:
      return 'Charging';
    case ROBOT_STATUS.ERROR:
      return 'Error';
    case ROBOT_STATUS.OFFLINE:
      return 'Offline';
    case ROBOT_STATUS.MANUAL:
      return 'Manual';
    default:
      return 'Unknown';
  }
}

/**
 * Get battery level color
 */
export function getBatteryColor(level: number): string {
  if (level >= 70) return '#4CAF50'; // Green
  if (level >= 30) return '#FF9800'; // Orange
  return '#F44336'; // Red
}

/**
 * Get battery icon based on level
 */
export function getBatteryIcon(level: number): string {
  if (level >= 90) return 'battery_full';
  if (level >= 70) return 'battery_6_bar';
  if (level >= 50) return 'battery_4_bar';
  if (level >= 30) return 'battery_2_bar';
  if (level >= 10) return 'battery_1_bar';
  return 'battery_alert';
}

/**
 * Format orientation angle for display
 */
export function formatOrientation(degrees: number): string {
  // Normalize to 0-360
  const normalized = ((degrees % 360) + 360) % 360;
  return `${Math.round(normalized)}°`;
}

/**
 * Get zone type display text
 */
export function getZoneTypeText(zoneType: string): string {
  switch (zoneType) {
    case '3':
      return 'Workflow Area';
    case '6':
      return 'Robot Zone';
    default:
      return `Type ${zoneType}`;
  }
}

/**
 * Default zone colors if not specified
 */
export const DEFAULT_ZONE_COLORS: Record<string, string> = {
  '3': '#E8DEF8', // Light purple for workflow areas
  '6': '#C8E6C9', // Light green for robot zones
  default: '#E0E0E0', // Light gray
};

/**
 * Get zone color with fallback
 */
export function getZoneColor(zone: MapZoneDisplay): string {
  if (zone.zoneColor) return zone.zoneColor;
  return DEFAULT_ZONE_COLORS[zone.zoneType] || DEFAULT_ZONE_COLORS['default'];
}
