import { test, expect } from '@playwright/test';

test.describe('비교분석 페이지', () => {
  test('/compare 접속 시 가이드 UI 표시 (items 없을 때)', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByText('비교분석 가이드')).toBeVisible();
  });

  test('"비교분석 가이드" 제목 존재', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: '비교분석 가이드' })).toBeVisible();
  });

  test('"검색 페이지로 이동" 링크 존재', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('link', { name: /검색 페이지로 이동/ })).toBeVisible();
  });

  test('/compare?tab=history 접속 시 "비교분석 이력" 표시', async ({ page }) => {
    await page.goto('/compare?tab=history');
    await expect(page.getByText('비교분석 이력')).toBeVisible();
  });
});
