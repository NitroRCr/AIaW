import { useQuasar } from "quasar"

import SaveDialog from "@/shared/components/dialogs/SaveDialog.vue"
import { useUserDataStore } from "@/shared/store"
import {
  restoreArtifactChanges,
  saveArtifactChanges,
} from "@/shared/utils/functions"

import { useArtifactsStore } from "@/features/artifacts/store"

import { Artifact } from "@/services/data/types/artifact"

export function useCloseArtifact () {
  const $q = useQuasar()
  const artifactsStore = useArtifactsStore()
  const userDataStore = useUserDataStore()

  function closeArtifact (artifact: Artifact) {
    if (artifact.tmp !== artifact.versions[artifact.currIndex].text) {
      $q.dialog({
        component: SaveDialog,
        componentProps: {
          name: artifact.name,
        },
      }).onOk((save: boolean) => {
        const changes = save
          ? saveArtifactChanges(artifact)
          : restoreArtifactChanges(artifact)
        artifactsStore.update({
          ...artifact,
          ...changes,
        })
        userDataStore.data.openedArtifacts =
          userDataStore.data.openedArtifacts.filter((id) => id !== artifact.id)
      })
    } else {
      userDataStore.data.openedArtifacts =
        userDataStore.data.openedArtifacts.filter((id) => id !== artifact.id)
    }
  }

  return { closeArtifact }
}
