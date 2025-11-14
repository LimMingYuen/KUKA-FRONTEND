/**
 * Sidebar navigation models and interfaces
 */

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: string | number;
  children?: SidebarItem[];
  disabled?: boolean;
  external?: boolean;
  target?: string;
}

export interface SidebarSection {
  id: string;
  label: string;
  items: SidebarItem[];
}

export interface SidebarConfig {
  collapsed: boolean;
  hoverable: boolean;
  showLabels: boolean;
  compactMode: boolean;
}

export interface NavigationState {
  activeRoute: string;
  expandedItems: Set<string>;
  sidebarCollapsed: boolean;
}