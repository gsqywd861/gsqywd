# 状态管理模块

## 概述

状态管理使用 Pinia，包含四个 Store：

- `useVideoStore`：视频处理状态
- `useImageStore`：图片处理状态
- `useTaskStore`：任务管理状态
- `useUserStore`：用户状态

## 文件列表

| 文件 | 描述 |
|------|------|
| `video.ts` | 视频处理 Store |
| `image.ts` | 图片处理 Store |
| `task.ts` | 任务管理 Store |
| `user.ts` | 用户 Store |

## useVideoStore

管理视频处理相关的状态。

### 状态

| 名称 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| videoFile | File | null | 当前视频文件 |
| videoInfo | VideoInfo | null | 视频信息 |
| videoUrl | string | '' | 视频预览 URL |
| watermarkRegions | WatermarkRegion[] | [] | 水印区域列表 |
| isProcessing | boolean | false | 是否正在处理 |
| progress | number | 0 | 处理进度（0-100） |
| outputBlob | Blob | null | 输出文件 Blob |
| error | string | null | 错误信息 |

## useImageStore

管理图片处理相关的状态。

### 状态

| 名称 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| imageFile | File | null | 当前图片文件 |
| imageUrl | string | '' | 图片预览 URL |
| imageInfo | ImageInfo | null | 图片信息 |
| watermarkRegions | WatermarkRegion[] | [] | 水印区域列表 |
| isProcessing | boolean | false | 是否正在处理 |
| progress | number | 0 | 处理进度（0-100） |
| outputBlob | Blob | null | 输出文件 Blob |
| outputUrl | string | '' | 输出图片 URL |
| error | string | null | 错误信息 |

## useTaskStore

管理处理任务的状态。

### 状态

| 名称 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| tasks | ProcessingTask[] | [] | 任务列表 |
| activeTaskId | string | null | 当前活动任务 ID |

## useUserStore

管理用户认证和设置。

### 状态

| 名称 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| user | User | null | 当前用户信息 |
| isAuthenticated | boolean | false | 是否已登录 |
| isLoading | boolean | false | 是否正在加载 |
| error | string | null | 错误信息 |
| defaultSettings | UserSettings | {...} | 默认用户设置 |
