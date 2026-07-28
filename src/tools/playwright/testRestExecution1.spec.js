import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: '10' }).click();
  await page.getByRole('button', { name: 'Install Plugin 🚀' }).nth(3).click();
  await page.getByRole('button', { name: 'Install Plugin 🚀' }).nth(5).click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: 'Add Step' }).click();
  await page.getByRole('combobox').selectOption('owasp-zap-openapi-import');
  await page.getByRole('button', { name: 'Add Step' }).click();
  await page.getByRole('combobox').nth(1).selectOption('zap-start-scan-fixed-v2');
  await page.getByRole('textbox').nth(1).click();
  await page.getByRole('textbox').nth(1).fill('http://localhost:5173/mini-api.json');
  await page.getByRole('textbox').nth(2).click();
  await page.getByRole('textbox').nth(2).fill('Default Policy');
  await page.getByRole('button', { name: 'Run Workflow 🚀' }).click();
  await page.getByText('All OK').click();
});