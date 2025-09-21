<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    back-to="."
  >
    <q-toolbar-title>
      {{ $t('pluginSettings.title') }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container v-if="plugin">
    <q-page
      bg-sur
      pb-2
    >
      <q-list v-if="pluginsStore.ready">
        <q-item-label header>
          {{ $t('pluginSettings.info') }}
        </q-item-label>
        <q-item>
          <q-item-section>{{ $t('pluginSettings.name') }}</q-item-section>
          <q-item-section side>
            {{ plugin.title }}
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section min-w="fit">
            {{ $t('pluginSettings.description') }}
          </q-item-section>
          <q-item-section side>
            <q-item-label caption>
              {{ plugin.description }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-if="plugin.author">
          <q-item-section>{{ $t('pluginSettings.author') }}</q-item-section>
          <q-item-section side>
            {{ plugin.author }}
          </q-item-section>
        </q-item>
        <q-item v-if="plugin.homepage">
          <q-item-section>{{ $t('pluginSettings.homepage') }}</q-item-section>
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
          <q-item-section>{{ $t('pluginSettings.icon') }}</q-item-section>
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
              {{ $t('pluginSettings.fileParsing') }}
            </q-item-section>
            <q-item-section side>
              <div>
                {{ $t('pluginSettings.enable') }}
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
          {{ $t('pluginSettings.settings') }}
        </q-item-label>
        <json-input
          :schema="plugin.settings"
          v-model="data[id].settings"
          component="item"
          lazy
        />
        <q-item>
          <q-item-section>{{ $t('pluginSettings.timeout') }}</q-item-section>
          <q-item-section side>
            <q-input
              filled
              dense
              type="number"
              min="1"
              style="width: 120px"
              v-model.number="timeoutSeconds"
              :suffix="$t('pluginSettings.timeoutUnit')"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePluginsStore } from 'src/stores/plugins'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import AAvatar from 'src/components/AAvatar.vue'
import { useQuasar } from 'quasar'
import PickAvatarDialog from 'src/components/PickAvatarDialog.vue'
import ErrorNotFound from 'src/pages/ErrorNotFound.vue'
import ListInput from 'src/components/ListInput.vue'
import JsonInput from 'src/components/JsonInput.vue'
import { useSetTitle } from 'src/composables/set-title'
import { MCPRequestTimeout } from 'src/utils/mcp-client'

const props = defineProps<{
  id: string
}>()

defineEmits(['toggle-drawer'])

const pluginsStore = usePluginsStore()
const { data } = pluginsStore

const timeoutSeconds = computed({
  get: () => {
    const pluginData = data[props.id]
    if (!pluginData) return Math.round(MCPRequestTimeout / 1000)
    return Math.round(((pluginData.timeout ?? MCPRequestTimeout) / 1000))
  },
  set: (val: number) => {
    const pluginData = data[props.id]
    if (!pluginData) return
    if (Number.isFinite(val) && val > 0) {
      pluginData.timeout = Math.round(val * 1000)
    } else {
      pluginData.timeout = undefined
    }
  }
})

const plugin = computed(() => pluginsStore.plugins.find(p => p.id === props.id))

const $q = useQuasar()
function pickAvatar() {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      model: data[props.id].avatar,
      defaultTab: 'icon'
    }
  }).onOk(avatar => {
    data[props.id].avatar = avatar
  })
}

import { useI18n } from 'vue-i18n'
const { t } = useI18n()
useSetTitle(computed(() => plugin.value && `${t('pluginSettings.title')} - ${plugin.value.title}`))
</script>
