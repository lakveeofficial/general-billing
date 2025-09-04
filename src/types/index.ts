// Common API response type
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Common error response
export interface ErrorResponse {
  error: string;
  status?: number;
}

// Example type for API error handling
export type ApiError = ErrorResponse | string | null;

// Common query parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// Common entity with base fields
export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
