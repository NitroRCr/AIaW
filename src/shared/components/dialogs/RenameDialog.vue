<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    no-route-dismiss
  >
    <q-card min-w="320px">
      <q-card-section>
        <div class="text-h6">
          {{ title }}
        </div>
      </q-card-section>
      <q-card-section pt-0>
        <q-input
          v-model="name"
          :label="$t('renameDialog.name')"
          :rules="[val => !!val || $t('renameDialog.nameRequired')]"
        />
      </q-card-section>
      <q-card-actions>
        <q-btn
          flat
          icon="sym_o_close"
          color="primary"
          :label="$t('saveDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-space />
        <q-btn
          flat
          icon="sym_o_save"
          color="primary"
          :label="$t('saveDialog.save')"
          @click="onSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useQuasar, useDialogPluginComponent } from "quasar"
import { ref } from "vue"
import { useI18n } from "vue-i18n"

const $q = useQuasar()
const { t } = useI18n()

const props = defineProps<{
  name: string,
  title: string,
}>()

const name = ref(props.name)

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()

const onSave = () => {
  if (name.value) {
    onDialogOK(name.value)
  } else {
    $q.notify({
      message: t("renameDialog.nameRequired"),
      color: "negative",
    })
  }
}
</script>
