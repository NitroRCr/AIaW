<template>
  <view-common-header @toggle-drawer="$emit('toggle-drawer')">
    <q-toolbar-title>
      {{ $t("assistantsMarket.title") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container>
    <q-page
      p-2
      :style-fn="pageFhStyle"
    >
      <div>
        <a-input
          :label="$t('assistantsMarket.search')"
          outlined
          v-model="query"
        />
      </div>
      <q-virtual-scroll
        mt-2
        v-slot="{ item, index }"
        :items="filterList"
      >
        <q-item :key="index">
          <q-item-section avatar>
            <a-avatar :avatar="item.avatar" />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ item.name }}
            </q-item-label>
            <q-item-label caption>
              {{ item.description }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              unelevated
              bg-pri-c
              text-on-pri-c
              :label="$t('assistantsMarket.add')"
            >
              <q-menu>
                <q-list>
                  <q-item
                    clickable
                    v-close-popup
                    @click="addToGlobal(item)"
                  >
                    <q-item-section>
                      {{ $t("assistantsMarket.addToGlobal") }}
                    </q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    @click="addToWorkspace(item)"
                  >
                    <q-item-section>
                      {{ $t("assistantsMarket.addToWorkspace") }}
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-virtual-scroll>
      <q-inner-loading :showing="loading" />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { caselessIncludes, pageFhStyle } from "@/shared/utils/functions"

import SelectWorkspaceDialog from "@/features/workspaces/components/SelectWorkspaceDialog.vue"
import { useAssistantActions } from "@/features/workspaces/composables/useAssistantActions"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

const { t } = useI18n()
defineEmits(["toggle-drawer"])

const query = ref("")
const list = reactive([])

const filterList = computed(() =>
  query.value
    ? list.filter(
      (item) =>
        caselessIncludes(item.name, query.value) ||
          caselessIncludes(item.description, query.value)
    )
    : list
)

const $q = useQuasar()
const loading = ref(false)
const { locale } = useI18n()

function load () {
  loading.value = true
  fetch(`/json/assistants.${locale.value}.json`)
    .then((res) => res.json())
    .then((data) => {
      list.push(...data)
    })
    .catch((err) => {
      console.error(err)
      $q.notify({
        message: t("assistantsMarket.loadError"),
        color: "err-c",
        textColor: "on-err-c",
        actions: [
          {
            label: t("assistantsMarket.retry"),
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

const { add } = useAssistantActions()

function addToGlobal (item) {
  add(item, null)
}

function addToWorkspace (item) {
  $q.dialog({
    component: SelectWorkspaceDialog,
    componentProps: {
      accept: "workspace",
    },
  }).onOk((selected) => {
    add(item, selected)
  })
}
</script>
