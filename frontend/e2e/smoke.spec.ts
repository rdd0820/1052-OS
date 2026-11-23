import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const routes = ['/today', '/chat', '/automations/orchestrations', '/capabilities/skills', '/settings/models']

test.setTimeout(120_000)

test.describe('1052 OS shell', () => {
  for (const route of routes) {
    test(`renders ${route}`, async ({ page }, testInfo) => {
      const pageErrors: string[] = []
      const consoleErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      if (route === '/today') await expect(page).toHaveURL(/\/today\/overview$/)
      const ready = route === '/today'
        ? page.getByRole('heading', { name: '现在想完成什么？' })
        : route === '/chat'
          ? page.locator('textarea')
          : route === '/automations/orchestrations'
            ? page.getByText('选择画布节点后查看参数')
            : route === '/capabilities/skills'
              ? page.getByRole('heading', { name: '已安装 Skills' })
              : page.getByRole('heading', { name: '主模型' })
      await expect(ready).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(900)
      await page.screenshot({ path: testInfo.outputPath(`${route.replace(/\W+/g, '-').replace(/^-/, '')}.png`), fullPage: false })

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(2)
      expect(pageErrors).toEqual([])
      expect(consoleErrors).toEqual([])
    })
  }

  test('passes critical accessibility checks', async ({ page }, testInfo) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    await page.goto('/today', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(1200)

    const results = await new AxeBuilder({ page }).disableRules(['color-contrast', 'page-has-heading-one']).analyze()
    expect(results.violations).toEqual([])
    expect(consoleErrors).toEqual([])
    await page.screenshot({ path: testInfo.outputPath('today-a11y.png'), fullPage: false })
  })
})
