import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  WorkflowSchedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ToggleScheduleRequest,
  ScheduleTriggerResult
} from '../models/workflow-schedule.models';

@Injectable({
  providedIn: 'root'
})
export class WorkflowScheduleService {
  private readonly API_URL = 'http://localhost:5109/api/v1/workflow-schedules';

  constructor(private http: HttpClient) {}

  /**
   * Get all workflow schedules
   */
  getAll(): Observable<WorkflowSchedule[]> {
    return this.http.get<WorkflowSchedule[]>(this.API_URL).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get a workflow schedule by ID
   */
  getById(id: number): Observable<WorkflowSchedule> {
    return this.http.get<WorkflowSchedule>(`${this.API_URL}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get all schedules for a specific SavedCustomMission
   */
  getByMissionId(missionId: number): Observable<WorkflowSchedule[]> {
    return this.http.get<WorkflowSchedule[]>(`${this.API_URL}/by-mission/${missionId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new workflow schedule
   */
  create(request: CreateScheduleRequest): Observable<WorkflowSchedule> {
    return this.http.post<WorkflowSchedule>(this.API_URL, request).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing workflow schedule
   */
  update(id: number, request: UpdateScheduleRequest): Observable<WorkflowSchedule> {
    return this.http.put<WorkflowSchedule>(`${this.API_URL}/${id}`, request).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a workflow schedule
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Toggle the enabled state of a schedule
   */
  toggle(id: number, enabled: boolean): Observable<WorkflowSchedule> {
    const request: ToggleScheduleRequest = { isEnabled: enabled };
    return this.http.post<WorkflowSchedule>(`${this.API_URL}/${id}/toggle`, request).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Manually trigger a schedule to run now
   */
  triggerNow(id: number): Observable<ScheduleTriggerResult> {
    return this.http.post<ScheduleTriggerResult>(`${this.API_URL}/${id}/trigger`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.Message) {
      errorMessage = error.error.Message;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }

    console.error('WorkflowSchedule Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
