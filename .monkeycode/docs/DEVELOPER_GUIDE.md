# 开发者指南

## 开发环境设置

### 前提条件

- Node.js 20.19.0 或 >=22.12.0
- npm 10+

### 安装

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173/

## 项目结构

```
src/
├── assets/           # 静态资源（CSS、图片）
├── components/       # Vue 组件
│   ├── common/       # 通用组件（FileUploader 等）
│   └── layout/       # 布局组件（AppLayout 等）
├── router/           # Vue Router 配置
├── services/         # 服务层（本地存储、API 等）
├── stores/           # Pinia 状态管理
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数
├── views/            # 页面视图组件
├── workers/          # Web Workers（待实现）
├── App.vue           # 根组件
└── main.ts           # 应用入口
```

## 常用命令

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run test:unit` | 运行单元测试 |
| `npm run lint` | 代码检查和修复 |
| `npm run type-check` | TypeScript 类型检查 |

## 编码规范

### 命名约定

- **组件**：PascalCase（如 `FileUploader.vue`）
- **文件**：kebab-case（如 `file-uploader.vue`）
- **类型/接口**：PascalCase（如 `WatermarkRegion`）
- **变量/函数**：camelCase（如 `generateId`）
- **常量**：UPPER_SNAKE_CASE（如 `DB_NAME`）

### 组件编写

使用 Vue 3 Composition API 和 `<script setup>` 语法：

```vue
<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
}>()

const emit = defineEmits<{
  'update': [value: string]
}>()

const message = ref(props.title)
</script>
```

### 状态管理

使用 Pinia stores 管理全局状态：

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMyStore = defineStore('myStore', () => {
  const state = ref(initialValue)
  
  function update(value: any) {
    state.value = value
  }
  
  return { state, update }
})
```

## 待集成依赖

项目后续需要集成以下依赖：

| 依赖 | 用途 | 安装命令 |
|------|------|----------|
| onnxruntime-web | AI 模型推理 | `npm install onnxruntime-web` |
| @ffmpeg/ffmpeg | 视频处理 | `npm install @ffmpeg/ffmpeg @ffmpeg/util` |
| opencv.js | 传统图像处理 | 通过 CDN 或 npm 安装 |
| @supabase/supabase-js | 用户认证 | `npm install @supabase/supabase-js` |
| @vueuse/gesture | 触摸手势 | `npm install @vueuse/gesture` |

## 测试

### 单元测试

使用 Vitest 编写单元测试，测试文件放在源文件同目录下，以 `.test.ts` 结尾：

```typescript
import { describe, it, expect } from 'vitest'
import { generateId, formatFileSize } from '@/utils/helpers'

describe('helpers', () => {
  it('generateId returns unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })
})
```

### 运行测试

```bash
npm run test:unit
```

## 构建和部署

### 构建

```bash
npm run build
```

输出到 `dist/` 目录。

### 部署

构建后的文件可以部署到任何静态文件服务器：

- Vercel
- Netlify
- GitHub Pages
- 自托管 Nginx

## 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 113+ | 完整支持 WebGPU |
| Edge | 113+ | 完整支持 WebGPU |
| Firefox | 120+ | WebGPU 实验性支持 |
| Safari | 17.4+ | WebGPU 实验性支持 |
| iOS Safari | 17.4+ | 响应式布局支持 |
| Android Chrome | 113+ | 响应式布局支持 |

## 性能优化建议

1. **模型懒加载**：AI 模型文件较大，应在用户需要时才加载
2. **Web Worker**：耗时处理应在 Web Worker 中执行，避免阻塞 UI
3. **内存管理**：及时释放不再使用的 Blob 和 ImageData
4. **CDN 缓存**：静态资源和模型文件应使用 CDN 并设置合适的缓存策略
