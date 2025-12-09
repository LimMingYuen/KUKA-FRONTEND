import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';

import { ShelfDecisionRulesComponent } from '../shelf-decision-rules/shelf-decision-rules.component';
import { MissionTypesComponent } from '../mission-types/mission-types.component';
import { RobotTypesComponent } from '../robot-types/robot-types.component';
import { ResumeStrategiesComponent } from '../resume-strategies/resume-strategies.component';
import { AreasComponent } from '../areas/areas.component';
import { OrganizationIdsComponent } from '../organization-ids/organization-ids.component';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { ShelfDecisionRulesService } from '../../services/shelf-decision-rules.service';
import { MissionTypesService } from '../../services/mission-types.service';
import { RobotTypesService } from '../../services/robot-types.service';
import { ResumeStrategiesService } from '../../services/resume-strategies.service';
import { AreasService } from '../../services/areas.service';
import { OrganizationIdsService } from '../../services/organization-ids.service';

export interface TabItem {
  label: string;
  icon: string;
  component: any;
  description: string;
}

@Component({
  selector: 'app-warehouse-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    ShelfDecisionRulesComponent,
    MissionTypesComponent,
    RobotTypesComponent,
    ResumeStrategiesComponent,
    AreasComponent,
    OrganizationIdsComponent
  ],
  templateUrl: './warehouse-management.component.html',
  styleUrl: './warehouse-management.component.css'
})
export class WarehouseManagementComponent implements OnInit, OnDestroy {
  // UI state
  public isLoading = true;
  public selectedTabIndex = 0;

  // Stats
  public totalRules = 0;
  public totalMissionTypes = 0;
  public totalRobotTypes = 0;
  public totalResumeStrategies = 0;
  public totalAreas = 0;
  public totalOrganizationIds = 0;

  // Tabs configuration
  public tabs: TabItem[] = [
    {
      label: 'Shelf Decision Rules',
      icon: 'rule',
      component: ShelfDecisionRulesComponent,
      description: 'Manage workflow template shelf decision rules and configurations'
    },
    {
      label: 'Mission Types',
      icon: 'assignment',
      component: MissionTypesComponent,
      description: 'Manage workflow template mission type configurations and settings'
    },
    {
      label: 'Robot Types',
      icon: 'smart_toy',
      component: RobotTypesComponent,
      description: 'Manage workflow template robot type configurations and settings'
    },
    {
      label: 'Resume Strategies',
      icon: 'restart_alt',
      component: ResumeStrategiesComponent,
      description: 'Manage workflow template resume strategy configurations and settings'
    },
    {
      label: 'Areas',
      icon: 'location_on',
      component: AreasComponent,
      description: 'Manage workflow template area configurations and settings'
    },
    {
      label: 'Organization IDs',
      icon: 'business',
      component: OrganizationIdsComponent,
      description: 'Manage workflow template organization ID configurations and settings'
    }
  ];

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private shelfDecisionRulesService: ShelfDecisionRulesService,
    private missionTypesService: MissionTypesService,
    private robotTypesService: RobotTypesService,
    private resumeStrategiesService: ResumeStrategiesService,
    private areasService: AreasService,
    private organizationIdsService: OrganizationIdsService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.handleRouteParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the component
   */
  private initializeComponent(): void {
    this.loadStats();
  }

  /**
   * Load statistics from services
   */
  private loadStats(): void {
    forkJoin({
      rules: this.shelfDecisionRulesService.getShelfDecisionRules(),
      missionTypes: this.missionTypesService.getMissionTypes(),
      robotTypes: this.robotTypesService.getRobotTypes(),
      resumeStrategies: this.resumeStrategiesService.getResumeStrategies(),
      areas: this.areasService.getAreas(),
      organizationIds: this.organizationIdsService.getOrganizationIds()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        this.totalRules = results.rules?.length || 0;
        this.totalMissionTypes = results.missionTypes?.length || 0;
        this.totalRobotTypes = results.robotTypes?.length || 0;
        this.totalResumeStrategies = results.resumeStrategies?.length || 0;
        this.totalAreas = results.areas?.length || 0;
        this.totalOrganizationIds = results.organizationIds?.length || 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Handle route parameters for deep linking to specific tabs
   */
  private handleRouteParams(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['tab']) {
        const tabIndex = this.getTabIndexFromLabel(params['tab']);
        if (tabIndex !== -1) {
          this.selectedTabIndex = tabIndex;
        }
      }
    });

    // Update URL when tab changes
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateRouteWithTab();
    });
  }

  /**
   * Get tab index from label
   */
  private getTabIndexFromLabel(label: string): number {
    if (!label) return -1;
    return this.tabs.findIndex(tab =>
      tab && tab.label && tab.label.toLowerCase().replace(/\s+/g, '-') === label.toLowerCase()
    );
  }

  /**
   * Update route with current tab
   */
  private updateRouteWithTab(): void {
    const currentTab = this.tabs[this.selectedTabIndex];
    if (!currentTab || !currentTab.label) {
      return; // Skip if tab is undefined or has no label
    }

    const tabLabel = currentTab.label.toLowerCase().replace(/\s+/g, '-');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabLabel },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Handle tab change
   */
  onTabChange(event: any): void {
    if (event && typeof event.index === 'number' && event.index >= 0) {
      this.selectedTabIndex = event.index;
      this.updateRouteWithTab();
    }
  }

  /**
   * Get tab icon
   */
  getTabIcon(tab: TabItem): string {
    return tab.icon;
  }

  /**
   * Get tab description
   */
  getTabDescription(tab: TabItem): string {
    return tab.description;
  }

  /**
   * Check if tab is active
   */
  isTabActive(index: number): boolean {
    return index === this.selectedTabIndex;
  }

  /**
   * Get loading state for specific tab
   */
  isTabLoading(index: number): boolean {
    return this.isLoading || (index === 0 && this.isLoading);
  }

  /**
   * Get component type for tab
   */
  getTabComponent(index: number): any {
    return this.tabs[index]?.component;
  }

  /**
   * Get statistics for dashboard overview
   */
  getConfigurationStats(): {
    totalRules: number;
    totalMissionTypes: number;
    totalRobotTypes: number;
    totalResumeStrategies: number;
    totalAreas: number;
    totalOrganizationIds: number;
  } {
    return {
      totalRules: this.totalRules,
      totalMissionTypes: this.totalMissionTypes,
      totalRobotTypes: this.totalRobotTypes,
      totalResumeStrategies: this.totalResumeStrategies,
      totalAreas: this.totalAreas,
      totalOrganizationIds: this.totalOrganizationIds
    };
  }

  /**
   * Navigate to specific tab
   */
  navigateToTab(index: number): void {
    if (typeof index === 'number' && index >= 0 && index < this.tabs.length) {
      this.selectedTabIndex = index;
      this.onTabChange({ index });
    }
  }
}
