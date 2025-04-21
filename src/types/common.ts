export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DatabaseError {
  code: string;
  message: string;
  details?: unknown;
} 