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
type DbUserWorkspaceRow = Database["public"]["Tables"]["user_workspaces"]["Row"]
type DbUserWorkspaceInsert = Database["public"]["Tables"]["user_workspaces"]["Insert"]
type DbUserWorkspaceUpdate = Database["public"]["Tables"]["user_workspaces"]["Update"]

type WorkspaceMemberRole = "admin" | "member" | "guest" | "none"

type DbWorkspace = DbWorkspaceRow | DbWorkspaceInsert | DbWorkspaceUpdate
type DbUserWorkspace = DbUserWorkspaceRow | DbUserWorkspaceInsert | DbUserWorkspaceUpdate

type WorkspaceMap = {
  avatar: Avatar
  vars: Record<string, string>
}

type Workspace<T extends DbWorkspace = DbWorkspaceRow> = OverrideProps<DtoToEntity<T>, WorkspaceMap>

type WorkspaceMember = DtoToEntity<Omit<DbWorkspaceMember, 'profile'>> & {
  profile: Profile
}

type UserWorkspace = DtoToEntity<DbUserWorkspaceRow> & {
  profile: Profile
  workspace: Workspace
}

const mapDbToWorkspace = <T extends DbWorkspace>(dbWorkspace: T) => {
  const workspace = dtoToEntity(dbWorkspace) as Workspace

  return mapAvatarOrDefault(workspace, workspace.name)
}

const mapWorkspaceToDb = <T extends DbWorkspace>(workspace: Workspace<T>) =>
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

const mapDbToUserWorkspace = (dbUserWorkspace: DbUserWorkspaceRow & {
  profile?: any
  workspace?: any
}) => {
  const userWorkspace = dtoToEntity(dbUserWorkspace) as UserWorkspace

  return {
    ...userWorkspace,
    profile: mapAvatarOrDefault(userWorkspace.profile, userWorkspace.profile.name),
    workspace: mapAvatarOrDefault(userWorkspace.workspace, userWorkspace.workspace.name)
  }
}

const mapUserWorkspaceToDb = (userWorkspace: UserWorkspace) =>
  entityToDto({
    userId: userWorkspace.userId,
    workspaceId: userWorkspace.workspaceId
  }) as DbUserWorkspaceRow

export {
  mapDbToWorkspace,
  mapDbToWorkspaceMember,
  mapDbToUserWorkspace,
  mapWorkspaceMemberToDb,
  mapUserWorkspaceToDb,
  mapWorkspaceToDb
}
export type {
  WorkspaceMember,
  Workspace,
  UserWorkspace,
  WorkspaceMemberRole,
  DbWorkspaceRow,
  DbWorkspaceInsert,
  DbWorkspaceMember,
  DbWorkspaceUpdate,
  DbWorkspace,
  DbUserWorkspaceRow,
  DbUserWorkspaceInsert,
  DbUserWorkspaceUpdate,
  DbUserWorkspace
}
