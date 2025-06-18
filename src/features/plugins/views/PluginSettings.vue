<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    back-to="."
  >
    <q-toolbar-title>
      {{ $t("pluginSettings.title") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container v-if="plugin">
    <q-page
      bg-sur
      pb-2
    >
      <q-list v-if="pluginsStore.isLoaded">
        <q-item-label header>
          {{ $t("pluginSettings.info") }}
        </q-item-label>
        <q-item>
          <q-item-section>{{ $t("pluginSettings.name") }}</q-item-section>
          <q-item-section side>
            {{ plugin.title }}
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section min-w="fit">
            {{ $t("pluginSettings.description") }}
          </q-item-section>
          <q-item-section side>
            <q-item-label caption>
              {{ plugin.description }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-if="plugin.author">
          <q-item-section>{{ $t("pluginSettings.author") }}</q-item-section>
          <q-item-section side>
            {{ plugin.author }}
          </q-item-section>
        </q-item>
        <q-item v-if="plugin.homepage">
          <q-item-section>{{ $t("pluginSettings.homepage") }}</q-item-section>
          <q-item-section side>
            <a
              pri-link
              :href="plugin.homepage"
              target="_blank"
            >
              {{ plugin.homepage }}
            </a>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          @click="pickAvatar"
        >
          <q-item-section>{{ $t("pluginSettings.icon") }}</q-item-section>
          <q-item-section
            side
            text-on-sur
          >
            <a-avatar :avatar="data[id].avatar" />
          </q-item-section>
        </q-item>
        <template v-if="plugin.fileparsers.length">
          <q-separator spaced />
          <q-item>
            <q-item-section text-sec>
              {{ $t("pluginSettings.fileParsing") }}
            </q-item-section>
            <q-item-section side>
              <div>
                {{ $t("pluginSettings.enable") }}
              </div>
            </q-item-section>
          </q-item>
          <q-item
            v-for="fp of plugin.fileparsers"
            :key="fp.name"
          >
            <q-item-section avatar>
              <q-item-label>{{ fp.name }}</q-item-label>
              <q-item-label caption>
                {{ fp.description }}
              </q-item-label>
            </q-item-section>
            <q-item-section items-end>
              <list-input
                :label="$t('pluginSettings.mimeType')"
                class="xs:w-200px sm:w-250px"
                filled
                dense
                v-model="data[id].fileparsers[fp.name].mimeTypes"
                new-value-mode="add-unique"
              />
            </q-item-section>
            <q-item-section side>
              <q-checkbox v-model="data[id].fileparsers[fp.name].enabled" />
            </q-item-section>
          </q-item>
        </template>
        <q-separator spaced />
        <q-item-label header>
          {{ $t("pluginSettings.settings") }}
        </q-item-label>
        <json-input
          :schema="plugin.settings"
          v-model="data[id].settings"
          component="item"
          lazy
        />
      </q-list>
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useQuasar } from "quasar"
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import JsonInput from "@/shared/components/ui/JsonInput.vue"
import ListInput from "@/shared/components/ui/ListInput.vue"
import { useSetTitle } from "@/shared/composables/setTitle"

import { usePluginsStore } from "@/features/plugins/store"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"
import ErrorNotFound from "@/pages/ErrorNotFound.vue"

const props = defineProps<{
  id: string
}>()

defineEmits(["toggle-drawer"])

const pluginsStore = usePluginsStore()
const { data } = storeToRefs(pluginsStore)

const plugin = computed(() =>
  pluginsStore.plugins.find((p) => p.id === props.id)
)

const $q = useQuasar()

function pickAvatar () {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      model: data[props.id].avatar,
      defaultTab: "icon",
    },
  }).onOk((avatar) => {
    data[props.id].avatar = avatar
  })
}

const { t } = useI18n()
useSetTitle(
  computed(
    () => plugin.value && `${t("pluginSettings.title")} - ${plugin.value.title}`
  )
)
</script>
