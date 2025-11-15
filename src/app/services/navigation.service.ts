import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SidebarItem, SidebarSection, NavigationState } from '../models/sidebar.models';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  // Reactive state using signals
  public activeRoute = signal<string>('');
  public sidebarCollapsed = signal<boolean>(false);
  public expandedItems = signal<Set<string>>(new Set());

  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.initializeNavigation();
  }

  /**
   * Initialize navigation state and listen to route changes
   */
  private initializeNavigation(): void {
    // Listen to route changes
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
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
   * Get sidebar navigation items configuration
   */
  public getSidebarItems(): SidebarSection[] {
    return [
      {
        id: 'main',
        label: 'Main',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/dashboard'
          },
          {
            id: 'workflows',
            label: 'Workflows',
            icon: 'account_tree',
            route: '/workflows'
          }
        ]
      },
      {
        id: 'management',
        label: 'Warehouse Management',
        items: [
          {
            id: 'warehouse-management',
            label: 'Warehouse Management',
            icon: 'warehouse',
            route: '/warehouse-management'
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
                    {
            id: 'mission-history',
            label: 'Mission History',
            icon: 'history',
            route: '/mission-history'
          },
          {
            id: 'saved-custom-missions',
            label: 'Saved Custom Missions',
            icon: 'save',
            route: '/saved-custom-missions'
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
          }
        ]
      },
      {
        id: 'system',
        label: 'System',
        items: [
          {
            id: 'monitoring',
            label: 'Monitoring',
            icon: 'monitor_heart',
            route: '/monitoring'
          },
          {
            id: 'help',
            label: 'Help & Support',
            icon: 'help',
            route: '/help'
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
   * Cleanup on service destruction
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}