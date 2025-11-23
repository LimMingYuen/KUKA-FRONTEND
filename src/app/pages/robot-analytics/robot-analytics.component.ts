import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil } from 'rxjs';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { RobotAnalyticsService } from '../../services/robot-analytics.service';
import {
  UtilizationMetrics,
  UtilizationRequest,
  RobotInfo,
  formatMinutes,
  formatTimestamp,
  getDefaultDateRange
} from '../../models/robot-analytics.models';
import {
  getUtilizationLineChartConfig,
  getTimeDistributionChartConfig
} from './chart-configs';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-robot-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    BaseChartDirective
  ],
  templateUrl: './robot-analytics.component.html',
  styleUrl: './robot-analytics.component.scss'
})
export class RobotAnalyticsComponent implements OnInit, OnDestroy {
  // Component state
  public utilizationData: UtilizationMetrics | null = null;
  public isLoading = false;
  public error: string | null = null;
  public availableRobots: RobotInfo[] = [];
  public filtersExpanded = true; // Expanded by default on first load

  // Filter values
  public selectedRobotId: string = '';
  public startDate: Date;
  public endDate: Date;
  public startHour: string = '00';
  public startMinute: string = '00';
  public endHour: string = '23';
  public endMinute: string = '59';
  public groupBy: 'hour' | 'day' = 'day';

  // Time selector options
  public hours: string[] = [];
  public minutes: string[] = [];

  // Chart data and options
  public utilizationChartData: any;
  public utilizationChartOptions: any;
  public timeDistributionChartData: any;
  public timeDistributionChartOptions: any;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(public analyticsService: RobotAnalyticsService) {
    // Initialize time selector options
    this.hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    this.minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    // Initialize default date range
    const defaultRange = getDefaultDateRange();
    this.startDate = defaultRange.start;
    this.endDate = defaultRange.end;

    // Initialize chart configurations
    const utilizationConfig = getUtilizationLineChartConfig();
    this.utilizationChartData = utilizationConfig.data;
    this.utilizationChartOptions = utilizationConfig.options;

    const timeDistConfig = getTimeDistributionChartConfig();
    this.timeDistributionChartData = timeDistConfig.data;
    this.timeDistributionChartOptions = timeDistConfig.options;

    // Set up reactive effects for service state
    effect(() => {
      this.isLoading = this.analyticsService.isLoading();
    });

    effect(() => {
      this.error = this.analyticsService.error();
    });

    effect(() => {
      const data = this.analyticsService.utilizationData();
      if (data) {
        this.utilizationData = data;
        this.updateCharts();
      }
    });

    effect(() => {
      this.availableRobots = this.analyticsService.availableRobots();
    });
  }

  ngOnInit(): void {
    this.loadAvailableRobots();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load available robots
   */
  private loadAvailableRobots(): void {
    this.analyticsService.getAvailableRobots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (robots) => {
          if (robots && robots.length > 0) {
            this.selectedRobotId = robots[0].id;
            this.loadDefaultData();
          }
        },
        error: (error) => {
          console.error('Error loading robots:', error);
        }
      });
  }

  /**
   * Load default analytics data
   */
  public loadDefaultData(): void {
    if (!this.selectedRobotId) {
      console.warn('No robot selected');
      return;
    }

    const request: UtilizationRequest = {
      robotId: this.selectedRobotId,
      start: this.combineDateAndTime(this.startDate, this.startHour, this.startMinute),
      end: this.combineDateAndTime(this.endDate, this.endHour, this.endMinute),
      groupBy: this.groupBy
    };

    this.analyticsService.getUtilization(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading analytics:', error);
        }
      });
  }

  /**
   * Combine date and time into a single Date object
   */
  private combineDateAndTime(date: Date, hour: string, minute: string): Date {
    if (!date || hour === null || minute === null) {
      return date;
    }

    const combined = new Date(date);
    combined.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    return combined;
  }

  /**
   * Handle time change from hour/minute selectors
   * Note: No longer auto-loads data, user must click Search button
   */
  public onTimeChange(): void {
    // Removed auto-load - user must click Search button
  }

  /**
   * Handle filter changes
   * Note: No longer auto-loads data, user must click Search button
   */
  public onFiltersChange(): void {
    // Removed auto-load - user must click Search button
  }

  /**
   * Apply filters and load analytics data
   * This is triggered by the Search button
   */
  public applyFilters(): void {
    this.loadDefaultData();

    // Auto-collapse filters after search to show results
    this.filtersExpanded = false;
  }

  /**
   * Reset filters to default values
   */
  public resetFilters(): void {
    const defaultRange = getDefaultDateRange();
    this.startDate = defaultRange.start;
    this.endDate = defaultRange.end;
    this.startHour = '00';
    this.startMinute = '00';
    this.endHour = '23';
    this.endMinute = '59';
    this.groupBy = 'day';

    // Optionally clear the current data
    this.utilizationData = null;
    this.error = null;
  }

  /**
   * Refresh data
   */
  public refreshData(): void {
    this.loadDefaultData();
  }

  /**
   * Export data to CSV
   */
  public exportData(): void {
    if (!this.utilizationData) {
      console.warn('No data to export');
      return;
    }

    this.analyticsService.exportToCsv(this.utilizationData);
  }

  /**
   * Update charts with new data
   */
  private updateCharts(): void {
    if (!this.utilizationData || !this.utilizationData.dataPoints) {
      return;
    }

    const dataPoints = this.utilizationData.dataPoints;
    const labels = dataPoints.map(p => formatTimestamp(p.timestamp, this.utilizationData!.grouping));

    // Update Utilization Line Chart
    this.utilizationChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Utilization Rate (%)',
          data: dataPoints.map(p => p.utilizationRate),
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#1976d2',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    };

    // Update Time Distribution Stacked Chart
    this.timeDistributionChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Working Time',
          data: dataPoints.map(p => p.workingMinutes),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.6)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: 'Charging Time',
          data: dataPoints.map(p => p.chargingMinutes),
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33, 150, 243, 0.6)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: 'Idle Time',
          data: dataPoints.map(p => p.idleMinutes),
          borderColor: '#9e9e9e',
          backgroundColor: 'rgba(158, 158, 158, 0.6)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    };
  }

  /**
   * Format minutes helper (expose to template)
   */
  public formatMinutes(minutes: number): string {
    return formatMinutes(minutes);
  }
}
