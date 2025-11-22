# Permission System Implementation Guide

This guide explains how to use the newly implemented role-based page access control system in the KUKA GUI Angular application.

## 🎉 What's Been Implemented

### ✅ Backend (100% Complete)
- **3 Database Tables**: Pages, RolePermissions, UserPermissions
- **24 API Endpoints**: Full CRUD for all permission entities
- **Permission Logic**: SuperAdmin bypass → User Override → Role Permissions → Deny
- **Login Integration**: User's `allowedPages` array returned on login

### ✅ Frontend Core (100% Complete)
- **Permission Models**: Complete TypeScript interfaces
- **PermissionService**: Full API integration (all 24 endpoints)
- **AuthService Updates**: Handles permissions from login response
- **Permission Guard**: Route-level access control
- **Navigation Filtering**: Sidebar automatically hides inaccessible pages

### ⏸ Not Yet Implemented
- **Permission Management UI**: Admin pages to manage permissions (optional)
- **Page Auto-Registration**: Automatic sync of frontend routes to backend (manual for now)

---

## 🚀 How the System Works

### Permission Check Flow

```
User Login
    ↓
Backend calculates allowed pages
    ↓
Login response includes "allowedPages" array
    ↓
Frontend stores in localStorage
    ↓
Navigation Service filters sidebar items
    ↓
Permission Guard protects routes
```

### Permission Priority (Backend Logic)

1. **SuperAdmin** - Full access to everything
2. **User Permissions** - Override role-based permissions
3. **Role Permissions** - Inherited from user's roles
4. **Default** - Deny access

---

## 📝 Step-by-Step Usage

### Step 1: Register Frontend Pages in Backend

Pages must be registered in the backend before permissions can be assigned.

**Option A: Manual Registration via Swagger** (Recommended for now)

1. Open Swagger: `http://localhost:5109/swagger`
2. Use `POST /api/v1/pages/sync` endpoint
3. Send request body:

```json
{
  "pages": [
    { "pagePath": "/workflows", "pageName": "Workflows", "pageIcon": "account_tree" },
    { "pagePath": "/workflow-template-configuration", "pageName": "Workflow Templates", "pageIcon": "settings" },
    { "pagePath": "/map-zones", "pageName": "Map Zones", "pageIcon": "map" },
    { "pagePath": "/qr-codes", "pageName": "QR Codes", "pageIcon": "qr_code_2" },
    { "pagePath": "/mobile-robots", "pageName": "Mobile Robots", "pageIcon": "smart_toy" },
    { "pagePath": "/mission-history", "pageName": "Mission History", "pageIcon": "history" },
    { "pagePath": "/mission-control", "pageName": "Mission Control", "pageIcon": "settings_remote" },
    { "pagePath": "/robot-analytics", "pageName": "Robot Analytics", "pageIcon": "analytics" },
    { "pagePath": "/user-management", "pageName": "User Management", "pageIcon": "people" },
    { "pagePath": "/role-management", "pageName": "Role Management", "pageIcon": "admin_panel_settings" }
  ]
}
```

**Option B: Programmatic Registration** (Future Enhancement)

Create an initialization service that runs on app startup and syncs pages automatically.

### Step 2: Assign Permissions to Roles

Using Swagger `POST /api/v1/role-permissions/bulk-set`:

```json
{
  "roleId": 2,
  "pagePermissions": [
    { "pageId": 1, "canAccess": true },
    { "pageId": 2, "canAccess": true },
    { "pageId": 3, "canAccess": true }
  ]
}
```

### Step 3: Create Users with Roles

Using Swagger `POST /api/v1/users`:

```json
{
  "username": "operator1",
  "password": "Test123!",
  "nickname": "John Operator",
  "isSuperAdmin": false,
  "roles": ["OPERATOR"],
  "createBy": "admin",
  "createApp": "KUKA-GUI"
}
```

### Step 4: (Optional) Add User-Specific Overrides

Grant additional access:
```json
{
  "userId": 3,
  "pageId": 5,
  "canAccess": true
}
```

