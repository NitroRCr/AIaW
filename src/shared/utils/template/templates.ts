// This file is being kept for backward compatibility during the refactoring process.
// It re-exports the utils from its new location in the feature module.
// TODO: Update all imports to reference @/features/dialogs/utils/templates directly and remove this file.

export {
  GenDialogTitle,
  DialogContent,
  PluginsPrompt,
  AssistantDefaultPrompt,
  DefaultWsIndexContent,
  ExampleWsIndexContent,
  ExtractArtifactPrompt,
  ExtractArtifactSchema,
  NameArtifactPrompt,
} from "@/features/dialogs/utils/templates"

export type { ExtractArtifactResult } from "@/features/dialogs/utils/templates"
