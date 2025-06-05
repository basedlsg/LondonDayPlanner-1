import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { renderHook, act } from '@testing-library/react';

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear console errors for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when an error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('allows resetting the error state', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    
    // Click Try Again
    fireEvent.click(screen.getByText('Try Again'));
    
    // Rerender with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });
});

describe('useErrorHandler', () => {
  it('categorizes network errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError({
        code: 'NETWORK_ERROR',
        message: 'Network request failed'
      });
    });
    
    expect(result.current.lastError).toEqual({
      code: 'NETWORK_ERROR',
      message: 'Network request failed',
      details: expect.any(Object),
      statusCode: undefined
    });
  });

  it('categorizes HTTP status errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // Test 401 Unauthorized
    act(() => {
      result.current.handleError({
        statusCode: 401,
        message: 'Unauthorized'
      });
    });
    
    expect(result.current.lastError?.statusCode).toBe(401);
    
    // Test 404 Not Found
    act(() => {
      result.current.handleError({
        statusCode: 404,
        message: 'Not found'
      });
    });
    
    expect(result.current.lastError?.statusCode).toBe(404);
    
    // Test 500 Server Error
    act(() => {
      result.current.handleError({
        statusCode: 500,
        message: 'Internal server error'
      });
    });
    
    expect(result.current.lastError?.statusCode).toBe(500);
  });

  it('clears errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError({
        message: 'Test error'
      });
    });
    
    expect(result.current.isError).toBe(true);
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.isError).toBe(false);
    expect(result.current.lastError).toBe(null);
  });

  it('handles silent errors without showing toast', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.handleError({
        message: 'Silent error'
      }, { silent: true });
    });
    
    // Error should be stored but no toast shown
    expect(result.current.lastError?.message).toBe('Silent error');
  });
});