import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.resolve(currentDir, '../../../docs/demo/screenshots');

async function shot(page: Page, name: string, fullPage = false) {
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage });
}

async function closeTour(page: Page) {
  const skip = page.getByRole('button', { name: '略過' });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

async function waitForApi(page: Page) {
  const response = await page.request.get('/api/v1/health');
  expect(response.ok()).toBeTruthy();
}

async function gotoNav(page: Page, label: string) {
  await closeTour(page);
  await page.getByRole('link', { name: label }).click();
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(500);
}

test.describe('IR / RAG Evaluation Lab demo walkthrough', () => {
  test('captures guided tour and major feature workflow', async ({ page }) => {
    await waitForApi(page);

    await page.goto('/');
    await expect(page.getByText('導覽小幫手')).toBeVisible();
    await expect(page.getByText(/1\/15/)).toBeVisible();
    await shot(page, '01-tour-overview');

    for (let step = 2; step <= 15; step += 1) {
      await page.getByRole('button', { name: /下一步|完成/ }).click();
      await page.waitForTimeout(650);
      await expect(page.getByText(new RegExp(`${step}/15|完成|導覽小幫手`))).toBeVisible({ timeout: 12_000 }).catch(() => undefined);
      if ([3, 5, 7, 9, 11, 13, 14, 15].includes(step)) {
        await shot(page, `${String(step).padStart(2, '0')}-tour-step`);
      }
    }
    await page.getByRole('button', { name: '完成' }).click();
    await expect(page.getByText(/1\/15|15\/15/)).toBeHidden();

    await gotoNav(page, '資料旅程');
    await expect(page.getByText('資料上傳區')).toBeVisible();
    await expect(page.getByText('逐步 pipeline tabs')).toBeVisible();
    await shot(page, '16-journey-top');
    await page.getByRole('button', { name: /Metrics/ }).click();
    await expect(page.getByRole('heading', { name: 'Retrieval metrics 與 per-query analytics' })).toBeVisible();
    await shot(page, '17-journey-metrics');

    await gotoNav(page, '語料庫');
    await expect(page.getByRole('heading', { name: '資料集管理' })).toBeVisible();
    await shot(page, '18-corpus-quality', true);

    await gotoNav(page, '實驗工作流');
    await expect(page.getByRole('heading', { name: '實驗工作流' })).toBeVisible();
    await shot(page, '19-experiment-workflow');

    await gotoNav(page, '查詢評估器');
    await expect(page.getByRole('heading', { name: '查詢評估器' })).toBeVisible();
    await page.getByRole('button', { name: '執行全部檢索模式' }).click();
    await expect(page.locator('h3', { hasText: 'BM25' }).first()).toBeVisible({ timeout: 25_000 });
    await shot(page, '20-query-evaluator-results', true);

    await gotoNav(page, '檢索比較');
    await expect(page.getByRole('heading', { name: '檢索比較' })).toBeVisible();
    await shot(page, '21-retrieval-comparison', true);

    await gotoNav(page, '評估分析');
    await expect(page.getByRole('heading', { name: '評估分析' })).toBeVisible();
    await shot(page, '22-analytics-top');
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);
    await shot(page, '23-analytics-scroll');

    await gotoNav(page, 'RAG 引用檢查');
    await expect(page.getByRole('heading', { name: 'RAG 引用檢查' })).toBeVisible();
    await page.getByRole('button', { name: '搜尋' }).click();
    await expect(page.getByText('答案')).toBeVisible({ timeout: 20_000 });
    await shot(page, '24-rag-citation-workbench', true);

    await gotoNav(page, '錯誤案例');
    await expect(page.getByRole('heading', { name: '錯誤案例' })).toBeVisible();
    await shot(page, '25-bad-cases', true);

    await gotoNav(page, 'LLM 評估');
    await expect(page.getByRole('heading', { name: 'LLM 評估' })).toBeVisible();
    await shot(page, '26-llm-dashboard', true);

    await gotoNav(page, '文本探勘');
    await expect(page.getByRole('heading', { name: '文本探勘' })).toBeVisible();
    await shot(page, '27-text-mining-network', true);

    await gotoNav(page, '實驗紀錄');
    await expect(page.getByRole('heading', { name: '實驗紀錄' })).toBeVisible();
    await shot(page, '28-experiment-runs', true);

    await gotoNav(page, '總覽');
    await page.getByLabel('Language').selectOption('en-US');
    await expect(page.getByText('Evaluation Command Center')).toBeVisible();
    await shot(page, '29-english-ui');
  });
});
