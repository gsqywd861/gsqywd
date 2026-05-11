export let cvReady = false
let cvPromise: Promise<void> | null = null

const OPENCV_CDN_URLS = [
  'https://docs.opencv.org/4.5.5/opencv.js',
  'https://cdn.jsdelivr.net/npm/opencv.js@1.2.1/opencv.js',
  'https://cdnjs.cloudflare.com/ajax/libs/opencv.js/4.5.5/opencv.js',
]

export function loadOpenCV(): Promise<void> {
  if (cvReady) return Promise.resolve()
  if (cvPromise) return cvPromise

  async function tryLoadUrl(index: number): Promise<void> {
    if (index >= OPENCV_CDN_URLS.length) {
      throw new Error('OpenCV.js 加载失败，请检查网络连接')
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      const url = OPENCV_CDN_URLS[index]
      if (!url) {
        reject(new Error('OpenCV.js 加载失败，请检查网络连接'))
        return
      }
      script.src = url
      script.async = true
      
      let settled = false
      
      script.onload = () => {
        const checkCv = () => {
          if (settled) return
          const cv = (window as any).cv
          if (cv && cv.Mat && typeof cv.inpaint === 'function') {
            cvReady = true
            settled = true
            resolve()
          } else if (cv?.onRuntimeInitialized) {
            cv.onRuntimeInitialized = () => {
              setTimeout(() => {
                if (settled) return
                const cv2 = (window as any).cv
                if (cv2 && cv2.Mat && typeof cv2.inpaint === 'function') {
                  cvReady = true
                  settled = true
                  resolve()
                } else if (cv2?.Mat) {
                  // Mat exists but no inpaint - resolve anyway (fallback will handle it)
                  cvReady = true
                  settled = true
                  resolve()
                } else {
                  setTimeout(checkCv, 200)
                }
              }, 2000)
            }
          } else if (cv?.Mat) {
            setTimeout(() => {
              if (settled) return
              const cv2 = (window as any).cv
              if (cv2 && cv2.Mat && typeof cv2.inpaint === 'function') {
                cvReady = true
                settled = true
                resolve()
              } else if (cv2?.Mat) {
                cvReady = true
                settled = true
                resolve()
              } else {
                setTimeout(checkCv, 200)
              }
            }, 1000)
          } else {
            setTimeout(checkCv, 100)
          }
        }
        checkCv()
      }
      
      script.onerror = () => {
        if (settled) return
        console.warn(`OpenCV CDN ${index} failed, trying next...`)
        tryLoadUrl(index + 1).then(resolve, reject)
      }
      
      // Timeout after 30s
      setTimeout(() => {
        if (!settled) {
          const cv = (window as any).cv
          if (cv?.Mat) {
            cvReady = true
            settled = true
            resolve()
          } else {
            reject(new Error('OpenCV.js 加载超时'))
          }
        }
      }, 30000)
      
      document.head.appendChild(script)
    })
  }

  cvPromise = tryLoadUrl(0)
  return cvPromise
}

export function getCv(): any {
  if (!cvReady) throw new Error('OpenCV.js not loaded')
  return (window as any).cv
}

export async function removeWatermarkTraditional(
  imageData: ImageData,
  maskData: ImageData,
  method: 'telea' | 'ns' = 'telea'
): Promise<ImageData> {
  const cv = getCv()
  
  if (typeof cv.inpaint === 'function') {
    return inpaintWithOpenCV(cv, imageData, maskData, method)
  }
  
  // Fallback: manual inpaint
  console.warn('cv.inpaint not available, using fallback algorithm')
  return inpaintFallback(imageData, maskData)
}

function inpaintWithOpenCV(cv: any, imageData: ImageData, maskData: ImageData, method: 'telea' | 'ns'): Promise<ImageData> {
  const src = cv.matFromImageData(imageData)
  const mask = cv.matFromImageData(maskData)
  const dst = new cv.Mat()
  
  const maskGray = new cv.Mat()
  cv.cvtColor(mask, maskGray, cv.COLOR_RGBA2GRAY)
  
  const inpaintMethod = method === 'telea' ? cv.INPAINT_TELEA : cv.INPAINT_NS
  cv.inpaint(src, maskGray, dst, 3, inpaintMethod)
  
  const result = new ImageData(dst.cols, dst.rows)
  result.data.set(new Uint8ClampedArray(dst.data))
  
  src.delete()
  mask.delete()
  maskGray.delete()
  dst.delete()
  
  return Promise.resolve(result)
}

function inpaintFallback(imageData: ImageData, maskData: ImageData): Promise<ImageData> {
  const width = imageData.width
  const height = imageData.height
  const src = imageData.data
  const mask = maskData.data
  
  // Build mask array
  const needsInpaint = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    needsInpaint[i] = mask[i * 4] > 0 ? 1 : 0
  }
  
  // Start with a copy of original
  const result = new Uint8ClampedArray(src)
  
  // Multi-pass diffusion: each pass reads from current result
  const maxPasses = 120
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false
    
    // Make a snapshot for this pass (read from current, write to new)
    const next = new Uint8ClampedArray(result)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (!needsInpaint[idx]) continue
        
        let rSum = 0, gSum = 0, bSum = 0, wSum = 0
        
        // Check neighbors in radius 3
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
            
            const nIdx = ny * width + nx
            // Only use non-masked pixels as source
            if (!needsInpaint[nIdx]) {
              const dist = Math.sqrt(dx * dx + dy * dy)
              const weight = 1 / (dist * dist * dist)
              const pIdx = nIdx * 4
              rSum += result[pIdx] * weight
              gSum += result[pIdx + 1] * weight
              bSum += result[pIdx + 2] * weight
              wSum += weight
            }
          }
        }
        
        if (wSum > 0) {
          const pIdx = idx * 4
          next[pIdx] = Math.round(rSum / wSum)
          next[pIdx + 1] = Math.round(gSum / wSum)
          next[pIdx + 2] = Math.round(bSum / wSum)
          next[pIdx + 3] = 255
          changed = true
        }
      }
    }
    
    // Apply changes
    result.set(next)
    if (!changed) break
  }
  
  return Promise.resolve(new ImageData(result, width, height))
}

export async function compressImage(
  imageData: ImageData,
  quality: number,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg'
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  
  const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'
  const q = format === 'png' ? undefined : quality / 100
  
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      mimeType,
      q
    )
  })
}

export async function enhanceSharpness(
  imageData: ImageData,
  strength: number = 1
): Promise<ImageData> {
  const cv = getCv()
  
  const src = cv.matFromImageData(imageData)
  const dst = new cv.Mat()
  
  const kernel = cv.Mat.eye(3, 3, cv.CV_32F)
  const kernelData = new Float32Array(9)
  kernelData[0] = 0; kernelData[1] = -strength; kernelData[2] = 0
  kernelData[3] = -strength; kernelData[4] = 1 + 4 * strength; kernelData[5] = -strength
  kernelData[6] = 0; kernelData[7] = -strength; kernelData[8] = 0
  kernel.data.set(kernelData)
  
  cv.filter2D(src, dst, cv.CV_8U, kernel)
  
  const result = new ImageData(dst.cols, dst.rows)
  result.data.set(new Uint8ClampedArray(dst.data))
  
  src.delete()
  dst.delete()
  kernel.delete()
  
  return result
}
