# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a KUKA GUI application built with **Angular 20.3.9** using standalone components and the new Angular application architecture. The project is a warehouse management system that provides interfaces for managing mobile robots, missions, workflows, and analytics. It uses TypeScript with strict mode enabled, SCSS for styling, and Angular Material for UI components.

## Technology Stack

### Core Framework
- **Angular**: 20.3.0 (standalone components architecture)
- **Angular CLI**: 20.3.9
- **TypeScript**: 5.9.2 (strict mode enabled)
- **RxJS**: 7.8.0 (reactive programming)
- **Zone.js**: 0.15.0 (change detection)

### UI Framework
- **Angular Material**: 20.2.12 (Material Design 3)
- **Angular CDK**: 20.2.12
- **Chart.js**: 4.5.1 (data visualization)
- **ng2-charts**: 8.0.0 (Angular wrapper for Chart.js)

### Development Tools
- **Karma**: 6.4.0 (test runner)
- **Jasmine**: 5.9.0 (testing framework)
- **Prettier**: Configured with 100 char width, single quotes

## Project Structure

```
KUKA-FRONTEND/
├── src/
│   ├── app/
│   │   ├── dashboard/          # Dashboard component (landing page)
│   │   ├── login/              # Login component (authentication)
│   │   ├── workflows/          # Workflows management
│   │   ├── sidebar/            # Navigation sidebar component
│   │   ├── pages/              # Feature pages
│   │   │   ├── warehouse-management/
│   │   │   ├── map-zones/
│   │   │   ├── qr-codes/
│   │   │   ├── mobile-robots/
│   │   │   ├── mission-history/
│   │   │   ├── saved-custom-missions/
│   │   │   ├── mission-types/
│   │   │   ├── robot-types/
│   │   │   ├── robot-analytics/
│   │   │   ├── resume-strategies/
│   │   │   ├── shelf-decision-rules/
│   │   │   └── areas/
│   │   ├── shared/             # Shared components and utilities
│   │   │   ├── components/
│   │   │   │   └── generic-table/  # Reusable table component
│   │   │   ├── models/         # Shared TypeScript interfaces
│   │   │   └── directives/     # Custom directives
│   │   ├── services/           # Application services
│   │   ├── guards/             # Route guards (auth.guard.ts)
│   │   ├── models/             # Domain models
│   │   ├── app.routes.ts       # Route definitions
│   │   ├── app.config.ts       # Application configuration
│   │   ├── app.html            # Root template
│   │   └── app.scss            # Root styles
│   ├── main.ts                 # Application entry point
│   ├── styles.scss             # Global styles
│   └── index.html              # HTML entry point
├── public/                     # Static assets
├── angular.json                # Angular CLI configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
└── README.md                   # Project documentation
```

## Development Commands

### Starting Development Server
```bash
npm start
# or
ng serve
```
Development server runs on `http://localhost:4200/` with hot reload enabled.

### Building
```bash
ng build                                  # Production build (default)
ng build --configuration development      # Development build
npm run watch                             # Build in watch mode for development
```

**Build Output**: `dist/` directory

**Production Budgets**:
- Initial bundle: 500kB warning, 1MB error
- Component styles: 10kB warning, 20kB error

### Testing
```bash
ng test     # Run unit tests with Karma
ng e2e      # Run end-to-end tests
```

### Code Generation
```bash
ng generate component component-name      # Generate new component
ng generate service service-name          # Generate new service
ng generate guard guard-name              # Generate new guard
ng generate --help                        # List all available schematics
```

**Important**: All generated components will use standalone architecture by default.

### Code Formatting
Prettier is configured for this project:
- Print width: 100 characters
- Single quotes: enabled
- Angular HTML parser: enabled

## Architecture

### Standalone Components Architecture

This application uses Angular's modern standalone component architecture introduced in Angular 14+ and made the default in Angular 20.

**Key Characteristics**:
- No NgModules - components are self-contained
- Components declare their own dependencies in `imports` array
- Uses `bootstrapApplication()` in `main.ts` instead of NgModule bootstrapping
- Application configuration in `app.config.ts` using `ApplicationConfig`

