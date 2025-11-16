import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SavedCustomMissionsService } from './saved-custom-missions.service';
import { SavedCustomMissionDto } from '../models/saved-custom-missions.models';

/**
 * Template Validation Result
 */
export interface TemplateValidationResult {
  templateId: number;
  templateName: string;
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

/**
 * Validation Warning (non-critical)
 */
export interface ValidationWarning {
  field: string;
  message: string;
  configType: 'missionType' | 'robotType' | 'resumeStrategy' | 'area';
}

/**
 * Validation Error (critical)
 */
export interface ValidationError {
  field: string;
  message: string;
  configType: 'missionType' | 'robotType' | 'resumeStrategy' | 'area';
}

/**
 * Configuration Usage Result
 */
export interface ConfigurationUsageResult {
  configType: 'missionType' | 'robotType' | 'resumeStrategy' | 'area' | 'shelfRule';
  configValue: string;
  usageCount: number;
  affectedTemplates: {
    id: number;
    name: string;
  }[];
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  msg?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class TemplateValidationService {
  private readonly API_URL = 'http://localhost:5109/api';

  // Reactive state
  public isValidating = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private savedCustomMissionsService: SavedCustomMissionsService
  ) {}

  /**
   * Get JWT token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Get HTTP headers with authentication
   */
  private getHttpHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Check if a mission type is used by any templates
   */
  public checkMissionTypeUsage(missionTypeValue: string): Observable<ConfigurationUsageResult> {
    return this.savedCustomMissionsService.getAllSavedCustomMissions().pipe(
      map(templates => {
        const affectedTemplates = templates
          .filter(t => t.missionType === missionTypeValue)
          .map(t => ({
            id: t.id,
            name: t.missionName
          }));

        return {
          configType: 'missionType' as const,
          configValue: missionTypeValue,
          usageCount: affectedTemplates.length,
          affectedTemplates
        };
      }),
      catchError(error => {
        console.error('Error checking mission type usage:', error);
        return of({
          configType: 'missionType' as const,
          configValue: missionTypeValue,
          usageCount: 0,
          affectedTemplates: []
        });
      })
    );
  }

  /**
   * Check if a robot type is used by any templates
   */
  public checkRobotTypeUsage(robotTypeValue: string): Observable<ConfigurationUsageResult> {
    return this.savedCustomMissionsService.getAllSavedCustomMissions().pipe(
      map(templates => {
        const affectedTemplates = templates
          .filter(t => t.robotType === robotTypeValue)
          .map(t => ({
            id: t.id,
            name: t.missionName
          }));

        return {
          configType: 'robotType' as const,
          configValue: robotTypeValue,
          usageCount: affectedTemplates.length,
          affectedTemplates
        };
      }),
      catchError(error => {
        console.error('Error checking robot type usage:', error);
        return of({
          configType: 'robotType' as const,
          configValue: robotTypeValue,
          usageCount: 0,
          affectedTemplates: []
        });
      })
    );
  }

  /**
   * Check if a resume strategy is used by any templates
   */
  public checkResumeStrategyUsage(strategyValue: string): Observable<ConfigurationUsageResult> {
    return this.savedCustomMissionsService.getAllSavedCustomMissions().pipe(
      map(templates => {
        const affectedTemplates: { id: number; name: string }[] = [];

        templates.forEach(template => {
          try {
            const missionSteps = JSON.parse(template.missionStepsJson || '[]');
            const usesStrategy = missionSteps.some(
              (step: any) => step.passStrategy === strategyValue
            );
            if (usesStrategy) {
              affectedTemplates.push({
                id: template.id,
                name: template.missionName
              });
            }
          } catch (error) {
            console.error(`Error parsing mission steps for template ${template.id}:`, error);
          }
        });

        return {
          configType: 'resumeStrategy' as const,
          configValue: strategyValue,
          usageCount: affectedTemplates.length,
          affectedTemplates
        };
      }),
      catchError(error => {
        console.error('Error checking resume strategy usage:', error);
        return of({
          configType: 'resumeStrategy' as const,
          configValue: strategyValue,
          usageCount: 0,
          affectedTemplates: []
        });
      })
    );
  }

  /**
   * Validate a single template against current configuration
   */
  public validateTemplate(
    template: SavedCustomMissionDto,
    activeMissionTypes: string[],
    activeRobotTypes: string[],
    activeResumeStrategies: string[]
  ): TemplateValidationResult {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];

    // Check mission type
    if (!activeMissionTypes.includes(template.missionType)) {
      errors.push({
        field: 'missionType',
        message: `Mission type "${template.missionType}" is not active or does not exist`,
        configType: 'missionType'
      });
    }

    // Check robot type
    if (!activeRobotTypes.includes(template.robotType)) {
      errors.push({
        field: 'robotType',
        message: `Robot type "${template.robotType}" is not active or does not exist`,
        configType: 'robotType'
      });
    }

    // Check resume strategies in mission steps
    try {
      const missionSteps = JSON.parse(template.missionStepsJson || '[]');
      missionSteps.forEach((step: any, index: number) => {
        if (step.passStrategy && !activeResumeStrategies.includes(step.passStrategy)) {
          warnings.push({
            field: `missionStep[${index}].passStrategy`,
            message: `Resume strategy "${step.passStrategy}" in step ${index + 1} is not active or does not exist`,
            configType: 'resumeStrategy'
          });
        }
      });
    } catch (error) {
      errors.push({
        field: 'missionStepsJson',
        message: 'Invalid mission steps JSON format',
        configType: 'missionType'
      });
    }

    return {
      templateId: template.id,
      templateName: template.missionName,
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Validate all templates
   */
  public validateAllTemplates(
    templates: SavedCustomMissionDto[],
    activeMissionTypes: string[],
    activeRobotTypes: string[],
    activeResumeStrategies: string[]
  ): TemplateValidationResult[] {
    return templates.map(template =>
      this.validateTemplate(template, activeMissionTypes, activeRobotTypes, activeResumeStrategies)
    );
  }

  /**
   * Get validation summary
   */
  public getValidationSummary(validationResults: TemplateValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    withWarnings: number;
  } {
    return {
      total: validationResults.length,
      valid: validationResults.filter(r => r.isValid && r.warnings.length === 0).length,
      invalid: validationResults.filter(r => !r.isValid).length,
      withWarnings: validationResults.filter(r => r.isValid && r.warnings.length > 0).length
    };
  }
}
