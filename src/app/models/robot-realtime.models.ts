/**
 * Lightweight robot position data received via SignalR
 */
export interface RobotPositionDto {
  robotId: string;
  xCoordinate: number;
  yCoordinate: number;
  robotOrientation: number;
  robotStatus: number;
  robotStatusText: string;
  batteryLevel: number;
  batteryIsCharging: boolean;
  mapCode?: string;
  floorNumber?: string;
  currentJobId?: string;
  robotTypeCode?: string;
  connectionState: number;
  warningLevel: number;
  velocity: number;
  timestamp: string;
}

/**
 * Batch update payload from SignalR
 */
export interface RobotPositionUpdateDto {
  robots: RobotPositionDto[];
  serverTimestamp: string;
  mapCode?: string;
  floorNumber?: string;
}

/**
 * Internal robot state for animation interpolation
 */
export interface AnimatedRobotState {
  robotId: string;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  currentOrientation: number;
  targetOrientation: number;
  robotStatus: number;
  robotStatusText: string;
  batteryLevel: number;
  batteryIsCharging: boolean;
  robotTypeCode?: string;
  connectionState: number;
  warningLevel: number;
  velocity: number;
  lastUpdateTime: number;
  interpolationProgress: number;
}

/**
 * Robot status codes
 */
export enum RobotStatus {
  Unknown = 0,
  Departure = 1,
  Offline = 2,
  Idle = 3,
  Executing = 4,
  Charging = 5,
  Updating = 6,
  Abnormal = 7
}

/**
 * Robot status color mapping
 */
export const ROBOT_STATUS_COLORS: { [key: number]: string } = {
  [RobotStatus.Unknown]: '#9e9e9e',    // Gray
  [RobotStatus.Departure]: '#03a9f4',  // Light Blue
  [RobotStatus.Offline]: '#607d8b',    // Blue Gray
  [RobotStatus.Idle]: '#4caf50',       // Green
  [RobotStatus.Executing]: '#2196f3',  // Blue
  [RobotStatus.Charging]: '#ff9800',   // Orange
  [RobotStatus.Updating]: '#9c27b0',   // Purple
  [RobotStatus.Abnormal]: '#f44336'    // Red
};

/**
 * Get status color for a robot
 */
export function getRobotStatusColor(status: number): string {
  return ROBOT_STATUS_COLORS[status] || '#9e9e9e';
}

/**
 * Get battery color based on level
 */
export function getBatteryColor(level: number, isCharging: boolean): string {
  if (isCharging) return '#ff9800'; // Orange when charging
  if (level > 60) return '#4caf50'; // Green
  if (level > 20) return '#ffeb3b'; // Yellow
  return '#f44336';                  // Red
}

/**
 * Get status text for display
 */
export function getRobotStatusText(status: number): string {
  switch (status) {
    case RobotStatus.Unknown: return 'Unknown';
    case RobotStatus.Departure: return 'Departure';
    case RobotStatus.Offline: return 'Offline';
    case RobotStatus.Idle: return 'Idle';
    case RobotStatus.Executing: return 'Executing';
    case RobotStatus.Charging: return 'Charging';
    case RobotStatus.Updating: return 'Updating';
    case RobotStatus.Abnormal: return 'Abnormal';
    default: return `Unknown (${status})`;
  }
}
