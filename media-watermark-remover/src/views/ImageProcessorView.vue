<template>
  <div class="space-y-6">
    <FileUploader
      accept="image/jpeg,image/png,image/webp"
      :max-size="50 * 1024 * 1024"
      mode="both"
      @file-selected="handleFileSelected"
      @url-selected="handleUrlSelected"
    />
    
    <div v-if="imageStore.imageUrl" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">图片预览</h3>
        <button
          v-if="imageStore.outputUrl"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          @click="downloadResult"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载结果
        </button>
      </div>
      
      <WatermarkSelector
        v-if="activeTab === 'watermark'"
        :image-url="imageStore.outputUrl || imageStore.imageUrl"
        :regions="imageStore.watermarkRegions"
        @add="imageStore.addWatermarkRegion"
        @remove="imageStore.removeWatermarkRegion"
        @update="updateRegion"
        @select="selectRegion"
        @image-loaded="handleImageLoaded"
      />
      
      <div v-if="selectedRegionId && activeTab === 'watermark'" class="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
        <h4 class="text-sm font-medium text-gray-900">区域微调</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">X 坐标</label>
            <input v-model.number="fineTune.x" type="range" min="0" :max="imageStore.imageInfo?.width || 1000" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Y 坐标</label>
            <input v-model.number="fineTune.y" type="range" min="0" :max="imageStore.imageInfo?.height || 1000" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">宽度</label>
            <input v-model.number="fineTune.width" type="range" min="10" :max="(imageStore.imageInfo?.width || 1000) - fineTune.x" class="w-full" @input="applyFineTune" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">高度</label>
            <input v-model.number="fineTune.height" type="range" min="10" :max="(imageStore.imageInfo?.height || 1000) - fineTune.y" class="w-full" @input="applyFineTune" />
          </div>
        </div>
      </div>
      
      <img
        v-else
        :src="imageStore.outputUrl || imageStore.imageUrl || ''"
        class="max-w-full h-auto rounded-lg"
      />
    </div>
    
    <div v-if="imageStore.imageUrl" class="bg-white rounded-xl shadow-sm border">
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors"
            :class="[
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
            @click="activeTab = tab.id"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>
      
      <div class="p-6">
        <div v-if="activeTab === 'watermark'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">算法选择</label>
              <select
                v-model="watermarkSettings.algorithm"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="traditional">传统算法 (OpenCV)</option>
                <option value="ai" :disabled="!hasWebGPU">AI 智能修复 (WebGPU)</option>
              </select>
              <p v-if="!hasWebGPU" class="mt-1 text-xs text-gray-500">AI 算法需要支持 WebGPU 的浏览器</p>
            </div>
            <div v-if="watermarkSettings.algorithm === 'traditional'">
              <label class="block text-sm font-medium text-gray-700 mb-2">修复方法</label>
              <select
                v-model="watermarkSettings.method"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="telea">Telea (快速)</option>
                <option value="ns">Navier-Stokes (精细)</option>
              </select>
            </div>
          </div>
          
          <p class="text-sm text-gray-600">
            已选择 {{ imageStore.watermarkRegions.length }} 个水印区域
          </p>
          
          <button
            class="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="imageStore.watermarkRegions.length === 0 || imageStore.isProcessing"
            @click="processWatermark"
          >
            <svg v-if="imageStore.isProcessing" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ imageStore.isProcessing ? '处理中...' : '开始去除水印' }}
          </button>
        </div>
        
        <div v-if="activeTab === 'compress'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              压缩质量: {{ compressSettings.quality }}%
            </label>
            <input
              v-model.number="compressSettings.quality"
              type="range"
              min="1"
              max="100"
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>最小文件</span>
              <span>最佳质量</span>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">输出格式</label>
            <select
              v-model="compressSettings.format"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </div>
          
          <button
            class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="imageStore.isProcessing"
            @click="processCompress"
          >
            <svg v-if="imageStore.isProcessing" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ imageStore.isProcessing ? '处理中...' : '开始压缩' }}
          </button>
        </div>
        
        <div v-if="activeTab === 'enhance'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">增强强度</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="level in enhanceLevels"
                :key="level.value"
                class="px-4 py-2 rounded-lg border-2 transition-colors"
                :class="enhanceSettings.strength === level.value ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-200 hover:border-gray-300'"
                @click="enhanceSettings.strength = level.value"
              >
                {{ level.label }}
              </button>
            </div>
          </div>
          
          <button
            class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="imageStore.isProcessing"
            @click="processEnhance"
          >
            <svg v-if="imageStore.isProcessing" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ imageStore.isProcessing ? '处理中...' : '开始增强' }}
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="imageStore.progress > 0 && imageStore.progress < 100" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>处理进度</span>
        <span>{{ Math.round(imageStore.progress) }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div
          class="bg-indigo-600 h-3 rounded-full transition-all duration-300"
          :style="{ width: `${imageStore.progress}%` }"
        ></div>
      </div>
    </div>
    
    <div v-if="imageStore.error" class="bg-red-50 border border-red-200 rounded-xl p-4">
      <p class="text-sm text-red-600">{{ imageStore.error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useImageStore } from '@/stores/image'
import { useTaskStore } from '@/stores/task'
import FileUploader from '@/components/common/FileUploader.vue'
import WatermarkSelector from '@/components/common/WatermarkSelector.vue'
import { loadOpenCV, removeWatermarkTraditional, compressImage, enhanceSharpness } from '@/services/image-processor'
import { initAIModel, inpaintAI } from '@/services/ai-processor'
import { formatFileSize } from '@/utils/helpers'

const imageStore = useImageStore()
const taskStore = useTaskStore()

const activeTab = ref('watermark')
const hasWebGPU = ref(false)
const selectedRegionId = ref<string | null>(null)
const fineTune = ref({ x: 0, y: 0, width: 0, height: 0 })

function selectRegion(id: string | null) {
  selectedRegionId.value = id
  if (id) {
    const region = imageStore.watermarkRegions.find(r => r.id === id)
    if (region) {
      fineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
    }
  }
}

function updateRegion(region: typeof fineTune.value & { id: string }) {
  const idx = imageStore.watermarkRegions.findIndex(r => r.id === region.id)
  if (idx !== -1) {
    imageStore.watermarkRegions[idx] = { ...region }
  }
}

function applyFineTune() {
  if (!selectedRegionId.value) return
  updateRegion({ id: selectedRegionId.value, ...fineTune.value })
}

const tabs = [
  { id: 'watermark', name: '水印去除' },
  { id: 'compress', name: '图片压缩' },
  { id: 'enhance', name: '清晰度增强' }
]

const watermarkSettings = ref({
  algorithm: 'traditional' as 'traditional' | 'ai',
  method: 'telea' as 'telea' | 'ns'
})

const compressSettings = ref({
  quality: 80,
  format: 'jpeg' as 'jpeg' | 'png'
})

const enhanceLevels = [
  { label: '轻度', value: 0.5 },
  { label: '中度', value: 1 },
  { label: '重度', value: 2 }
]

const enhanceSettings = ref({
  strength: 1
})

onMounted(() => {
  hasWebGPU.value = !!(navigator as any).gpu
  if (hasWebGPU.value) {
    watermarkSettings.value.algorithm = 'ai'
  }
})

async function handleFileSelected(files: File[]) {
  if (files.length === 0) return
  const file = files[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  imageStore.setImageFile(file, url)
}

async function handleUrlSelected(url: string) {
  const emptyFile = new File([], 'url-image', { type: 'image/jpeg' })
  imageStore.setImageFile(emptyFile, url)
}

function handleImageLoaded(info: { width: number; height: number }) {
  const file = imageStore.imageFile
  const ext = file?.type?.includes('png') ? 'png' : 'jpg'
  imageStore.setImageInfo({
    width: info.width,
    height: info.height,
    format: ext as 'jpg' | 'png' | 'webp',
    file,
    url: imageStore.imageUrl
  })
}

async function processWatermark() {
  if (imageStore.watermarkRegions.length === 0) return
  
  imageStore.isProcessing = true
  imageStore.progress = 0
  imageStore.error = null
  
  try {
    const file = imageStore.imageFile
    const fileName = file?.name || 'url-image'
    const taskId = taskStore.createTask('image-watermark', fileName)
    taskStore.updateTaskStatus(taskId, 'processing', 10)
    
    await loadOpenCV()
    taskStore.updateTaskStatus(taskId, 'processing', 30)
    
    const img = new Image()
    img.src = imageStore.imageUrl
    await new Promise((resolve) => { img.onload = resolve })
    
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = imageData.width
    maskCanvas.height = imageData.height
    const maskCtx = maskCanvas.getContext('2d')!
    
    const maskData = maskCtx.createImageData(imageData.width, imageData.height)
    for (const region of imageStore.watermarkRegions) {
      for (let y = region.y; y < region.y + region.height; y++) {
        for (let x = region.x; x < region.x + region.width; x++) {
          if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
            const idx = (y * imageData.width + x) * 4
            maskData.data[idx] = 255
            maskData.data[idx + 1] = 255
            maskData.data[idx + 2] = 255
            maskData.data[idx + 3] = 255
          }
        }
      }
    }
    
    imageStore.progress = 50
    taskStore.updateTaskStatus(taskId, 'processing', 50)
    
    let result: ImageData
    if (watermarkSettings.value.algorithm === 'ai' && hasWebGPU.value) {
      const aiReady = await initAIModel()
      if (!aiReady) throw new Error('AI 模型初始化失败，请确保浏览器支持 WebGPU 或切换至传统算法')
      result = await inpaintAI(imageData, maskData)
    } else {
      result = await removeWatermarkTraditional(
        imageData,
        maskData,
        watermarkSettings.value.method
      )
    }
    
    imageStore.progress = 90
    taskStore.updateTaskStatus(taskId, 'processing', 90)
    
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = result.width
    resultCanvas.height = result.height
    resultCanvas.getContext('2d')!.putImageData(result, 0, 0)
    
    const blob = await new Promise<Blob>((resolve) => {
      resultCanvas.toBlob((b) => resolve(b!), 'image/png')
    })
    
    const outputUrl = URL.createObjectURL(blob)
    imageStore.setOutputBlob(blob, outputUrl)
    imageStore.progress = 100
    
    taskStore.setTaskOutput(taskId, blob, 'processed.png')
    taskStore.updateTaskStatus(taskId, 'completed', 100)
  } catch (err) {
    imageStore.error = err instanceof Error ? err.message : '处理失败'
    imageStore.progress = 0
  } finally {
    imageStore.isProcessing = false
  }
}

async function processCompress() {
  imageStore.isProcessing = true
  imageStore.progress = 10
  imageStore.error = null
  
  try {
    const taskId = taskStore.createTask('image-compress', imageStore.imageFile?.name || 'url-image')
    taskStore.updateTaskStatus(taskId, 'processing', 10)
    
    const img = new Image()
    img.src = imageStore.imageUrl
    await new Promise((resolve) => { img.onload = resolve })
    
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    imageStore.progress = 50
    taskStore.updateTaskStatus(taskId, 'processing', 50)
    
    const blob = await compressImage(imageData, compressSettings.value.quality, compressSettings.value.format)
    
    imageStore.progress = 90
    taskStore.updateTaskStatus(taskId, 'processing', 90)
    
    const outputUrl = URL.createObjectURL(blob)
    imageStore.setOutputBlob(blob, outputUrl)
    imageStore.progress = 100
    
    taskStore.setTaskOutput(taskId, blob, `compressed.${compressSettings.value.format}`)
    taskStore.updateTaskStatus(taskId, 'completed', 100)
  } catch (err) {
    imageStore.error = err instanceof Error ? err.message : '压缩失败'
    imageStore.progress = 0
  } finally {
    imageStore.isProcessing = false
  }
}

async function processEnhance() {
  imageStore.isProcessing = true
  imageStore.progress = 10
  imageStore.error = null
  
  try {
    const taskId = taskStore.createTask('image-enhance', imageStore.imageFile?.name || 'url-image')
    taskStore.updateTaskStatus(taskId, 'processing', 10)
    
    await loadOpenCV()
    taskStore.updateTaskStatus(taskId, 'processing', 30)
    
    const img = new Image()
    img.src = imageStore.imageUrl
    await new Promise((resolve) => { img.onload = resolve })
    
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    imageStore.progress = 50
    taskStore.updateTaskStatus(taskId, 'processing', 50)
    
    const result = await enhanceSharpness(imageData, enhanceSettings.value.strength)
    
    imageStore.progress = 80
    taskStore.updateTaskStatus(taskId, 'processing', 80)
    
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = result.width
    resultCanvas.height = result.height
    resultCanvas.getContext('2d')!.putImageData(result, 0, 0)
    
    const blob = await new Promise<Blob>((resolve) => {
      resultCanvas.toBlob((b) => resolve(b!), 'image/png')
    })
    
    const outputUrl = URL.createObjectURL(blob)
    imageStore.setOutputBlob(blob, outputUrl)
    imageStore.progress = 100
    
    taskStore.setTaskOutput(taskId, blob, 'enhanced.png')
    taskStore.updateTaskStatus(taskId, 'completed', 100)
  } catch (err) {
    imageStore.error = err instanceof Error ? err.message : '增强失败'
    imageStore.progress = 0
  } finally {
    imageStore.isProcessing = false
  }
}

function downloadResult() {
  if (!imageStore.outputBlob || !imageStore.outputUrl) return
  
  const a = document.createElement('a')
  a.href = imageStore.outputUrl
  a.download = `processed_${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>