**Example Component Structure**:
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss'
})
export class ExampleComponent {
  // Component logic
}
```

### Application Configuration

**app.config.ts** defines global providers:
- `provideBrowserGlobalErrorListeners()` - Error handling
- `provideZoneChangeDetection({ eventCoalescing: true })` - Optimized change detection
- `provideRouter(routes)` - Routing configuration
- `provideHttpClient(withInterceptorsFromDi())` - HTTP client with interceptor support

### Routing

**Routing Strategy**: File-based routing with lazy loading

**Route Protection**: All routes except `/login` are protected by `authGuard`

**Route Configuration** (`app.routes.ts`):
```typescript
{
  path: 'login',
  component: LoginComponent,
  title: 'Login - KUKA GUI'
},
{
  path: 'dashboard',
  loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent),
  canActivate: [authGuard],
  title: 'Dashboard - KUKA GUI'
},
// ... more routes
```

**Key Routes**:
- `/login` - Authentication page (public)
- `/dashboard` - Main dashboard (protected, default route)
- `/workflows` - Workflow management (protected)
- `/warehouse-management` - Warehouse operations (protected)
- `/map-zones` - Map zone configuration (protected)
- `/qr-codes` - QR code management (protected)
- `/mobile-robots` - Robot fleet management (protected)
- `/mission-history` - Mission tracking (protected)
- `/saved-custom-missions` - Custom mission templates (protected)
- `/robot-analytics` - Analytics dashboard (protected)
- `**` - Wildcard redirects to `/dashboard`

### State Management

The application uses **Angular Signals** for reactive state management:

```typescript
// Example from AuthService
public currentUser = signal<User | null>(null);
public isAuthenticated = signal<boolean>(false);
public isLoading = signal<boolean>(false);
```

**Benefits**:
- Fine-grained reactivity
- Better performance than traditional RxJS subjects
- Simpler mental model for state updates
- Built-in change detection integration

## Angular Material Setup

The project uses Angular Material 20.2.12 with Material Design 3 theming.

### Theme Configuration

**Primary Color**: Orange palette (KUKA branding)
**Tertiary Color**: Gray palette
**Typography**: Roboto font family
**Density**: Default density setting

### Available Material Components

**Form Controls**: MatButtonModule, MatFormFieldModule, MatInputModule
**Navigation**: MatToolbarModule, MatMenuModule, MatSidenavModule
**Layout**: MatCardModule, MatDividerModule, MatExpansionModule
**Data Tables**: MatTableModule, MatPaginatorModule, MatSortModule
**Indicators**: MatProgressSpinnerModule, MatTooltipModule
**Popups**: MatSnackBarModule, MatDialogModule
**Icons**: MatIconModule

### Adding Material Components

When creating new components, import required Material modules in the component's `imports` array:

```typescript
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss'
})
export class ExampleComponent { }
```

## Authentication System

The application implements a complete JWT-based authentication system.

### Backend Integration

- **API Base URL**: `http://localhost:5109/api`
- **Login Endpoint**: `POST /api/Login`
- **Authentication Method**: JWT token-based
- **Token Storage**: localStorage (`auth_token` key)
- **User Data Storage**: localStorage (`user_data` key)

### Request/Response Format

**Login Request**:
```typescript
interface LoginRequest {
  username: string;
  password: string;
}
```

**Login Response**:
```typescript
interface ApiResponse<T> {
  success: boolean;
  msg: string;
  data?: T;
}

interface LoginResponseData {
  token: string;
  username: string;
}
```

### Authentication Components

**AuthService** (`src/app/services/auth.service.ts`):
- Manages login/logout operations
- Stores and retrieves JWT tokens
- Maintains authentication state using signals
- Provides user information
- Handles API errors with user-friendly messages

**AuthGuard** (`src/app/guards/auth.guard.ts`):
- Functional guard using `CanActivateFn`
- Protects routes from unauthorized access
- Redirects to `/login` if not authenticated

**LoginComponent** (`src/app/login/`):
- Material Design login form
- Reactive form validation
- Error handling with MatSnackBar
- Loading state management

**DashboardComponent** (`src/app/dashboard/`):
- Protected landing page after authentication
- Displays user information
- Access to all application features

