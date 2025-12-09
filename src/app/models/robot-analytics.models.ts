/**
 * Robot Analytics Models
 *
 * TypeScript interfaces for Robot Analytics data structures
 * matching the RobotAnalyticsController API.
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  msg?: string;
  traceId?: string;
}

/**
 * Utilization request parameters
 */
export interface UtilizationRequest {
  robotId?: string;
  start?: Date;
  end?: Date;
  groupBy?: 'hour' | 'day';
}

/**
 * Single data point in the utilization time series
 */
export interface UtilizationDataPoint {
  timestamp: string; // ISO 8601 format
  utilizationRate: number; // Percentage 0-100
  workingMinutes: number;
  chargingMinutes: number;
  idleMinutes: number;
}

/**
 * Summary statistics for the entire period
 */
export interface UtilizationSummary {
  averageUtilization: number; // Percentage
  totalWorkingTime: number; // Minutes
  totalChargingTime: number; // Minutes
  totalIdleTime: number; // Minutes
  peakUtilization: {
    value: number;
    timestamp: string;
  };
  lowestUtilization: {
    value: number;
    timestamp: string;
  };
}

/**
 * Complete utilization metrics response
 */
export interface UtilizationMetrics {
  robotId: string;
  timeRange: {
    start: string;
    end: string;
  };
  grouping: 'hour' | 'day';
  dataPoints: UtilizationDataPoint[];
  summary: UtilizationSummary;
}

/**
 * Robot information for selector
 */
export interface RobotInfo {
  id: string;
  name: string;
  type?: string;
}

/**
 * Chart dataset for Chart.js
 */
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

/**
 * Utility Functions
 */

/**
 * Convert minutes to hours with decimal
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Format minutes to human-readable string
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string, grouping: 'hour' | 'day'): string {
  const date = new Date(timestamp);

  if (grouping === 'hour') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      hour12: true
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Calculate idle time from total period
 */
export function calculateIdleTime(workingMins: number, chargingMins: number, totalMinsInPeriod: number): number {
  return Math.max(0, totalMinsInPeriod - workingMins - chargingMins);
}

/**
 * Calculate utilization rate: Working / (Available - Charging)
 */
export function calculateUtilizationRate(workingMins: number, chargingMins: number, totalMinsInPeriod: number): number {
  const effectiveAvailable = totalMinsInPeriod - chargingMins;
  if (effectiveAvailable <= 0) return 0;
  return Math.round((workingMins / effectiveAvailable) * 100 * 10) / 10;
}

/**
 * Get color for utilization level
 */
export function getUtilizationColor(utilization: number): string {
  if (utilization >= 80) return '#4caf50'; // Green - Excellent
  if (utilization >= 60) return '#8bc34a'; // Light Green - Good
  if (utilization >= 40) return '#ff9800'; // Orange - Fair
  if (utilization >= 20) return '#ff5722'; // Deep Orange - Poor
  return '#f44336'; // Red - Critical
}

/**
 * Backend response structure from RobotAnalyticsController
 */
interface BackendUtilizationResponse {
  robotId: string;
  periodStartUtc: string;
  periodEndUtc: string;
  totalAvailableMinutes: number;
  manualPauseMinutes: number;
  utilizedMinutes: number;
  utilizationPercent: number;
  totalChargingMinutes: number;
  totalWorkingMinutes: number;
  totalIdleMinutes: number;
  breakdown: {
    bucketStartUtc: string;
    totalAvailableMinutes: number;
    utilizedMinutes: number;
    manualPauseMinutes: number;
    completedMissions: number;
    chargingMinutes: number;
    workingMinutes: number;
    idleMinutes: number;
  }[];
}

/**
 * Transform API response to UtilizationMetrics
 */
export function transformUtilizationData(apiData: any, request: UtilizationRequest): UtilizationMetrics {
  if (!apiData) {
    return createEmptyMetrics(request);
  }

  const backendData = apiData as BackendUtilizationResponse;

  // Transform breakdown array to dataPoints
  const dataPoints: UtilizationDataPoint[] = backendData.breakdown.map(bucket => {
    // Calculate utilization rate for this bucket: Working / (Available - Charging)
    const effectiveAvailable = bucket.totalAvailableMinutes - bucket.chargingMinutes;
    const utilizationRate = effectiveAvailable > 0
      ? Math.round((bucket.workingMinutes / effectiveAvailable) * 100 * 10) / 10
      : 0;

    return {
      timestamp: bucket.bucketStartUtc,
      utilizationRate: utilizationRate,
      workingMinutes: Math.round(bucket.workingMinutes * 10) / 10,
      chargingMinutes: Math.round(bucket.chargingMinutes * 10) / 10,
      idleMinutes: Math.round(bucket.idleMinutes * 10) / 10
    };
  });

  // Find peak and lowest utilization
  let peakUtilization = { value: 0, timestamp: '' };
  let lowestUtilization = { value: 100, timestamp: '' };

  if (dataPoints.length > 0) {
    dataPoints.forEach(point => {
      if (point.utilizationRate > peakUtilization.value) {
        peakUtilization = { value: point.utilizationRate, timestamp: point.timestamp };
      }
      if (point.utilizationRate < lowestUtilization.value) {
        lowestUtilization = { value: point.utilizationRate, timestamp: point.timestamp };
      }
    });
  }

  // Create summary
  const summary: UtilizationSummary = {
    averageUtilization: Math.round(backendData.utilizationPercent * 10) / 10,
    totalWorkingTime: Math.round(backendData.totalWorkingMinutes * 10) / 10,
    totalChargingTime: Math.round(backendData.totalChargingMinutes * 10) / 10,
    totalIdleTime: Math.round(backendData.totalIdleMinutes * 10) / 10,
    peakUtilization: peakUtilization,
    lowestUtilization: lowestUtilization
  };

  // Return transformed data
  return {
    robotId: backendData.robotId,
    timeRange: {
      start: backendData.periodStartUtc,
      end: backendData.periodEndUtc
    },
    grouping: request.groupBy || 'day',
    dataPoints: dataPoints,
    summary: summary
  };
}

/**
 * Create empty metrics structure
 */
export function createEmptyMetrics(request: UtilizationRequest): UtilizationMetrics {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    robotId: request.robotId || '',
    timeRange: {
      start: (request.start || weekAgo).toISOString(),
      end: (request.end || now).toISOString()
    },
    grouping: request.groupBy || 'day',
    dataPoints: [],
    summary: {
      averageUtilization: 0,
      totalWorkingTime: 0,
      totalChargingTime: 0,
      totalIdleTime: 0,
      peakUtilization: { value: 0, timestamp: '' },
      lowestUtilization: { value: 0, timestamp: '' }
    }
  };
}

/**
 * Validate date range
 */
export function isValidDateRange(start: Date, end: Date): boolean {
  return end > start;
}

/**
 * Get default date range (last 7 days)
 */
export function getDefaultDateRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}
