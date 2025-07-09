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
          <span class="mr-1">🟣</span><span>CYBER</span>
        </div>

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
        <q-btn
          flat
          dense
          round
          icon="sym_o_home"
          @click="openLastWorkspace"
        />
      </div>
      <q-separator
        spaced
        mb-0
      />
      <workspace-left-sidebar />
    </q-drawer>
    <router-view />
  </q-layout>
</template>

<script setup>
import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

import { DRAWER_WIDTH } from "@/shared/components/consts"
import { useUiStateStore } from "@/shared/store"

import { useOpenLastWorkspace } from "@/features/workspaces/composables/useOpenLastWorkspace"

import WorkspaceLeftSidebar from "@/layouts/components/WorkspaceLeftSidebar.vue"
import version from "@/version.json"

defineOptions({
  name: "MainLayout",
})

const uiStore = useUiStateStore()
const route = useRoute()

const { openLastWorkspace } = useOpenLastWorkspace()
route.path === "/" && openLastWorkspace()

const { t } = useI18n()
const $q = useQuasar()

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
  top: -2px;
  position: relative;
  letter-spacing: 0.1em;
  text-transform: uppercase;

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