### Authentication Flow

1. User enters credentials in login form
2. Form validation runs (required fields, etc.)
3. AuthService sends POST request to backend API
4. On success:
   - JWT token stored in localStorage
   - User data stored in localStorage
   - Reactive signals updated (currentUser, isAuthenticated)
   - MatSnackBar shows success message
   - Router navigates to `/dashboard`
5. On error:
   - Error message displayed via MatSnackBar
   - Form remains accessible for retry

### Using AuthService in Components

```typescript
import { AuthService } from '../services/auth.service';

export class MyComponent {
  constructor(private authService: AuthService) {
    // Access reactive state
    effect(() => {
      const user = this.authService.currentUser();
      const isAuth = this.authService.isAuthenticated();
      console.log('User:', user, 'Authenticated:', isAuth);
    });
  }

  logout() {
    this.authService.logout();
  }
}
```

## Shared Components

### Generic Table Component

**Location**: `src/app/shared/components/generic-table/`

A fully reusable, type-safe table component built on Angular Material's MatTable.

**Features**:
- Generic type support for full type safety
- Sorting (per-column configuration)
- Filtering (global search across specified columns)
- Pagination (configurable page sizes)
- Row actions (edit, delete, custom actions)
- Header actions (add, export, custom actions)
- Empty state with custom message and action
- Loading state with spinner
- Custom cell templates
- Value transformation functions
- Responsive design
- Keyboard navigation

**Usage Example**:

```typescript
import { GenericTableComponent } from './shared/components/generic-table/generic-table';
import { TableConfig } from './shared/models/table.models';

@Component({
  standalone: true,
  imports: [GenericTableComponent],
  template: `
    <app-generic-table
      [data]="tableData"
      [config]="tableConfig"
      [loading]="isLoading"
      (action)="handleAction($event)"
      (sortChange)="handleSort($event)"
      (pageChange)="handlePage($event)"
      (filterChange)="handleFilter($event)">
    </app-generic-table>
  `
})
export class MyComponent {
  tableData: MyModel[] = [];
  isLoading = false;

  tableConfig: TableConfig<MyModel> = {
    title: 'My Data Table',
    columns: [
      { key: 'id', header: 'ID', sortable: true, filterable: false },
      { key: 'name', header: 'Name', sortable: true, filterable: true },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        filterable: true,
        transform: (value) => value.toUpperCase()
      }
    ],
    actions: [
      { action: 'edit', label: 'Edit', icon: 'edit', color: 'primary' },
      { action: 'delete', label: 'Delete', icon: 'delete', color: 'warn' }
    ],
    pagination: {
      pageSize: 10,
      pageSizeOptions: [5, 10, 25, 100]
    },
    filter: {
      placeholder: 'Search...',
      enabled: true
    },
    defaultSort: {
      column: 'name',
      direction: 'asc'
    }
  };

  handleAction(event: ActionEvent) {
    console.log('Action:', event.action, 'Row:', event.row);
  }
}
```

**Table Configuration Models** (`src/app/shared/models/table.models.ts`):
- `TableConfig<T>` - Main configuration interface
- `ColumnConfig<T>` - Column definitions
- `ActionConfig` - Row action buttons
- `HeaderActionConfig` - Header action buttons
- `PaginationConfig` - Pagination settings
- `FilterConfig` - Search filter settings
- `EmptyConfig` - Empty state configuration

### Sidebar Navigation Component

**Location**: `src/app/sidebar/`

A collapsible sidebar navigation component with multi-level support.

**Features**:
- Reactive state management with signals
- Collapsible/expandable behavior
- Multi-level navigation support
- Active route highlighting
- Keyboard navigation
- Integration with NavigationService
- User logout functionality
- Material Design styling

## Services

### Core Services

**AuthService** (`src/app/services/auth.service.ts`):
- JWT token management
- User authentication state
- Login/logout operations
- HTTP error handling

**NavigationService** (`src/app/services/navigation.service.ts`):
- Sidebar state management
- Active route tracking
- Navigation item configuration
- Expanded item state

### Domain Services

Each feature has its own service for API communication:

