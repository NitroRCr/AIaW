import { throttle } from "lodash"
import { defineStore } from "pinia"
import { reactive, computed, ref } from "vue"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/data/supabase/client"
import { Artifact, DbArtifactInsert, DbArtifactUpdate, mapArtifactToDb, mapDbToArtifact } from "@/services/data/types/artifact"

/**
 * Store for managing code and document artifacts
 *
 * This store handles:
 * - Fetching, creating, updating, and deleting artifacts
 * - Organizing artifacts by workspace
 * - Background synchronization of artifact content
 *
 * Artifacts are user-generated or AI-generated code snippets and documents
 * that can be saved and organized within workspaces.
 *
 * @dependencies
 * - {@link useUserLoginCallback} - For initialization after user login
 *
 * @database
 * - Table: "artifacts" - Stores artifact metadata and content
 *
 * @related
 * - Used by {@link artifactsPlugin} for artifact creation from dialogs
 * - Used by {@link EditArtifact} view for artifact editing
 */
export const useArtifactsStore = defineStore("artifacts", () => {
  const isLoaded = ref(false)
  const workspaceArtifacts = reactive<
    Record<string, Record<string, Artifact>>
  >({})
  const artifacts = computed(() =>
    Object.values(workspaceArtifacts).flatMap((workspace) =>
      Object.values(workspace)
    )
  )

  const fetchArtifacts = async () => {
    const { data, error } = await supabase.from("artifacts").select("*")

    if (error) {
      console.error(error)
    }

    const artifacts = data.map((a) => mapDbToArtifact(a))

    for (const artifact of artifacts) {
      if (!(artifact.workspaceId in workspaceArtifacts)) {
        workspaceArtifacts[artifact.workspaceId] = {} as Record<string, Artifact>
      }

      workspaceArtifacts[artifact.workspaceId][artifact.id] = artifact
    }
  }

  async function add (item: Artifact<DbArtifactInsert>) {
    const { data, error } = await supabase
      .from("artifacts")
      .insert(mapArtifactToDb(item))
      .select()
      .single()

    if (error) {
      console.error(error)
    }

    const artifact = mapDbToArtifact(data)

    if (!(artifact.workspaceId in workspaceArtifacts)) {
      workspaceArtifacts[artifact.workspaceId] = {}
    }

    workspaceArtifacts[artifact.workspaceId][artifact.id] = artifact

    return artifact
  }

  // background update with throttle, for "no save button" UI
  const throttledUpdate = throttle((item: Artifact<DbArtifactUpdate>) => {
    supabase
      .from("artifacts")
      .update(mapArtifactToDb(item))
      .eq("id", item.id)
      .select()
      .single()
      .then((res) => {
        if (res.error) {
          console.error(res.error)
        }
      })
  }, 2000)

  async function update (artifact: Artifact<DbArtifactUpdate>) {
    throttledUpdate(artifact)
    workspaceArtifacts[artifact.workspaceId][artifact.id] = {
      ...workspaceArtifacts[artifact.workspaceId][artifact.id],
      ...artifact,
    } as Artifact
  }

  async function remove (artifact: Partial<Artifact>) {
    const { error } = await supabase
      .from("artifacts")
      .delete()
      .eq("id", artifact.id)

    if (error) {
      console.error(error)
    }

    delete workspaceArtifacts[artifact.workspaceId][artifact.id]
  }

  async function init () {
    isLoaded.value = false
    Object.assign(workspaceArtifacts, {})
    await fetchArtifacts()
    isLoaded.value = true
  }

  useUserLoginCallback(init)

  return {
    isLoaded: computed(() => isLoaded.value),

    artifacts,
    workspaceArtifacts,
    init,
    add,
    update,
    remove,
  }
})
