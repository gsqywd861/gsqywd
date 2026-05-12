// 错误处理工具类

export class WatermarkError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string
  ) {
    super(message)
    this.name = 'WatermarkError'
  }
}

export const ERROR_MESSAGES = {
  OPENCV_LOAD_FAILED: {
    code: 'OPENCV_LOAD_FAILED',
    message: 'OpenCV.js 加载失败',
    suggestion: '请检查网络连接，或刷新页面重试'
  },
  AI_MODEL_LOAD_FAILED: {
    code: 'AI_MODEL_LOAD_FAILED',
    message: 'AI 模型加载失败',
    suggestion: '请检查网络连接，或切换到传统算法'
  },
  VIDEO_TOO_LARGE: {
    code: 'VIDEO_TOO_LARGE',
    message: '视频文件过大',
    suggestion: '请选择小于 500MB 的视频文件'
  },
  UNSUPPORTED_FORMAT: {
    code: 'UNSUPPORTED_FORMAT',
    message: '不支持的文件格式',
    suggestion: '请选择支持的文件格式（图片：JPEG/PNG/WebP，视频：MP4/WebM）'
  },
  INVALID_TIME_RANGE: {
    code: 'INVALID_TIME_RANGE',
    message: '无效的时间范围',
    suggestion: '请确保开始时间小于结束时间'
  },
  NO_WATERMARK_REGIONS: {
    code: 'NO_WATERMARK_REGIONS',
    message: '未选择水印区域',
    suggestion: '请在图片/视频上拖拽选择水印区域'
  },
  PROCESSING_FAILED: {
    code: 'PROCESSING_FAILED',
    message: '处理失败',
    suggestion: '请稍后重试，如果问题持续存在，请联系技术支持'
  },
  FILE_READ_FAILED: {
    code: 'FILE_READ_FAILED',
    message: '文件读取失败',
    suggestion: '请检查文件是否损坏，或重新选择文件'
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: '网络错误',
    suggestion: '请检查网络连接，或稍后重试'
  }
}

export function handleError(error: unknown): WatermarkError {
  if (error instanceof WatermarkError) {
    return error
  }
  
  if (error instanceof Error) {
    // 根据错误消息匹配错误类型
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (error.message.includes(value.message)) {
        return new WatermarkError(value.message, value.code, value.suggestion)
      }
    }
    
    // 根据错误消息关键词匹配
    if (error.message.includes('OpenCV') || error.message.includes('opencv')) {
      return new WatermarkError(
        ERROR_MESSAGES.OPENCV_LOAD_FAILED.message,
        ERROR_MESSAGES.OPENCV_LOAD_FAILED.code,
        ERROR_MESSAGES.OPENCV_LOAD_FAILED.suggestion
      )
    }
    
    if (error.message.includes('AI') || error.message.includes('model') || error.message.includes('inpaint')) {
      return new WatermarkError(
        ERROR_MESSAGES.AI_MODEL_LOAD_FAILED.message,
        ERROR_MESSAGES.AI_MODEL_LOAD_FAILED.code,
        ERROR_MESSAGES.AI_MODEL_LOAD_FAILED.suggestion
      )
    }
    
    if (error.message.includes('video') || error.message.includes('Video')) {
      return new WatermarkError(
        ERROR_MESSAGES.PROCESSING_FAILED.message,
        ERROR_MESSAGES.PROCESSING_FAILED.code,
        ERROR_MESSAGES.PROCESSING_FAILED.suggestion
      )
    }
    
    if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('load')) {
      return new WatermarkError(
        ERROR_MESSAGES.NETWORK_ERROR.message,
        ERROR_MESSAGES.NETWORK_ERROR.code,
        ERROR_MESSAGES.NETWORK_ERROR.suggestion
      )
    }
    
    return new WatermarkError(
      error.message,
      'UNKNOWN_ERROR',
      '请稍后重试，如果问题持续存在，请联系技术支持'
    )
  }
  
  return new WatermarkError(
    '未知错误',
    'UNKNOWN_ERROR',
    '请稍后重试，如果问题持续存在，请联系技术支持'
  )
}

export function logError(error: unknown, context?: string) {
  const watermarkError = handleError(error)
  
  console.error(`[${context || 'Watermark'}] Error:`, {
    code: watermarkError.code,
    message: watermarkError.message,
    suggestion: watermarkError.suggestion,
    originalError: error
  })
  
  // 可以在这里添加错误上报逻辑
  // 例如发送到错误追踪服务
}