- `workflow.service.ts` - Workflow management
- `mobile-robots.service.ts` - Robot fleet management
- `mission-history.service.ts` - Mission tracking
- `mission-types.service.ts` - Mission type configuration
- `robot-types.service.ts` - Robot type definitions
- `robot-analytics.service.ts` - Analytics data
- `qr-codes.service.ts` - QR code management
- `map-zones.service.ts` - Map zone configuration
- `areas.service.ts` - Area management
- `resume-strategies.service.ts` - Resume strategy configuration
- `shelf-decision-rules.service.ts` - Shelf decision logic
- `saved-custom-missions.service.ts` - Custom mission templates

**Service Pattern**:
```typescript
@Injectable({
  providedIn: 'root'
})
export class MyService {
  private readonly API_URL = 'http://localhost:5109/api';

  constructor(private http: HttpClient) {}

  getAll(): Observable<MyModel[]> {
    return this.http.get<ApiResponse<MyModel[]>>(`${this.API_URL}/MyEndpoint`)
      .pipe(map(response => response.data || []));
  }

  getById(id: number): Observable<MyModel> {
    return this.http.get<ApiResponse<MyModel>>(`${this.API_URL}/MyEndpoint/${id}`)
      .pipe(map(response => response.data));
  }

  create(data: MyModel): Observable<MyModel> {
    return this.http.post<ApiResponse<MyModel>>(`${this.API_URL}/MyEndpoint`, data)
      .pipe(map(response => response.data));
  }

  update(id: number, data: MyModel): Observable<MyModel> {
    return this.http.put<ApiResponse<MyModel>>(`${this.API_URL}/MyEndpoint/${id}`, data)
      .pipe(map(response => response.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/MyEndpoint/${id}`);
  }
}
```

## Models

### Model Organization

**Domain Models** (`src/app/models/`):
- `auth.models.ts` - Authentication types
- `workflow.models.ts` - Workflow entities
- `mobile-robot.models.ts` - Robot entities
- `mission-history.models.ts` - Mission tracking
- `mission-types.models.ts` - Mission type definitions
- `robot-types.models.ts` - Robot type definitions
- `robot-analytics.models.ts` - Analytics data types
- `qr-code.models.ts` - QR code entities
- `map-zone.models.ts` - Map zone entities
- `areas.models.ts` - Area entities
- `resume-strategies.models.ts` - Resume strategy types
- `shelf-decision-rules.models.ts` - Decision rule types
- `saved-custom-missions.models.ts` - Custom mission types
- `sidebar.models.ts` - Navigation models

**Shared Models** (`src/app/shared/models/`):
- `table.models.ts` - Generic table configuration types

### Model Pattern

```typescript
// Domain entity
export interface MyEntity {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  msg: string;
  data?: T;
}

// Request DTOs
export interface CreateMyEntityRequest {
  name: string;
  description?: string;
}

export interface UpdateMyEntityRequest {
  name?: string;
  description?: string;
}
```

## Data Visualization

### Chart.js Integration

The application uses Chart.js for data visualization in the Robot Analytics page.

**Dependencies**:
- `chart.js`: 4.5.1
- `ng2-charts`: 8.0.0
- `@types/chart.js`: 2.9.41 (dev)

**Usage Example** (from `robot-analytics.component.ts`):

```typescript
import { Chart, ChartConfiguration } from 'chart.js';

export class RobotAnalyticsComponent {
  chartConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{
        label: 'Robot Activity',
        data: [10, 20, 30]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  };
}
```

**Chart Configuration** (`src/app/pages/robot-analytics/chart-configs.ts`):
- Centralized chart configuration
- Reusable chart options
- Consistent styling across analytics

## Styling

### SCSS Architecture

**Global Styles** (`src/styles.scss`):
- Material theme imports
- Global CSS resets
- Typography definitions
- Utility classes

**Component Styles**:
- Each component has its own `.scss` file
- Scoped to component using Angular's view encapsulation
- Follow BEM naming convention

**Style Guidelines**:
- Use SCSS variables for colors and spacing
- Follow Material Design guidelines
- Keep styles modular and reusable
- Use Angular Material's theming system

### CSS Class Conventions

```scss
// BEM naming convention
.component-name {
  &__element {
    // element styles
  }

  &--modifier {
    // modifier styles
  }
}

