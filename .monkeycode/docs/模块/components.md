# 组件模块

## 概述

Vue 组件按功能组织在 `src/components/` 目录下。

## 组件分类

### 布局组件

位置：`src/components/layout/`

| 组件 | 描述 |
|------|------|
| `AppLayout.vue` | 主布局组件，包含导航栏和页脚 |

### 通用组件

位置：`src/components/common/`

| 组件 | 描述 |
|------|------|
| `FileUploader.vue` | 文件上传组件，支持拖拽、URL 输入、移动端相机 |

### 视图组件

位置：`src/views/`

| 组件 | 路由 | 描述 |
|------|------|------|
| `HomeView.vue` | `/` | 首页 |
| `VideoProcessorView.vue` | `/video` | 视频处理页面 |
| `ImageProcessorView.vue` | `/image` | 图片处理页面 |
| `UserCenterView.vue` | `/user` | 用户中心页面 |

## FileUploader 组件

### 功能

- 拖拽上传
- 点击选择文件
- URL 输入提取图片
- 移动端相机/相册选择
- 文件大小限制验证
- 上传进度显示

### 使用示例

```vue
<template>
  <FileUploader
    accept="video/*"
    :max-size="500 * 1024 * 1024"
    mode="both"
    @file-selected="handleFileSelected"
    @url-selected="handleUrlSelected"
    @error="handleError"
  />
</template>
```
