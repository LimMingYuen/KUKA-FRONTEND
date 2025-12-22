import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
import { ConfigService } from './config.service';
import {
  IoControllerDeviceDto,
  IoChannelDto,
  IoDeviceFullStatusDto,
  IoStateLogDto,
  IoConnectionResult,
  IoWriteResult,
  PagedResponse,
  CreateIoDeviceRequest,
  UpdateIoDeviceRequest,
  SetDigitalOutputRequest,
  SetFsvRequest,
  UpdateChannelLabelRequest,
  IoDeviceStatusSignalR,
  IoChannelChangeSignalR,
  IoConnectionStatusSignalR
} from '../models/io-controller.models';

@Injectable({
  providedIn: 'root'
})
export class IoControllerService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private get API_URL(): string {
    return this.config.apiUrl + '/api/IoController';
  }

  // Loading states
  public isLoading = signal<boolean>(false);
  public isTestingConnection = signal<boolean>(false);

  // SignalR connection
  private hubConnection: signalR.HubConnection | null = null;
  private isConnected = signal<boolean>(false);

  // SignalR event subjects
  private deviceStatusSubject = new Subject<IoDeviceStatusSignalR>();
  private channelChangeSubject = new Subject<IoChannelChangeSignalR>();
  private connectionStatusSubject = new Subject<IoConnectionStatusSignalR>();

  // Public observables for SignalR events
  public deviceStatus$ = this.deviceStatusSubject.asObservable();
  public channelChange$ = this.channelChangeSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private createHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // #region Device CRUD

  getDevices(): Observable<IoControllerDeviceDto[]> {
    this.isLoading.set(true);
    return this.http.get<IoControllerDeviceDto[]>(
      `${this.API_URL}/devices`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => this.isLoading.set(false)),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  getDevice(id: number): Observable<IoControllerDeviceDto> {
    return this.http.get<IoControllerDeviceDto>(
      `${this.API_URL}/devices/${id}`,
      { headers: this.createHeaders() }
    );
  }

  createDevice(request: CreateIoDeviceRequest): Observable<IoControllerDeviceDto> {
    this.isLoading.set(true);
    return this.http.post<IoControllerDeviceDto>(
      `${this.API_URL}/devices`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => this.isLoading.set(false)),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  updateDevice(id: number, request: UpdateIoDeviceRequest): Observable<IoControllerDeviceDto> {
    this.isLoading.set(true);
    return this.http.put<IoControllerDeviceDto>(
      `${this.API_URL}/devices/${id}`,
      request,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => this.isLoading.set(false)),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  deleteDevice(id: number): Observable<void> {
    this.isLoading.set(true);
    return this.http.delete<void>(
      `${this.API_URL}/devices/${id}`,
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => this.isLoading.set(false)),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  testConnection(id: number): Observable<IoConnectionResult> {
    this.isTestingConnection.set(true);
    return this.http.post<IoConnectionResult>(
      `${this.API_URL}/devices/${id}/test`,
      {},
      { headers: this.createHeaders() }
    ).pipe(
      tap(() => this.isTestingConnection.set(false)),
      catchError(error => {
        this.isTestingConnection.set(false);
        return throwError(() => error);
      })
    );
  }

  getDeviceStatus(id: number): Observable<IoDeviceFullStatusDto> {
    return this.http.get<IoDeviceFullStatusDto>(
      `${this.API_URL}/devices/${id}/status`,
      { headers: this.createHeaders() }
    );
  }

  // #endregion

  // #region Channel Operations

  getChannels(deviceId: number): Observable<IoChannelDto[]> {
    return this.http.get<IoChannelDto[]>(
      `${this.API_URL}/devices/${deviceId}/channels`,
      { headers: this.createHeaders() }
    );
  }

  updateChannelLabel(
    deviceId: number,
    channelType: string,
    channelNumber: number,
    request: UpdateChannelLabelRequest
  ): Observable<IoChannelDto> {
    return this.http.put<IoChannelDto>(
      `${this.API_URL}/devices/${deviceId}/channels/${channelType}/${channelNumber}/label`,
      request,
      { headers: this.createHeaders() }
    );
  }

  setDigitalOutput(deviceId: number, channelNumber: number, request: SetDigitalOutputRequest): Observable<IoWriteResult> {
    return this.http.post<IoWriteResult>(
      `${this.API_URL}/devices/${deviceId}/do/${channelNumber}`,
      request,
      { headers: this.createHeaders() }
    );
  }

  setFsv(deviceId: number, channelNumber: number, request: SetFsvRequest): Observable<IoWriteResult> {
    return this.http.post<IoWriteResult>(
      `${this.API_URL}/devices/${deviceId}/do/${channelNumber}/fsv`,
      request,
      { headers: this.createHeaders() }
    );
  }

  // #endregion

  // #region Logs

  getDeviceLogs(deviceId: number, count: number = 50): Observable<IoStateLogDto[]> {
    const params = new HttpParams().set('count', count.toString());
    return this.http.get<IoStateLogDto[]>(
      `${this.API_URL}/devices/${deviceId}/logs`,
      { headers: this.createHeaders(), params }
    );
  }

  getAllLogs(
    deviceId?: number,
    channelNumber?: number,
    channelType?: string,
    changeSource?: string,
    changedBy?: string,
    fromUtc?: string,
    toUtc?: string,
    page: number = 1,
    pageSize: number = 50
  ): Observable<PagedResponse<IoStateLogDto>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (deviceId !== undefined) params = params.set('deviceId', deviceId.toString());
    if (channelNumber !== undefined) params = params.set('channelNumber', channelNumber.toString());
    if (channelType) params = params.set('channelType', channelType);
    if (changeSource) params = params.set('changeSource', changeSource);
    if (changedBy) params = params.set('changedBy', changedBy);
    if (fromUtc) params = params.set('fromUtc', fromUtc);
    if (toUtc) params = params.set('toUtc', toUtc);

    return this.http.get<PagedResponse<IoStateLogDto>>(
      `${this.API_URL}/logs`,
      { headers: this.createHeaders(), params }
    );
  }

  // #endregion

  // #region SignalR

  async startSignalRConnection(): Promise<void> {
    if (this.hubConnection) {
      return;
    }

    const token = localStorage.getItem('token');
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.config.apiUrl}/hubs/iocontroller`, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register handlers
    this.hubConnection.on('ReceiveDeviceStatus', (data: IoDeviceStatusSignalR) => {
      this.deviceStatusSubject.next(data);
    });

    this.hubConnection.on('ReceiveChannelChange', (data: IoChannelChangeSignalR) => {
      this.channelChangeSubject.next(data);
    });

    this.hubConnection.on('ReceiveConnectionStatus', (data: IoConnectionStatusSignalR) => {
      this.connectionStatusSubject.next(data);
    });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR reconnected to IoController hub');
      this.isConnected.set(true);
    });

    this.hubConnection.onreconnecting(() => {
      console.log('SignalR reconnecting to IoController hub...');
      this.isConnected.set(false);
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR disconnected from IoController hub');
      this.isConnected.set(false);
    });

    try {
      await this.hubConnection.start();
      console.log('SignalR connected to IoController hub');
      this.isConnected.set(true);
    } catch (err) {
      console.error('Error connecting to IoController hub:', err);
      this.isConnected.set(false);
      throw err;
    }
  }

  async stopSignalRConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
      this.isConnected.set(false);
    }
  }

  async subscribeToDevice(deviceId: number): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      await this.hubConnection.invoke('SubscribeToDevice', deviceId);
    }
  }

  async unsubscribeFromDevice(deviceId: number): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      await this.hubConnection.invoke('UnsubscribeFromDevice', deviceId);
    }
  }

  async subscribeToAll(): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      await this.hubConnection.invoke('SubscribeToAll');
    }
  }

  async unsubscribeFromAll(): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      await this.hubConnection.invoke('UnsubscribeFromAll');
    }
  }

  getConnectionState(): boolean {
    return this.isConnected();
  }

  // #endregion
}
