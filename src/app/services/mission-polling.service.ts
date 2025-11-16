import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subject, takeUntil } from 'rxjs';
import { MissionsService } from './missions.service';
import { JobData, RobotData, MissionsUtils } from '../models/missions.models';

export interface MissionJob {
  id: number;
  type: 'workflow' | 'custom';
  missionCode: string;
  jobData?: JobData;
  robotData?: RobotData;
}

@Injectable({
  providedIn: 'root'
})
export class MissionPollingService implements OnDestroy {
  private activeMissions: Map<number, MissionJob> = new Map();
  private pollingSubscriptions: Map<string, any> = new Map();
  private destroy$ = new Subject<void>();

  // Observable stream of active missions
  private activeMissions$ = new BehaviorSubject<Map<number, MissionJob>>(new Map());

  constructor(private missionsService: MissionsService) {}

  /**
   * Get observable of active missions
   */
  getActiveMissions$() {
    return this.activeMissions$.asObservable();
  }

  /**
   * Get current active missions
   */
  getActiveMissions(): Map<number, MissionJob> {
    return new Map(this.activeMissions);
  }

  /**
   * Start tracking a mission
   */
  startTracking(id: number, missionCode: string, type: 'workflow' | 'custom'): void {
    // Add to active missions
    this.activeMissions.set(id, {
      id,
      type,
      missionCode
    });
    this.emitUpdate();

    // Start polling if not already polling
    if (!this.pollingSubscriptions.has(missionCode)) {
      this.startPolling(id, missionCode, type);
    }
  }

  /**
   * Stop tracking a mission
   */
  stopTracking(id: number): void {
    const mission = this.activeMissions.get(id);
    if (mission) {
      this.stopPolling(mission.missionCode);
      this.activeMissions.delete(id);
      this.emitUpdate();
    }
  }

  /**
   * Start polling for a mission
   */
  private startPolling(id: number, missionCode: string, type: 'workflow' | 'custom'): void {
    const subscription = interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Query job status
        this.missionsService.queryJobs({
          jobCode: missionCode,
          limit: 10
        }).subscribe({
          next: (response) => {
            if (response.success && response.data && response.data.length > 0) {
              const jobData = response.data[0];

              // Update mission data
              const mission = this.activeMissions.get(id);
              if (mission) {
                mission.jobData = jobData;
                this.emitUpdate();

                // Query robot status if robotId is available
                if (jobData.robotId) {
                  this.queryRobotStatus(id, jobData.robotId);
                }

                // Stop polling if job is in terminal state
                if (MissionsUtils.isJobTerminal(jobData.status)) {
                  this.stopPolling(missionCode);
                }
              }
            }
          },
          error: (error) => {
            console.error('Error polling job status:', error);
          }
        });
      });

    this.pollingSubscriptions.set(missionCode, subscription);
  }

  /**
   * Query robot status
   */
  private queryRobotStatus(id: number, robotId: string): void {
    this.missionsService.queryRobots({
      robotId: robotId
    }).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          const robotData = response.data[0];

          // Update mission data
          const mission = this.activeMissions.get(id);
          if (mission) {
            mission.robotData = robotData;
            this.emitUpdate();
          }
        }
      },
      error: (error) => {
        console.error('Error querying robot status:', error);
      }
    });
  }

  /**
   * Stop polling for a mission
   */
  private stopPolling(missionCode: string): void {
    const subscription = this.pollingSubscriptions.get(missionCode);
    if (subscription) {
      subscription.unsubscribe();
      this.pollingSubscriptions.delete(missionCode);
    }
  }

  /**
   * Emit update to subscribers
   */
  private emitUpdate(): void {
    this.activeMissions$.next(new Map(this.activeMissions));
  }

  /**
   * Clear all tracking
   */
  clearAll(): void {
    this.pollingSubscriptions.forEach(sub => sub.unsubscribe());
    this.pollingSubscriptions.clear();
    this.activeMissions.clear();
    this.emitUpdate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAll();
  }
}
