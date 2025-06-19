import { ArtifactVersion } from "@/shared/utils"
import { dtoToEntity, entityToDto } from "@/shared/utils/dto/helpers"
import { DtoToEntity, OverrideProps } from "@/shared/utils/dto/types"

import { Database } from "../supabase/database.types"

type DbArtifactInsert = Database["public"]["Tables"]["artifacts"]["Insert"]
type DbArtifactRow = Database["public"]["Tables"]["artifacts"]["Row"]
type DbArtifactUpdate = Database["public"]["Tables"]["artifacts"]["Update"]
type DbArtifact = DbArtifactRow | DbArtifactInsert | DbArtifactUpdate

type ArtifactMap = {
  versions: ArtifactVersion[]
}

type Artifact<T extends DbArtifact = DbArtifactRow> = OverrideProps<DtoToEntity<T>, ArtifactMap>

const mapDbToArtifact = <T extends DbArtifactRow>(dbArtifact: T) => dtoToEntity(dbArtifact) as Artifact

const mapArtifactToDb = <T extends DbArtifact>(artifact: Artifact<T>): T =>
   entityToDto(artifact) as T

export { mapDbToArtifact, mapArtifactToDb, type Artifact }
export type { DbArtifactInsert, DbArtifactRow, DbArtifactUpdate }
