export interface WatermarkRegion {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface VideoInfo {
  width: number
  height: number
  duration: number
  codec: string
  fps: number
  file: File
}

export interface ImageInfo {
  width: number
  height: number
  format: 'jpg' | 'png' | 'webp'
  file: File | null
  url: string | null
}

export type ProcessingTaskType =
  | 'video-watermark'
  | 'image-watermark'
  | 'image-compress'
  | 'image-enhance'

export type ProcessingTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export interface ProcessingTask {
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

export interface UserSettings {
  preferredAlgorithm: 'ai' | 'traditional'
  defaultOutputResolution: string
  defaultOutputQuality: string
}

export interface User {
  id: string
  email: string
  createdAt: Date
  settings: UserSettings
}