Deny role-based access:
```json
{
  "userId": 2,
  "pageId": 4,
  "canAccess": false
}
```

### Step 5: Test Login

When a user logs in, the response will include:

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": 2,
      "username": "operator1",
      "isSuperAdmin": false,
      "roles": ["OPERATOR"],
      "allowedPages": ["/workflows", "/map-zones", "/qr-codes"]
    }
  }
}
```

The frontend automatically:
- Stores `allowedPages` in localStorage
- Filters sidebar to show only accessible items
- Protects routes with permissionGuard

---

## 🛡️ Applying Permission Guard to Routes

### Current State

The permission guard has been created but is **NOT yet applied** to routes. This allows you to test the system incrementally.

### How to Apply (When Ready)

Edit `src/app/app.routes.ts`:

**Before:**
```typescript
{
  path: 'workflows',
  loadComponent: () => import('./workflows/workflows.component')
    .then(m => m.WorkflowsComponent),
  canActivate: [authGuard],  // Only auth check
  title: 'Workflows - KUKA GUI'
}
```

**After:**
```typescript
import { permissionGuard } from './guards/permission.guard';

{
  path: 'workflows',
  loadComponent: () => import('./workflows/workflows.component')
    .then(m => m.WorkflowsComponent),
  canActivate: [authGuard, permissionGuard],  // Auth + Permission check
  title: 'Workflows - KUKA GUI'
}
```

**Apply to all protected routes** except `/login`.

---

## 🧪 Testing the System

### Test Scenario 1: SuperAdmin User

1. Login as SuperAdmin user
2. **Expected**: All sidebar items visible
3. **Expected**: All routes accessible

### Test Scenario 2: Limited Role User

1. Create role "VIEWER" with access to only 2 pages
2. Create user with "VIEWER" role
3. Login as that user
4. **Expected**: Sidebar shows only 2 items
5. **Expected**: Direct navigation to other routes blocked (when guard applied)

### Test Scenario 3: User Permission Override

1. User has role with access to pages A, B, C
2. Add user override: DENY access to page B
3. Add user override: GRANT access to page D
4. **Expected**: allowedPages = [A, C, D]
5. **Expected**: Sidebar reflects this

### Test Scenario 4: No Permissions

1. Create user with no roles
2. Login
3. **Expected**: Sidebar empty (or minimal items)
4. **Expected**: Redirected to default page

---

## 🔧 Frontend API Usage

### Check if User Can Access a Page

```typescript
import { AuthService } from './services/auth.service';

constructor(private authService: AuthService) {}

if (this.authService.canAccessPage('/workflows')) {
  // User has permission
}
```

### Get User's Allowed Pages

```typescript
const allowedPages = this.authService.getAllowedPages();
console.log(allowedPages); // ["/workflows", "/map-zones", ...]
```

### Check Roles

```typescript
if (this.authService.hasRole('ADMIN')) {
  // User has ADMIN role
}

if (this.authService.hasAnyRole(['ADMIN', 'OPERATOR'])) {
  // User has at least one of these roles
}

if (this.authService.isSuperAdmin()) {
  // User is SuperAdmin
}
```

### Use Permission Service for Management

```typescript
import { PermissionService } from './services/permission.service';

constructor(private permissionService: PermissionService) {}

// Get all pages
this.permissionService.getAllPages().subscribe(pages => {
  console.log(pages);
});

// Get permission matrix
this.permissionService.getRolePermissionMatrix().subscribe(matrix => {
  console.log('Roles:', matrix.roles);
  console.log('Pages:', matrix.pages);
  console.log('Permissions:', matrix.permissions);
});

