import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const CLIENT = '/#/c/carnot-ai';

function slider(page: Page) {
  return page.getByRole('slider', { name: 'Feminine to Masculine' });
}

function note(page: Page) {
  return page.getByRole('textbox', { name: 'Notes on Feminine to Masculine' });
}

/**
 * Waits for the browser's own copy to catch up. The visible indicator is not
 * enough on its own: it says a save happened, not that this edit is in it, and
 * two saves a few seconds apart show the same time.
 */
async function waitUntilSaved(page: Page, text: string) {
  await page.waitForFunction(
    (expected) => (localStorage.getItem('brand-tone/v1/carnot-ai') ?? '').includes(expected),
    text,
  );
}

test.describe('the main path', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('answers survive a reload and travel in a share link', async ({ page, browser }) => {
    await page.goto(CLIENT);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Spectrum');

    // Move a slider with the keyboard alone.
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(slider(page)).toHaveValue('4');

    await note(page).fill('Warmth over force.');

    // The browser keeps a copy after a short pause, not on every key press.
    await expect(page.getByText(/^Saved /)).toBeVisible();
    await waitUntilSaved(page, 'Warmth over force.');

    await page.reload();
    await expect(slider(page)).toHaveValue('4');
    await expect(note(page)).toHaveValue('Warmth over force.');

    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Share link copied.')).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('#/c/carnot-ai?a=');

    // A browser that has never seen this client takes the answers from the link.
    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await freshPage.goto(link);
    await expect(slider(freshPage)).toHaveValue('4');
    await expect(note(freshPage)).toHaveValue('Warmth over force.');
    await fresh.close();
  });

  test('a link never quietly replaces work already in the browser', async ({ page }) => {
    await page.goto(CLIENT);
    await note(page).fill('Mine.');
    await waitUntilSaved(page, 'Mine.');

    await page.getByRole('button', { name: 'Copy link' }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());

    // Change the answers, then open the older link on the same browser.
    await note(page).fill('Mine, changed since.');
    await waitUntilSaved(page, 'Mine, changed since.');
    await page.goto(link);

    const prompt = page.getByRole('alertdialog', { name: 'Answers from a link' });
    await expect(prompt).toBeVisible();
    await expect(note(page)).toHaveValue('Mine, changed since.');

    await prompt.getByRole('button', { name: 'Use the link' }).click();
    await expect(note(page)).toHaveValue('Mine.');
  });
});

test('a download can be loaded back in', async ({ page }) => {
  await page.goto(CLIENT);
  await note(page).fill('Round trip through a file.');

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ]).then(([event]) => event);

  const path = await download.path();
  expect(path).not.toBeNull();

  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Reset, sure?' }).click();
  await expect(note(page)).toHaveValue('');

  if (path !== null) {
    await page.getByLabel('Load a JSON file of answers').setInputFiles(path);
    await expect(note(page)).toHaveValue('Round trip through a file.');
  }
});

test('the presentation view hides the toolbar and prevents editing', async ({ page }) => {
  await page.goto('/#/c/carnot-ai?present=1');

  await expect(page.getByRole('group', { name: 'Actions' })).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Feminine to Masculine' })).toBeDisabled();
  await expect(page.getByRole('textbox')).toHaveCount(0);
});

test('no send button appears when no endpoint is configured', async ({ page }) => {
  await page.goto(CLIENT);
  await expect(page.getByRole('button', { name: /send/i })).toHaveCount(0);
});

test('printing shows the notes as words and drops the toolbar', async ({ page }) => {
  await page.goto(CLIENT);
  await note(page).fill('This should appear on paper.');

  await page.emulateMedia({ media: 'print' });

  await expect(page.getByRole('group', { name: 'Actions' })).toBeHidden();
  await expect(note(page)).toBeHidden();
  // The printed twin of the note, which only the print stylesheet reveals.
  const printed = page.locator('.notes-static').first();
  await expect(printed).toBeVisible();
  await expect(printed).toHaveText('This should appear on paper.');
});

test('an unknown client says so', async ({ page }) => {
  await page.goto('/#/c/nobody-here');
  await expect(page.getByRole('heading', { name: 'No such client' })).toBeVisible();
});

test.describe('accessibility', () => {
  for (const [name, path] of [
    ['the index', '/'],
    ['a client sheet', CLIENT],
    // The presentation view swaps every notes box for read only text, so it is
    // a different tree from the editable sheet and needs checking on its own.
    ['the presentation view', `${CLIENT}?present=1`],
  ] as const) {
    test(`${name} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
