import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, UserSettings } from '@/types'
import { signUp, signIn, signOut, getCurrentUser, onAuthStateChange } from '@/services/auth'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let authSubscription: { unsubscribe: () => void } | null = null

  const defaultSettings: UserSettings = {
    preferredAlgorithm: 'ai',
    defaultOutputResolution: 'original',
    defaultOutputQuality: 'high',
  }

  function initAuth() {
    authSubscription = onAuthStateChange((authUser) => {
      if (authUser) {
        user.value = {
          id: authUser.id,
          email: authUser.email || '',
          createdAt: new Date(authUser.created_at),
          settings: defaultSettings,
        }
        isAuthenticated.value = true
      } else {
        user.value = null
        isAuthenticated.value = false
      }
    })
    getCurrentUser().then((authUser) => {
      if (authUser) {
        user.value = {
          id: authUser.id,
          email: authUser.email || '',
          createdAt: new Date(authUser.created_at),
          settings: defaultSettings,
        }
        isAuthenticated.value = true
      }
    })
  }

  async function handleSignUp(email: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      const authUser = await signUp(email, password)
      user.value = {
        id: authUser.id,
        email: authUser.email || '',
        createdAt: new Date(authUser.created_at),
        settings: defaultSettings,
      }
      isAuthenticated.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function handleSignIn(email: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      const authUser = await signIn(email, password)
      user.value = {
        id: authUser.id,
        email: authUser.email || '',
        createdAt: new Date(authUser.created_at),
        settings: defaultSettings,
      }
      isAuthenticated.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      user.value = null
      isAuthenticated.value = false
    }
  }

  function updateSettings(settings: Partial<UserSettings>) {
    if (user.value) {
      user.value.settings = { ...user.value.settings, ...settings }
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    defaultSettings,
    initAuth,
    handleSignUp,
    handleSignIn,
    handleSignOut,
    updateSettings,
    clearError,
  }
})
