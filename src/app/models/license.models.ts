export interface MachineIdResponse {
  machineId: string;
  displayMachineId: string;
}

export interface LicenseStatusResponse {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  customerName?: string;
  licenseType?: string;
  expiresAt?: string;
  daysRemaining?: number;
  maxRobots?: number;
}

/**
 * Robot License Status from backend API
 */
export interface RobotLicenseStatus {
  robotId: string;
  isLicensed: boolean;
  errorCode?: string;
  errorMessage?: string;
  customerName?: string;
  expiresAt?: string;
  daysRemaining?: number;
}
