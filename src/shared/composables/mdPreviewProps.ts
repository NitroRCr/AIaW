import Footnote from "markdown-it-footnote"
import LinkAttr from "markdown-it-link-attributes"
import { config, MdPreviewProps, XSSPlugin } from "md-editor-v3"
import { useQuasar } from "quasar"
import { computed } from "vue"

import { useUserPerfsStore } from "@/shared/store"

import router from "@/router"
import "md-editor-v3/lib/preview.css"

config({
  editorConfig: {
    languageUserDefined: {
      "zh-CN": {
        copyCode: {
          text: "content_copy",
          successTips: "check",
          failTips: "error",
        },
      },
    },
  },
  markdownItPlugins (plugins) {
    return [
      ...plugins,
      {
        type: "xss",
        plugin: XSSPlugin,
        options: {},
      },
      {
        type: "linkAttr",
        plugin: LinkAttr,
        options: {
          matcher (href: string) {
            // If markdown-it-anchor is used,
            // it should ignore the anchor links in the title headers
            return !href.startsWith("#")
          },
          attrs: {
            target: "_blank",
          },
        },
      },
      {
        type: "footnote",
        plugin: Footnote,
        options: {},
      },
    ]
  },
})

class RouterLink extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: "open" })
    this.shadowRoot.innerHTML = "<span><slot></slot></span>"
  }

  connectedCallback () {
    this.shadowRoot
      .querySelector("span")
      .addEventListener("click", this.onClick.bind(this))
  }

  disconnectedCallback () {
    this.shadowRoot
      .querySelector("span")
      .removeEventListener("click", this.onClick.bind(this))
  }

  onClick (event) {
    event.preventDefault()
    const path = this.getAttribute("to")
    router.push(path)
  }
}

customElements.define("router-link", RouterLink)

export function useMdPreviewProps () {
  const $q = useQuasar()
  const { data: perfs } = useUserPerfsStore()

  return computed<Partial<MdPreviewProps>>(() => ({
    theme: $q.dark.isActive ? "dark" : "light",
    previewTheme: perfs.mdPreviewTheme,
    codeTheme: perfs.mdCodeTheme,
    autoFoldThreshold: perfs.mdAutoFoldThreshold ?? Infinity,
    noMermaid: perfs.mdNoMermaid,
    mdHeadingId: (text, level, index) => `${text}-${level}-${index}`,
  }))
}