// State classes
.is-active { }
.is-disabled { }
.is-loading { }

// Utility classes
.mt-1 { margin-top: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
```

## TypeScript Configuration

### Compiler Options

**Strict Mode**: Enabled with additional strict checks
- `strict`: true
- `noImplicitOverride`: true
- `noPropertyAccessFromIndexSignature`: true
- `noImplicitReturns`: true
- `noFallthroughCasesInSwitch`: true

**Module Resolution**:
- `moduleResolution`: "bundler"
- `module`: "ES2022"
- `target`: "ES2022"

### Best Practices

1. **Use explicit types**: Avoid `any` when possible
2. **Leverage interfaces**: Define clear contracts for data structures
3. **Use generics**: For reusable, type-safe components
4. **Enable strict null checks**: Handle null/undefined explicitly
5. **Use readonly**: For immutable properties

## Development Guidelines

### Component Development

1. **Always use standalone components**:
   ```typescript
   @Component({
     standalone: true,
     imports: [/* dependencies */]
   })
   ```

2. **Import only what you need**: Minimize bundle size by importing specific modules

3. **Use signals for reactive state**: Prefer signals over BehaviorSubjects for simple state

4. **Implement OnDestroy**: Always clean up subscriptions
   ```typescript
   private destroy$ = new Subject<void>();

   ngOnDestroy() {
     this.destroy$.next();
     this.destroy$.complete();
   }
   ```

5. **Use the generic table component**: Don't create custom tables unless absolutely necessary

### Service Development

1. **Use `providedIn: 'root'`**: For singleton services
2. **Return observables**: For async operations
3. **Handle errors**: Implement proper error handling with catchError
4. **Use typed responses**: Define interfaces for API responses
5. **Centralize API URLs**: Keep base URLs in service constants

### Routing Development

1. **Use lazy loading**: For feature modules/components
2. **Define page titles**: For better SEO and UX
3. **Protect routes**: Use canActivate guards for authentication
4. **Use functional guards**: Prefer function-based guards over class-based

### Testing Guidelines

1. **Write unit tests**: For all services and components
2. **Use TestBed**: For component testing
3. **Mock dependencies**: Use Jasmine spies for service mocking
4. **Test user interactions**: Simulate clicks, inputs, etc.
5. **Test async operations**: Use `fakeAsync` and `tick`

## Common Patterns

### Page Component Pattern

Each feature page follows this structure:

```typescript
// Component file (e.g., my-feature.component.ts)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { GenericTableComponent } from '../../shared/components/generic-table/generic-table';
import { MyFeatureService } from '../../services/my-feature.service';
import { TableConfig, ActionEvent } from '../../shared/models/table.models';
import { MY_FEATURE_TABLE_CONFIG } from './my-feature-table.config';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-my-feature',
  standalone: true,
  imports: [GenericTableComponent, /* other imports */],
  templateUrl: './my-feature.component.html',
  styleUrl: './my-feature.component.scss'
})
export class MyFeatureComponent implements OnInit, OnDestroy {
  tableData: MyModel[] = [];
  tableConfig: TableConfig<MyModel> = MY_FEATURE_TABLE_CONFIG;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(private myFeatureService: MyFeatureService) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.isLoading = true;
    this.myFeatureService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.tableData = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading data:', err);
          this.isLoading = false;
        }
      });
  }

  handleAction(event: ActionEvent) {
    switch (event.action) {
      case 'edit':
        this.editItem(event.row);
        break;
      case 'delete':
        this.deleteItem(event.row);
        break;
    }
  }
}
```

### Table Configuration Pattern

Each page with a table has a separate config file:

```typescript
// my-feature-table.config.ts
import { TableConfig } from '../../shared/models/table.models';
import { MyModel } from '../../models/my-feature.models';

