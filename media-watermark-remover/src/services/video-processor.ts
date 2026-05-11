import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
let ffmpegReady = false

export async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpegReady) return ffmpeg
  
  ffmpeg = new FFmpeg()
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`
  })
  
  ffmpegReady = true
  return ffmpeg!
}

export async function getVideoInfo(file: File): Promise<{
  width: number
  height: number
  duration: number
  codec: string
  fps: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        codec: 'unknown',
        fps: 30
      })
      URL.revokeObjectURL(video.src)
    }
    
    video.onerror = () => {
      reject(new Error('无法读取视频文件'))
      URL.revokeObjectURL(video.src)
    }
    
    video.src = URL.createObjectURL(file)
  })
}

export async function extractFrame(
  file: File,
  timestamp: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
      URL.revokeObjectURL(video.src)
    }
    
    video.onerror = () => {
      reject(new Error('无法提取视频帧'))
      URL.revokeObjectURL(video.src)
    }
    
    video.src = URL.createObjectURL(file)
    video.currentTime = timestamp
  })
}

export interface VideoProcessParams {
  watermarkRegions: Array<{ x: number; y: number; width: number; height: number }>
  outputResolution: 'original' | '1080p' | '720p' | '480p'
  outputQuality: 'high' | 'medium' | 'low'
}

export async function processVideo(
  file: File,
  params: VideoProcessParams,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await initFFmpeg()
  
  const inputName = 'input.mp4'
  const outputName = 'output.mp4'
  
  await ffmpeg.writeFile(inputName, await fetchFile(file))
  
  onProgress?.(10)
  
  const qualityMap = {
    high: '18',
    medium: '23',
    low: '28'
  }
  
  const resolutionMap = {
    original: '',
    '1080p': '-vf scale=-1:1080',
    '720p': '-vf scale=-1:720',
    '480p': '-vf scale=-1:480'
  }
  
  const crf = qualityMap[params.outputQuality]
  const scaleFilter = resolutionMap[params.outputResolution]
  
  const args = [
    '-i', inputName,
    '-c:v', 'libx264',
    '-crf', crf,
    '-preset', 'medium',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    outputName
  ]
  
  if (scaleFilter) {
    args.splice(3, 0, ...scaleFilter.split(' '))
  }
  
  onProgress?.(20)
  
  await ffmpeg.exec(args)
  
  onProgress?.(80)
  
  const data = await ffmpeg.readFile(outputName) as Uint8Array
  
  onProgress?.(100)
  
  const buffer = data.buffer instanceof SharedArrayBuffer ? (data.buffer.slice(0) as unknown as ArrayBuffer) : data.buffer
  return new Blob([buffer], { type: 'video/mp4' })
}
