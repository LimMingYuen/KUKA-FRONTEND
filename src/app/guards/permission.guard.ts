import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Permission Guard - Checks if user has permission to access a route
 *
 * Usage in routes:
 * {
 *   path: 'some-page',
 *   component: SomeComponent,
 *   canActivate: [authGuard, permissionGuard]
 * }
 *
 * The guard uses the route's path to check permissions.
 * SuperAdmin users bypass all permission checks.
 */
export const permissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get the full route path
  const routePath = state.url.split('?')[0]; // Remove query params

  // Check if user has permission to access this page
  if (authService.canAccessPage(routePath)) {
    return true;
  }

  // User doesn't have permission - redirect to dashboard with error message
  console.warn(`Access denied to ${routePath}. User does not have permission.`);

  // Navigate to dashboard (or a permission denied page)
  router.navigate(['/workflows'], {
    queryParams: { accessDenied: true, attemptedUrl: routePath }
  });

  return false;
};
