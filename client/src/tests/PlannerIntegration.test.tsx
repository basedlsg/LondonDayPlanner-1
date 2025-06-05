import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import { CityProvider } from '../hooks/useCity';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CityProvider>
          {children}
        </CityProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Planner Integration Tests', () => {
  beforeAll(() => {
    // Mock city data
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/cities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              slug: 'nyc',
              name: 'New York City',
              timezone: 'America/New_York',
              defaultLocation: { lat: 40.7128, lng: -74.0060 }
            }
          ])
        });
      }
      return Promise.reject(new Error('Not mocked'));
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('handles successful itinerary creation', async () => {
    const mockItinerary = {
      id: 1,
      title: 'NYC Day Plan',
      description: 'A day in NYC',
      venues: [
        {
          name: 'Central Park',
          address: '59th St to 110th St',
          time: '10:00 AM',
          duration: 90
        },
        {
          name: 'MoMA',
          address: '11 W 53rd St',
          time: '2:00 PM',
          duration: 120
        }
      ]
    };

    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockItinerary)
      })
    );

    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    // Fill in the query
    const input = screen.getByPlaceholderText(/describe your ideal day/i);
    fireEvent.change(input, { target: { value: 'Visit museums and parks in NYC' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /plan my day/i });
    fireEvent.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/nyc/plan'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        })
      })
    );

    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    // Fill in the query
    const input = screen.getByPlaceholderText(/describe your ideal day/i);
    fireEvent.change(input, { target: { value: 'Test query' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /plan my day/i });
    fireEvent.click(submitButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    // Fill in the query
    const input = screen.getByPlaceholderText(/describe your ideal day/i);
    fireEvent.change(input, { target: { value: 'Test query' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /plan my day/i });
    fireEvent.click(submitButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('validates input before submission', async () => {
    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    // Try to submit without entering a query
    const submitButton = screen.getByRole('button', { name: /plan my day/i });
    fireEvent.click(submitButton);

    // Should not make API call
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/nyc/plan'),
      expect.any(Object)
    );
  });

  it('handles city switching', async () => {
    // Mock multiple cities
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/cities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              slug: 'nyc',
              name: 'New York City',
              timezone: 'America/New_York'
            },
            {
              slug: 'london',
              name: 'London',
              timezone: 'Europe/London'
            }
          ])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 1, title: 'Test' })
      });
    });

    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    // Submit for NYC
    const input = screen.getByPlaceholderText(/describe your ideal day/i);
    fireEvent.change(input, { target: { value: 'NYC test' } });
    fireEvent.click(screen.getByRole('button', { name: /plan my day/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/nyc/plan'),
        expect.any(Object)
      );
    });
  });
});