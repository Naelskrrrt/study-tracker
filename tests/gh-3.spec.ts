import { test, expect } from '@playwright/test';

test("GH-3 - Vérifier l'affichage du formulaire d'inscription et l'état initial invalide", async ({ page }) => {
  // Step 1: navigate to register page
  await page.goto('/register');

  // Step 2: register form is visible
  const registerForm = page.getByTestId('register-form');
  await expect(registerForm).toBeVisible({ timeout: 5000 });

  // Step 3: email field is visible
  const emailField = page.getByTestId('register-email');
  await expect(emailField).toBeVisible({ timeout: 5000 });

  // Step 4: username field is visible
  const usernameField = page.getByTestId('register-username');
  await expect(usernameField).toBeVisible({ timeout: 5000 });

  // Step 5: password field is visible
  const passwordField = page.getByTestId('register-password');
  await expect(passwordField).toBeVisible({ timeout: 5000 });

  // Step 6: submit button is visible
  const submitButton = page.getByTestId('register-submit');
  await expect(submitButton).toBeVisible({ timeout: 5000 });

  // Step 7: submit button is disabled on initial load
  await expect(submitButton).toBeDisabled({ timeout: 5000 });

  // Step 8: no validation error message is shown before interaction
  const preInteractionErrors = page.locator("[data-testid='register-form'] [role='alert'], [data-testid='register-form'] [data-testid='register-email-error'], [data-testid='register-form'] [data-testid='register-username-error'], [data-testid='register-form'] [data-testid='register-password-error']");
  await expect(preInteractionErrors).toHaveCount(0, { timeout: 5000 });

  // Step 9: click email field
  await emailField.click({ timeout: 5000 });
  await expect(emailField).toBeFocused();

  // Step 10: click username field to blur email without typing
  await usernameField.click({ timeout: 5000 });
  await expect(usernameField).toBeFocused();

  // Step 11: email error appears after minimal invalid interaction
  const emailError = page.getByTestId('register-email-error');
  await expect(emailError).toBeVisible({ timeout: 5000 });

  // Step 12: submit button remains disabled
  await expect(submitButton).toBeDisabled({ timeout: 5000 });
});
