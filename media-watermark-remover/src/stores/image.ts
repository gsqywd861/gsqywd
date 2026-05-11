import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ImageInfo, WatermarkRegion } from '@/types'

export const useImageStore = defineStore('image', () => {
  const imageFile = ref<File>({} as File)
  const imageUrl = ref<string>('')
  const imageInfo = ref<ImageInfo | null>(null)
  const watermarkRegions = ref<WatermarkRegion[]>([])
  const isProcessing = ref(false)
  const progress = ref(0)
  const outputBlob = ref<Blob | null>(null)
  const outputUrl = ref<string>('')
  const error = ref<string | null>(null)

  function setImageFile(file: File, url: string) {
    imageFile.value = file
    imageUrl.value = url
    imageInfo.value = null
    watermarkRegions.value = []
    outputBlob.value = null
    outputUrl.value = ''
    error.value = null
  }

  function setImageInfo(info: ImageInfo) {
    imageInfo.value = info
  }

  function addWatermarkRegion(region: WatermarkRegion) {
    watermarkRegions.value.push(region)
  }

  function removeWatermarkRegion(id: string) {
    watermarkRegions.value = watermarkRegions.value.filter(r => r.id !== id)
  }

  function updateWatermarkRegion(id: string, updates: Partial<WatermarkRegion>) {
    const index = watermarkRegions.value.findIndex(r => r.id === id)
    if (index !== -1) {
      watermarkRegions.value[index] = { ...watermarkRegions.value[index], ...updates } as WatermarkRegion
    }
  }

  function clearWatermarkRegions() {
    watermarkRegions.value = []
  }

  function setProgress(value: number) {
    progress.value = value
  }

  function setOutputBlob(blob: Blob, url: string = '') {
    outputBlob.value = blob
    outputUrl.value = url
    isProcessing.value = false
    progress.value = 100
  }

  function setError(msg: string | null) {
    error.value = msg
    isProcessing.value = false
  }

  function reset() {
    imageFile.value = {} as File
    imageUrl.value = ''
    imageInfo.value = null
    watermarkRegions.value = []
    isProcessing.value = false
    progress.value = 0
    outputBlob.value = null
    outputUrl.value = ''
    error.value = null
  }

  return {
    imageFile,
    imageUrl,
    imageInfo,
    watermarkRegions,
    isProcessing,
    progress,
    outputBlob,
    outputUrl,
    error,
    setImageFile,
    setImageInfo,
    addWatermarkRegion,
    removeWatermarkRegion,
    updateWatermarkRegion,
    clearWatermarkRegions,
    setProgress,
    setOutputBlob,
    setError,
    reset,
  }
})
