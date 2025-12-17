import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, signal, ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

import { NavigationService } from '../services/navigation.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { SidebarItem, SidebarSection } from '../models/sidebar.models';
import { Subject, takeUntil } from 'rxjs';
import { NotificationPanelComponent } from '../shared/components/notification-panel/notification-panel.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatSidenavModule,
    MatTooltipModule,
    MatDividerModule,
    MatMenuModule,
    MatBadgeModule,
    NotificationPanelComponent
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  public sidebarSections: SidebarSection[] = [];

  // Reactive state
  public showNotificationPanel = signal<boolean>(false);

  // Regular properties updated via subscription (not getters - avoids tooltip issues)
  public sidebarCollapsed: boolean = true;
  public activeRoute: string = '';
  public expandedItems: Set<string> = new Set();

  // Notification properties (avoid calling service signals directly in template)
  public unreadCount: number = 0;
  public hasUnread: boolean = false;

  // ViewChild for notification button to calculate dropdown position
  @ViewChild('notificationButton', { read: ElementRef })
  notificationButtonRef!: ElementRef;

  // Dynamic position for notification panel dropdown
  public notificationPanelTop = 0;
  public notificationPanelLeft = 0;

  private destroy$ = new Subject<void>();
  private lastExpandedRoute = '';

  constructor(
    public navigationService: NavigationService,
    private authService: AuthService,
    private router: Router,
    public notificationService: NotificationService,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    this.loadSidebarItems();
    this.subscribeToNavigationState();
    this.subscribeToSignals();
  }

  ngAfterViewInit(): void {
    // Initialize expanded items based on active route
    this.expandActiveItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load sidebar navigation items
   */
  private loadSidebarItems(): void {
    this.sidebarSections = this.navigationService.getSidebarItems();
  }

  /**
   * Subscribe to navigation state changes
   */
  private subscribeToNavigationState(): void {
    // Subscribe to router events to expand active items on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Expand items that have active children after navigation
      this.expandActiveItems();
    });
  }

  /**
   * Subscribe to service signals and update local properties
   * Using toObservable to convert signals to observables for stable subscriptions
   */
  private subscribeToSignals(): void {
    runInInjectionContext(this.injector, () => {
      // Subscribe to sidebarCollapsed signal
      toObservable(this.navigationService.sidebarCollapsed)
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          this.sidebarCollapsed = value;
        });

      // Subscribe to activeRoute signal
      toObservable(this.navigationService.activeRoute)
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          this.activeRoute = value;
        });

      // Subscribe to expandedItems signal
      toObservable(this.navigationService.expandedItems)
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          this.expandedItems = value;
        });

      // Subscribe to notification signals
      toObservable(this.notificationService.unreadCount)
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          this.unreadCount = value;
        });

      toObservable(this.notificationService.hasUnread)
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          this.hasUnread = value;
        });
    });
  }

  /**
   * Expand items that have active children (idempotent - only adds, never removes)
   */
  private expandActiveItems(): void {
    this.sidebarSections.forEach(section => {
      section.items.forEach(item => {
        if (this.navigationService.hasActiveChildren(item)) {
          // Only expand if not already expanded (idempotent operation)
          if (!this.navigationService.isItemExpanded(item.id)) {
            this.navigationService.toggleExpandedItem(item.id);
          }
        }
      });
    });
  }

  /**
   * Navigate to a specific route
   */
  public navigateToRoute(itemOrRoute: SidebarItem | string): void {
    if (typeof itemOrRoute === 'string') {
      this.router.navigate([itemOrRoute]);
    } else {
      if (itemOrRoute.disabled) return;
      this.navigationService.navigateToRoute(itemOrRoute.route);
    }
  }

  /**
   * Toggle sidebar collapsed state
   */
  public toggleSidebar(): void {
    this.navigationService.toggleSidebar();
  }

  /**
   * Toggle expanded state of a navigation item
   */
  public toggleExpanded(item: SidebarItem): void {
    if (item.children && item.children.length > 0) {
      this.navigationService.toggleExpandedItem(item.id);
    }
  }

  /**
   * Check if a route is currently active
   */
  public isRouteActive(route: string): boolean {
    return this.navigationService.isRouteActive(route);
  }

  /**
   * Check if a sidebar item has active children
   */
  public hasActiveChildren(item: SidebarItem): boolean {
    return this.navigationService.hasActiveChildren(item);
  }

  /**
   * Check if a sidebar item is expanded
   */
  public isItemExpanded(itemId: string): boolean {
    return this.navigationService.isItemExpanded(itemId);
  }

  /**
   * Handle keyboard navigation
   */
  public onKeydown(event: KeyboardEvent, item: SidebarItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navigateToRoute(item);
    }
  }

  /**
   * Get CSS classes for sidebar item
   */
  public getItemClasses(item: SidebarItem): { [key: string]: boolean } {
    return {
      'sidebar-item': true,
      'sidebar-item--active': this.isRouteActive(item.route),
      'sidebar-item--has-children': !!(item.children && item.children.length > 0),
      'sidebar-item--expanded': this.isItemExpanded(item.id),
      'sidebar-item--disabled': !!item.disabled
    };
  }

  /**
   * Get CSS classes for sidebar container
   */
  public getSidebarClasses(): { [key: string]: boolean } {
    return {
      'sidebar': true,
      'sidebar--collapsed': this.sidebarCollapsed,
      'sidebar--expanded': !this.sidebarCollapsed
    };
  }

  /**
   * Logout user
   */
  public logout(): void {
    this.authService.logout();
  }

  /**
   * Toggle notification panel visibility
   */
  public toggleNotificationPanel(): void {
    if (!this.showNotificationPanel()) {
      // Calculate position before showing the panel
      const rect = this.notificationButtonRef.nativeElement.getBoundingClientRect();
      this.notificationPanelTop = rect.bottom + 8; // 8px gap below button
      this.notificationPanelLeft = rect.left;      // Align left edge with button
    }
    this.showNotificationPanel.update(value => !value);
  }

  /**
   * Close notification panel
   */
  public closeNotificationPanel(): void {
    this.showNotificationPanel.set(false);
  }

  /**
   * Track by function for sections
   */
  public trackBySectionId(index: number, section: SidebarSection): string {
    return section.id;
  }

  /**
   * Track by function for items
   */
  public trackByItemId(index: number, item: SidebarItem): string {
    return item.id;
  }

  /**
   * Get user initials for avatar
   */
  public getUserInitials(): string {
    const user = this.authService.currentUser();
    if (user?.username) {
      const names = user.username.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'LM';
  }

  /**
   * Get user name
   */
  public getUserName(): string {
    const user = this.authService.currentUser();
    return user?.username || 'User';
  }
}