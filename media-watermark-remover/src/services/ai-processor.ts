import * as ort from 'onnxruntime-web'

let session: ort.InferenceSession | null = null
let isInitialized = false

export async function initAIModel(): Promise<boolean> {
  if (isInitialized) return true
  if (!session) {
    try {
      const hasWebGPU = !!(navigator as any).gpu
      if (!hasWebGPU) throw new Error('WebGPU 不支持')
      
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/'
      
      session = await ort.InferenceSession.create('https://huggingface.co/ototadana/inpainting_lama/resolve/main/model.onnx', {
        executionProviders: ['webgpu']
      })
      
      isInitialized = true
      return true
    } catch (err) {
      console.error('AI 模型初始化失败:', err)
      session = null
      isInitialized = false
      return false
    }
  }
  return true
}

export async function inpaintAI(imageData: ImageData, maskData: ImageData): Promise<ImageData> {
  if (!session) throw new Error('AI 模型未初始化')
  
  // 确保尺寸是 8 的倍数（LaMa 模型要求）
  const h = Math.floor(imageData.height / 8) * 8
  const w = Math.floor(imageData.width / 8) * 8
  
  const inputTensor = new ort.Tensor('float32', normalizeImage(imageData, w, h), [1, 4, h, w])
  const maskTensor = new ort.Tensor('float32', normalizeMask(maskData, w, h), [1, 1, h, w])
  
  const results = await session.run({ image: inputTensor, mask: maskTensor })
  const output = results.output!
  
  return denormalizeOutput(output, w, h)
}

function normalizeImage(imageData: ImageData, w: number, h: number): Float32Array {
  const data = new Float32Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * imageData.width + x) * 4
      const destIdx = (y * w + x) * 4
      data[destIdx] = imageData.data[srcIdx] / 255.0
      data[destIdx + 1] = imageData.data[srcIdx + 1] / 255.0
      data[destIdx + 2] = imageData.data[srcIdx + 2] / 255.0
      data[destIdx + 3] = imageData.data[srcIdx + 3] / 255.0
    }
  }
  return data
}

function normalizeMask(maskData: ImageData, w: number, h: number): Float32Array {
  const data = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * imageData.width + x) * 4
      data[y * w + x] = maskData.data[srcIdx] > 0 ? 1.0 : 0.0
    }
  }
  return data
}

function denormalizeOutput(tensor: ort.Tensor, width: number, height: number): ImageData {
  const result = new ImageData(width, height)
  const data = tensor.data as Float32Array
  
  for (let i = 0; i < result.data.length; i++) {
    result.data[i] = Math.min(255, Math.max(0, data[i] * 255))
  }
  
  return result
}
