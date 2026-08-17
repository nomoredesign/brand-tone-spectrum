import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ClientConfigSchema } from '../shared/schema';

test.describe('the client builder', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('builds a client file the app would load', async ({ page }) => {
    await page.goto('/#/new');

    // A blank form is not a form full of mistakes.
    await expect(page.getByText('is needed.')).toHaveCount(0);

    await page.getByLabel('Client name').fill('Blue Harbour Coffee');
    await expect(page.getByLabel('Slug, which becomes their link')).toHaveValue(
      'blue-harbour-coffee',
    );

    await page.getByLabel('Date line').fill('SEPTEMBER 2026');

    // The preview is the real sheet, so the client's name reaches the footer.
    const preview = page.getByLabel("Preview of the client's chart");
    await expect(preview).toBeVisible();
    await expect(preview.getByText('BLUE HARBOUR COFFEE')).toBeVisible();

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /^Download / }).click(),
    ]).then(([event]) => event);

    expect(download.suggestedFilename()).toBe('blue-harbour-coffee.json');

    const path = await download.path();
    expect(path).not.toBeNull();
    if (path === null) return;

    const written = ClientConfigSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));
    expect(written.success ? null : written.error.issues).toBeNull();
    if (!written.success) return;

    expect(written.data.slug).toBe('blue-harbour-coffee');
    expect(written.data.clientName).toBe('Blue Harbour Coffee');
    expect(written.data.dateLine).toBe('SEPTEMBER 2026');
    expect(written.data.axes).toHaveLength(8);
  });

  test('adds, removes and reorders the pairs', async ({ page }) => {
    await page.goto('/#/new');
    await page.getByLabel('Client name').fill('Pair Test');

    const lefts = page.getByLabel('Left', { exact: true });
    await expect(lefts).toHaveCount(8);
    await expect(lefts.first()).toHaveValue('Feminine');

    await page.getByRole('button', { name: 'Move Feminine down' }).click();
    await expect(lefts.first()).toHaveValue('Playful');

    await page.getByRole('button', { name: 'Remove Playful' }).click();
    await expect(lefts).toHaveCount(7);

    await page.getByRole('button', { name: 'Add a pair' }).click();
    await expect(lefts).toHaveCount(8);

    // The new pair is empty, so the file is not ready until it is filled in.
    await expect(page.getByRole('button', { name: /^Download / })).toHaveCount(0);

    await lefts.last().fill('Quiet');
    await page.getByLabel('Right', { exact: true }).last().fill('Loud');
    await expect(page.getByRole('button', { name: /^Download / })).toBeVisible();
  });

  test('refuses a slug another client already uses', async ({ page }) => {
    await page.goto('/#/new');

    await page.getByLabel('Client name').fill('Carnot AI');
    await expect(page.getByText('A client with the slug carnot-ai already exists.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Download / })).toHaveCount(0);

    await page.getByLabel('Slug, which becomes their link').fill('carnot-ai-two');
    await expect(page.getByRole('button', { name: /^Download / })).toBeVisible();
  });

  test('warns about colours that would be hard to read', async ({ page }) => {
    await page.goto('/#/new');
    await page.getByLabel('Client name').fill('Pale Test');

    await page.getByLabel('Give this client its own colours').check();
    await expect(page.getByText('Every pair has enough contrast.')).toBeVisible();

    await page.getByLabel('Text colour as a hex code', { exact: true }).fill('#e8e4dc');
    await expect(page.getByText('Labels and headings on the paper')).toBeVisible();
  });

  test('opens an existing client with its details already in', async ({ page }) => {
    await page.goto('/#/edit/demo-studio');

    await expect(page.getByLabel('Client name')).toHaveValue('DEMO STUDIO');
    await expect(page.getByLabel('Left', { exact: true }).first()).toHaveValue('Quiet');
    // The references it already has are reported rather than quietly dropped.
    await expect(page.getByText('3 references on this pair, kept as they are.')).toBeVisible();
  });

  test('says which files to delete when a client is removed', async ({ page }) => {
    await page.goto('/#/');

    await page
      .getByRole('listitem')
      .filter({ hasText: 'DEMO STUDIO' })
      .getByRole('button', { name: 'Remove' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Scoped to the listed files, since the commands below repeat the names.
    await expect(dialog.locator('code', { hasText: 'clients/demo-studio.json' })).toBeVisible();
    await expect(dialog.locator('code', { hasText: 'public/refs/demo-studio/' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Copy the commands' }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('git rm -r clients/demo-studio.json');
  });

  test('the builder has no axe violations', async ({ page }) => {
    await page.goto('/#/new');
    await page.getByLabel('Client name').fill('Axe Test');
    await page.getByLabel('Give this client its own colours').check();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
