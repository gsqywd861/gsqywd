# 项目索引 - 在线媒体水印去除工具

## 项目概述

在线媒体水印去除工具是一个基于客户端计算的 Web 应用，利用用户设备的 WebGPU 算力进行视频和图片的水印去除、图片压缩和清晰度增强。所有媒体处理均在浏览器中完成，无需服务器 GPU 资源。

## 文档结构

| 文档 | 描述 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统架构设计 |
| [INTERFACES.md](./INTERFACES.md) | 类型定义和接口文档 |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | 开发者指南 |
| [模块/](./模块/) | 各模块详细文档 |
| [专有概念/](./专有概念/) | 核心概念说明 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test:unit

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

## 项目结构

```
media-watermark-remover/
├── src/
│   ├── assets/           # 静态资源（CSS）
│   ├── components/       # Vue 组件
│   │   ├── common/       # 通用组件
│   │   └── layout/       # 布局组件
│   ├── router/           # 路由配置
│   ├── services/         # 服务层（本地存储等）
│   ├── stores/           # Pinia 状态管理
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── views/            # 页面视图
│   ├── workers/          # Web Workers
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── .monkeycode/          # 项目文档和规格
│   ├── docs/             # 项目文档
│   └── specs/            # 功能规格说明
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 核心功能

- **视频水印去除**：支持 MP4/MOV 格式，多区域选择，AI/传统双算法
- **图片水印去除**：支持 JPG/PNG 格式，URL 提取图片
- **图片压缩**：可指定目标大小和质量
- **图片清晰度增强**：三级增强强度
- **用户系统**：可选注册登录，历史记录同步
- **移动端适配**：响应式界面，触摸手势支持
