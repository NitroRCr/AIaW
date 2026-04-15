<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card min-w="300px">
      <q-card-section>
        <div class="text-h6">
          {{ $t('migrationAlertDialog.title') }}
        </div>
      </q-card-section>
      <q-card-section py-0>
        <p>{{ $t('migrationAlertDialog.messageP1') }}</p>
        <p>{{ $t('migrationAlertDialog.messageP2') }}</p>
      </q-card-section>
      <q-card-actions>
        <q-btn
          flat
          color="primary"
          :label="$t('migrationAlertDialog.dismiss')"
          @click="onDialogOK(true)"
          no-caps
        />
        <q-space />
        <q-btn
          flat
          color="primary"
          :label="$t('migrationAlertDialog.learnMore')"
          @click="onDialogOK(false)"
          no-caps
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
</script>
