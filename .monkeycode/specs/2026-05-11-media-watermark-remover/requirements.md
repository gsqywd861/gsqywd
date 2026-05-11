# Requirements Document

## Introduction

在线媒体水印去除工具，支持视频和图片的水印去除、图片压缩和清晰度增强。采用客户端计算架构，利用用户设备算力进行媒体处理，无需服务器 GPU 资源。用户通过 Web 界面上传媒体文件，选择处理参数，在浏览器中本地处理后下载结果。

## Glossary

- **媒体文件**：视频文件（MP4、MOV 等）或图片文件（JPG、PNG 等）
- **水印区域**：用户在视频或图片上标记的需要去除的水印位置
- **AI 去水印**：基于 Web 端推理的深度学习模型（如 ONNX Runtime Web、WebGPU）
- **传统去水印**：基于 Canvas API 或 WebAssembly 的图像处理算法
- **处理任务**：用户提交的一次完整的媒体文件处理请求
- **客户端计算**：利用用户设备的 CPU/GPU 在浏览器中执行处理任务

## Requirements

### Requirement 1: 视频水印去除

**User Story:** AS 网站访客，I want 上传视频并选择多个水印区域进行去除，so that 我可以获得无水印的视频文件

#### Acceptance Criteria

1. WHEN 用户上传视频文件，系统 SHALL 支持 MP4 和 MOV 格式
2. WHEN 用户上传视频文件，系统 SHALL 支持 H.264、H.265/HEVC 编解码器
3. WHEN 视频加载完成，系统 SHALL 在播放器中显示视频预览
4. WHEN 用户在视频预览上操作，系统 SHALL 允许用户标记多个矩形区域作为水印位置
5. WHEN 用户标记水印区域，系统 SHALL 实时显示已标记区域的叠加层
6. WHEN 用户提交处理请求，系统 SHALL 提供 AI 去水印和传统去水印两种算法选项
7. WHEN 用户选择输出参数，系统 SHALL 提供分辨率选择（原始分辨率、1080p、720p、480p）
8. WHEN 用户选择输出参数，系统 SHALL 提供输出质量选择（高质量、中等质量、低质量）
9. WHEN 处理完成，系统 SHALL 提供处理后视频的下载链接
10. WHILE 处理任务执行中，系统 SHALL 显示处理进度百分比
11. WHILE 处理任务执行中，系统 SHALL 在用户浏览器中执行计算，不依赖服务器算力

### Requirement 2: 图片水印去除

**User Story:** AS 网站访客，I want 上传图片并去除水印，so that 我可以获得无水印的图片文件

#### Acceptance Criteria

1. WHEN 用户上传或提供图片 URL，系统 SHALL 支持 JPG 和 PNG 格式
2. WHEN 用户提供图片 URL，系统 SHALL 从 URL 下载图片并显示预览
3. WHEN 图片加载完成，系统 SHALL 允许用户标记矩形区域作为水印位置
4. WHEN 用户提交处理请求，系统 SHALL 提供 AI 去水印和传统去水印两种算法选项
5. WHEN 处理完成，系统 SHALL 提供处理后图片的下载链接
6. WHILE 处理任务执行中，系统 SHALL 在用户浏览器中执行计算，不依赖服务器算力

### Requirement 3: 图片压缩处理

**User Story:** AS 网站访客，I want 压缩图片大小，so that 我可以获得更小的图片文件用于网络传输

#### Acceptance Criteria

1. WHEN 用户上传或提供图片 URL，系统 SHALL 显示图片压缩功能区块
2. WHEN 用户选择压缩参数，系统 SHALL 提供目标文件大小输入（KB 或 MB）
3. WHEN 用户选择压缩参数，系统 SHALL 提供压缩质量滑块（1-100）
4. WHEN 处理完成，系统 SHALL 提供压缩后图片的下载链接
5. WHEN 处理完成，系统 SHALL 显示原始大小和压缩后大小的对比信息

### Requirement 4: 图片清晰度增强

**User Story:** AS 网站访客，I want 增强图片清晰度，so that 我可以获得更清晰的图片文件

#### Acceptance Criteria

1. WHEN 用户上传或提供图片 URL，系统 SHALL 显示图片清晰度增强功能区块
2. WHEN 用户选择增强参数，系统 SHALL 提供目标输出尺寸选择
3. WHEN 用户选择增强参数，系统 SHALL 提供增强强度选项（轻度增强、中度增强、重度增强）
4. WHEN 处理完成，系统 SHALL 提供增强后图片的下载链接
5. WHEN 处理完成，系统 SHALL 提供原始图片和增强后图片的对比预览

### Requirement 5: 文件上传与 URL 提取

**User Story:** AS 网站访客，I want 通过文件上传或 URL 提供媒体文件，so that 我可以灵活地选择输入方式

#### Acceptance Criteria

1. WHEN 用户选择文件上传，系统 SHALL 接受拖拽上传和点击选择两种交互方式
2. WHEN 用户提供图片 URL，系统 SHALL 验证 URL 有效性并下载图片
3. WHEN 用户提供的 URL 无效，系统 SHALL 显示错误提示信息
4. WHILE 文件上传中，系统 SHALL 显示上传进度条
5. IF 上传文件大小超过 500MB，系统 SHALL 拒绝上传并显示文件大小限制提示

### Requirement 6: 处理任务管理

**User Story:** AS 网站访客，I want 查看和管理我的处理任务，so that 我可以跟踪处理进度并获取结果

#### Acceptance Criteria

1. WHEN 用户提交处理任务，系统 SHALL 创建任务记录并返回任务 ID
2. WHILE 任务处理中，系统 SHALL 提供实时进度更新
3. WHEN 任务完成，系统 SHALL 通知用户处理完成
4. WHEN 任务失败，系统 SHALL 显示错误原因并提供重试选项
5. IF 用户设备性能不足导致处理时间过长，系统 SHALL 提供取消选项
6. WHILE 处理任务执行中，系统 SHALL 在浏览器标签页关闭时保存进度状态

### Requirement 7: 输出格式与下载

**User Story:** AS 网站访客，I want 下载处理后的媒体文件，so that 我可以保存和使用处理结果

#### Acceptance Criteria

1. WHEN 视频处理完成，系统 SHALL 提供 MP4 格式下载
2. WHEN 图片处理完成，系统 SHALL 提供原始格式（JPG 或 PNG）下载
3. WHEN 用户点击下载链接，系统 SHALL 触发浏览器下载行为
4. WHILE 处理结果文件保留期间，系统 SHALL 确保下载链接有效
5. IF 处理结果文件超过保留期限，系统 SHALL 清理文件并显示过期提示
6. WHEN 处理完成，系统 SHALL 在用户浏览器中生成输出文件，不依赖服务器存储

## Requirements Priority Matrix

| 优先级 | 需求编号 | 需求名称 |
|--------|----------|----------|
| P0（核心） | Req 1, 2 | 视频水印去除、图片水印去除 |
| P1（重要） | Req 3, 4 | 图片压缩、图片清晰度增强 |
| P2（基础） | Req 5, 6, 7 | 文件上传、任务管理、输出下载 |
