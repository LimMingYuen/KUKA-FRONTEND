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
import { Subject, takeUntil } from 'rxjs';

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
    AreasComponent
  ],
  templateUrl: './warehouse-management.component.html',
  styleUrl: './warehouse-management.component.css'
})
export class WarehouseManagementComponent implements OnInit, OnDestroy {
  // UI state
  public isLoading = true;
  public selectedTabIndex = 0;

  // Tabs configuration
  public tabs: TabItem[] = [
    {
      label: 'Shelf Decision Rules',
      icon: 'rule',
      component: ShelfDecisionRulesComponent,
      description: 'Manage warehouse shelf decision rules and configurations'
    },
    {
      label: 'Mission Types',
      icon: 'assignment',
      component: MissionTypesComponent,
      description: 'Manage mission type configurations and settings'
    },
    {
      label: 'Robot Types',
      icon: 'smart_toy',
      component: RobotTypesComponent,
      description: 'Manage robot type configurations and settings'
    },
    {
      label: 'Resume Strategies',
      icon: 'restart_alt',
      component: ResumeStrategiesComponent,
      description: 'Manage resume strategy configurations and settings'
    },
    {
      label: 'Areas',
      icon: 'location_on',
      component: AreasComponent,
      description: 'Manage warehouse area configurations and settings'
    }
  ];

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router
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
    // Simulate loading time
    setTimeout(() => {
      this.isLoading = false;
    }, 500);
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
  getWarehouseStats(): {
    totalRules: number;
    activeRobots: number;
    totalMissions: number;
    qrCodeCount: number;
  } {
    // These would come from respective services in a real implementation
    return {
      totalRules: 0,
      activeRobots: 0,
      totalMissions: 0,
      qrCodeCount: 0
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