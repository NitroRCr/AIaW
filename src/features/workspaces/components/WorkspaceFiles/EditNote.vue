<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    no-route-dismiss
  >
    <q-card min-w="320px">
      <q-card-section>
        <div class="text-h6">
          {{ $t("workspacesPage.createTextNote") }}
        </div>
      </q-card-section>
      <q-card-section pt-0>
        <a-input
          v-model="name"
          :placeholder="$t('workspacesPage.noteName')"
          :rules="[required]"
        />
      </q-card-section>
      <q-card-section pt-0>
        <MdEditor v-model="text" />
      </q-card-section>
      <q-card-actions>
        <q-btn
          flat
          color="primary"
          :label="$t('saveDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-space />
        <q-btn
          flat
          :label="$t('saveDialog.dontSave')"
          text="pri hover:err"
          @click="onDialogOK({ save: false })"
        />
        <q-btn
          flat
          color="primary"
          :label="$t('saveDialog.save')"
          @click="saveNote"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import { useDialogPluginComponent, useQuasar } from "quasar"
import { ref } from 'vue'
import 'md-editor-v3/lib/style.css'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  workspaceId: string,
  name: string,
  text: string
}>()

defineEmits([...useDialogPluginComponent.emits])

const $q = useQuasar()
const { t } = useI18n()
const required = (val: string) => !!val.trim() || t("workspacesPage.noteNameRequired")
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()

const saveNote = () => {
  if (!name.value.trim()) {
    $q.notify({
      message: t("workspacesPage.noteNameRequired"),
      color: "negative",
    })

    return
  }

  onDialogOK({ save: true, name: name.value, text: text.value })
}

const name = ref(props.name)
const text = ref(props.text)
</script>
