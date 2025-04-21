import type { DatabaseError } from '../types';

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class DatabaseOperationError extends ApplicationError {
  constructor(operation: string, error: DatabaseError) {
    super(
      `데이터베이스 작업 실패: ${operation}`,
      'DATABASE_ERROR',
      error
    );
    this.name = 'DatabaseOperationError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class BusinessLogicError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'BUSINESS_LOGIC_ERROR', details);
    this.name = 'BusinessLogicError';
  }
}

export function handleError(error: unknown): { success: false; error: string } {
  console.error('Error occurred:', error);

  if (error instanceof ApplicationError) {
    return {
      success: false,
      error: `[${error.code}] ${error.message}`
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message
    };
  }

  return {
    success: false,
    error: '알 수 없는 오류가 발생했습니다.'
  };
} 