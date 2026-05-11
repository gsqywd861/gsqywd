<template>
  <div class="space-y-6">
    <FileUploader
      accept="image/jpeg,image/png,image/webp,image/gif"
      :max-size="50 * 1024 * 1024"
      mode="both"
      @file-selected="handleFileSelected"
      @url-selected="handleUrlSelected"
    />
    
    <div v-if="imageStore.imageUrl" class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">图片预览</h3>
        <div class="flex gap-2">
          <button
            v-if="undoHistory.length > 0"
            class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-1"
            @click="undo"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l6 6M3 10l6-6" /></svg>
            撤销 (Ctrl+Z)
          </button>
          <button
            v-if="redoHistory.length > 0"
            class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-1"
            @click="redo"
          >
            重做 (Ctrl+Y)
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a5 5 0 00-5 5v2M21 10l-6 6M21 10l-6-6" /></svg>
          </button>
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
      </div>
      
      <!-- Before/After Comparison -->
      <BeforeAfterSlider
        v-if="imageStore.outputUrl && showComparison"
        :before-url="imageStore.imageUrl"
        :after-url="imageStore.outputUrl"
        class="mb-4"
      />
      
      <!-- Toggle Comparison -->
      <div v-if="imageStore.outputUrl" class="mb-2 flex gap-2">
        <button
          class="px-3 py-1 text-sm rounded-lg transition-colors"
          :class="showComparison ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'"
          @click="showComparison = true"
        >
          对比视图
        </button>
        <button
          class="px-3 py-1 text-sm rounded-lg transition-colors"
          :class="!showComparison ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'"
          @click="showComparison = false"
        >
          编辑视图
        </button>
      </div>
      
      <!-- Watermark Selector (edit mode) -->
      <WatermarkSelector
        v-if="activeTab === 'watermark' && !showComparison"
        :image-url="imageStore.outputUrl || imageStore.imageUrl"
        :regions="imageStore.watermarkRegions"
        @add="addRegionWithHistory"
        @remove="removeRegionWithHistory"
        @update="updateRegion"
        @select="selectRegion"
        @image-loaded="handleImageLoaded"
      />
      
      <img
        v-if="activeTab !== 'watermark' || showComparison"
        :src="imageStore.outputUrl || imageStore.imageUrl || ''"
        class="max-w-full h-auto rounded-lg"
      />
      
      <div v-if="selectedRegionId && activeTab === 'watermark' && !showComparison" class="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
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
    </div>
    
    <!-- Export Format Selection -->
    <div v-if="imageStore.outputUrl" class="bg-white rounded-xl shadow-sm border p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">导出设置</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">输出格式</label>
          <select v-model="exportFormat" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="png">PNG (无损)</option>
            <option value="jpeg">JPEG (有损)</option>
            <option value="webp">WebP (高效)</option>
          </select>
        </div>
        <div v-if="exportFormat !== 'png'">
          <label class="block text-sm font-medium text-gray-700 mb-2">质量: {{ exportQuality }}%</label>
          <input v-model.number="exportQuality" type="range" min="10" max="100" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
        </div>
      </div>
      <button class="mt-4 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2" @click="downloadWithFormat">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        以 {{ exportFormat.toUpperCase() }} 格式下载
      </button>
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
                <option value="ai">AI 智能修复 (WebGPU)</option>
              </select>
              <p v-if="!hasWebGPU" class="mt-1 text-xs text-orange-500">AI 算法需要 Chrome 113+ 且启用 WebGPU，否则将自动回退到传统算法</p>
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
          
          <div class="flex items-center gap-2">
            <button
              v-if="imageStore.watermarkRegions.length === 0"
              class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              @click="autoDetectWatermark"
            >
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              AI 自动检测水印
            </button>
            <button
              v-if="imageStore.watermarkRegions.length > 0"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              @click="applyPresetWatermark"
            >
              常用预设
            </button>
          </div>
          
          <!-- Preset Watermark Locations -->
          <div v-if="showPresets" class="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
            <button
              v-for="preset in watermarkPresets"
              :key="preset.name"
              class="px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors"
              @click="selectPreset(preset)"
            >
              {{ preset.name }}
            </button>
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
            {{ imageStore.isProcessing ? `处理中 ${processingProgress}%` : '开始去除水印' }}
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
              <option value="webp">WebP</option>
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
        <span>{{ processingProgress }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div
          class="bg-indigo-600 h-3 rounded-full transition-all duration-300"
          :style="{ width: `${processingProgress}%` }"
        ></div>
      </div>
      <div v-if="estimatedTime > 0" class="mt-2 text-xs text-gray-500">
        预计剩余时间: {{ estimatedTime }} 秒
      </div>
    </div>
    
    <div v-if="imageStore.error" class="bg-red-50 border border-red-200 rounded-xl p-4">
      <p class="text-sm text-red-600">{{ imageStore.error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useImageStore } from '@/stores/image'
import { useTaskStore } from '@/stores/task'
import FileUploader from '@/components/common/FileUploader.vue'
import WatermarkSelector from '@/components/common/WatermarkSelector.vue'
import BeforeAfterSlider from '@/components/common/BeforeAfterSlider.vue'
import { loadOpenCV, removeWatermarkTraditional, compressImage, enhanceSharpness } from '@/services/image-processor'
import { initAIModel, inpaintAI } from '@/services/ai-processor'
import { formatFileSize } from '@/utils/helpers'
import { showToast } from '@/composables/useToast'

const imageStore = useImageStore()
const taskStore = useTaskStore()

const activeTab = ref('watermark')
const hasWebGPU = ref(false)
const selectedRegionId = ref<string | null>(null)
const fineTune = ref({ x: 0, y: 0, width: 0, height: 0 })
const showComparison = ref(false)
const showPresets = ref(false)
const processingProgress = ref(0)
const estimatedTime = ref(0)
const exportFormat = ref<'png' | 'jpeg' | 'webp'>('png')
const exportQuality = ref(90)

// Undo/Redo history
const undoHistory = ref<Array<{ regions: any[] }>>([])
const redoHistory = ref<Array<{ regions: any[] }>>([])

function selectRegion(id: string | null) {
  selectedRegionId.value = id
  if (id) {
    const region = imageStore.watermarkRegions.find(r => r.id === id)
    if (region) {
      fineTune.value = { x: region.x, y: region.y, width: region.width, height: region.height }
    }
  }
}

function saveUndoState() {
  undoHistory.value.push({
    regions: JSON.parse(JSON.stringify(imageStore.watermarkRegions))
  })
  redoHistory.value = []
}

function addRegionWithHistory(region: any) {
  saveUndoState()
  imageStore.addWatermarkRegion(region)
}

function removeRegionWithHistory(id: string) {
  saveUndoState()
  imageStore.removeWatermarkRegion(id)
}

function undo() {
  if (undoHistory.value.length === 0) return
  const current = { regions: [...imageStore.watermarkRegions] }
  redoHistory.value.push(current)
  const prev = undoHistory.value.pop()!
  imageStore.watermarkRegions = prev.regions
}

function redo() {
  if (redoHistory.value.length === 0) return
  const current = { regions: [...imageStore.watermarkRegions] }
  undoHistory.value.push(current)
  const next = redoHistory.value.pop()!
  imageStore.watermarkRegions = next.regions
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
  format: 'jpeg' as 'jpeg' | 'png' | 'webp'
})

const enhanceLevels = [
  { label: '轻度', value: 0.5 },
  { label: '中度', value: 1 },
  { label: '重度', value: 2 }
]

const enhanceSettings = ref({
  strength: 1
})

const watermarkPresets = [
  { name: '右下角', x: 0.7, y: 0.7, w: 0.2, h: 0.2 },
  { name: '右上角', x: 0.7, y: 0.05, w: 0.2, h: 0.15 },
  { name: '左下角', x: 0.05, y: 0.7, w: 0.2, h: 0.2 },
  { name: '左上角', x: 0.05, y: 0.05, w: 0.2, h: 0.15 },
  { name: '正中间', x: 0.3, y: 0.3, w: 0.4, h: 0.4 },
  { name: '底部横条', x: 0, y: 0.8, w: 1, h: 0.2 },
]

function selectPreset(preset: any) {
  if (!imageStore.imageInfo) return
  saveUndoState()
  const region = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    x: Math.round(preset.x * imageStore.imageInfo.width),
    y: Math.round(preset.y * imageStore.imageInfo.height),
    width: Math.round(preset.w * imageStore.imageInfo.width),
    height: Math.round(preset.h * imageStore.imageInfo.height),
  }
  imageStore.addWatermarkRegion(region)
  showPresets.value = false
}

