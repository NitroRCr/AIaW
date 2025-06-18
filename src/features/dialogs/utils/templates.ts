/* eslint-disable no-useless-escape */
import { Boolean, Object, Optional, Static, String } from "@sinclair/typebox"

import { i18n } from "@/boot/i18n"

const GenDialogTitle = `
<instructions>
  Your task is to analyze the provided chat history between a user and an assistant and generate a concise, relevant title summarizing the conversation.
  Follow these rules strictly:

  1.  **Language:** The title's language must match the predominant language used in the chat history.
  2.  **Length:**
      - If the language is English, the title text should be approximately 3-5 words long.
      - If the language is not English (e.g., Chinese), aim for an equivalent length (e.g., approximately 6-10 characters).
  3.  **Format:** The title must start with a single relevant emoji, followed by a single space, and then the title text.
      - Format: \`[emoji] [Title Text]\`
  4.  **Content:** The title should accurately capture the main topic, question, or goal of the conversation.
  5.  **Output:** Generate *only* the title in the specified format. Do not include any explanations or surrounding text.

</instructions>

<input>
  <description>Chat history between user and assistant:</description>
  <chat_history>
    {%- for content in contents %}
    {%- if content.type == 'user-message' %}
    <user_message>
      {{ content.text }}
    </user_message>
    {%- elsif content.type == 'assistant-message' %}
    <assistant_message>
      {{ content.text }}
    </assistant_message>
    {%- endif %}
    {%- endfor %}
  </chat_history>
</input>

<output_specifications>
  <format_description>A single line containing one emoji, one space, and the title text.</format_description>
  <language_rule>Must match the language of the chat_history.</language_rule>
  <length_rule_english>3-5 words</length_rule_english>
  <length_rule_other>Equivalent length (e.g., 6-10 Chinese characters)</length_rule_other>
</output_specifications>

<examples>
  <example name="English Example 1">📉 Stock Market Trends</example>
  <example name="English Example 2">🔧 Tauri Command Usage</example>
  <example name="Chinese Example 1">📜 OpenAPI 的作用</example>
  <example name="Chinese Example 2">📡 WebRTC 连接建立过程</example>
</examples>

<final_instruction>
  Based *only* on the chat history provided in the \`<input>\` section, generate the title according to all the rules and examples specified above. Output *only* the formatted title.
</final_instruction>
`

const DialogContent = `# {{ title }}
{%- for content in contents %}
{%- if content.type == 'user-message' %}

**User:**
{{ content.text }}
{%- elsif content.type == 'assistant-message' %}

**Assistant:**
{{ content.text }}
{%- endif %}
{%- endfor %}`

const PluginsPrompt = `<plugins>
{%- for plugin in plugins %}
<plugin id="{{ plugin.id }}">
{%- if plugin.prompt %}
<plugin_prompt>
{{ plugin.prompt }}
</plugin_prompt>
{%- endif %}
</plugin>
{%- endfor %}
</plugins>
`

const AssistantDefaultPrompt = `{%- if _rolePrompt %}
<role_prompt>
{{ _rolePrompt }}
</role_prompt>
{%- endif %}

{{ _pluginsPrompt }}
`

const { t } = i18n.global

const DefaultWsIndexContent = t("templates.defaultWsIndexContent")

const ExtractArtifactSchema = Object({
  thinking: String({
    description:
      "During the process of determining whether there are artifacts in the conversation record between the user and the AI assistant, your thinking process.",
  }),
  found: Boolean({
    description:
      "Whether there are artifacts in the conversation record between the user and the AI assistant",
  }),
  regex: Optional(
    String({
      description:
        'A JS regular expression string for extracting artifacts, which must exactly match the entire artifact. Artifacts are long, and `[\\s\\S]*` can be used to match any content in the middle. If the artifact is a code block, please **do not** include the opening "\`\`\`" marker.',
    })
  ),
  name: Optional(
    String({
      description:
        "Name the artifact according to its content. Like a file name with a suffix. The naming format must conform to the file naming conventions of the corresponding language code.",
    })
  ),
  language: Optional(
    String({
      description:
        'The code language of the content, used for code highlighting. Example values: "markdown", "javascript", "python", etc.',
    })
  ),
})
type ExtractArtifactResult = Static<typeof ExtractArtifactSchema>
const ExtractArtifactPrompt = `
<instruction>
Your task is to determine whether there are artifacts in the conversation record between the user and the AI assistant, and if so, extract them.

Artifacts can be a long complete code, a complete article, or a report. Users may reuse and modify these contents, and the content is long (>15 lines), so they are extracted.

Other content (general question answers, operation steps, etc.) will not be extracted, and it is considered that no artifacts are found.

If there is no independent content suitable for extraction as an artifact, return \`found\` as false;
If there is, please determine the scope of the artifact in the assistant message, give the regular expression for extracting the artifact, and the language and name of the artifact.

If the artifact is a code block, it must be a complete code block, not a part of a code block or multiple short code blocks. In the case of inappropriate situations, it is considered that the artifact is not found.

The reply is in json format, only the json content is answered, and it is not wrapped in "\`\`\`".
</instruction>
<response_schema>
${JSON.stringify(ExtractArtifactSchema, null, 2)}
</response_schema>
<chat_history>
{%- for content in contents %}
{%- if content.type == 'user-message' %}
<user_message>
{{ content.text }}
</user_message>
{%- elsif content.type == 'assistant-message' %}
<assistant_message>
{{ content.text }}
</assistant_message>
{%- endif %}
{%- endfor %}
</chat_history>
`
const NameArtifactPrompt = `<instruction>
Please name the file according to its content. Requirements:
- The file name must have a suffix
- The file name must conform to the file naming conventions of the corresponding language code, such as "hello_world.py" (underscore format), "hello-world.js" (hyphen format), "HelloWorld.java" (camel case format), etc.
- The length must not exceed 3 words
- Only answer the file name, do not answer anything else.
</instruction>
<file_content {%- if lang %} lang="{{ lang }}"{%- endif %}>
{{ content }}
</file_content>
`

const ExampleWsIndexContent = DefaultWsIndexContent

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
}

export type { ExtractArtifactResult }
