# KUKA Backend API Endpoints Documentation

This document provides a comprehensive reference for all backend API endpoints used by the KUKA frontend application. The backend API base URL is: `http://localhost:5109/api`

## Table of Contents

- [1. Saved Custom Missions](#1-saved-custom-missions)
- [2. Missions (Queue & Submit)](#2-missions-queue--submit)
- [3. Queue Monitoring](#3-queue-monitoring)
- [4. Mission Queue Operations](#4-mission-queue-operations)

---

## 1. Saved Custom Missions

**Controller**: `SavedCustomMissionsController.cs`
**Base Route**: `/api/saved-custom-missions`
**Frontend Feature**: Create Custom Mission

### Endpoints

#### Get All Custom Missions
```http
GET /api/saved-custom-missions
```

**Description**: Retrieves a list of all saved custom missions.

**Response**:
```typescript
interface ApiResponse<SavedCustomMission[]> {
  success: boolean;
  code: string;
  msg: string;
  data?: SavedCustomMission[];
}
```

---

#### Get Custom Mission by ID
```http
GET /api/saved-custom-missions/{id}
```

**Description**: Retrieves a specific custom mission by its ID.

**Parameters**:
- `id` (path, number) - The unique identifier of the custom mission

**Response**:
```typescript
interface ApiResponse<SavedCustomMission> {
  success: boolean;
  code: string;
  msg: string;
  data?: SavedCustomMission;
}
```

---

#### Create Custom Mission
```http
POST /api/saved-custom-missions
```

**Description**: Creates a new custom mission.

**Request Body**:
```typescript
interface CreateSavedCustomMissionRequest {
  name: string;
  description?: string;
  missionTypeId: number;
  robotTypeId: number;
  parameters: any; // Mission-specific parameters
  // Add other required fields based on backend model
}
```

**Response**:
```typescript
interface ApiResponse<SavedCustomMission> {
  success: boolean;
  code: string;
  msg: string;
  data?: SavedCustomMission;
}
```

---

#### Update Custom Mission
```http
PUT /api/saved-custom-missions/{id}
```

**Description**: Updates an existing custom mission.

**Parameters**:
- `id` (path, number) - The unique identifier of the custom mission to update

**Request Body**:
```typescript
interface UpdateSavedCustomMissionRequest {
  name?: string;
  description?: string;
  missionTypeId?: number;
  robotTypeId?: number;
  parameters?: any;
  // Add other updatable fields based on backend model
}
```

**Response**:
```typescript
interface ApiResponse<SavedCustomMission> {
  success: boolean;
  code: string;
  msg: string;
  data?: SavedCustomMission;
}
```

---

#### Delete Custom Mission
```http
DELETE /api/saved-custom-missions/{id}
```

**Description**: Deletes a custom mission by its ID.

**Parameters**:
- `id` (path, number) - The unique identifier of the custom mission to delete

**Response**:
```typescript
interface ApiResponse<void> {
  success: boolean;
  code: string;
  msg: string;
}
```

---

#### Trigger/Execute Custom Mission
```http
POST /api/saved-custom-missions/{id}/trigger
```

**Description**: Triggers/executes a saved custom mission.

**Parameters**:
- `id` (path, number) - The unique identifier of the custom mission to trigger

**Request Body** (optional):
```typescript
interface TriggerMissionRequest {
  robotId?: number;
  priority?: number;
  // Add other execution parameters as needed
}
```

**Response**:
```typescript
interface ApiResponse<MissionExecutionResult> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    missionCode: string;
    queueItemId: number;
    status: string;
  };
}
```

---

## 2. Missions (Queue & Submit)

**Controller**: `MissionsController.cs`
**Base Route**: `/api/missions`
**Frontend Features**: Queue Mission, Submit Mission

### Endpoints

#### Submit/Queue Mission
```http
POST /api/missions/submit
```

**Description**: Submits or queues a new mission for execution. This endpoint handles both queuing and submitting missions.

**Request Body**:
```typescript
interface SubmitMissionRequest {
  missionTypeId: number;
  robotTypeId?: number;
  robotId?: number;
  mapCode: string;
  priority?: number;
  parameters: {
    startPoint?: string;
    endPoint?: string;
    waypoints?: string[];
    // Add other mission-specific parameters
  };
  scheduledTime?: string; // ISO 8601 date string for scheduled missions
}
```

**Response**:
```typescript
interface ApiResponse<MissionSubmitResult> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    missionCode: string;
    queueItemId: number;
    status: string;
    estimatedStartTime?: string;
  };
}
```

---

#### Save Mission as Template
```http
POST /api/missions/save-as-template
```

**Description**: Saves a mission configuration as a reusable template.

**Request Body**:
```typescript
interface SaveMissionTemplateRequest {
  name: string;
  description?: string;
  missionTypeId: number;
  robotTypeId: number;
  parameters: any;
}
```

**Response**:
```typescript
interface ApiResponse<SavedCustomMission> {
  success: boolean;
  code: string;
  msg: string;
  data?: SavedCustomMission;
}
```

---

#### Cancel Mission
```http
POST /api/missions/cancel
```

**Description**: Cancels an active or queued mission.

**Request Body**:
```typescript
interface CancelMissionRequest {
  missionCode: string;
  reason?: string;
}
```

**Response**:
```typescript
interface ApiResponse<CancelMissionResult> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    missionCode: string;
    status: string;
    cancelledAt: string;
  };
}
```

---

#### Query Job Status
```http
POST /api/missions/jobs/query
```

**Description**: Queries the status of one or more jobs.

**Request Body**:
```typescript
interface QueryJobsRequest {
  missionCodes?: string[];
  queueItemIds?: number[];
  robotId?: number;
  status?: string;
}
```

**Response**:
```typescript
interface ApiResponse<JobStatus[]> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    missionCode: string;
    queueItemId: number;
    status: string;
    robotId?: number;
    progress?: number;
    currentLocation?: string;
    updatedAt: string;
  }[];
}
```

---

#### Send Operation Feedback
```http
POST /api/missions/operation-feedback
```

**Description**: Sends feedback or updates about mission operations.

**Request Body**:
```typescript
interface OperationFeedbackRequest {
  missionCode: string;
  operationType: string;
  status: string;
  message?: string;
  data?: any;
}
```

**Response**:
```typescript
interface ApiResponse<void> {
  success: boolean;
  code: string;
  msg: string;
}
```

---

#### Query Robot Status
```http
POST /api/missions/robot-query
```

**Description**: Queries the current status of robots.

**Request Body**:
```typescript
interface RobotQueryRequest {
  robotIds?: number[];
  mapCode?: string;
  includeCurrentMission?: boolean;
}
```

**Response**:
```typescript
interface ApiResponse<RobotStatus[]> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    robotId: number;
    robotName: string;
    status: string;
    batteryLevel?: number;
    currentLocation?: string;
    currentMission?: {
      missionCode: string;
      queueItemId: number;
      progress: number;
    };
    lastUpdated: string;
  }[];
}
```

---

## 3. Queue Monitoring

**Controller**: `QueueController.cs`
**Base Route**: `/api/queue`
**Frontend Feature**: Queue Monitor (Primary)

### Endpoints

#### Get Queue Status by Mission Code
```http
GET /api/queue/status/{missionCode}
```

**Description**: Retrieves the status of all queue items associated with a specific mission code.

**Parameters**:
- `missionCode` (path, string) - The mission code to query

**Response**:
```typescript
interface ApiResponse<QueueItem[]> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    queueItemId: number;
    missionCode: string;
    status: string;
    robotId?: number;
    priority: number;
    queuedAt: string;
    startedAt?: string;
    completedAt?: string;
    progress?: number;
  }[];
}
```

---

#### Get Queue Items by Map Code
```http
GET /api/queue/mapcode/{mapCode}
```

**Description**: Lists all queue items for a specific map.

**Parameters**:
- `mapCode` (path, string) - The map code to query

**Response**:
```typescript
interface ApiResponse<QueueItem[]> {
  success: boolean;
  code: string;
  msg: string;
  data?: QueueItem[];
}
```

---

#### Get Queue Statistics
```http
GET /api/queue/statistics
```

**Description**: Retrieves overall queue statistics across all maps.

**Response**:
```typescript
interface ApiResponse<QueueStatistics> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    totalQueued: number;
    totalInProgress: number;
    totalCompleted: number;
    totalFailed: number;
    totalCancelled: number;
    byMap: {
      [mapCode: string]: {
        queued: number;
        inProgress: number;
        completed: number;
        failed: number;
        cancelled: number;
      };
    };
    byRobot: {
      [robotId: number]: {
        current: number;
        completed: number;
        failed: number;
      };
    };
  };
}
```

---

#### Get Robot Current Job
```http
GET /api/queue/robot/{robotId}/current
```

**Description**: Retrieves the current job assigned to a specific robot.

**Parameters**:
- `robotId` (path, number) - The robot ID to query

**Response**:
```typescript
interface ApiResponse<QueueItem> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    queueItemId: number;
    missionCode: string;
    status: string;
    robotId: number;
    progress: number;
    startedAt: string;
    estimatedCompletion?: string;
    currentStep?: string;
  };
}
```

---

#### Get Queue Item by ID
```http
GET /api/queue/{queueItemId}
```

**Description**: Retrieves detailed information about a specific queue item.

**Parameters**:
- `queueItemId` (path, number) - The queue item ID to query

**Response**:
```typescript
interface ApiResponse<QueueItemDetails> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    queueItemId: number;
    missionCode: string;
    missionType: string;
    status: string;
    robotId?: number;
    robotName?: string;
    priority: number;
    mapCode: string;
    queuedAt: string;
    startedAt?: string;
    completedAt?: string;
    progress: number;
    parameters: any;
    history: {
      timestamp: string;
      status: string;
      message: string;
    }[];
  };
}
```

---

#### Cancel Queue Item
```http
POST /api/queue/{queueItemId}/cancel
```

**Description**: Cancels a specific queued item.

**Parameters**:
- `queueItemId` (path, number) - The queue item ID to cancel

**Request Body** (optional):
```typescript
interface CancelQueueItemRequest {
  reason?: string;
}
```

**Response**:
```typescript
interface ApiResponse<void> {
  success: boolean;
  code: string;
  msg: string;
}
```

---

## 4. Mission Queue Operations

**Controller**: `MissionQueueController.cs`
**Base Route**: `/api/mission-queue`
**Frontend Feature**: Queue Monitor (Additional Operations)

### Endpoints

#### Get Pending Jobs by Map
```http
GET /api/mission-queue/pending/{mapCode}
```

**Description**: Retrieves all pending jobs for a specific map.

**Parameters**:
- `mapCode` (path, string) - The map code to query

**Response**:
```typescript
interface ApiResponse<QueueItem[]> {
  success: boolean;
  code: string;
  msg: string;
  data?: {
    queueItemId: number;
    missionCode: string;
    missionType: string;
    priority: number;
    queuedAt: string;
    estimatedStartTime?: string;
  }[];
}
```

---

#### Get Queue Item by ID
```http
GET /api/mission-queue/{queueItemId}
```

**Description**: Retrieves a queue item by its ID.

**Parameters**:
- `queueItemId` (path, number) - The queue item ID to query

**Response**:
```typescript
interface ApiResponse<QueueItem> {
  success: boolean;
  code: string;
  msg: string;
  data?: QueueItem;
}
```

---

#### Get Queue Item by Mission Code
```http
GET /api/mission-queue/by-mission/{missionCode}
```

**Description**: Retrieves a queue item by its mission code.

**Parameters**:
- `missionCode` (path, string) - The mission code to query

**Response**:
```typescript
interface ApiResponse<QueueItem> {
  success: boolean;
  code: string;
  msg: string;
  data?: QueueItem;
}
```

---

#### Cancel Job
```http
POST /api/mission-queue/{queueItemId}/cancel
```

**Description**: Cancels a specific job in the queue.

**Parameters**:
- `queueItemId` (path, number) - The queue item ID to cancel

**Request Body** (optional):
```typescript
interface CancelJobRequest {
  reason?: string;
}
```

**Response**:
```typescript
interface ApiResponse<void> {
  success: boolean;
  code: string;
  msg: string;
}
```

---

#### Update Job Status (Testing/Debugging)
```http
POST /api/mission-queue/{queueItemId}/status
```

**Description**: Updates the status of a job. This endpoint is primarily for testing and debugging purposes.

**Parameters**:
- `queueItemId` (path, number) - The queue item ID to update

**Request Body**:
```typescript
interface UpdateJobStatusRequest {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  currentLocation?: string;
}
```

**Response**:
```typescript
interface ApiResponse<QueueItem> {
  success: boolean;
  code: string;
  msg: string;
  data?: QueueItem;
}
```

---

## Common Response Format

All API endpoints follow this standard response format:

```typescript
interface ApiResponse<T> {
  success: boolean;      // Indicates if the request was successful
  code: string;          // Response code (e.g., "SUCCESS", "ERROR", "VALIDATION_ERROR")
  msg: string;           // Human-readable message
  data?: T;              // Response data (optional, depends on endpoint)
}
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  code: string;
  msg: string;
  errors?: {
    field: string;
    message: string;
  }[];
}
```

---

## Frontend Service Implementation Guidelines

When implementing services in the Angular frontend, follow this pattern:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class FeatureService {
  private readonly API_URL = 'http://localhost:5109/api';

  constructor(private http: HttpClient) {}

  // Example GET request
  getAll(): Observable<MyModel[]> {
    return this.http.get<ApiResponse<MyModel[]>>(`${this.API_URL}/endpoint`)
      .pipe(
        map(response => response.data || []),
        catchError(this.handleError)
      );
  }

  // Example POST request
  create(data: CreateRequest): Observable<MyModel> {
    return this.http.post<ApiResponse<MyModel>>(`${this.API_URL}/endpoint`, data)
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    }
    // Handle error appropriately (show notification, log, etc.)
    throw new Error(errorMessage);
  }
}
```

---

## WebSocket/Real-Time Updates

If your backend supports WebSocket connections for real-time queue monitoring, add those details here:

```typescript
// Example WebSocket connection for queue monitoring
const ws = new WebSocket('ws://localhost:5109/ws/queue-monitor');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Handle real-time queue updates
};
```

---

## Notes

1. **Authentication**: All endpoints require a valid JWT token in the `Authorization` header:
   ```
   Authorization: Bearer <token>
   ```

2. **Content-Type**: All POST/PUT requests should use `Content-Type: application/json`

3. **Date Formats**: All dates should be in ISO 8601 format (e.g., `2025-01-16T10:30:00Z`)

4. **Pagination**: If endpoints support pagination, use query parameters:
   ```
   ?page=1&pageSize=10
   ```

5. **Sorting**: If endpoints support sorting, use query parameters:
   ```
   ?sortBy=createdAt&sortOrder=desc
   ```

6. **Filtering**: If endpoints support filtering, use query parameters:
   ```
   ?status=pending&robotId=123
   ```

---

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Project overview and development guidelines
- [README.md](./README.md) - Project setup and getting started
- Backend API Repository: `/home/user/KUKA-BACKEND`

---

**Last Updated**: 2025-01-16
**Backend API Version**: Check with backend team
**Frontend Version**: Angular 20.3.9
