<template>
  <q-layout view="Lhh Lpr lff">
    <q-drawer
      v-model="uiStore.mainDrawerOpen"
      show-if-above
      :width="DRAWER_WIDTH"
      :breakpoint="1200"
      bg-sur-c
      flex
      flex-col
    >
      <div
        text-xl
        pt-1
        px-4
        class="logo-container pt-2"
      >
        <div
          class="text-xl logo"
          @click="notifyVersion"
        >
          <span class="mr-1">🟢</span><span>CYBER</span>
        </div>
        <add-dialog-item
          v-if="workspace"
          main-layout
          :workspace-id="workspace.id"
        />
        <!-- <svg
          fill-on-sur-var
          h="24px"
          viewBox="0 0 636 86"
          cursor-pointer
          @click="notifyVersion"
        >
          <use
            xlink:href="/banner.svg#default"
          />
        </svg> -->
      </div>
      <q-separator spaced />
      <q-item
        px-3
        py-2
        text-sec
      >
        <q-item-section>
          {{ t("mainLayout.workspace", 1) }}
        </q-item-section>
        <q-item-section side>
          <q-btn
            v-if="canViewCyberlinks"
            flat
            dense
            icon="sym_o_history"
            :to="'/cyberlinks'"
            :class="{
              'route-active': route.path === '/cyberlinks',
            }"
            :title="$t('View cyberlinks')"
          />
        </q-item-section>
        <q-item-section side>
          <q-btn
            v-if="workspace"
            flat
            dense
            icon="sym_o_home"
            :to="`/workspaces/${workspace.id}`"
            :class="{
              'route-active': route.path === `/workspaces/${workspace.id}`,
            }"
            :title="$t('workspacePage.workspaceHome')"
          />
        </q-item-section>
      </q-item>
      <workspace-selector />
      <assistant-selector />
      <!-- before -->
      <!-- <workspace-nav mt-2 /> -->
      <!-- end before -->
      <div class="drawer-tabs-item">
        <tabs-item />
      </div>
      <q-separator spaced />
      <q-item
        pt-3
        px-4
        text-sec
        pb-0
      >
        <q-item-section>
          {{ t("mainLayout.lastDialogs") }}
        </q-item-section>
      </q-item>
      <q-item>
        <last-dialogs />
      </q-item>
      <q-item
        pt-3
        px-4
        pb-0
        text-sec
      >
        <q-item-section>
          {{ t("mainLayout.pinnedChats") }}
        </q-item-section>
      </q-item>
      <q-item>
        <pinned-chats />
      </q-item>
    </q-drawer>
    <router-view />
  </q-layout>
</template>

<script setup>
import { useQuasar } from "quasar"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

import { DRAWER_WIDTH } from "@/shared/components/consts"
import AssistantSelector from "@/shared/components/layout/AssistantSelector.vue"
import LastDialogs from "@/shared/components/layout/LastDialogs.vue"
import PinnedChats from "@/shared/components/layout/PinnedChats.vue"
import TabsItem from "@/shared/components/layout/TabsItem.vue"
import { useUiStateStore } from "@/shared/store"

import AddDialogItem from "@/features/dialogs/components/AddDialogItem.vue"
import { usePluginsStore } from "@/features/plugins/store"
import WorkspaceSelector from "@/features/workspaces/components/WorkspaceSelector.vue"
import { useActiveWorkspace } from "@/features/workspaces/composables/useActiveWorkspace"
import { useOpenLastWorkspace } from "@/features/workspaces/composables/useOpenLastWorkspace"

import version from "@/version.json"

defineOptions({
  name: "MainLayout",
})

const uiStore = useUiStateStore()
const route = useRoute()
const { workspace } = useActiveWorkspace()

const { openLastWorkspace } = useOpenLastWorkspace()
route.path === "/" && openLastWorkspace()

const { t } = useI18n()
const $q = useQuasar()

const pluginsStore = usePluginsStore()
const { assistant } = useActiveWorkspace()

const canViewCyberlinks = computed(() => {
  if (!assistant.value?.plugins) return false

  const activePlugins = pluginsStore.plugins.filter(
    (p) => p.available && assistant.value.plugins[p.id]?.enabled
  )

  return activePlugins.some((plugin) =>
    plugin.apis.some((api) => api.name === "query_cyberlinks")
  )
})

function notifyVersion () {
  $q.notify({
    message: `${t("mainLayout.currentVersion")}: ${version.version}`,
    color: "inv-sur",
    textColor: "inv-on-sur",
    actions: [
      {
        label: t("mainLayout.changeLog"),
        handler: () => {
          window.open("https://github.com/NitroRCr/AIaW/releases", "_blank")
        },
        textColor: "inv-pri",
      },
    ],
  })
}
</script>

<style scoped>
.logo-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 41px;
  cursor: pointer;
}
.logo {
  font-family: "Material Symbols Outlined";
  font-weight: 800;
  text-shadow: 0 0 1px #000;
  letter-spacing: 0.1em;
  color: #263238;
  top: -2px;
  position: relative;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: linear-gradient(90deg, #263238, #000);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}
.drawer-tabs-item {
  flex: 0 0 30%;
  max-height: 30%;
  min-height: 0;
  /* Ensures it doesn't overflow and works with flex column */
  display: flex;
  flex-direction: column;
}
</style>
