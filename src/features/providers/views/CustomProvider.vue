<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    back-to="."
  >
    <q-toolbar-title>
      {{ $t("customProvider.title") }}
    </q-toolbar-title>
  </view-common-header>
  <q-page-container v-if="provider">
    <q-page
      :style-fn="pageFhStyle"
      class="relative-position"
    >
      <q-list
        py-2
        max-w="1000px"
        mx-a
      >
        <q-item>
          <q-item-section>{{ $t("customProvider.name") }}</q-item-section>
          <q-item-section side>
            <a-input
              class="w-150px"
              filled
              dense
              v-model="provider.name"
            />
          </q-item-section>
        </q-item>
        <q-item
          clickable
          @click="pickAvatar"
        >
          <q-item-section>{{ $t("customProvider.icon") }}</q-item-section>
          <q-item-section
            side
            text-on-sur
          >
            <a-avatar :avatar="provider.avatar" />
          </q-item-section>
        </q-item>
        <provider-input-items
          v-model="provider.fallback_provider"
          :label="$t('customProvider.fallbackProvider')"
          :caption="$t('customProvider.fallbackProviderCaption')"
        />
        <q-separator spaced />
        <q-item-label header>
          {{ $t("customProvider.subproviders") }}
        </q-item-label>
        <template
          v-for="(subprovider, index) in provider.subproviders"
          :key="subprovider.id"
        >
          <subprovider-input v-model="provider.subproviders[index]" />
          <q-item>
            <q-item-section>
              <q-btn
                :label="$t('customProvider.removeSubprovider')"
                icon="sym_o_close"
                flat
                text-on-sur-var
                hover:text-err
                @click="removeSubprovider(subprovider)"
              />
            </q-item-section>
          </q-item>
          <q-separator
            spaced
            inset
          />
        </template>
        <q-item>
          <q-item-section>
            <q-btn
              :label="$t('customProvider.addSubprovider')"
              icon="sym_o_add"
              flat
              w-full
              text-sec
              @click="addSubprovider"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <!-- Sticky Save Button -->
      <q-btn
        fab
        icon="sym_o_save"
        color="primary"
        class="sticky-save-btn"
        @click="saveProvider"
        :loading="store.isSaving"
        :disable="!store.hasChanges"
      />
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import PickAvatarDialog from "@/shared/components/avatar/PickAvatarDialog.vue"
import ProviderInputItems from "@/features/providers/components/ProviderInputItems.vue"
import SubproviderInput from "@/features/providers/components/SubproviderInput.vue"
import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"
import { useSetTitle } from "@/shared/composables/setTitle"
import ErrorNotFound from "@/pages/ErrorNotFound.vue"
import {
  SubproviderMapped,
} from "@/services/supabase/types"
import { useProvidersStore } from "@/features/providers/store"
import { pageFhStyle } from "@/shared/utils/functions"
import { computed, toRaw } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  id: string
}>()

defineEmits(["toggle-drawer"])

const store = useProvidersStore()
const $q = useQuasar()

const providerId = computed(() => props.id)
const provider = computed(() => store.providers.find(p => p.id === providerId.value))

async function saveProvider() {
  if (!provider.value) return

  try {
    await store.put(toRaw(provider.value))
    $q.notify({
      type: 'positive',
      message: 'Provider saved'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error saving provider'
    })
  }
}

function addSubprovider () {
  if (!provider.value) return
  provider.value.subproviders.push({
    custom_provider_id: provider.value.id,
    provider: null,
    model_map: {},
  })
}

function removeSubprovider (subprovider: SubproviderMapped) {
  if (!provider.value) return
  const index = provider.value.subproviders.findIndex(s => s.id === subprovider.id)
  if (index > -1) {
    provider.value.subproviders.splice(index, 1)
  }
}

function pickAvatar () {
  if (!provider.value) return
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      model: provider.value.avatar,
      defaultTab: "icon",
    },
  }).onOk((avatar) => {
    // Create a new object to trigger reactivity
    const updatedProvider = { ...provider.value!, avatar }
    Object.assign(provider.value!, updatedProvider)
  })
}

const { t } = useI18n()
useSetTitle(
  computed(
    () =>
      provider.value && `${t("customProvider.title")} - ${provider.value.name}`
  )
)
</script>
