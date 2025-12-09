import { Injectable } from '@angular/core';
import { PermissionService } from './permission.service';
import { PageCreateRequest, PageSyncRequest } from '../models/permission.models';

@Injectable({
  providedIn: 'root'
})
export class PageInitializationService {
  private initialized = false;

  constructor(private permissionService: PermissionService) {}

  /**
   * Initialize and sync all frontend pages to the backend.
   * This should be called after successful login.
   */
  async initializePages(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const pages = this.getFrontendPages();
      const syncRequest: PageSyncRequest = { pages };

      const result = await this.permissionService.syncPages(syncRequest).toPromise();

      if (result) {
        this.initialized = true;
      }
    } catch (error) {
      // Don't throw - app should continue even if page sync fails
    }
  }

  /**
   * Get all frontend page definitions.
   * This should match the routes defined in app.routes.ts
   */
  private getFrontendPages(): PageCreateRequest[] {
    return [
      {
        pagePath: '/workflows',
        pageName: 'Workflows',
        pageIcon: 'account_tree'
      },
      {
        pagePath: '/workflow-templates',
        pageName: 'Workflow Templates',
        pageIcon: 'assignment'
      },
      {
        pagePath: '/workflow-template-configuration',
        pageName: 'Workflow Template Configuration',
        pageIcon: 'settings'
      },
      {
        pagePath: '/qr-codes',
        pageName: 'QR Codes',
        pageIcon: 'qr_code_2'
      },
      {
        pagePath: '/map-zones',
        pageName: 'Map Zones',
        pageIcon: 'map'
      },
      {
        pagePath: '/mobile-robots',
        pageName: 'Mobile Robots',
        pageIcon: 'smart_toy'
      },
      {
        pagePath: '/robot-monitoring',
        pageName: 'Robot Monitoring',
        pageIcon: 'radar'
      },
      {
        pagePath: '/mission-history',
        pageName: 'Mission History',
        pageIcon: 'history'
      },
      {
        pagePath: '/mission-control',
        pageName: 'Mission Control',
        pageIcon: 'settings_remote'
      },
      {
        pagePath: '/queue-monitor',
        pageName: 'Queue Monitor',
        pageIcon: 'queue'
      },
      {
        pagePath: '/live-jobs',
        pageName: 'Live Jobs',
        pageIcon: 'play_circle'
      },
      {
        pagePath: '/saved-custom-missions',
        pageName: 'Saved Custom Missions',
        pageIcon: 'bookmark'
      },
      {
        pagePath: '/robot-analytics',
        pageName: 'Robot Analytics',
        pageIcon: 'analytics'
      },
      {
        pagePath: '/user-management',
        pageName: 'User Management',
        pageIcon: 'people'
      },
      {
        pagePath: '/role-management',
        pageName: 'Role Management',
        pageIcon: 'admin_panel_settings'
      },
      {
        pagePath: '/create-workflow-template',
        pageName: 'Create Workflow Template',
        pageIcon: 'add_circle'
      },
      {
        pagePath: '/system-settings',
        pageName: 'System Settings',
        pageIcon: 'settings'
      },
      {
        pagePath: '/workflow-schedules',
        pageName: 'Workflow Schedules',
        pageIcon: 'schedule'
      }
    ];
  }

  /**
   * Reset initialization state (useful for testing)
   */
  reset(): void {
    this.initialized = false;
  }
}
