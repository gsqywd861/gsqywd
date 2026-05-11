import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProcessingTask, ProcessingTaskStatus } from '@/types'
import { generateId } from '@/utils/helpers'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<ProcessingTask[]>([])
  const activeTaskId = ref<string | null>(null)

  function createTask(type: ProcessingTask['type'], inputFileName: string, params: Record<string, any> = {}): string {
    const task: ProcessingTask = {
      id: generateId(),
      userId: null,
      type,
      inputFileName,
      outputFileName: null,
      outputBlob: null,
      status: 'pending',
      progress: 0,
      params,
      createdAt: new Date(),
      completedAt: null,
    }
    tasks.value.push(task)
    activeTaskId.value = task.id
    return task.id
  }

  function updateTaskStatus(id: string, status: ProcessingTaskStatus, progress?: number) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.status = status
      if (progress !== undefined) {
        task.progress = progress
      }
      if (status === 'completed' || status === 'failed') {
        task.completedAt = new Date()
        if (status === 'completed') {
          task.progress = 100
        }
      }
    }
  }

  function setTaskOutput(id: string, outputBlob: Blob, outputFileName: string) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.outputBlob = outputBlob
      task.outputFileName = outputFileName
    }
  }

  function getTask(id: string): ProcessingTask | undefined {
    return tasks.value.find(t => t.id === id)
  }

  function getActiveTask(): ProcessingTask | undefined {
    if (!activeTaskId.value) return undefined
    return tasks.value.find(t => t.id === activeTaskId.value)
  }

  function removeTask(id: string) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    if (activeTaskId.value === id) {
      activeTaskId.value = null
    }
  }

  function clearCompletedTasks() {
    tasks.value = tasks.value.filter(t => t.status !== 'completed')
  }

  return {
    tasks,
    activeTaskId,
    createTask,
    updateTaskStatus,
    setTaskOutput,
    getTask,
    getActiveTask,
    removeTask,
    clearCompletedTasks,
  }
})
