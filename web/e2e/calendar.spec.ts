import { expect, test, type Page } from '@playwright/test';
import type { Calendar } from '../src/data/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sample = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/calendar.json'), 'utf8')) as Calendar;

// Pin "today" (dev-only override) and keep data fresh so the stale banner stays out of the way.
const TODAY = '2026-10-27';
const fresh = (): Calendar => ({ ...sample, generated_at: new Date().toISOString() });

async function serve(page: Page, cal: () => Calendar) {
  await page.route('**/data/calendar.json', (route) => route.fulfill({ json: cal() }));
}

const q3Window = (cal: Calendar, status?: 'done') => {
  const c = structuredClone(cal);
  // uar Q4 starts 16 Nov 2026: planned in the sample, GRC later marks it done.
  const w = c.windows.find((x) => x.window_id === 'uar-FY2026-Q4')!;
  delete w.jira_status;
  if (status) w.status = status;
  return c;
};

test.describe('AC1: GRC marks a window done -> shows done after refresh', () => {
  test('status change in calendar.json appears after reload', async ({ page }) => {
    let cal = q3Window(fresh());
    await serve(page, () => cal);

    await page.goto(`/?today=${TODAY}&q=4&sel=uar`);
    const q4 = page.locator('.detail .wins li', { hasText: 'Q4' });
    await expect(q4.locator('.pill')).toHaveText('Planned');

    // GRC marks the window done; the publisher republishes calendar.json.
    cal = q3Window(fresh(), 'done');
    await page.reload();

    await expect(page.locator('.detail .wins li', { hasText: 'Q4' }).locator('.pill')).toHaveText('Done');
    await expect(page.locator('button.bar[aria-label*="Q4"]')).toHaveClass(/s-done/);
  });

  test('status is per window, not per activity', async ({ page }) => {
    await serve(page, () => q3Window(fresh(), 'done'));
    await page.goto(`/?today=${TODAY}&sel=uar&q=0`);
    const pills = page.locator('.detail .wins li .pill');
    await expect(pills).toHaveText(['Done', 'Done', 'Done', 'Done']);
    await serve(page, () => q3Window(fresh()));
    await page.reload();
    await expect(page.locator('.detail .wins li .pill')).toHaveText(['Done', 'Done', 'Done', 'Planned']);
  });

  test('shows where the status came from', async ({ page }) => {
    await serve(page, () => fresh());
    await page.goto(`/?today=${TODAY}&sel=uar&q=4`);
    await expect(page.locator('.detail .wins li', { hasText: 'Q4' })).toContainText('source: Jira');
  });
});

test.describe('AC3: filter by team -> only that team’s activities and asks', () => {
  test.beforeEach(async ({ page }) => {
    await serve(page, () => fresh());
  });

  test('timeline lists only activities with asks for the chosen team', async ({ page }) => {
    await page.goto(`/?today=${TODAY}&q=0`);
    await page.getByLabel('Team', { exact: true }).selectOption('Legal');
    await expect(page.locator('button.g-label .nm')).toHaveText(['Policy Review & Approval']);
    await expect(page).toHaveURL(/team=Legal/);
  });

  test('detail panel shows only the chosen team’s asks', async ({ page }) => {
    await page.goto(`/?today=${TODAY}&q=0&sel=uar`);
    const asks = page.locator('.detail h3:has-text("Team asks") + ul li');
    await expect(asks).toHaveCount(3);

    await page.getByLabel('Team', { exact: true }).selectOption('Infra');
    await expect(page.locator('.detail h3:has-text("Team asks")')).toHaveText('Team asks — Infra');
    await expect(asks).toHaveCount(1);
    await expect(asks.first()).toContainText('Infra:');
    await expect(page.locator('.detail')).not.toContainText('Managers certify team access');
  });

  test('team filter in the URL survives a reload and clears', async ({ page }) => {
    await page.goto(`/?today=${TODAY}&q=0&team=IT`);
    await expect(page.getByLabel('Team', { exact: true })).toHaveValue('IT');
    const names = await page.locator('button.g-label .nm').allTextContents();
    expect(names.sort()).toEqual(['SOC 2 Audit Fieldwork', 'User Access Review']);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.locator('button.g-label .nm')).not.toHaveCount(2);
    await expect(page).not.toHaveURL(/team=/);
  });
});