export const MY_FEATURE_TABLE_CONFIG: TableConfig<MyModel> = {
  title: 'My Feature',
  columns: [
    { key: 'id', header: 'ID', sortable: true, filterable: false },
    { key: 'name', header: 'Name', sortable: true, filterable: true }
  ],
  actions: [
    { action: 'edit', label: 'Edit', icon: 'edit', color: 'primary' },
    { action: 'delete', label: 'Delete', icon: 'delete', color: 'warn' }
  ],
  pagination: { pageSize: 10, pageSizeOptions: [5, 10, 25, 100] },
  filter: { placeholder: 'Search...', enabled: true },
  defaultSort: { column: 'name', direction: 'asc' }
};
```

## Error Handling

### HTTP Error Handling

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

this.http.get(url).pipe(
  catchError((error: HttpErrorResponse) => {
    let errorMessage = 'An error occurred';

    if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else if (error.status >= 500) {
      errorMessage = 'Server error';
    }

    this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
    return throwError(() => error);
  })
);
```

### User Feedback

Use MatSnackBar for user notifications:

```typescript
// Success message
this.snackBar.open('Operation successful!', 'Close', {
  duration: 3000,
  panelClass: ['success-snackbar']
});

// Error message
this.snackBar.open('Operation failed', 'Close', {
  duration: 5000,
  panelClass: ['error-snackbar']
});
```

## Performance Optimization

### Change Detection
- Uses `provideZoneChangeDetection({ eventCoalescing: true })` for optimized change detection
- Consider using `OnPush` change detection for performance-critical components

### Lazy Loading
- All feature routes use lazy loading via `loadComponent()`
- Reduces initial bundle size
- Improves time to interactive

### Bundle Size
- Production budgets enforced (500kB initial, 1MB max)
- Tree-shaking enabled in production builds
- Only import necessary Material modules

## Security Considerations

1. **JWT Token Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
2. **Route Guards**: All protected routes use authGuard
3. **Input Validation**: Always validate user input on both client and server
4. **XSS Prevention**: Angular's built-in sanitization active
5. **CORS**: Backend must configure appropriate CORS headers

## Troubleshooting

### Common Issues

**Issue**: Material components not displaying correctly
**Solution**: Ensure Material theme is imported in `styles.scss` and component imports include necessary Material modules

**Issue**: Route guard not working
**Solution**: Verify authGuard is included in route's `canActivate` array and AuthService is returning correct authentication state

**Issue**: Table not sorting correctly
**Solution**: Check that `sortable: true` is set on column config and data is compatible with sorting

**Issue**: API requests failing with CORS errors
**Solution**: Ensure backend server has correct CORS configuration for `http://localhost:4200`

## AI Assistant Guidelines

### When Working on This Project

1. **Always use standalone components**: Do not create NgModules
2. **Respect the architecture**: Follow existing patterns for services, components, and models
3. **Use the generic table component**: For any data table needs
4. **Follow TypeScript strict mode**: Handle all type errors properly
5. **Update models**: When adding new API endpoints, create/update corresponding models
6. **Use signals**: For reactive state management in new components
7. **Implement proper cleanup**: Always implement OnDestroy for components with subscriptions
8. **Follow naming conventions**:
   - Components: `feature-name.component.ts`
   - Services: `feature-name.service.ts`
   - Models: `feature-name.models.ts`
   - Config files: `feature-name-table.config.ts`
9. **Test changes**: Run `ng serve` and verify in browser before committing
10. **Keep CLAUDE.md updated**: Update this file when making architectural changes

### Code Generation Templates

**New Feature Page**:
1. Create component in `src/app/pages/feature-name/`
2. Create service in `src/app/services/feature-name.service.ts`
3. Create models in `src/app/models/feature-name.models.ts`
4. Create table config in `src/app/pages/feature-name/feature-name-table.config.ts`
5. Add route in `app.routes.ts` with lazy loading and authGuard
6. Add navigation item in NavigationService

**New Service**:
1. Create in `src/app/services/`
2. Use `providedIn: 'root'`
3. Define API_URL constant
4. Implement CRUD methods returning Observables
5. Add error handling
6. Create corresponding models

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [Angular Material Documentation](https://material.angular.io)
- [RxJS Documentation](https://rxjs.dev)
- [Chart.js Documentation](https://www.chartjs.org)
- [TypeScript Documentation](https://www.typescriptlang.org)

## Project Contacts

For questions or issues regarding this codebase, refer to the project README or contact the development team.
