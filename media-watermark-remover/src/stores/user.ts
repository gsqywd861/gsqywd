import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, UserSettings } from '@/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const defaultSettings: UserSettings = {
    preferredAlgorithm: 'ai',
    defaultOutputResolution: 'original',
    defaultOutputQuality: 'high',
  }

  function setUser(newUser: User) {
    user.value = newUser
    isAuthenticated.value = true
  }

  function clearUser() {
    user.value = null
    isAuthenticated.value = false
  }

  function updateSettings(settings: Partial<UserSettings>) {
    if (user.value) {
      user.value.settings = { ...user.value.settings, ...settings }
    }
  }

  function setError(msg: string | null) {
    error.value = msg
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    defaultSettings,
    setUser,
    clearUser,
    updateSettings,
    setError,
  }
})
