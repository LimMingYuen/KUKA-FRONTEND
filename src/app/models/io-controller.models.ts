// ============================================
// IO Controller Models
// ============================================

// Enums
export enum IoChannelType {
  DigitalInput = 'DigitalInput',
  DigitalOutput = 'DigitalOutput'
}

export enum IoStateChangeSource {
  System = 'System',
  User = 'User',
  Modbus = 'Modbus',
  FailSafe = 'FailSafe'
}

// DTOs from API
export interface IoControllerDeviceDto {
  id: number;
  deviceName: string;
  ipAddress: string;
  port: number;
  unitId: number;
  description?: string;
  isActive: boolean;
  pollingIntervalMs: number;
  connectionTimeoutMs: number;
  lastPollUtc?: string;
  lastConnectionSuccess?: boolean;
  lastErrorMessage?: string;
  createdUtc: string;
  updatedUtc: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface IoChannelDto {
  id: number;
  deviceId: number;
  channelNumber: number;
  channelType: string;
  label?: string;
  currentState: boolean;
  failSafeValue?: boolean;
  fsvEnabled: boolean;
  lastStateChangeUtc?: string;
}

export interface IoDeviceFullStatusDto {
  device: IoControllerDeviceDto;
  channels: IoChannelDto[];
  isConnected: boolean;
  lastPollUtc?: string;
}

export interface IoStateLogDto {
  id: number;
  deviceId: number;
  channelNumber: number;
  channelType: string;
  previousState: boolean;
  newState: boolean;
  changeSource: string;
  changedBy?: string;
  changedUtc: string;
  reason?: string;
}

export interface IoConnectionResult {
  isConnected: boolean;
  errorMessage?: string;
  responseTimeMs: number;
}

export interface IoWriteResult {
  success: boolean;
  errorMessage?: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Request DTOs
export interface CreateIoDeviceRequest {
  deviceName: string;
  ipAddress: string;
  port?: number;
  unitId?: number;
  description?: string;
  isActive?: boolean;
  pollingIntervalMs?: number;
  connectionTimeoutMs?: number;
}

export interface UpdateIoDeviceRequest {
  deviceName: string;
  description?: string;
  isActive?: boolean;
  pollingIntervalMs?: number;
  connectionTimeoutMs?: number;
}

export interface SetDigitalOutputRequest {
  value: boolean;
  reason?: string;
}

export interface SetFsvRequest {
  enabled: boolean;
  value: boolean;
}

export interface UpdateChannelLabelRequest {
  label?: string;
}

// SignalR DTOs (received from hub)
export interface IoDeviceStatusSignalR {
  deviceId: number;
  deviceName: string;
  isConnected: boolean;
  lastPollUtc?: string;
  channels: IoChannelSignalR[];
}

export interface IoChannelSignalR {
  channelNumber: number;
  channelType: string;
  label?: string;
  currentState: boolean;
  fsvEnabled: boolean;
  failSafeValue?: boolean;
  lastStateChangeUtc?: string;
}

export interface IoChannelChangeSignalR {
  deviceId: number;
  channelNumber: number;
  channelType: string;
  label?: string;
  currentState: boolean;
  lastStateChangeUtc?: string;
}

export interface IoConnectionStatusSignalR {
  deviceId: number;
  isConnected: boolean;
  errorMessage?: string;
  timestamp: string;
}

// Display data (extended for UI)
export interface IoControllerDeviceDisplayData extends IoControllerDeviceDto {
  connectionStatusClass: string;
  connectionStatusText: string;
  lastPollDisplay: string;
}

export interface IoChannelDisplayData extends IoChannelDto {
  channelLabel: string;
  stateText: string;
  stateClass: string;
  modbusAddress: string;
}

// Utility functions
export function transformDeviceForDisplay(device: IoControllerDeviceDto): IoControllerDeviceDisplayData {
  const isConnected = device.lastConnectionSuccess === true;
  const isUnknown = device.lastConnectionSuccess === null || device.lastConnectionSuccess === undefined;

  return {
    ...device,
    connectionStatusClass: isUnknown ? 'status-unknown' : (isConnected ? 'status-connected' : 'status-disconnected'),
    connectionStatusText: isUnknown ? 'Unknown' : (isConnected ? 'Connected' : 'Disconnected'),
    lastPollDisplay: device.lastPollUtc
      ? new Date(device.lastPollUtc).toLocaleString()
      : 'Never'
  };
}

export function transformChannelForDisplay(channel: IoChannelDto): IoChannelDisplayData {
  const isDi = channel.channelType === IoChannelType.DigitalInput || channel.channelType === 'DigitalInput';
  const baseAddress = isDi ? 1 : 17;
  const modbusAddress = String(baseAddress + channel.channelNumber).padStart(5, '0');

  return {
    ...channel,
    channelLabel: channel.label || `${isDi ? 'DI' : 'DO'} ${channel.channelNumber}`,
    stateText: channel.currentState ? 'ON' : 'OFF',
    stateClass: channel.currentState ? 'state-on' : 'state-off',
    modbusAddress
  };
}

export function transformChannelsForDisplay(channels: IoChannelDto[]): IoChannelDisplayData[] {
  return channels.map(transformChannelForDisplay);
}

export function getDigitalInputs(channels: IoChannelDisplayData[]): IoChannelDisplayData[] {
  return channels.filter(c => c.channelType === IoChannelType.DigitalInput || c.channelType === 'DigitalInput');
}

export function getDigitalOutputs(channels: IoChannelDisplayData[]): IoChannelDisplayData[] {
  return channels.filter(c => c.channelType === IoChannelType.DigitalOutput || c.channelType === 'DigitalOutput');
}
