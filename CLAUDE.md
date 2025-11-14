# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a KUKA GUI application built with Angular 20.3.9 using standalone components and the new Angular application architecture. The project uses TypeScript with strict mode enabled, SCSS for styling, and Angular Material for UI components.

## Angular Material Setup

The project uses Angular Material 20.2.12 with Material Design 3 theming. Key configuration:

### Theme Configuration
- **Primary Color**: Orange palette (KUKA branding)
- **Tertiary Color**: Gray palette
- **Typography**: Roboto font family
- **Density**: Default density setting

### Available Material Components
- MatButtonModule, MatFormField, MatInputModule, MatCardModule
- MatProgressSpinner, MatToolbar, MatIconModule, MatSnackBar
- MatDialog, MatMenu, MatTooltip

### Adding Material Components
When creating new components, import required Material modules in the component's `imports` array:

```typescript
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  // ...
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  // ...
})
```

## Development Commands

### Starting Development Server
```bash
cd KUKA-GUI
npm start
# or
ng serve
```
Development server runs on `http://localhost:4200/` with hot reload enabled.

### Building
```bash
ng build                    # Production build (default)
ng build --configuration development  # Development build
npm run watch              # Build in watch mode for development
```

### Testing
```bash
ng test                    # Run unit tests with Karma
ng e2e                     # Run end-to-end tests
```

### Code Generation
```bash
ng generate component component-name    # Generate new component
ng generate --help                     # List all available schematics
```

## Architecture

### Project Structure
- **Standalone Components**: Uses Angular 20+ standalone component architecture
- **Bootstrap Application**: Uses `bootstrapApplication()` in `main.ts` instead of NgModule-based bootstrapping
- **Configuration**: Application configuration in `app.config.ts` with providers for routing and change detection
- **Routing**: Route definitions in `app.routes.ts` (currently empty)
- **Root Component**: Main app component located in `src/app/` with separate HTML, SCSS, and TypeScript files

### Key Configuration Files
- **angular.json**: Angular CLI configuration with SCSS as default style preprocessor
- **tsconfig.json**: TypeScript configuration with strict mode enabled
- **package.json**: Scripts use standard Angular CLI commands

### Build Configuration
- **Development**: Source maps enabled, optimization disabled, no license extraction
- **Production**: Budget limits (500kB initial, 1MB error; 4kB component style warning, 8kB error), output hashing enabled
- **Assets**: Static assets served from `public/` directory

### Styling
- SCSS is configured as the default style preprocessor
- Global styles in `src/styles.scss`
- Component styles use `.scss` extension

### Change Detection
Application uses `provideZoneChangeDetection({ eventCoalescing: true })` for optimized change detection performance.

## Authentication System

The application implements a complete authentication system with the following architecture:

### Backend Integration
- **API Endpoint**: `http://localhost:5109/api/Login`
- **Authentication Method**: JWT token-based authentication
- **Token Storage**: localStorage for client-side persistence
- **Request Format**: POST with LoginRequest model (username/password)
- **Response Format**: ApiResponse wrapper with LoginResponseData

### Authentication Components
- **AuthService**: Handles login/logout operations and token management
- **AuthGuard**: Route protection for authenticated areas
- **Login Component**: Material Design login form with validation
- **Dashboard Component**: Protected landing page after authentication

### Authentication Flow
1. User enters credentials in login form
2. AuthService sends POST request to backend API
3. Successful login stores JWT token in localStorage
4. User is redirected to dashboard
5. AuthGuard protects routes from unauthorized access

### Material Authentication UI
- Login form with Material card layout
- Reactive form validation with Material error states
- Loading spinners during authentication
- MatSnackBar for success/error notifications
- Responsive design for mobile and desktop

## Development Notes

- This is a modern Angular application using the latest standalone component architecture
- No NgModules are used - components are self-contained with their own imports
- Angular Material provides the complete UI component library
- Authentication uses modern Angular patterns with signals for state management
- TypeScript strict mode is enforced with additional strict compiler options