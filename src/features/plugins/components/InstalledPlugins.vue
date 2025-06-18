<template>
  <q-list>
    <q-item
      v-for="plugin in pluginsStore.plugins.filter((p) => p.available)"
      :key="plugin.id"
      clickable
      :to="`/plugins/${plugin.id}`"
      active-class="route-active"
      item-rd
    >
      <q-item-section avatar>
        <a-avatar
          v-if="data[plugin.id]"
          size="md"
          :avatar="data[plugin.id].avatar"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label>
          {{ plugin.title
          }}<plugin-type-badge
            :type="plugin.type"
            ml-2
            lh="1.2em"
          />
        </q-item-label>
      </q-item-section>
      <q-item-section
        side
        important:pl-1
      >
        <q-btn
          flat
          dense
          round
          icon="sym_o_delete"
          :title="t('installedPlugins.uninstall')"
          v-if="plugin.type !== 'builtin'"
          @click.prevent.stop="deleteItem(plugin)"
        />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"

import { usePluginsStore } from "@/features/plugins/store"

import PluginTypeBadge from "./PluginTypeBadge.vue"

const { t } = useI18n()

const pluginsStore = usePluginsStore()
const { data } = pluginsStore

const $q = useQuasar()

function deleteItem (plugin) {
  $q.dialog({
    title: t("installedPlugins.uninstallPlugin"),
    message: t("installedPlugins.uninstallConfirm", { title: plugin.title }),
    cancel: true,
    ok: {
      label: t("installedPlugins.uninstall"),
      color: "err",
      flat: true,
    },
  }).onOk(() => {
    pluginsStore.uninstall(plugin.id)
  })
}
</script>
