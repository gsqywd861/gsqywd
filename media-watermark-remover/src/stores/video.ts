import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VideoInfo, WatermarkRegion } from '@/types'

export const useVideoStore = defineStore('video', () => {
  const videoFile = ref<File | null>(null)
  const videoInfo = ref<VideoInfo | null>(null)
  const videoUrl = ref<string>('')
  const watermarkRegions = ref<WatermarkRegion[]>([])
  const isProcessing = ref(false)
  const progress = ref(0)
  const outputBlob = ref<Blob | null>(null)
  const error = ref<string | null>(null)

  function setVideoFile(file: File, url: string) {
    videoFile.value = file
    videoUrl.value = url
    videoInfo.value = null
    watermarkRegions.value = []
    outputBlob.value = null
    error.value = null
  }

  function setVideoInfo(info: VideoInfo) {
    videoInfo.value = info
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
      watermarkRegions.value[index] = { ...watermarkRegions.value[index], ...updates }
    }
  }

  function clearWatermarkRegions() {
    watermarkRegions.value = []
  }

  function setProgress(value: number) {
    progress.value = value
  }

  function setOutputBlob(blob: Blob) {
    outputBlob.value = blob
  }

  function setError(msg: string | null) {
    error.value = msg
    isProcessing.value = false
  }

  function reset() {
    videoFile.value = null
    videoInfo.value = null
    videoUrl.value = ''
    watermarkRegions.value = []
    isProcessing.value = false
    progress.value = 0
    outputBlob.value = null
    error.value = null
  }

  return {
    videoFile,
    videoInfo,
    videoUrl,
    watermarkRegions,
    isProcessing,
    progress,
    outputBlob,
    error,
    setVideoFile,
    setVideoInfo,
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
