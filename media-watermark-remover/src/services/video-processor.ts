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
  startTime?: number
  endTime?: number
  algorithm?: 'traditional' | 'ai'
  method?: 'telea' | 'ns'
}

export async function processVideo(
  file: File,
  params: VideoProcessParams,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const video = document.createElement('video')
  video.src = URL.createObjectURL(file)
  video.muted = true
  
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('无法加载视频'))
  })
  
  const vw = video.videoWidth
  const vh = video.videoHeight
  const duration = video.duration
  
  const startTime = params.startTime ?? 0
  const endTime = Math.min(params.endTime ?? duration, duration)
  const totalDuration = endTime - startTime
  
  if (totalDuration <= 0) {
    throw new Error('无效的时间范围')
  }
  
  // Determine output resolution
  let outW = vw, outH = vh
  if (params.outputResolution !== 'original') {
    const targetH = { '1080p': 1080, '720p': 720, '480p': 480 }[params.outputResolution] ?? vh
    if (vh > targetH) {
      outH = targetH
      outW = Math.round(vw * (targetH / vh))
    }
  }
  outW = outW % 2 === 0 ? outW : outW - 1
  outH = outH % 2 === 0 ? outH : outH - 1
  
  const qualityMap = { high: 8000000, medium: 4000000, low: 1500000 }
  const targetBitrate = qualityMap[params.outputQuality] ?? 4000000
  
  // Setup canvas and recorder
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  
  const stream = canvas.captureStream(30)
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'
  
  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: targetBitrate
  })
  
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  
  // Build mask
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = outW
  maskCanvas.height = outH
  const maskCtx = maskCanvas.getContext('2d')!
  const scaleX = outW / vw
  const scaleY = outH / vh
  
  for (const region of params.watermarkRegions) {
    const rx = Math.round(region.x * scaleX)
    const ry = Math.round(region.y * scaleY)
    const rw = Math.round(region.width * scaleX)
    const rh = Math.round(region.height * scaleY)
    maskCtx.fillStyle = 'white'
    maskCtx.fillRect(rx, ry, rw, rh)
  }
  
  const maskImageData = maskCtx.getImageData(0, 0, outW, outH)
  const needsInpaint = new Uint8Array(outW * outH)
  for (let i = 0; i < outW * outH; i++) {
    needsInpaint[i] = maskImageData.data[i * 4] > 0 ? 1 : 0
  }
  
  // Has watermark?
  const hasWatermark = needsInpaint.some(v => v === 1)
  
  await new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve()
    video.onerror = () => reject(new Error('视频播放出错'))
    
    recorder.start(50)
    video.currentTime = startTime
    
    video.onseeked = function onSeeked() {
      video.onseeked = null
      
      let lastTime = 0
      const frameInterval = 1 / 30
      
      function processFrame() {
        if (video.paused || video.ended || video.currentTime >= endTime) {
          video.pause()
          setTimeout(() => recorder.stop(), 100)
          return
        }
        
        const now = performance.now()
        if (now - lastTime >= frameInterval * 1000) {
          ctx.drawImage(video, 0, 0, outW, outH)
          
          if (hasWatermark) {
            const frameData = ctx.getImageData(0, 0, outW, outH)
            inpaintFrameFast(frameData, needsInpaint, outW, outH)
            ctx.putImageData(frameData, 0, 0)
          }
          
          lastTime = now
          const elapsed = video.currentTime - startTime
          const progress = Math.min(100, (elapsed / totalDuration) * 100)
          onProgress?.(Math.round(progress))
        }
        
        requestAnimationFrame(processFrame)
      }
      
      video.play()
      processFrame()
    }
  })
  
  URL.revokeObjectURL(video.src)
  
  const blob = new Blob(chunks, { type: 'video/webm' })
  return blob
}

