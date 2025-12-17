import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SidebarItem, SidebarSection, NavigationState } from '../models/sidebar.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  // Reactive state using signals
  public activeRoute = signal<string>('');
  public sidebarCollapsed = signal<boolean>(false);
  public expandedItems = signal<Set<string>>(new Set());

  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);

  constructor(private router: Router) {
    this.initializeNavigation();
  }

  /**
   * Initialize navigation state and listen to route changes
   */
  private initializeNavigation(): void {
    // Listen to NavigationEnd events only (not all router events)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateActiveRoute();
    });

    // Set initial active route
    this.updateActiveRoute();
  }

  /**
   * Update the active route based on current URL
   */
  private updateActiveRoute(): void {
    const currentUrl = this.router.url;
    this.activeRoute.set(currentUrl);
  }

  /**
   * Get sidebar navigation items configuration (filtered by user permissions)
   */
  public getSidebarItems(): SidebarSection[] {
    const allSections = this.getAllSidebarSections();
    return this.filterSectionsByPermissions(allSections);
  }

  /**
   * Get all sidebar sections (unfiltered)
   */
  private getAllSidebarSections(): SidebarSection[] {
    return [
      {
        id: 'main',
        label: 'Main',
        items: [
          {
            id: 'workflows',
            label: 'Workflows',
            icon: 'account_tree',
            route: '/workflows'
          },
          {
            id: 'workflow-templates',
            label: 'Workflow Templates',
            icon: 'assignment',
            route: '/workflow-templates'
          }
        ]
      },
      {
        id: 'management',
        label: 'Configuration',
        items: [
          {
            id: 'workflow-template-configuration',
            label: 'Workflow Template Configuration',
            icon: 'settings',
            route: '/workflow-template-configuration'
          }
        ]
      },
      {
        id: 'operations',
        label: 'Operations',
        items: [
          {
            id: 'qr-codes',
            label: 'QR Codes',
            icon: 'qr_code_2',
            route: '/qr-codes'
          },
          {
            id: 'map-zones',
            label: 'Map Zones',
            icon: 'map',
            route: '/map-zones'
          },
          {
            id: 'mobile-robots',
            label: 'Mobile Robots',
            icon: 'smart_toy',
            route: '/mobile-robots'
          },
          // Robot Monitoring hidden - uncomment to restore
          // {
          //   id: 'robot-monitoring',
          //   label: 'Robot Monitoring',
          //   icon: 'radar',
          //   route: '/robot-monitoring'
          // },
          {
            id: 'mission-history',
            label: 'Mission History',
            icon: 'history',
            route: '/mission-history'
          },
          {
            id: 'mission-control',
            label: 'Mission Control',
            icon: 'settings_remote',
            route: '/mission-control'
          },
          {
            id: 'queue-monitor',
            label: 'Queue Monitor',
            icon: 'queue',
            route: '/queue-monitor'
          },
          {
            id: 'live-jobs',
            label: 'Live Jobs',
            icon: 'play_circle',
            route: '/live-jobs'
          },
          {
            id: 'workflow-schedules',
            label: 'Workflow Schedules',
            icon: 'schedule',
            route: '/workflow-schedules'
          }
        ]
      },
      {
        id: 'analytics',
        label: 'Analytics',
        items: [
          {
            id: 'robot-analytics',
            label: 'Robot Analytics',
            icon: 'analytics',
            route: '/robot-analytics'
          }
        ]
      },
      {
        id: 'administration',
        label: 'Administration',
        items: [
          {
            id: 'user-management',
            label: 'User Management',
            icon: 'people',
            route: '/user-management'
          },
          {
            id: 'role-management',
            label: 'Role Management',
            icon: 'admin_panel_settings',
            route: '/role-management'
          },
          {
            id: 'system-settings',
            label: 'System Settings',
            icon: 'settings',
            route: '/system-settings'
          },
          {
            id: 'log-cleanup',
            label: 'Log Cleanup',
            icon: 'cleaning_services',
            route: '/log-cleanup'
          }
        ]
      }
    ];
  }

  /**
   * Navigate to a specific route
   */
  public navigateToRoute(route: string): void {
    if (route.startsWith('http')) {
      // External link
      window.open(route, '_blank');
    } else {
      // Internal navigation
      this.router.navigate([route]);
    }
  }

  /**
   * Toggle sidebar collapsed state
   */
  public toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  /**
   * Set sidebar collapsed state
   */
  public setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }

  /**
   * Toggle expanded state of a sidebar item
   */
  public toggleExpandedItem(itemId: string): void {
    const currentExpanded = new Set(this.expandedItems());
    if (currentExpanded.has(itemId)) {
      currentExpanded.delete(itemId);
    } else {
      currentExpanded.add(itemId);
    }
    this.expandedItems.set(currentExpanded);
  }

  /**
   * Check if a route is currently active
   */
  public isRouteActive(route: string): boolean {
    const currentRoute = this.activeRoute();
    return currentRoute === route || currentRoute.startsWith(route + '/');
  }

  /**
   * Check if a sidebar item has active children
   */
  public hasActiveChildren(item: SidebarItem): boolean {
    if (!item.children || item.children.length === 0) {
      return false;
    }
    return item.children.some(child => this.isRouteActive(child.route));
  }

  /**
   * Check if a sidebar item is expanded
   */
  public isItemExpanded(itemId: string): boolean {
    return this.expandedItems().has(itemId);
  }

  /**
   * Get navigation state
   */
  public getNavigationState(): NavigationState {
    return {
      activeRoute: this.activeRoute(),
      expandedItems: this.expandedItems(),
      sidebarCollapsed: this.sidebarCollapsed()
    };
  }

  /**
   * Filter sidebar sections by user permissions
   */
  private filterSectionsByPermissions(sections: SidebarSection[]): SidebarSection[] {
    // If user is not authenticated, return empty array
    if (!this.authService.isLoggedIn()) {
      return [];
    }

    // Filter sections and their items
    return sections
      .map(section => ({
        ...section,
        items: this.filterItemsByPermissions(section.items)
      }))
      .filter(section => section.items.length > 0); // Remove empty sections
  }

  /**
   * Filter sidebar items by user permissions
   */
  private filterItemsByPermissions(items: SidebarItem[]): SidebarItem[] {
    return items
      .filter(item => {
        // Check if user can access this route
        return this.authService.canAccessPage(item.route);
      })
      .map(item => {
        // If item has children, filter them recursively
        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: this.filterItemsByPermissions(item.children)
          };
        }
        return item;
      });
  }

  /**
   * Cleanup on service destruction
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}