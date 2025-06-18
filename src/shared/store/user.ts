import type { User } from "@supabase/supabase-js"
import { defineStore } from "pinia"
import { ref, computed } from "vue"

import { supabase } from "@/services/supabase/client"

export const useUserStore = defineStore("user", () => {
  const currentUser = ref<User | null>(null)
  const isInitialized = ref(false)

  // Initialize user on store creation
  async function init () {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    currentUser.value = session?.user ?? null
    supabase.auth.onAuthStateChange((event, session) => {
      currentUser.value = session?.user ?? null
    })
    isInitialized.value = true
  }

  const currentUserId = computed(() => currentUser.value?.id ?? null)
  const isLoggedIn = computed(() => !!currentUser.value?.id)

  return {
    currentUser,
    currentUserId,
    isLoggedIn,
    init,
    isInitialized,
  }
})
