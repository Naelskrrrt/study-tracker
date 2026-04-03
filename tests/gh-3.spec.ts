import { test, expect } from '@playwright/test';

test("Validation en temps réel du formulaire d'inscription et état du bouton Submit", async ({ page }) => {
  await page.goto('/login');

  const emailInput = page.locator("input[name='email']");
  const passwordInput = page.locator("input[name='password']");
  const usernameInput = page.locator("input[name='username']");
  const submitButton = page.locator("button[type='submit']");

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(usernameInput).toBeVisible();
  await expect(submitButton).toBeVisible();

  await emailInput.fill('invalid-email');
  await expect(emailInput).toHaveValue('invalid-email');

  const emailError = page.getByText('Email invalide');
  await expect(emailError).toBeVisible();

  await passwordInput.fill('short');
  await expect(passwordInput).toHaveValue('short');

  const passwordError = page.getByText(
    'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre'
  );
  await expect(passwordError).toBeVisible();

  await usernameInput.fill('ab');
  await expect(usernameInput).toHaveValue('ab');

  const usernameError = page.getByText(
    "Le nom d'utilisateur doit contenir entre 3 et 30 caractères"
  );
  await expect(usernameError).toBeVisible();

  await expect(submitButton).toBeDisabled();

  await emailInput.fill('user@example.com');
  await expect(emailInput).toHaveValue('user@example.com');
  await expect(emailError).toBeHidden();

  await passwordInput.fill('Password1');
  await expect(passwordInput).toHaveValue('Password1');
  await expect(passwordError).toBeHidden();

  await usernameInput.fill('usernamevalid');
  await expect(usernameInput).toHaveValue('usernamevalid');
  await expect(usernameError).toBeHidden();

  await expect(submitButton).toBeEnabled();
});
