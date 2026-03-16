import { test, expect } from '@playwright/test';

test.describe('검색 페이지', () => {
  test('/search 접속 시 필터 영역 존재', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText('검색 조건')).toBeVisible();
  });

  test('지역 선택 UI 존재', async ({ page }) => {
    await page.goto('/search');
    // 필터 패널 열기
    await page.getByText('검색 조건').click();
    await expect(page.getByText('시/도 선택').or(page.getByText('지역 선택')).or(page.getByRole('combobox').first())).toBeVisible();
  });

  test('모바일 탭 바(지도/목록) 존재 - viewport 640px', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/search');
    await expect(page.getByRole('button', { name: /목록/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /지도/ })).toBeVisible();
  });

  test('다크모드 토글 존재', async ({ page }) => {
    await page.goto('/search');
    const toggle = page.getByRole('button', { name: /다크 모드|라이트 모드/ });
    await expect(toggle).toBeVisible();
  });

  test('다크모드 토글 클릭 시 html.dark 클래스 적용', async ({ page }) => {
    await page.goto('/search');
    // 초기 상태를 라이트로 강제 (로컬스토리지 초기화)
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();

    const toggle = page.getByRole('button', { name: /다크 모드/ });
    await toggle.click();

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );
    expect(hasDark).toBe(true);
  });
});