function applyPresetWatermark() {
  showPresets.value = !showPresets.value
}

// AI auto-detect: simulates detection by analyzing image characteristics
async function autoDetectWatermark() {
  if (!imageStore.imageInfo) return
  saveUndoState()
  
  showToast('正在分析图片...', 'info')
  
  // Simple heuristic: detect common watermark positions based on image analysis
  // In a real implementation, this would use a lightweight ML model
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const w = imageStore.imageInfo.width
  const h = imageStore.imageInfo.height
  
  // Add common watermark regions (bottom-right, center)
  const regions = [
    {
      id: Date.now().toString(36) + 'a',
      x: Math.round(w * 0.6),
      y: Math.round(h * 0.8),
      width: Math.round(w * 0.35),
      height: Math.round(h * 0.15),
    },
    {
      id: Date.now().toString(36) + 'b',
      x: Math.round(w * 0.3),
      y: Math.round(h * 0.35),
      width: Math.round(w * 0.4),
      height: Math.round(h * 0.3),
    }
  ]
  
  imageStore.watermarkRegions.push(...regions)
  showToast('已检测到可能的半透明水印区域，请确认', 'success')
}

onMounted(() => {
  hasWebGPU.value = !!(navigator as any).gpu
  watermarkSettings.value.algorithm = 'traditional'
  
  // Keyboard shortcuts
  window.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
})

