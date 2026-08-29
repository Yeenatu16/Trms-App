import { test, expect } from '@playwright/test';

test.describe('Offline Referral Wizard', () => {
  // Test simulated offline behavior
  test('Nurse can create and save a draft referral offline', async ({ page }) => {
    // Mock session request to avoid background checkSession kicking out the user
    await page.route('**/auth/session', async (route) => {
      await route.fulfill({ status: 200, json: { user: null } });
    });

    // Mock login request
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          user: {
            id: '3',
            email: 'nurse@trms.gov.et',
            role: 'NURSE',
            firstName: 'Offline',
            lastName: 'Nurse',
            facilityId: 'FAC-001'
          },
          token: 'fake-jwt-token'
        }
      });
    });

    // 1. Login as Nurse
    await page.goto('/');
    await page.fill('input[type="email"]', 'nurse@trms.gov.et');
    await page.fill('input[type="password"]', 'securepass');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/nurse*');

    // Mock facilities request
    await page.route('**/api/directory/facilities', async (route) => {
      await route.fulfill({
        status: 200,
        json: [{
          id: 'FAC-002', name: 'Ayder Referral Hospital', status: 'ONLINE',
          services: [{ id: 'SRV-01', status: 'AVAILABLE', bedsTotal: 10, bedsAvailable: 5, clinicalService: { name: 'Cardiology' } }]
        }]
      });
    });

    // 2. Enter wizard
    // Click the New Referral quick action link
    await page.locator('a[href="/referral/new"]').first().click();
    await page.waitForURL('**/referral/new*');

    // Wait for the page to fully render (meaning AuthContext has finished)
    // Increase timeout to 15s for Next.js dev server chunk compilation
    await expect(page.locator('h1:has-text("New Patient Referral")')).toBeVisible({ timeout: 15000 });

    // Handle the window.alert that happens on submit
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // 3. Go Offline (simulate disconnect without breaking Next.js dev server)
    await page.route('**/api/**', route => route.abort('failed'));
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });

    // Step 1: Patient
    await page.locator('input[name="mrn"]').fill('MRN-OFFLINE-TEST');
    await page.locator('input[name="firstName"]').fill('John');
    await page.locator('input[name="lastName"]').fill('Doe');
    await page.locator('input[name="age"]').fill('45');
    await page.locator('select[name="sex"]').selectOption('MALE');
    await page.click('button:has-text("Next")');

    // Step 2: Facility & Priority
    // Priority: Click Emergency
    await page.click('button:has-text("Emergency")');
    // Facilities: The mock returns FAC-002
    await page.locator('select[name="destFacilityId"]').selectOption('FAC-002');
    await page.locator('select[name="selectedServiceId"]').selectOption('SRV-01');
    await page.click('button:has-text("Next")');

    // Step 3: Clinical
    await page.locator('textarea[name="clinicalSummary"]').fill('Patient experiencing severe localized pain. Needs immediate evaluation.');
    await page.click('button:has-text("Next")');

    // Step 4: Attachments (Skip)
    await page.click('button:has-text("Next")');

    // Step 5: Confirm
    // Tick consent
    await page.click('input[type="checkbox"]');
    // Save Offline
    await page.click('button:has-text("Secure Submit Referral")');

    // We expect it to redirect back to Nurse Home
    await page.waitForURL('**/nurse*');

    // 4. Verify the Sync Banner shows "Working Offline"
    await expect(page.locator('text=Working Offline')).toBeVisible();

    // 5. Go Online (simulate reconnect)
    await page.unroute('**/api/**'); // allow requests again
    // We need to re-add the mock for /api/sync so it succeeds, and /api/referrals/my so it doesn't fail
    await page.route('**/api/sync', async route => {
      await route.fulfill({ status: 200, json: { syncedIds: ['dummy-id'] } });
    });
    await page.route('**/api/referrals/my', async route => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    // 6. Verify sync goes through
    // It should transiently show "Syncing drafts up to network", but Playwright might skip over it too fast,
    // so we verify it settles at UP TO DATE by the absence of the banner
    await expect(page.locator('text=Working Offline')).toBeHidden();
  });
});
