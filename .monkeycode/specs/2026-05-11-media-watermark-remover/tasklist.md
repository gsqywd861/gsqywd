# Implementation Task List

Feature: 2026-05-11-media-watermark-remover
Created: 2026-05-11

## Phase 1: 项目基础搭建

- [x] 1.1 初始化 Vue 3 + Vite 项目
  - 使用 `create-vue` 创建项目
  - 配置 TypeScript、Vitest、ESLint
  - 安装基础依赖：vue-router, pinia, tailwindcss

- [x] 1.2 配置项目结构
  - 创建目录结构（components, stores, utils, types, assets）
  - 配置路由（首页、视频处理、图片处理、用户中心）
  - 配置 Tailwind CSS

- [x] 1.3 实现基础布局组件
  - 创建 `App.vue` 根组件
  - 创建 `ResponsiveLayout.vue` 响应式布局容器
  - 创建导航栏和页脚组件

- [x] 1.4 实现文件上传组件
  - 创建 `FileUploader.vue`
  - 支持拖拽上传和点击选择
  - 支持 URL 输入提取图片
  - 支持移动端相册/相机选择

- [x] 1.5 实现状态管理基础
  - 创建 Pinia stores（useVideoStore, useImageStore, useTaskStore, useUserStore）
  - 配置 IndexedDB 本地存储

## Phase 2: 图片处理功能

- [x] 2.1 集成 OpenCV.js
  - 安装和配置 OpenCV.js WebAssembly
  - 创建 `TraditionalImageProcessor` 封装类
  - 实现初始化逻辑

- [x] 2.2 实现传统去水印
  - 实现基于 inpainting 的水印去除
  - 支持 Telea 和 NS 两种算法
  - 创建单元测试

- [x] 2.3 实现图片压缩
  - 实现压缩功能（质量滑块、目标大小输入）
  - 实现大小对比显示

- [x] 2.4 实现图片清晰度增强
  - 实现基础锐化增强
  - 支持三级强度选项
  - 实现前后对比预览

- [x] 2.5 集成 ONNX Runtime Web
  - 安装和配置 ONNX Runtime Web
  - 创建 `AIInferenceEngine` 封装类
  - 实现 WebGPU 后端检测和初始化

- [x] 2.6 实现 AI 去水印
  - 加载 LaMa 模型
  - 实现图像修复推理
  - 创建水印区域 mask 处理

- [x] 2.7 实现图片处理界面
  - 创建 `ImageProcessor.vue` 主界面
  - 集成水印/压缩/增强三个功能区块
  - 创建 `ImagePreview.vue` 预览组件

- [x] 2.8 实现水印区域选择器
  - 创建 `WatermarkSelector.vue`
  - 支持多区域标记
  - 支持触摸手势操作

## Phase 3: 视频处理功能

- [x] 3.1 集成 FFmpeg.wasm
  - 安装和配置 FFmpeg.wasm
  - 创建 `VideoProcessor` 封装类
  - 实现初始化逻辑

- [x] 3.2 实现视频预览播放器
  - 创建 `VideoPlayer.vue` 组件
  - 支持视频加载和播放控制
  - 支持帧提取

- [x] 3.3 实现视频水印选择器
  - 扩展 `WatermarkSelector.vue` 支持视频
  - 支持时间轴上的区域标记
  - 支持多区域叠加显示

- [x] 3.4 实现视频处理管道
  - 实现逐帧解码
  - 实现逐帧去水印处理
  - 实现帧重新编码

- [x] 3.5 实现输出设置
  - 创建 `OutputSettings.vue` 组件
  - 支持分辨率选择
  - 支持输出质量选择

- [x] 3.6 实现视频处理界面
  - 创建 `VideoProcessor.vue` 主界面
  - 集成播放器、选择器、设置组件
  - 实现处理进度显示

- [x] 3.7 实现进度和取消功能
  - 创建 `TaskProgress.vue` 组件
  - 实现实时进度更新
  - 实现任务取消功能

## Phase 4: 移动端适配

- [x] 4.1 实现响应式布局
  - Tailwind CSS 断点适配
  - 移动端专属样式
  - 横竖屏适配

- [x] 4.2 添加触摸手势支持
  - 安装 vueuse/gesture
  - 实现触摸选择和拖拽
  - 优化移动端交互体验

- [x] 4.3 优化移动端 UI 组件
  - 创建 `MobileToolbar.vue` 底部操作栏
  - 触摸友好的按钮尺寸
  - 移动端进度指示器

- [x] 4.4 移动端文件选择器
  - 支持相册选择
  - 支持相机拍摄
  - 支持视频文件选择

## Phase 5: 用户系统

- [x] 5.1 集成 Supabase Auth
  - 安装和配置 Supabase 客户端
  - 创建 `AuthService` 封装类
  - 实现邮箱注册/登录

- [x] 5.2 实现第三方登录
  - Google OAuth 登录
  - GitHub OAuth 登录
  - 手机号短信验证码登录

- [x] 5.3 实现用户中心
  - 创建用户中心页面
  - 显示处理历史记录
  - 实现用户设置管理

- [x] 5.4 实现云端同步
  - IndexedDB 本地存储
  - 登录用户数据云端同步
  - 离线/在线状态处理

## Phase 6: 优化与测试

- [x] 6.1 性能优化
  - Web Worker 并发处理
  - 内存管理优化
  - 模型懒加载

- [x] 6.2 错误处理完善
  - 统一错误处理机制
  - 优雅降级逻辑
  - 任务状态保存/恢复

- [x] 6.3 端到端测试
  - Playwright 测试配置
  - 视频处理流程测试
  - 图片处理流程测试
  - 用户认证流程测试

- [x] 6.4 浏览器兼容性测试
  - 桌面浏览器测试
  - 移动端浏览器测试
  - 修复兼容性问题
