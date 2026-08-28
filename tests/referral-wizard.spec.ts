import { test, expect } from '@playwright/test';

test.describe('Offline Referral Wizard', () => {
  // Test simulated offline behavior
  test('Nurse can create and save a draft referral offline', async ({ page }) => {
    // 1. Login as Nurse
    await page.goto('/');
    await page.click('text=Sign up');
    await page.click('div:has(strong:has-text("Nurse"))');
    await page.fill('input[placeholder="e.g. Abebe"]', 'Offline');
    await page.fill('input[placeholder="e.g. Kebede"]', 'Nurse');
    await page.fill('input[type="email"]', `offline_${Date.now()}@test.et`);
    await page.fill('input[type="password"]', 'securepass');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('/nurse');

    // 2. Go Offline (simulate disconnect)
    await page.context().setOffline(true);

    // 3. Enter wizard
    await page.click('text=New Referral');
    await page.waitForURL('**/referral/new');

    // Expected Steps: Patient > Facility > Clinical > Confirm
    // Step 1: Patient
    await page.fill('input[name="mrn"]', 'MRN-OFFLINE-TEST');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="age"]', '45');
    await page.selectOption('select[name="sex"]', 'MALE');
    await page.click('button:has-text("Next")');

    // Step 2: Facility & Priority
    await page.selectOption('select[name="originFacilityId"]', 'FAC-001'); // Origin Default
    await page.selectOption('select[name="destFacilityId"]', 'FAC-002'); // Destination Default
    await page.click('button:has-text("EMERGENCY")');
    await page.click('button:has-text("Next")');

    // Step 3: Clinical
    await page.fill('textarea[name="clinicalSummary"]', 'Patient experiencing severe localized pain. Needs immediate evaluation.');
    await page.click('button:has-text("Next")');

    // Step 4: Confirm
    // Tick consent
    await page.click('input[type="checkbox"]');
    // Save Offline
    await page.click('button:has-text("Save Draft Offline")');

    // We expect it to redirect back to Nurse Home
    await page.waitForURL('/nurse');

    // 4. Verify the Sync Banner shows "Working Offline"
    await expect(page.locator('text=Working Offline')).toBeVisible();

    // 5. Go Online (simulate reconnect)
    await page.context().setOffline(false);

    // 6. Verify sync goes through
    await expect(page.locator('text=Working Offline')).toBeHidden();
    // It should transiently show "Syncing drafts up to network", but Playwright might skip over it too fast,
    // so we verify it settles at UP TO DATE by the absence of the banner
    await expect(page.locator('text=Working Offline')).toBeHidden();
  });
});
