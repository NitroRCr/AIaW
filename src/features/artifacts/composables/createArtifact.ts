import { Ref } from "vue"
import { useRouter } from "vue-router"

import { useUserDataStore } from "@/shared/store"

import { useArtifactsStore } from "@/features/artifacts/store"

import { ArtifactMapped } from "@/services/supabase/types"

export function useCreateArtifact (workspaceId: Ref<string>) {
  const router = useRouter()
  const artifactsStore = useArtifactsStore()
  const userDataStore = useUserDataStore()

  async function createArtifact (props: Partial<ArtifactMapped> = {}) {
    const artifact = await artifactsStore.add({
      name: "new_artifact",
      versions: [{ date: new Date().toISOString(), text: "" }],
      curr_index: 0,
      readable: true,
      writable: true,
      workspace_id: workspaceId.value,
      tmp: "",
      ...props,
    })
    router.push({ query: { artifactId: artifact.id } })
    userDataStore.data.openedArtifacts.push(artifact.id)
    console.log(
      "created artifact",
      artifact,
      userDataStore.data.openedArtifacts
    )

    return artifact.id
  }

  return { createArtifact }
}
