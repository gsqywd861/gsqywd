import { test, expect } from '@playwright/test'

test('首页显示正确', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/水印去除工具/)
  await expect(page.getByText('在线媒体水印去除工具')).toBeVisible()
  await expect(page.getByText('视频水印去除')).toBeVisible()
  await expect(page.getByText('图片处理')).toBeVisible()
})

test('导航栏工作正常', async ({ page }) => {
  await page.goto('/')
  await page.getByText('视频处理').click()
  await expect(page).toHaveURL('/video')
  await expect(page.getByText('视频水印去除')).toBeVisible()
  
  await page.getByText('图片处理').click()
  await expect(page).toHaveURL('/image')
  await expect(page.getByText('图片处理')).toBeVisible()
})

test('图片处理页面加载', async ({ page }) => {
  await page.goto('/image')
  await expect(page.getByText('水印去除')).toBeVisible()
  await expect(page.getByText('图片压缩')).toBeVisible()
  await expect(page.getByText('清晰度增强')).toBeVisible()
})

test('用户中心页面加载', async ({ page }) => {
  await page.goto('/user')
  await expect(page.getByText('登录')).toBeVisible()
  await expect(page.getByText('注册')).toBeVisible()
})

test('响应式布局适配移动端', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await expect(page.getByText('在线媒体水印去除工具')).toBeVisible()
})