// 新增：使用 FFmpeg 编码视频，支持 MP4 输出
export async function processVideoWithFFmpeg(
  file: File,
  params: VideoProcessParams,
  outputFormat: 'mp4' | 'webm' = 'mp4',
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await initFFmpeg()
  
  const video = document.createElement('video')
  video.src = URL.createObjectURL(file)
  video.muted = true
  
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('无法加载视频'))
  })
  
  const vw = video.videoWidth
  const vh = video.videoHeight
  const duration = video.duration
  
  const startTime = params.startTime ?? 0
  const endTime = Math.min(params.endTime ?? duration, duration)
  const totalDuration = endTime - startTime
  
  if (totalDuration <= 0) {
    throw new Error('无效的时间范围')
  }
  
  // Determine output resolution
  let outW = vw, outH = vh
  if (params.outputResolution !== 'original') {
    const targetH = { '1080p': 1080, '720p': 720, '480p': 480 }[params.outputResolution] ?? vh
    if (vh > targetH) {
      outH = targetH
      outW = Math.round(vw * (targetH / vh))
    }
  }
  outW = outW % 2 === 0 ? outW : outW - 1
  outH = outH % 2 === 0 ? outH : outH - 1
  
  // Build mask
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = outW
  maskCanvas.height = outH
  const maskCtx = maskCanvas.getContext('2d')!
  const scaleX = outW / vw
  const scaleY = outH / vh
  
  for (const region of params.watermarkRegions) {
    const rx = Math.round(region.x * scaleX)
    const ry = Math.round(region.y * scaleY)
    const rw = Math.round(region.width * scaleX)
    const rh = Math.round(region.height * scaleY)
    maskCtx.fillStyle = 'white'
    maskCtx.fillRect(rx, ry, rw, rh)
  }
  
  const maskImageData = maskCtx.getImageData(0, 0, outW, outH)
  const needsInpaint = new Uint8Array(outW * outH)
  for (let i = 0; i < outW * outH; i++) {
    needsInpaint[i] = maskImageData.data[i * 4] > 0 ? 1 : 0
  }
  
  const hasWatermark = needsInpaint.some(v => v === 1)
  
  // Extract frames and process
  const fps = 30
  const totalFrames = Math.floor(totalDuration * fps)
  const frames: ImageData[] = []
  
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  
  for (let i = 0; i < totalFrames; i++) {
    const time = startTime + (i / fps)
    video.currentTime = time
    
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
    })
    
    ctx.drawImage(video, 0, 0, outW, outH)
    
    if (hasWatermark) {
      const frameData = ctx.getImageData(0, 0, outW, outH)
      inpaintFrameFast(frameData, needsInpaint, outW, outH)
      ctx.putImageData(frameData, 0, 0)
    }
    
    frames.push(ctx.getImageData(0, 0, outW, outH))
    
    const progress = ((i + 1) / totalFrames) * 50
    onProgress?.(Math.round(progress))
  }
  
  URL.revokeObjectURL(video.src)
  
  // Write frames to FFmpeg
  for (let i = 0; i < frames.length; i++) {
    const frameCanvas = document.createElement('canvas')
    frameCanvas.width = outW
    frameCanvas.height = outH
    const frameCtx = frameCanvas.getContext('2d')!
    frameCtx.putImageData(frames[i], 0, 0)
    
    const blob = await new Promise<Blob>((resolve) => {
      frameCanvas.toBlob((b) => resolve(b!), 'image/png')
    })
    
    const buffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    await ffmpeg.writeFile(`frame_${i.toString().padStart(5, '0')}.png`, uint8Array)
    
    const progress = 50 + ((i + 1) / frames.length) * 20
    onProgress?.(Math.round(progress))
  }
  
  // Encode video with FFmpeg
  const codec = outputFormat === 'mp4' ? 'libx264' : 'libvpx-vp9'
  const crf = { high: '18', medium: '23', low: '28' }[params.outputQuality] ?? '23'
  const outputFile = outputFormat === 'mp4' ? 'output.mp4' : 'output.webm'
  
  await ffmpeg.exec([
    '-framerate', fps.toString(),
    '-i', 'frame_%05d.png',
    '-c:v', codec,
    '-pix_fmt', 'yuv420p',
    '-crf', crf,
    '-preset', 'fast',
    outputFile
  ])
  
  onProgress?.(90)
  
  // Read output file
  const data = await ffmpeg.readFile(outputFile)
  const blob = new Blob([data], { type: `video/${outputFormat}` })
  
  onProgress?.(100)
  
  return blob
}

function inpaintFrameFast(
  imageData: ImageData,
  needsInpaint: Uint8Array,
  width: number,
  height: number
): void {
  const data = imageData.data
  
  // Multi-pass diffusion with radius 3
  const maxPasses = 50
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false
    const snapshot = new Uint8ClampedArray(data)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (!needsInpaint[idx]) continue
        
        let rSum = 0, gSum = 0, bSum = 0, wSum = 0
        
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
            
            const nIdx = ny * width + nx
            if (!needsInpaint[nIdx]) {
              const dist = dx * dx + dy * dy
              const weight = 1 / (dist * Math.sqrt(dist))
              const pIdx = nIdx * 4
              rSum += snapshot[pIdx] * weight
              gSum += snapshot[pIdx + 1] * weight
              bSum += snapshot[pIdx + 2] * weight
              wSum += weight
            }
          }
        }
        
        if (wSum > 0) {
          const pIdx = idx * 4
          data[pIdx] = Math.round(rSum / wSum)
          data[pIdx + 1] = Math.round(gSum / wSum)
          data[pIdx + 2] = Math.round(bSum / wSum)
          changed = true
        }
      }
    }
    
    if (!changed) break
  }
}