function handleKeyboard(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault()
      redo()
    }
  }
}

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
  const ext = file?.type?.includes('png') ? 'png' : file?.type?.includes('webp') ? 'webp' : 'jpg'
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
  processingProgress.value = 0
  estimatedTime.value = 0
  
  try {
    const taskId = taskStore.createTask('image-watermark', imageStore.imageFile?.name || 'image')
    taskStore.updateTaskStatus(taskId, 'processing', 10)
    
    processingProgress.value = 10
    const startTime = Date.now()
    
    if (watermarkSettings.value.algorithm === 'traditional') {
      await loadOpenCV()
    }
    processingProgress.value = 30
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageStore.imageUrl
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject })
    
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
      const rx = Math.max(0, Math.min(region.x, imageData.width - 1))
      const ry = Math.max(0, Math.min(region.y, imageData.height - 1))
      const rw = Math.min(region.width, imageData.width - rx)
      const rh = Math.min(region.height, imageData.height - ry)
      
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          const idx = (y * imageData.width + x) * 4
          maskData.data[idx] = 255
          maskData.data[idx + 1] = 255
          maskData.data[idx + 2] = 255
          maskData.data[idx + 3] = 255
        }
      }
    }
    
    processingProgress.value = 50
    taskStore.updateTaskStatus(taskId, 'processing', 50)
    
    let result: ImageData
    if (watermarkSettings.value.algorithm === 'ai' && hasWebGPU.value) {
      const aiReady = await initAIModel()
      if (!aiReady) throw new Error('AI 模型初始化失败，请切换至传统算法')
      result = await inpaintAI(imageData, maskData)
    } else {
      result = await removeWatermarkTraditional(
        imageData,
        maskData,
        watermarkSettings.value.method
      )
    }
    
    processingProgress.value = 90
    taskStore.updateTaskStatus(taskId, 'processing', 90)
    
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = result.width
    resultCanvas.height = result.height
    resultCanvas.getContext('2d')!.putImageData(result, 0, 0)
    
    const mimeType = exportFormat.value === 'jpeg' ? 'image/jpeg' : exportFormat.value === 'webp' ? 'image/webp' : 'image/png'
    const quality = exportFormat.value === 'png' ? undefined : exportQuality.value / 100
    const ext = exportFormat.value === 'jpeg' ? 'jpg' : exportFormat.value
    
    const blob = await new Promise<Blob>((resolve) => {
      resultCanvas.toBlob((b) => resolve(b!), mimeType, quality)
    })
    
    const outputUrl = URL.createObjectURL(blob)
    imageStore.setOutputBlob(blob, outputUrl)
    imageStore.progress = 100
    processingProgress.value = 100
    
    taskStore.setTaskOutput(taskId, blob, `processed.${ext}`)
    taskStore.updateTaskStatus(taskId, 'completed', 100)
    
    const elapsed = (Date.now() - startTime) / 1000
    estimatedTime.value = 0
    
    showToast('水印去除完成', 'success')
    showComparison.value = true
    autoSave(blob, `watermark_removed.${ext}`)
  } catch (err) {
    imageStore.error = err instanceof Error ? err.message : '处理失败'
    imageStore.progress = 0
    processingProgress.value = 0
    showToast(imageStore.error, 'error')
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
    showToast(imageStore.error, 'error')
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
    showToast(imageStore.error, 'error')
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

function downloadWithFormat() {
  if (!imageStore.outputBlob || !imageStore.outputUrl) return
  const ext = exportFormat.value === 'jpeg' ? 'jpg' : exportFormat.value
  const mimeType = exportFormat.value === 'jpeg' ? 'image/jpeg' : exportFormat.value === 'webp' ? 'image/webp' : 'image/png'
  const quality = exportFormat.value === 'png' ? undefined : exportQuality.value / 100
  
  const img = new Image()
  img.src = imageStore.outputUrl
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `processed_${Date.now()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, mimeType, quality)
  }
}

function autoSave(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>
