/**
 * Mobile Robot Models
 *
 * TypeScript interfaces for Mobile Robot data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * Mobile Robot DTO from backend API response
 */
export interface MobileRobotSummaryDto {
  robotId: string;
  robotTypeCode: string;
  mapCode: string;
  floorNumber: string;
  reliability: number;
  status: number;
  occupyStatus: number;
  lastNodeNumber: number;
  batteryLevel: number;
  xCoordinate: number;
  yCoordinate: number;
  robotOrientation: number;
  /** Whether this robot has a valid license */
  isLicensed: boolean;
  /** License error message if unlicensed */
  licenseError?: string;
}

/**
 * Mobile Robot Sync Result DTO from sync API
 */
export interface MobileRobotSyncResultDto {
  total: number;
  inserted: number;
  updated: number;
  /** List of RobotIds that were skipped because they appeared multiple times in external API */
  skippedDuplicates: string[];
}

/**
 * Display Data for Mobile Robots Table
 * Extended with formatted display values
 */
export interface MobileRobotDisplayData extends MobileRobotSummaryDto {
  // Formatted display values
  reliabilityText: string;
  statusText: string;
  batteryLevelText: string;
  coordinatesText: string;
  orientationText: string;
  floorDisplay: string;
  nodeDisplay: string;
  licenseStatusText: string;
}

/**
 * Utility Functions for Mobile Robot Data Processing
 */

/**
 * Robot Status enumeration (from external AMR API)
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
 * Occupy Status enumeration
 */
export enum OccupyStatus {
  Unknown = 0,
  Free = 1,
  Occupied = 2,
  Reserved = 3
}

/**
 * Transform reliability number to display text
 */
export function getReliabilityText(reliability: number): string {
  if (reliability >= 95) return 'Excellent';
  if (reliability >= 85) return 'Good';
  if (reliability >= 70) return 'Fair';
  if (reliability >= 50) return 'Poor';
  return 'Very Poor';
}

/**
 * Transform status number to display text
 */
export function getStatusText(status: number): string {
  switch (status) {
    case RobotStatus.Departure: return 'Departure';
    case RobotStatus.Offline: return 'Offline';
    case RobotStatus.Idle: return 'Idle';
    case RobotStatus.Executing: return 'Executing';
    case RobotStatus.Charging: return 'Charging';
    case RobotStatus.Updating: return 'Updating';
    case RobotStatus.Abnormal: return 'Abnormal';
    default: return 'Unknown';
  }
}

/**
 * Transform occupy status number to display text
 */
export function getOccupyStatusText(occupyStatus: number): string {
  switch (occupyStatus) {
    case OccupyStatus.Free: return 'Free';
    case OccupyStatus.Occupied: return 'Occupied';
    case OccupyStatus.Reserved: return 'Reserved';
    default: return 'Unknown';
  }
}

/**
 * Format reliability for display with percentage
 */
export function formatReliability(reliability: number): string {
  return `${reliability.toFixed(1)}%`;
}

/**
 * Format battery level for display
 */
export function formatBatteryLevel(batteryLevel: number): string {
  return `${batteryLevel}%`;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(x: number, y: number): string {
  return `(${x.toFixed(2)}, ${y.toFixed(2)})`;
}

/**
 * Format orientation for display
 */
export function formatOrientation(orientation: number): string {
  return `${orientation}°`;
}

/**
 * Format floor number for display
 */
export function formatFloorNumber(floorNumber: string): string {
  if (!floorNumber) return 'N/A';
  return `Floor ${floorNumber}`;
}

/**
 * Format node display text
 */
export function formatNodeDisplay(nodeNumber: number): string {
  if (nodeNumber === null || nodeNumber === undefined) return 'N/A';
  return `Node #${nodeNumber}`;
}

/**
 * Format license status for display
 */
export function formatLicenseStatus(isLicensed: boolean, licenseError?: string): string {
  if (isLicensed) return 'Licensed';
  return licenseError || 'Unlicensed';
}

/**
 * Get CSS class for license status badge
 */
export function getLicenseStatusClass(isLicensed: boolean): string {
  return isLicensed ? 'license-valid' : 'license-invalid';
}

/**
 * Transform MobileRobotSummaryDto to MobileRobotDisplayData
 */
export function transformMobileRobotData(robot: MobileRobotSummaryDto): MobileRobotDisplayData {
  return {
    ...robot,
    reliabilityText: formatReliability(robot.reliability),
    statusText: getStatusText(robot.status),
    batteryLevelText: formatBatteryLevel(robot.batteryLevel),
    coordinatesText: formatCoordinates(robot.xCoordinate, robot.yCoordinate),
    orientationText: formatOrientation(robot.robotOrientation),
    floorDisplay: formatFloorNumber(robot.floorNumber),
    nodeDisplay: formatNodeDisplay(robot.lastNodeNumber),
    licenseStatusText: formatLicenseStatus(robot.isLicensed, robot.licenseError)
  };
}

/**
 * Transform array of mobile robots for display
 */
export function transformMobileRobotsForDisplay(robots: MobileRobotSummaryDto[]): MobileRobotDisplayData[] {
  return robots.map(robot => transformMobileRobotData(robot));
}

/**
 * Get CSS class for reliability badge
 */
export function getReliabilityClass(reliability: number): string {
  if (reliability >= 95) return 'reliability-excellent';
  if (reliability >= 85) return 'reliability-good';
  if (reliability >= 70) return 'reliability-fair';
  if (reliability >= 50) return 'reliability-poor';
  return 'reliability-very-poor';
}

/**
 * Get CSS class for status badge
 */
export function getStatusClass(status: number): string {
  switch (status) {
    case RobotStatus.Departure: return 'status-departure';
    case RobotStatus.Offline: return 'status-offline';
    case RobotStatus.Idle: return 'status-idle';
    case RobotStatus.Executing: return 'status-executing';
    case RobotStatus.Charging: return 'status-charging';
    case RobotStatus.Updating: return 'status-updating';
    case RobotStatus.Abnormal: return 'status-abnormal';
    default: return 'status-unknown';
  }
}

/**
 * Get CSS class for occupy status badge
 */
export function getOccupyStatusClass(occupyStatus: number): string {
  switch (occupyStatus) {
    case OccupyStatus.Free: return 'occupy-free';
    case OccupyStatus.Occupied: return 'occupy-occupied';
    case OccupyStatus.Reserved: return 'occupy-reserved';
    default: return 'occupy-unknown';
  }
}

/**
 * Get CSS class for battery level indicator
 */
export function getBatteryClass(batteryLevel: number): string {
  if (batteryLevel >= 80) return 'battery-high';
  if (batteryLevel >= 50) return 'battery-medium';
  if (batteryLevel >= 20) return 'battery-low';
  return 'battery-critical';
}

/**
 * Get CSS class for floor badge
 */
export function getFloorClass(floorNumber: string): string {
  if (!floorNumber) return 'floor-unknown';

  const floorNum = parseInt(floorNumber, 10);
  if (isNaN(floorNum)) return 'floor-unknown';

  if (floorNum === 1) return 'floor-first';
  if (floorNum === 2) return 'floor-second';
  if (floorNum === 3) return 'floor-third';
  if (floorNum > 3) return 'floor-higher';
  if (floorNum < 0) return 'floor-basement';

  return 'floor-ground';
}