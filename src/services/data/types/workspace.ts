import { Avatar } from "@/shared/types"
import { mapAvatarOrDefault } from "@/shared/utils/avatar"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

import { Profile } from "./profile"

type DbWorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"]
type DbWorkspaceInsert = Database["public"]["Tables"]["workspaces"]["Insert"]
type DbWorkspaceUpdate = Database["public"]["Tables"]["workspaces"]["Update"]
type DbWorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"]

type WorkspaceMemberRole = "admin" | "member" | "readonly"
type WorkspaceRole = "owner" | "admin" | "member" | "readonly" | "none"

type WorkspaceDbType = DbWorkspaceRow | DbWorkspaceInsert | DbWorkspaceUpdate

type WorkspaceMap = {
  avatar: Avatar
  vars: Record<string, string>
}

type Workspace<T extends WorkspaceDbType = DbWorkspaceRow> = OverrideProps<DtoToEntity<T>, WorkspaceMap>

type WorkspaceMember = DtoToEntity<Omit<DbWorkspaceMember, 'profile'>> & {
  profile: Profile
}

const mapDbToWorkspace = <T extends WorkspaceDbType>(dbWorkspace: T) => {
  const workspace = dtoToEntity(dbWorkspace) as Workspace

  return mapAvatarOrDefault(workspace, workspace.name)
}

const mapWorkspaceToDb = <T extends WorkspaceDbType>(workspace: Workspace<T>) =>
  entityToDto(workspace) as T

const mapDbToWorkspaceMember = (dbWorkspaceMember: DbWorkspaceMember) => {
  const workspaceMember = dtoToEntity(dbWorkspaceMember) as WorkspaceMember

  return {
    ...workspaceMember,
    profile: mapAvatarOrDefault(workspaceMember.profile, workspaceMember.profile.name)
  }
}

const mapWorkspaceMemberToDb = (workspaceMember: WorkspaceMember) =>
  entityToDto(workspaceMember) as DbWorkspaceMember

export { mapDbToWorkspace, mapDbToWorkspaceMember, mapWorkspaceMemberToDb, mapWorkspaceToDb }
export type {
  WorkspaceMember, Workspace,
  WorkspaceMemberRole, WorkspaceRole,
  DbWorkspaceRow, DbWorkspaceInsert, DbWorkspaceMember, DbWorkspaceUpdate
}
