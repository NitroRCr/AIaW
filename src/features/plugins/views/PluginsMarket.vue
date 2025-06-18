<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("pluginsMarket.title") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container>
    <q-page
      p-2
      :style-fn="pageFhStyle"
    >
      <a-tip
        v-if="IsTauri"
        tip-key="mcp-plugin-usage"
        mb-2
      >
        {{ $t("pluginsMarket.mcpPluginTip") }}
        <a
          href="https://docs.aiaw.app/usage/mcp.html"
          target="_blank"
          pri-link
        >
          {{ $t("pluginsMarket.mcpPluginGuide") }}
        </a>
      </a-tip>
      <a-tip
        v-if="$q.screen.xs"
        tip-key="plugins-market-right-drawer"
        mb-2
      >
        {{ $t("pluginsMarket.rightDrawerTip") }}
      </a-tip>
      <div>
        <a-input
          :label="$t('pluginsMarket.search')"
          outlined
          v-model="query"
        />
      </div>
      <q-list mt-2>
        <q-item
          v-for="item in filterList"
          :key="item.id"
        >
          <q-item-section avatar>
            <a-avatar :avatar="item.avatar" />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ item.title
              }}<plugin-type-badge
                :type="item.type"
                ml-2
                lh="1.1em"
              />
            </q-item-label>
            <q-item-label caption>
              {{ item.description }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <install-plugin-btn
              :id="item.id"
              :manifest="item.manifest"
              unelevated
              bg-pri-c
              text-on-pri-c
            />
          </q-item-section>
        </q-item>
      </q-list>
      <q-inner-loading :showing="loading" />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"

import ATip from "@/shared/components/ATip.vue"
import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { caselessIncludes, pageFhStyle } from "@/shared/utils/functions"
import { IsTauri } from "@/shared/utils/platformApi"

import InstallPluginBtn from "@/features/plugins/components/InstallPluginBtn.vue"
import PluginTypeBadge from "@/features/plugins/components/PluginTypeBadge.vue"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

defineEmits(["toggle-drawer"])

const query = ref("")
const list = reactive([])

const filterList = computed(() => {
  let res = list

  if (query.value) {
    res = res.filter(
      (item) =>
        caselessIncludes(item.title, query.value) ||
        caselessIncludes(item.description, query.value)
    )
  }

  if (!IsTauri) res = res.filter((item) => item.type !== "mcp")

  return res
})

const $q = useQuasar()
const loading = ref(false)
const { t, locale } = useI18n()

function load () {
  loading.value = true
  fetch(`/json/plugins.${locale.value}.json`)
    .then((res) => res.json())
    .then((data) => {
      list.push(...data)
    })
    .catch((err) => {
      console.error(err)
      $q.notify({
        message: t("pluginsMarket.loadError"),
        color: "err-c",
        textColor: "on-err-c",
        actions: [
          {
            label: t("pluginsMarket.retry"),
            color: "on-sur",
            handler: load,
          },
        ],
      })
    })
    .finally(() => {
      loading.value = false
    })
}
load()
</script>
