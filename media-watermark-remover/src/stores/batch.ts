import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface BatchQueueItem {
  id: string
  file: File
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  outputBlob: Blob | null
  outputUrl: string | null
  error: string | null
}

export const useBatchStore = defineStore('batch', () => {
  const queue = ref<BatchQueueItem[]>([])
  const watermarkRegions = ref<Array<{ id: string; x: number; y: number; width: number; height: number }>>([])
  const algorithm = ref<'traditional' | 'ai'>('traditional')
  const method = ref<'telea' | 'ns'>('telea')
  const imageInfo = ref<{ width: number; height: number } | null>(null)
  const previewUrl = ref<string | null>(null)
  const isProcessing = ref(false)

  const completedCount = computed(() => queue.value.filter(item => item.status === 'completed').length)
  const overallProgress = computed(() => {
    if (queue.value.length === 0) return 0
    const total = queue.value.reduce((sum, item) => sum + item.progress, 0)
    return Math.round(total / queue.value.length)
  })

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  }

  function addToQueue(file: File, url: string) {
    queue.value.push({
      id: generateId(),
      file,
      url,
      status: 'pending',
      progress: 0,
      outputBlob: null,
      outputUrl: null,
      error: null
    })
  }

  function removeFromQueue(id: string) {
    const idx = queue.value.findIndex(item => item.id === id)
    if (idx !== -1) {
      const item = queue.value[idx]
      if (item) {
        URL.revokeObjectURL(item.url)
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
      }
      queue.value.splice(idx, 1)
    }
  }

  function clearQueue() {
    queue.value.forEach(item => {
      URL.revokeObjectURL(item.url)
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
    })
    queue.value = []
    watermarkRegions.value = []
  }

  function addWatermarkRegion(region: { id: string; x: number; y: number; width: number; height: number }) {
    watermarkRegions.value.push(region)
  }

  function removeWatermarkRegion(id: string) {
    watermarkRegions.value = watermarkRegions.value.filter(r => r.id !== id)
  }

  function setImageInfo(info: { width: number; height: number }) {
    imageInfo.value = info
  }

  function startProcessing() {
    isProcessing.value = true
  }

  function finishProcessing() {
    isProcessing.value = false
  }

  function updateOverallProgress() {
    // Computed property handles this automatically
  }

  function reset() {
    clearQueue()
    algorithm.value = 'traditional'
    method.value = 'telea'
    imageInfo.value = null
    previewUrl.value = null
    isProcessing.value = false
  }

  return {
    queue,
    watermarkRegions,
    algorithm,
    method,
    imageInfo,
    previewUrl,
    isProcessing,
    completedCount,
    overallProgress,
    addToQueue,
    removeFromQueue,
    clearQueue,
    addWatermarkRegion,
    removeWatermarkRegion,
    setImageInfo,
    startProcessing,
    finishProcessing,
    updateOverallProgress,
    reset
  }
})
