let cvReady = false
let cvPromise: Promise<void> | null = null

const OPENCV_CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/opencv.js@1.2.1/opencv.js',
  'https://cdnjs.cloudflare.com/ajax/libs/opencv.js/4.5.5/opencv.js',
  'https://unpkg.com/opencv.js@1.2.1/opencv.js',
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
      
      script.onload = () => {
        const checkCv = () => {
          if ((window as any).cv?.onRuntimeInitialized) {
            (window as any).cv.onRuntimeInitialized = () => {
              cvReady = true
              resolve()
            }
          } else if ((window as any).cv?.Mat) {
            cvReady = true
            resolve()
          } else {
            setTimeout(checkCv, 100)
          }
        }
        checkCv()
      }
      
      script.onerror = () => {
        console.warn(`OpenCV CDN ${index} failed, trying next...`)
        tryLoadUrl(index + 1).then(resolve, reject)
      }
      
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
  
  return result
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
