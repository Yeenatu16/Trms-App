import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('User can log in as Admin and is redirected to Admin Dashboard', async ({ page }) => {
    await page.goto('/');

    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@trms.gov.et');
    await page.fill('input[type="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to Admin Dashboard
    await page.waitForURL('/admin/dashboard');

    // Verify Dashboard contains KPI elements
    await expect(page.locator('text=Total Referrals')).toBeVisible();
    await expect(page.locator('text=Pending Triage')).toBeVisible();
  });

  test('User can open signup panel, select role, and register', async ({ page }) => {
    await page.goto('/');

    // Switch to create account mode
    await page.click('text=Sign up');
    
    // Select Nurse role
    await expect(page.locator('text=Primary Health Care')).toBeVisible();
    await page.click('div:has(strong:has-text("Nurse"))');

    // Fill registration form
    await page.fill('input[placeholder="e.g. Abebe"]', 'Test');
    await page.fill('input[placeholder="e.g. Kebede"]', 'Nurse');
    await page.fill('input[type="email"]', `nurse_${Date.now()}@test.et`);
    await page.fill('input[type="password"]', 'securepass');
    
    // Sign up
    await page.click('button:has-text("Create Account")');

    // Expect redirect to Nurse mobile interface
    await page.waitForURL('/nurse');
    await expect(page.locator('text=New Referral')).toBeVisible();
  });
});
