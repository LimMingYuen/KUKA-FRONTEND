/**
 * QR Code Models
 *
 * TypeScript interfaces for QR Code data structures
 * matching the backend API DTOs and frontend display requirements.
 */

/**
 * QR Code DTO from backend API response
 */
export interface QrCodeSummaryDto {
  id: number;
  nodeLabel: string;
  mapCode: string;
  floorNumber: string;
  nodeNumber: number;
  reliability: number;
  reportTimes: number;
  lastUpdateTime: string;
}

/**
 * QR Code Sync Result DTO from sync API
 */
export interface QrCodeSyncResultDto {
  total: number;
  inserted: number;
  updated: number;
}

/**
 * Display Data for QR Codes Table
 * Extended with formatted display values
 */
export interface QrCodeDisplayData extends QrCodeSummaryDto {
  // Formatted display values
  reliabilityText: string;
  lastUpdatedDate: string;
  floorDisplay: string;
  nodeDisplay: string;
}

/**
 * Utility Functions for QR Code Data Processing
 */

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
 * Format reliability for display with percentage
 */
export function formatReliability(reliability: number): string {
  return `${reliability.toFixed(1)}%`;
}

/**
 * Format date string for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
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
 * Transform QrCodeSummaryDto to QrCodeDisplayData
 */
export function transformQrCodeData(qrCode: QrCodeSummaryDto): QrCodeDisplayData {
  return {
    ...qrCode,
    reliabilityText: formatReliability(qrCode.reliability),
    lastUpdatedDate: formatDate(qrCode.lastUpdateTime),
    floorDisplay: formatFloorNumber(qrCode.floorNumber),
    nodeDisplay: formatNodeDisplay(qrCode.nodeNumber)
  };
}

/**
 * Transform array of QR codes for display
 */
export function transformQrCodesForDisplay(qrCodes: QrCodeSummaryDto[]): QrCodeDisplayData[] {
  return qrCodes.map(qrCode => transformQrCodeData(qrCode));
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