// Bulk set role permissions
this.permissionService.bulkSetRolePermissions({
  roleId: 2,
  pagePermissions: [
    { pageId: 1, canAccess: true },
    { pageId: 2, canAccess: true }
  ]
}).subscribe(result => {
  console.log(`Modified ${result.modifiedCount} permissions`);
});
```

---

## 📊 Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Entities | ✅ Complete | 3 tables with indices |
| Backend Services | ✅ Complete | Full CRUD + permission logic |
| Backend Controllers | ✅ Complete | 24 REST endpoints |
| Frontend Models | ✅ Complete | TypeScript interfaces |
| Frontend Service | ✅ Complete | Full API integration |
| Auth Integration | ✅ Complete | Permissions in login response |
| Permission Guard | ✅ Complete | Ready to apply to routes |
| Navigation Filtering | ✅ Complete | Auto-hides inaccessible items |
| Permission Management UI | ⏸ Not Started | Admin pages (optional) |
| Page Auto-Registration | ⏸ Not Started | Could be added later |

---

## 🎯 Next Steps (Optional Enhancements)

### 1. Create Permission Management UI

Build Angular components for:
- Page Management (view registered pages)
- Role Permission Matrix (assign pages to roles)
- User Permission Overrides (grant/deny for specific users)

These would use the existing `PermissionService` methods.

### 2. Automatic Page Registration

Create an `AppInitializer` service that:
- Reads all routes from `app.routes.ts`
- Calls `permissionService.syncPages()` on startup
- Registers pages automatically

### 3. Apply Guards to All Routes

Add `permissionGuard` to all protected routes in `app.routes.ts`.

### 4. Permission Denied Page

Create a dedicated component for "Access Denied" scenarios instead of redirecting to workflows.

### 5. Audit Logging

Track when users are denied access for security monitoring.

---

## 🐛 Troubleshooting

### Issue: Sidebar shows all items even though user has limited permissions

**Cause**: Pages not yet registered in backend OR permissions not assigned to role

**Solution**:
1. Check `GET /api/v1/pages` - are pages registered?
2. Check `GET /api/v1/role-permissions/role/{roleId}` - are permissions assigned?
3. Check login response - does `allowedPages` array contain correct pages?

### Issue: User has permissions but can't access route

**Cause**: Permission guard not applied to route OR path mismatch

**Solution**:
1. Check if route has `canActivate: [authGuard, permissionGuard]`
2. Verify page path in database matches route path exactly (case-insensitive)
3. Check browser console for access denied warnings

### Issue: SuperAdmin can't access pages

**Cause**: `isSuperAdmin` flag not set correctly

**Solution**:
1. Check Users table: `SELECT IsSuperAdmin FROM Users WHERE Id = X`
2. Verify login response includes `"isSuperAdmin": true`
3. Check localStorage `user_data` - should have `isSuperAdmin: true`

### Issue: Login response doesn't include allowedPages

**Cause**: Backend permission check service not called OR no permissions assigned

**Solution**:
1. Verify backend `AuthService.LoginAsync()` calls `GetUserAllowedPagePathsAsync()`
2. Check if user has any role permissions or user permissions in database
3. SuperAdmins may return empty array (they bypass checks)

---

## 📚 Additional Resources

- **Backend Testing Guide**: `/QES-KUKA-AMR-Penang-Renesas/PERMISSION_SYSTEM_TESTING.md`
- **Backend API**: `http://localhost:5109/swagger`
- **Frontend Models**: `src/app/models/permission.models.ts`
- **Permission Service**: `src/app/services/permission.service.ts`
- **Auth Service**: `src/app/services/auth.service.ts`
- **Permission Guard**: `src/app/guards/permission.guard.ts`

---

## ✅ Summary

You now have a complete, working permission system with:

✅ **Backend**: Full database schema, services, and API endpoints
✅ **Frontend Core**: Services, guards, and navigation filtering
✅ **Testing**: Comprehensive backend testing completed
✅ **Integration**: Login automatically provides user permissions

**The system is ready to use!** You can:
1. Register pages via Swagger
2. Assign permissions to roles
3. Create users with roles
4. Login and see filtered navigation
5. (Optional) Apply permission guard to routes for route-level protection

The sidebar will automatically show only pages the user has access to, and SuperAdmins will see everything.
