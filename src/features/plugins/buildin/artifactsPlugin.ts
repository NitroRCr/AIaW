import { Array as TArray, Object, Optional, String } from "@sinclair/typebox"

import { Plugin, PluginApi, PluginData } from "@/shared/types"
import { saveArtifactChanges } from "@/shared/utils/functions"
import { engine } from "@/shared/utils/template/templateEngine"

import { useArtifactsStore } from "@/features/artifacts/store"

import { Artifact } from "@/services/data/types/artifact"

import { i18n } from "@/boot/i18n"

const pluginId = "aiaw-artifacts"

const { t } = i18n.global
const api: PluginApi = {
  type: "tool",
  name: "edit",
  description: t("artifactsPlugin.description"),
  prompt: "Modify Artifact",
  parameters: Object({
    id: String({
      description: "Artifact id",
    }),
    updates: TArray(
      Object({
        pattern: String({
          description:
            "JS regular expression string to replace the old content. You can use `[\\s\\S]*` to overwrite all content",
        }),
        flags: Optional(
          String({
            description:
              "JS regular expression flags, such as `g` to represent global matching. Default no flags",
          })
        ),
        replacement: String({
          description: "New content after replacement",
        }),
      }),
      {
        description: "List of replacement modification operations to be executed in order",
      }
    ),
    newName: Optional(
      String({
        description:
          "If you want to modify the name of the Artifact, please fill in this item. Generally, the name is not modified",
      })
    ),
  }),
  async execute ({ id, updates, newName }) {
    const artifactsStore = useArtifactsStore()

    const artifact = artifactsStore.artifacts[id]

    if (!artifact || !artifact.writable) {
      throw new Error(`Artifact ${id} not found`)
    }

    let content = artifact.versions[artifact.currIndex].text
    for (const update of updates) {
      const pattern = new RegExp(update.pattern, update.flags)
      content = content.replace(pattern, update.replacement)
    }
    artifact.tmp = content
    await artifactsStore.update({
      ...saveArtifactChanges(artifact),
      tmp: artifact.tmp,
      name: newName ?? artifact.name,
    })

    return [
      {
        type: "text",
        contentText: "修改成功",
      },
    ]
  },
}

const plugin: Plugin = {
  id: pluginId,
  type: "builtin",
  available: false,
  apis: [api],
  fileparsers: [],
  title: "Artifacts",
  settings: Object({}),
}

const promptTemplate = `Artifacts are independent content (code, articles, etc.) that users may modify or reuse.
For clear display, they will be displayed in a separate UI window.

You can modify artifacts with the \`writable\` attribute set to \`true\` by calling the tool \`edit-artifact\`.

Please answer the user first to explain the changes you want to make, and then call the tool to modify the artifacts.

The following are the existing artifacts:

{%- for artifact in artifacts %}
<artifact id="{{ artifact.id }}" name="{{ artifact.name }}" writable="{{ artifact.writable }}">
{{ artifact.versions[artifact.currIndex].text }}
</artifact>
{%- endfor %}
`

function getPrompt (artifacts: Artifact[]) {
  return engine.parseAndRenderSync(promptTemplate, {
    artifacts: artifacts.filter((a) => a.readable),
  })
}

const defaultData: PluginData = {
  settings: {},
  avatar: { type: "icon", icon: "sym_o_convert_to_text", hue: 45 },
  fileparsers: {},
}

export default {
  pluginId,
  plugin,
  defaultData,
  getPrompt,
  api,
}
