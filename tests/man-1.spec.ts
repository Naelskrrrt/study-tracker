import { test, expect } from '@playwright/test';

test.describe('MAN-1 - Login page renders core branding and authentication options', () => {
  test('should render title, subtitle, and exactly three expected auth buttons', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login$/);

    const titleHeading = page.getByRole('heading', { name: 'NVIDIA Tracker' });
    await expect(titleHeading).toBeVisible({ timeout: 5000 });

    const subtitleText = page.getByText('Tracker de certification gamifié');
    await expect(subtitleText).toBeVisible({ timeout: 5000 });

    const allButtons = page.locator('button');
    await expect(allButtons).toHaveCount(3, { timeout: 5000 });

    const githubButton = page.getByRole('button', { name: 'Continuer avec GitHub' });
    await expect(githubButton).toBeVisible({ timeout: 5000 });

    const googleButton = page.getByRole('button', { name: 'Continuer avec Google' });
    await expect(googleButton).toBeVisible({ timeout: 5000 });

    const devLoginButton = page.getByRole('button', { name: 'Dev Login (local)' });
    await expect(devLoginButton).toBeVisible({ timeout: 5000 });

    const discordText = page.getByText('Continuer avec Discord');
    await expect(discordText).toHaveCount(0, { timeout: 3000 });

    const githubIcon = page.locator("button:has-text('Continuer avec GitHub') svg");
    await expect(githubIcon).toBeVisible({ timeout: 5000 });

    const googleIcon = page.locator("button:has-text('Continuer avec Google') svg");
    await expect(googleIcon).toBeVisible({ timeout: 5000 });
  });
});
