import { test, expect } from '@playwright/test';

test.describe('네비게이션', () => {
  test('홈페이지 접속 시 "방구석 임장" 타이틀 표시', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('방구석 임장')).toBeVisible();
  });

  test('네비게이션 링크 존재 - 가이드', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTitle('비교분석 사용 가이드')).toBeVisible();
  });

  test('네비게이션 링크 존재 - 비교분석 이력', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /비교분석 이력/ })).toBeVisible();
  });

  test('네비게이션 링크 존재 - 관심단지 지도', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /관심단지 지도/ })).toBeVisible();
  });

  test('네비게이션 링크 존재 - 나의관심단지', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '나의관심단지' })).toBeVisible();
  });

  test('검색 페이지 이동 가능', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '매물 검색' }).click();
    await expect(page).toHaveURL(/\/search/);
  });

  test('비교분석 페이지 이동 가능', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /비교분석 이력/ }).click();
    await expect(page).toHaveURL(/\/compare/);
  });
});
