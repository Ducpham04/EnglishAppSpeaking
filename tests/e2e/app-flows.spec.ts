import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('#login-submit-btn').click();
  await expect(page).toHaveURL(/\/(student|teacher|admin)\/dashboard/);
}

test.describe('core commercial flows', () => {
  test('student can log in, see classes, and open assigned practice', async ({ page }) => {
    await login(page, 'student@gbspeaking.com', 'student123');

    await page.goto('/student/classes');
    await expect(page.getByRole('heading', { name: /lớp học của tôi/i })).toBeVisible();
    await expect(page.getByText(/English B1/i)).toBeVisible();

    await page.goto('/student/assignments');
    await expect(page.getByRole('heading', { name: /bài tập của tôi/i })).toBeVisible();
    await page.getByRole('button', { name: /bắt đầu/i }).first().click();
    await expect(page).toHaveURL(/\/student\/assignments\/.+\/practice/);
    await expect(page.getByRole('link', { name: /vào phòng luyện/i }).first()).toBeVisible();
  });

  test('teacher can create class assignment and inspect deep report', async ({ page }) => {
    await login(page, 'teacher@gbspeaking.com', 'teacher123');

    await page.goto('/teacher/classes/class-english-b1');
    await expect(page.getByText(/Báo cáo sâu/i)).toBeVisible();

    await page.getByText(/Báo cáo sâu/i).click();
    await expect(page).toHaveURL(/\/teacher\/classes\/class-english-b1\/report/);
    await expect(page.getByRole('heading', { name: /báo cáo chuyên sâu/i })).toBeVisible();

    await page.goto('/teacher/assignments/create?classId=class-english-b1');
    await expect(page.getByRole('heading', { name: /tạo bài luyện hội thoại/i })).toBeVisible();
    await expect(page.getByLabel(/lớp học/i)).toHaveValue('class-english-b1');
  });

  test('admin can grant a student plan', async ({ page }) => {
    await login(page, 'admin@gbspeaking.com', 'admin123');

    await page.goto('/admin/students');
    await expect(page.getByRole('heading', { name: /quản lý học viên/i })).toBeVisible();
    await expect(page.getByText(/student@gbspeaking.com/i)).toBeVisible();

    const firstGrantButton = page.getByRole('button', { name: /cấp gói/i }).first();
    await expect(firstGrantButton).toBeVisible();
    await firstGrantButton.click();
    await expect(page.getByText(/Free|Student Plus/i).first()).toBeVisible();
  });
});
