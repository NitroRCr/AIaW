/* eslint-disable camelcase */
import { throttle } from "lodash"
import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

import { useUserStore } from "@/shared/store"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/data/supabase/client"
import { mapDbToProfile, Profile } from "@/services/data/types/profile"

export const useProfileStore = defineStore("profile", () => {
  const profiles = ref<Record<string, Profile>>({})
  const user = useUserStore()
  const myProfile = computed(() => profiles.value[user.currentUserId])
  const isInitialized = ref(false)
  const isSaving = ref(false)
  const hasChanges = ref(false)

  watch(profiles, () => {
    hasChanges.value = true
  }, { deep: true })

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .throwOnError()

    if (error) {
      console.error("Error fetching profiles:", error)
    }

    profiles.value = data.reduce(
      (acc, profile) => {
        acc[profile.id] = mapDbToProfile(profile)

        return acc
      },
      {} as Record<string, Profile>
    )
  }

  const fetchProfile = async (id: string) => {
    if (profiles.value[id]) {
      return profiles.value[id]
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .select()
      .single()
      .throwOnError()

    if (error) {
      console.error("Error fetching profile:", error)
    }

    profiles.value[id] = mapDbToProfile(data)

    return profiles.value[id]
  }

  const init = async () => {
    profiles.value = {}
    await fetchProfiles()
    isInitialized.value = true
    hasChanges.value = false
  }

  useUserLoginCallback(init)

  async function update (id: string, changes) {
    isSaving.value = true

    const { data, error } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", id)
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("Error updating profile:", error)

      return null
    }

    profiles.value[id] = mapDbToProfile(data)

    return data
  }

  const throttledUpdate = throttle(async (profile: Profile) => {
    await update(profile.id, profile)
  }, 2000)

  async function put (profile: Profile) {
    if (profile.id) {
      return throttledUpdate(profile)
    }
  }

  return {
    profiles,
    update,
    put,
    fetchProfile,
    fetchProfiles,
    myProfile,
    isInitialized,
    isSaving,
    hasChanges,
  }
})
