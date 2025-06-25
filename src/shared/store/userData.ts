import { createKeyValueDbStore } from "./utils/createKeyValueDbStore"

interface UserData {
  lastWorkspaceId: string
  lastDialogIds: Record<string, string>
  defaultAssistantIds: Record<string, string>
  openedArtifacts: string[]
  tipDismissed: Record<string, boolean>
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
}

const defaultUserData: UserData = {
  lastWorkspaceId: null,
  tipDismissed: {},
  lastDialogIds: {},
  defaultAssistantIds: {},
  openedArtifacts: [],
  leftSidebarOpen: false,
  rightSidebarOpen: false,
}

export const useUserDataStore = () => {
  return createKeyValueDbStore<UserData>("user-data", defaultUserData)()
}
