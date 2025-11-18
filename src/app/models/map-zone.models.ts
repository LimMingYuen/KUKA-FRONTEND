/**
 * Map Zone data models and interfaces
 * Based on backend DTOs from MapZonesController
 */

export interface MapZoneSummaryDto {
  id: number;
  zoneName: string;
  zoneCode: string;
  layout: string;
  areaPurpose: string;
  statusText: string;
}

export interface MapZoneSyncResultDto {
  total: number;
  inserted: number;
  updated: number;
}

export interface MapZoneWithNodesDto {
  id: number;
  zoneName: string;
  zoneCode: string;
  nodes: string;
  mapCode: string;
}

export interface MapZoneDto {
  zoneName: string;
  zoneCode: string;
  zoneDescription: string;
  zoneColor: string;
  mapCode: string;
  floorNumber: string;
  points: string;
  nodes: string;
  edges: string;
  customerUi: string;
  zoneType: string;
  status: number;
  beginTime: string;
  endTime: string;
  createTime: string;
  createBy: string;
  createApp: string;
  lastUpdateTime: string;
  lastUpdateBy: string;
  lastUpdateApp: string;
  configs?: any;
}

/**
 * Map Zone table display data structure
 */
export interface MapZoneDisplayData {
  id: number;
  name: string;
  code: string;
  layout: string;
  areaPurpose: string;
  status: number;
  statusText: string;
  createdDate: string;
  updatedDate: string;
}

/**
 * Zone Type mapping for human-readable purposes
 */
export const ZONE_TYPE_MAP: { [key: string]: string } = {
  '1': 'Parking Area',
  '2': 'Charging Area',
  '3': 'Workflow Area',
  '4': 'Loading Area',
  '5': 'Unloading Area',
  '6': 'Robot Zone',
  '7': 'Restricted Area',
  '8': 'Safety Zone'
};

/**
 * Get area purpose text for zone type code
 */
export function getAreaPurpose(zoneType: string): string {
  return ZONE_TYPE_MAP[zoneType] || `Type ${zoneType}`;
}

/**
 * Get status text for zone status code
 */
export function getZoneStatusText(status: number): string {
  return status === 1 ? 'Enabled' : 'Disabled';
}