# 接口文档

## 类型定义

### 核心类型

位置：`src/types/index.ts`

#### WatermarkRegion

水印区域坐标和尺寸。

```typescript
interface WatermarkRegion {
  id: string
  x: number
  y: number
  width: number
  height: number
}
```

#### VideoInfo

视频文件信息。

```typescript
interface VideoInfo {
  width: number
  height: number
  duration: number
  codec: string
  fps: number
  file: File
}
```

#### ImageInfo

图片文件信息。

```typescript
interface ImageInfo {
  width: number
  height: number
  format: 'jpg' | 'png' | 'webp'
  file: File | null
  url: string | null
}
```

#### ProcessingTask

处理任务记录。

```typescript
type ProcessingTaskType =
  | 'video-watermark'
  | 'image-watermark'
  | 'image-compress'
  | 'image-enhance'

type ProcessingTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

interface ProcessingTask {
  id: string
  userId: string | null
  type: ProcessingTaskType
  inputFileName: string
  outputFileName: string | null
  outputBlob: Blob | null
  status: ProcessingTaskStatus
  progress: number
  params: Record<string, any>
  createdAt: Date
  completedAt: Date | null
}
```

#### User

用户信息。

```typescript
interface UserSettings {
  preferredAlgorithm: 'ai' | 'traditional'
  defaultOutputResolution: string
  defaultOutputQuality: string
}

interface User {
  id: string
  email: string
  createdAt: Date
  settings: UserSettings
}
```

## Store 接口

### useVideoStore

位置：`src/stores/video.ts`

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| setVideoFile | file: File, url: string | void | 设置视频文件 |
| setVideoInfo | info: VideoInfo | void | 设置视频信息 |
| addWatermarkRegion | region: WatermarkRegion | void | 添加水印区域 |
| removeWatermarkRegion | id: string | void | 移除水印区域 |
| updateWatermarkRegion | id: string, updates: Partial | void | 更新水印区域 |
| clearWatermarkRegions | - | void | 清空水印区域 |
| setProgress | value: number | void | 设置处理进度 |
| setOutputBlob | blob: Blob | void | 设置输出文件 |
| setError | msg: string | null | void | 设置错误信息 |
| reset | - | void | 重置状态 |

### useImageStore

位置：`src/stores/image.ts`

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| setImageFile | file: File | null, url: string | void | 设置图片文件 |
| setImageInfo | info: ImageInfo | void | 设置图片信息 |
| addWatermarkRegion | region: WatermarkRegion | void | 添加水印区域 |
| removeWatermarkRegion | id: string | void | 移除水印区域 |
| updateWatermarkRegion | id: string, updates: Partial | void | 更新水印区域 |
| clearWatermarkRegions | - | void | 清空水印区域 |
| setProgress | value: number | void | 设置处理进度 |
| setOutputBlob | blob: Blob, url: string | void | 设置输出文件 |
| setError | msg: string | null | void | 设置错误信息 |
| reset | - | void | 重置状态 |

### useTaskStore

位置：`src/stores/task.ts`

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| createTask | type, inputFileName, params | string | 创建任务，返回任务 ID |
| updateTaskStatus | id, status, progress? | void | 更新任务状态 |
| setTaskOutput | id, outputBlob, outputFileName | void | 设置任务输出 |
| getTask | id | ProcessingTask | undefined | 获取任务 |
| getActiveTask | - | ProcessingTask | undefined | 获取活动任务 |
| removeTask | id | void | 移除任务 |
| clearCompletedTasks | - | void | 清理已完成任务 |

### useUserStore

位置：`src/stores/user.ts`

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| setUser | user: User | void | 设置用户信息 |
| clearUser | - | void | 清除用户信息 |
| updateSettings | settings: Partial | void | 更新用户设置 |
| setError | msg: string | null | void | 设置错误信息 |

## 服务接口

### LocalStorageService

位置：`src/services/local-storage.ts`

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| init | - | Promise | void | 初始化 IndexedDB |
| save | key: string, data: any | Promise | void | 保存数据 |
| load | key: string | Promise | any | null | 加载数据 |
| remove | key: string | Promise | void | 删除数据 |
| clear | - | Promise | void | 清空存储 |

## 工具函数

位置：`src/utils/helpers.ts`

| 函数 | 参数 | 返回 | 描述 |
|------|------|------|------|
| generateId | - | string | 生成唯一 ID |
| formatFileSize | bytes: number | string | 格式化文件大小 |
| formatDuration | seconds: number | string | 格式化时长 |

## 组件 Props 和 Emits

### FileUploader

位置：`src/components/common/FileUploader.vue`

#### Props

| 名称 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| accept | string | '*' | 接受的文件类型 |
| multiple | boolean | false | 是否支持多选 |
| maxSize | number | 0 | 最大文件大小（0 表示无限制） |
| mode | 'file' | 'url' | 'both' | 'file' | 上传模式 |
| disabled | boolean | false | 是否禁用 |

#### Emits

| 事件 | 参数 | 描述 |
|------|------|------|
| file-selected | files: File[] | 文件选择完成 |
| url-selected | url: string | URL 提取完成 |
| error | error: string | 发生错误 |
