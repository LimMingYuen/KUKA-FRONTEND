import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';

import { NavigationService } from '../services/navigation.service';
import { AuthService } from '../services/auth.service';
import { SidebarItem, SidebarSection } from '../models/sidebar.models';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    MatDividerModule,
    MatExpansionModule,
    MatCardModule,
    MatMenuModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  public sidebarSections: SidebarSection[] = [];

  // Reactive state
  public activeRoute = '';
  public sidebarCollapsed = false;
  public expandedItems = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    public navigationService: NavigationService,
    private authService: AuthService,
    private router: Router
  ) {
    // Set up reactive effects for navigation state changes
    effect(() => {
      this.activeRoute = this.navigationService.activeRoute();
    });

    effect(() => {
      this.sidebarCollapsed = this.navigationService.sidebarCollapsed();
    });

    effect(() => {
      this.expandedItems = this.navigationService.expandedItems();
    });

    effect(() => {
      // Expand active items when route changes
      this.expandActiveItems();
    });
  }

  ngOnInit(): void {
    this.loadSidebarItems();
    this.subscribeToNavigationState();
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
    // Navigation state changes are handled by effects
  }

  /**
   * Expand items that have active children
   */
  private expandActiveItems(): void {
    this.sidebarSections.forEach(section => {
      section.items.forEach(item => {
        if (this.navigationService.hasActiveChildren(item)) {
          this.navigationService.toggleExpandedItem(item.id);
        }
      });
    });
  }

  /**
   * Navigate to a specific route
   */
  public navigateToRoute(item: SidebarItem): void {
    if (item.disabled) return;

    this.navigationService.navigateToRoute(item.route);
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
}