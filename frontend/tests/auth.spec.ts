import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('User can log in as Admin and is redirected to Admin Dashboard', async ({ page }) => {
    // Mock session request to avoid background checkSession overwriting login
    await page.route('**/auth/session', async (route) => {
      await route.fulfill({ status: 200, json: { user: null } }); // Start logged out
    });

    // Mock login request
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            id: '1',
            email: 'admin@trms.gov.et',
            role: 'ADMINISTRATOR',
            firstName: 'Admin',
            lastName: 'User'
          },
          token: 'fake-jwt-token'
        }
      });
    });

    // Mock analytics request on dashboard
    await page.route('**/api/analytics/summary', async (route) => {
      await route.fulfill({
        status: 200,
        json: { total: 847, accepted: 14, activeFacilities: 5 }
      });
    });

    await page.goto('/');

    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@trms.gov.et');
    await page.fill('input[type="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to Admin Dashboard
    await page.waitForURL('**/admin/dashboard*');

    // Verify Dashboard contains KPI elements
    // Increase timeout to 15s to account for Next.js dev server chunk compilation under concurrent test load
    await expect(page.locator('text=Total Referrals').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Pending Triage').first()).toBeVisible();
  });

  test('User can open signup panel, register as Admin', async ({ page }) => {
    // Mock session request
    await page.route('**/auth/session', async (route) => {
      await route.fulfill({ status: 200, json: { user: null } });
    });

    // Mock signup request
    await page.route('**/auth/signup', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            id: '2',
            email: 'newadmin@trms.gov.et',
            role: 'ADMINISTRATOR',
            firstName: 'New',
            lastName: 'Admin'
          },
          token: 'fake-jwt-token'
        }
      });
    });

    // Mock analytics request on dashboard
    await page.route('**/api/analytics/summary', async (route) => {
      await route.fulfill({
        status: 200,
        json: { total: 0, accepted: 0, activeFacilities: 0 }
      });
    });

    await page.goto('/');

    // Switch to create account mode
    await page.click('text=Administrator? Create account');
    
    // Fill registration form
    await page.fill('input#reg-name', 'Dr. Abebe Kebede');
    await page.fill('input[id="auth-email"]', 'newadmin@trms.gov.et');
    await page.fill('input#auth-password', 'securepass123');
    await page.fill('input#auth-confirm', 'securepass123');
    await page.fill('input#auth-code', 'SECRET_CODE');
    
    // Sign up
    await page.click('button:has-text("Create Admin Account")');

    // Wait for redirect to Admin Dashboard
    await page.waitForURL('**/admin/dashboard*');
    // Increase timeout to 15s to account for Next.js dev server chunk compilation
    await expect(page.locator('text=Total Referrals').first()).toBeVisible({ timeout: 15000 });
  });
});
