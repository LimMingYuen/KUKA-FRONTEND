import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login - KUKA GUI'
  },
  {
    path: 'workflows',
    loadComponent: () => import('./workflows/workflows').then(m => m.WorkflowsComponent),
    canActivate: [authGuard],
    title: 'Workflows - KUKA GUI'
  },
  {
    path: 'workflow-template-configuration',
    loadComponent: () => import('./pages/warehouse-management/warehouse-management.component').then(m => m.WarehouseManagementComponent),
    canActivate: [authGuard],
    title: 'Workflow Template Configuration - KUKA GUI'
  },
  {
    path: 'map-zones',
    loadComponent: () => import('./pages/map-zones/map-zones.component').then(m => m.MapZonesComponent),
    canActivate: [authGuard],
    title: 'Map Zones - KUKA GUI'
  },
  {
    path: 'qr-codes',
    loadComponent: () => import('./pages/qr-codes/qr-codes.component').then(m => m.QrCodesComponent),
    canActivate: [authGuard],
    title: 'QR Codes - KUKA GUI'
  },
  {
    path: 'mobile-robots',
    loadComponent: () => import('./pages/mobile-robots/mobile-robots.component').then(m => m.MobileRobotsComponent),
    canActivate: [authGuard],
    title: 'Mobile Robots - KUKA GUI'
  },
    {
    path: 'mission-history',
    loadComponent: () => import('./pages/mission-history/mission-history.component').then(m => m.MissionHistoryComponent),
    canActivate: [authGuard],
    title: 'Mission History - KUKA GUI'
  },
  {
    path: 'saved-custom-missions',
    loadComponent: () => import('./pages/saved-custom-missions/saved-custom-missions.component').then(m => m.SavedCustomMissionsComponent),
    canActivate: [authGuard],
    title: 'Saved Custom Missions - KUKA GUI'
  },
  {
    path: 'mission-control',
    loadComponent: () => import('./pages/mission-control/mission-control.component').then(m => m.MissionControlComponent),
    canActivate: [authGuard],
    title: 'Mission Control - KUKA GUI'
  },
  {
    path: 'robot-analytics',
    loadComponent: () => import('./pages/robot-analytics/robot-analytics.component').then(m => m.RobotAnalyticsComponent),
    canActivate: [authGuard],
    title: 'Robot Analytics - KUKA GUI'
  },
  {
    path: 'user-management',
    loadComponent: () => import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [authGuard],
    title: 'User Management - KUKA GUI'
  },
  {
    path: 'role-management',
    loadComponent: () => import('./pages/role-management/role-management.component').then(m => m.RoleManagementComponent),
    canActivate: [authGuard],
    title: 'Role Management - KUKA GUI'
  },
  {
    path: 'create-workflow-template',
    loadComponent: () => import('./pages/create-workflow-template/create-workflow-template.component').then(m => m.CreateWorkflowTemplateComponent),
    canActivate: [authGuard],
    title: 'Workflow Templates - KUKA GUI'
  },
  {
    path: '',
    redirectTo: '/workflows',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/workflows'
  }
];
