import { test, expect } from '@playwright/test';

test.describe('Role Based Access and Navigation', () => {

  test('Nurse logs in and sees Nurse Dashboard', async ({ page }) => {
    // Mock session request to start logged out
    await page.route('**/auth/session', async (route) => {
      await route.fulfill({ status: 200, json: { user: null } });
    });

    // Mock login request for Nurse
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            id: 'n1',
            email: 'nurse@trms.gov.et',
            role: 'NURSE',
            firstName: 'Nurse',
            lastName: 'Joy'
          },
          token: 'fake-jwt-token'
        }
      });
    });

    await page.goto('/');

    // Fill in credentials
    await page.fill('input[type="email"]', 'nurse@trms.gov.et');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to Nurse Home
    await page.waitForURL('**/nurse*');

    // Verify some nurse specific text
    await expect(page.locator('text=New Referral').first()).toBeVisible({ timeout: 15000 });
  });

  test('Liaison Officer logs in and sees Triage Dashboard', async ({ page }) => {
    await page.route('**/auth/session', async (route) => {
      await route.fulfill({ status: 200, json: { user: null } });
    });

    // Mock login request for Liaison
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            id: 'l1',
            email: 'liaison@trms.gov.et',
            role: 'LIAISON_OFFICER',
            firstName: 'Liaison',
            lastName: 'Officer'
          },
          token: 'fake-jwt-token'
        }
      });
    });

    // Mock triage endpoint to prevent fetch failures
    await page.route('**/api/triage/pending', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/api/referrals/incoming', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.goto('/');

    await page.fill('input[type="email"]', 'liaison@trms.gov.et');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to Triage
    await page.waitForURL('**/triage*');

    // Verify triage specific text
    await expect(page.locator('text=Triage Queue').first()).toBeVisible({ timeout: 15000 });
  });

});
