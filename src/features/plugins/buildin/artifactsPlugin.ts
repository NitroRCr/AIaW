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
  prompt: "修改 Artifact",
  parameters: Object({
    id: String({
      description: "要修改的 Artifact 的 id",
    }),
    updates: TArray(
      Object({
        pattern: String({
          description:
            "要替换的旧内容的 JS 正则表达式字符串。你可以使用 `[\\s\\S]*` 来覆写全部内容",
        }),
        flags: Optional(
          String({
            description:
              "JS 正则表达式的 flags，如 `g` 表示全局匹配。默认无 flags",
          })
        ),
        replacement: String({
          description: "替换后的新内容",
        }),
      }),
      {
        description: "按顺序执行的替换修改操作列表",
      }
    ),
    newName: Optional(
      String({
        description:
          "如果要修改 Artifact 的名称，请填写此项。一般情况下不修改名称",
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

const promptTemplate = `Artifacts 是用户可能修改或复用的独立内容（代码、文章等），为了清晰地展示，将显示在单独的 UI 窗口中。

你可以通过调用工具 \`edit-artifact\` 修改 \`writable\` 属性为 \`true\` 的 Artifacts。请先回答用户，说明你要做的修改，再调用工具修改 Artifacts。

下面是已有的 Artifacts：

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
