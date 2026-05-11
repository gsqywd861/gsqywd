# 在线媒体水印去除工具

基于客户端计算的在线媒体处理工具，支持视频和图片水印去除、图片压缩和清晰度增强。所有处理均在浏览器中完成，无需上传文件到服务器，保护您的隐私。

## ✨ 功能特性

### 🎬 视频水印去除
- 支持 MP4、MOV 等主流格式
- 支持 H.264、H.265/HEVC 编解码器
- 多区域水印选择
- 可选分辨率（原始/1080p/720p/480p）
- 输出质量可调（高/中/低）
- 实时处理进度显示

### 🖼️ 图片处理
- **水印去除**：支持 JPG、PNG 格式，AI 智能修复或传统算法可选
- **图片压缩**：质量可调，支持指定输出格式
- **清晰度增强**：三级增强强度（轻度/中度/重度）
- **URL 提取**：支持从网址直接提取图片处理

### 🔒 隐私保护
- 纯客户端计算，文件不离开您的设备
- 无需上传任何数据到服务器
- 本地 IndexedDB 存储历史记录

### 📱 跨平台支持
- 响应式设计，适配手机、平板、桌面
- 触摸手势操作
- 移动端相机/相册直接选择

### 👤 用户系统
- 支持邮箱注册/登录（Supabase Auth）
- 处理历史记录管理
- 可选云端同步

## 🚀 快速开始

### 环境要求

- Node.js 20.19.0 或 >=22.12.0
- npm 10+
- 支持 WebGPU 的浏览器（Chrome 113+、Edge 113+）可获得最佳 AI 处理效果

### 安装

```bash
# 克隆项目
git clone https://github.com/gsqywd861/gsqywd.git
cd media-watermark-remover

# 安装依赖
npm install
```

### 配置（可选）

如需启用用户认证和云端同步功能，请配置 Supabase：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入您的 Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 构建

```bash
# 生产构建
npm run build

# 预览生产版本
npm run preview
```

### 测试

```bash
# 运行单元测试
npm run test:unit

# 运行端到端测试
npm run test:e2e

# 代码检查
npm run lint
```

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 构建工具 | Vite 8 |
| 状态管理 | Pinia |
| 样式 | Tailwind CSS 4 |
| 视频处理 | FFmpeg.wasm |
| 图像处理 | OpenCV.js WebAssembly |
| AI 推理 | ONNX Runtime Web + WebGPU |
| 用户认证 | Supabase Auth |
| 本地存储 | IndexedDB |
| 测试 | Vitest + Playwright |

## 📁 项目结构

```
media-watermark-remover/
├── src/
│   ├── assets/           # 静态资源
│   ├── components/       # Vue 组件
│   │   ├── common/       # 通用组件（文件上传、水印选择器等）
│   │   └── layout/       # 布局组件
│   ├── router/           # 路由配置
│   ├── services/         # 服务层
│   │   ├── auth.ts       # 用户认证
│   │   ├── ai-processor.ts  # AI 图像处理
│   │   ├── image-processor.ts  # 传统图像处理
│   │   ├── video-processor.ts  # 视频处理
│   │   ├── cloud-sync.ts # 云端同步
│   │   └── local-storage.ts  # 本地存储
│   ├── stores/           # Pinia 状态管理
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── views/            # 页面视图
│   └── workers/          # Web Workers
├── e2e/                  # Playwright 端到端测试
├── public/               # 静态资源
└── .monkeycode/          # 项目文档
```

## 📖 使用指南

### 视频水印去除

1. 进入"视频处理"页面
2. 上传视频文件（支持拖拽或点击选择）
3. 在视频预览上点击选择水印区域（支持多个区域）
4. 选择输出分辨率和质量
5. 点击"开始处理视频"
6. 等待处理完成后下载

### 图片水印去除

1. 进入"图片处理"页面
2. 上传图片或输入图片 URL
3. 在图片上选择水印区域
4. 选择算法（AI 智能修复或传统算法）
5. 点击"开始去除水印"
6. 下载处理结果

### 图片压缩

1. 进入"图片处理"页面，切换到"图片压缩"标签
2. 调整压缩质量滑块
3. 选择输出格式（JPEG/PNG）
4. 点击"开始压缩"

### 清晰度增强

1. 进入"图片处理"页面，切换到"清晰度增强"标签
2. 选择增强强度（轻度/中度/重度）
3. 点击"开始增强"

## 🌐 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 113+ | 完整支持 WebGPU |
| Edge | 113+ | 完整支持 WebGPU |
| Firefox | 120+ | WebGPU 实验性支持 |
| Safari | 17.4+ | WebGPU 实验性支持 |
| iOS Safari | 17.4+ | 响应式布局支持 |
| Android Chrome | 113+ | 响应式布局支持 |

## 📝 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览生产版本 |
| `npm run test:unit` | 运行单元测试 |
| `npm run test:e2e` | 运行端到端测试 |
| `npm run lint` | 代码检查 |
| `npm run type-check` | TypeScript 类型检查 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## ⚠️ 免责声明

本工具仅供学习和合法用途使用。请尊重版权，不要用于去除受版权保护的水印。用户应确保对要处理的媒体文件拥有合法使用权。
