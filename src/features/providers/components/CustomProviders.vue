<template>
  <q-list>
    <q-item
      v-for="provider in providersStore.providers"
      :key="provider.id"
      clickable
      :to="`/settings/providers/${provider.id}`"
      active-class="route-active"
      item-rd
    >
      <q-item-section avatar>
        <a-avatar
          size="md"
          :avatar="provider.avatar"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label>
          {{ provider.name }}
        </q-item-label>
      </q-item-section>
      <q-menu context-menu>
        <q-list style="min-width: 100px">
          <menu-item
            icon="sym_o_check_box"
            :label="$t('customProviders.setAsDefault')"
            @click="setAsDefault(provider)"
            :class="{
              'route-active': perfs.provider?.type === `custom:${provider.id}`,
            }"
          />
          <menu-item
            icon="sym_o_delete"
            :label="$t('customProviders.delete')"
            @click="deleteItem(provider)"
            hover:text-err
          />
        </q-list>
      </q-menu>
    </q-item>
    <q-item
      clickable
      @click="addItem"
      text-sec
      item-rd
    >
      <q-item-section
        avatar
        min-w-0
      >
        <q-icon name="sym_o_add" />
      </q-item-section>
      <q-item-section>
        {{ $t("customProviders.createProvider") }}
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import MenuItem from "@/shared/components/menu/MenuItem.vue"
import { useUserPerfsStore } from "@/shared/store"

import { useProvidersStore } from "@/features/providers/store"

import { CustomProviderMapped } from "@/services/supabase/types"

const { t } = useI18n()

const providersStore = useProvidersStore()

const $q = useQuasar()

const router = useRouter()

async function addItem () {
  const customProvider = await providersStore.add()
  router.push(`/settings/providers/${customProvider.id}`)
}

const { data: perfs } = useUserPerfsStore()

function setAsDefault ({ id }: CustomProviderMapped) {
  perfs.provider = { type: `custom:${id}`, settings: {} }
}

function deleteItem ({ id, name }: CustomProviderMapped) {
  $q.dialog({
    title: t("customProviders.deleteProvider"),
    message: t("customProviders.deleteConfirm", { name }),
    cancel: true,
    ok: {
      label: t("customProviders.delete"),
      color: "err",
      flat: true,
    },
  }).onOk(() => {
    providersStore.delete(id)
  })
}
</script>
