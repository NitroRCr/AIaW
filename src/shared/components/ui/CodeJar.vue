<template>
  <div
    ref="el"
    class="code-jar hljs"
  />
</template>
<script setup lang="ts">
import { CodeJar } from "codejar"
// eslint-disable-next-line import/order
import { withLineNumbers } from "codejar-linenumbers"

import "codejar-linenumbers/js/codejar-linenumbers.css"

import { computed, onMounted, ref, watchEffect } from "vue"

const props = defineProps<{
  language?: string
}>()

const model = defineModel<string>()

const el = ref(null)

const tab = computed(() => (/\n {2}\w/g.test(model.value) ? "  " : "    "))

function highlight (editor: HTMLElement) {
  if (!window.hljs) {
    setTimeout(() => {
      highlight(editor)
    }, 100)

    return
  }

  const code = editor.textContent
  const html =
    props.language && window.hljs.getLanguage(props.language)
      ? window.hljs.highlight(code, {
        language: props.language,
        ignoreIllegals: true,
      }).value
      : window.hljs.highlightAuto(code).value
  editor.innerHTML = html
}

onMounted(() => {
  const jar = CodeJar(el.value, withLineNumbers(highlight))
  jar.onUpdate((code) => {
    model.value = code
  })
  watchEffect(() => {
    if (model.value !== el.value?.textContent) jar.updateCode(model.value)
  })
  watchEffect(() => {
    jar.updateOptions({
      tab: tab.value,
    })
  })
})
</script>

<style lang="scss">
.codejar-wrap {
  height: 100%;
  border-radius: 0 6px 6px 6px;
  overflow: hidden;
}
.code-jar {
  font-family:
    source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
  color: var(--md-theme-code-block-color);
  background-color: var(--md-theme-code-block-bg-color);
  height: 100%;
}

.codejar-linenumbers {
  background-color: var(--md-theme-code-block-bg-color) !important;
  text-align: right;
  padding-right: 8px;

  .codejar-linenumber {
    color: #999 !important;
  }
}
.codejar-wrap {
  --md-theme-code-block-color: #747384;
  --md-theme-code-block-bg-color: #f8f8f8;
}
.body--dark .codejar-wrap {
  --md-theme-code-block-color: #999;
  --md-theme-code-block-bg-color: #1a1a1a;
}
</style>
