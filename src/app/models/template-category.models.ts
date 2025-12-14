/**
 * DTO for template category data returned from API
 */
export interface TemplateCategoryDto {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  createdUtc: string;
  updatedUtc: string;
  templateCount: number;
}

/**
 * Request to create a new template category
 */
export interface TemplateCategoryCreateRequest {
  name: string;
  description?: string | null;
  displayOrder?: number;
}

/**
 * Request to update an existing template category
 */
export interface TemplateCategoryUpdateRequest {
  name: string;
  description?: string | null;
  displayOrder: number;
}

/**
 * Request to assign a template to a category
 */
export interface AssignTemplateToCategoryRequest {
  categoryId: number | null;
}

/**
 * Standard API response wrapper
 */
export interface TemplateCategoryApiResponse<T> {
  success: boolean;
  msg?: string;
  data?: T;
}
