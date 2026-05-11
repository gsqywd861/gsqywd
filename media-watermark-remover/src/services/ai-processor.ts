import * as ort from 'onnxruntime-web'

let session: ort.InferenceSession | null = null
let isInitialized = false

export async function initAIModel(): Promise<boolean> {
  if (isInitialized) return true
  
  try {
    const hasWebGPU = !!(navigator as any).gpu
    if (!hasWebGPU) return false
    
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/'
    
    session = await ort.InferenceSession.create('https://huggingface.co/ototadana/inpainting_lama/resolve/main/model.onnx', {
      executionProviders: ['webgpu']
    })
    
    isInitialized = true
    return true
  } catch (err) {
    console.warn('AI model init failed, falling back to traditional:', err)
    return false
  }
}

export async function inpaintAI(imageData: ImageData, maskData: ImageData): Promise<ImageData> {
  if (!session) throw new Error('AI model not initialized')
  
  const inputTensor = new ort.Tensor('float32', normalizeImage(imageData), [1, 4, imageData.height, imageData.width])
  const maskTensor = new ort.Tensor('float32', normalizeMask(maskData), [1, 1, maskData.height, maskData.width])
  
  const results = await session.run({ image: inputTensor, mask: maskTensor })
  const output = results.output!
  
  return denormalizeOutput(output, imageData.width, imageData.height)
}

function normalizeImage(imageData: ImageData): Float32Array {
  const data = new Float32Array(imageData.width * imageData.height * 4)
  for (let i = 0; i < imageData.data.length; i++) {
    data[i] = imageData.data[i] / 255.0
  }
  return data
}

function normalizeMask(maskData: ImageData): Float32Array {
  const data = new Float32Array(maskData.width * maskData.height)
  for (let i = 0; i < maskData.data.length; i += 4) {
    data[i / 4] = maskData.data[i] > 0 ? 1.0 : 0.0
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
