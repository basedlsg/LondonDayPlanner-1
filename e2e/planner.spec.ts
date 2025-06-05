import { test, expect } from '@playwright/test';

test.describe('London Day Planner E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5001');
  });

  test('should load the homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Day Planner/);
    await expect(page.locator('h1')).toContainText(/plan your perfect day/i);
  });

  test('should create an itinerary', async ({ page }) => {
    // Enter a query
    const input = page.getByPlaceholder(/describe your ideal day/i);
    await input.fill('I want to visit museums and have lunch in Central Park');

    // Submit the form
    await page.getByRole('button', { name: /plan my day/i }).click();

    // Wait for loading to complete
    await expect(page.locator('.loading-spinner')).toBeVisible();
    await expect(page.locator('.loading-spinner')).toBeHidden({ timeout: 30000 });

    // Check that venues are displayed
    await expect(page.locator('[data-testid="venue-card"]')).toHaveCount(2);
    
    // Verify venue details
    const firstVenue = page.locator('[data-testid="venue-card"]').first();
    await expect(firstVenue).toContainText(/museum|park/i);
    await expect(firstVenue.locator('[data-testid="venue-time"]')).toBeVisible();
    await expect(firstVenue.locator('[data-testid="venue-address"]')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/*/plan', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          code: 'SERVER_ERROR'
        })
      });
    });

    // Enter a query
    const input = page.getByPlaceholder(/describe your ideal day/i);
    await input.fill('Test query');

    // Submit the form
    await page.getByRole('button', { name: /plan my day/i }).click();

    // Check error message is displayed
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText(/error|failed/i);
  });

  test('should switch between cities', async ({ page }) => {
    // Click city selector
    await page.getByRole('button', { name: /new york city/i }).click();
    
    // Select London
    await page.getByRole('menuitem', { name: /london/i }).click();

    // Verify URL changed
    await expect(page).toHaveURL(/\/london/);

    // Create an itinerary
    const input = page.getByPlaceholder(/describe your ideal day/i);
    await input.fill('Tea at Harrods and visit Big Ben');
    await page.getByRole('button', { name: /plan my day/i }).click();

    // Wait for results
    await expect(page.locator('[data-testid="venue-card"]')).toHaveCount(2, { timeout: 30000 });
  });

  test('should export itinerary to calendar', async ({ page }) => {
    // Create an itinerary first
    const input = page.getByPlaceholder(/describe your ideal day/i);
    await input.fill('Morning coffee and afternoon shopping');
    await page.getByRole('button', { name: /plan my day/i }).click();

    // Wait for itinerary to load
    await expect(page.locator('[data-testid="venue-card"]')).toHaveCount(2, { timeout: 30000 });

    // Click share button
    await page.getByRole('button', { name: /share/i }).click();

    // Check share modal is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toContainText(/share your itinerary/i);

    // Test download calendar
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download calendar/i }).click();
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.ics$/);
  });

  test('should show weather information', async ({ page }) => {
    // Mock weather API
    await page.route('**/api/weather/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          temperature: 72,
          conditions: 'Sunny',
          icon: '01d'
        })
      });
    });

    // Create an outdoor itinerary
    const input = page.getByPlaceholder(/describe your ideal day/i);
    await input.fill('Picnic in the park and outdoor activities');
    await page.getByRole('button', { name: /plan my day/i }).click();

    // Wait for venues
    await expect(page.locator('[data-testid="venue-card"]')).toHaveCount(2, { timeout: 30000 });

    // Check weather info is displayed
    await expect(page.locator('[data-testid="weather-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="weather-info"]')).toContainText(/72°F|sunny/i);
  });

  test('should validate input fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: /plan my day/i }).click();

    // Should show validation error
    await expect(page.locator('[data-testid="input-error"]')).toBeVisible();
    
    // Enter only spaces
    const input = page.getByPlaceholder(/describe your ideal day/i);
    await input.fill('   ');
    await page.getByRole('button', { name: /plan my day/i }).click();

    // Should still show error
    await expect(page.locator('[data-testid="input-error"]')).toBeVisible();
  });

  test('should handle venue variety', async ({ page }) => {
    // Create multiple itineraries with same query
    const queries = [];
    
    for (let i = 0; i < 3; i++) {
      const input = page.getByPlaceholder(/describe your ideal day/i);
      await input.fill('Coffee in SoHo');
      await page.getByRole('button', { name: /plan my day/i }).click();
      
      // Wait for results
      await expect(page.locator('[data-testid="venue-card"]')).toBeVisible({ timeout: 30000 });
      
      // Get venue name
      const venueName = await page.locator('[data-testid="venue-name"]').first().textContent();
      queries.push(venueName);
      
      // Go back to create new plan
      await page.goto('http://localhost:5001');
    }
    
    // Check that we got some variety (not all venues are the same)
    const uniqueVenues = new Set(queries);
    expect(uniqueVenues.size).toBeGreaterThan(1);
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu is visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Create an itinerary
    const input = page.getByPlaceholder(/describe your ideal day/i);
    await input.fill('Quick lunch and coffee');
    await page.getByRole('button', { name: /plan my day/i }).click();
    
    // Check results are displayed properly on mobile
    await expect(page.locator('[data-testid="venue-card"]')).toBeVisible({ timeout: 30000 });
    
    // Verify mobile-specific styles are applied
    const venueCard = page.locator('[data-testid="venue-card"]').first();
    const box = await venueCard.boundingBox();
    expect(box?.width).toBeLessThan(350);
  });
});