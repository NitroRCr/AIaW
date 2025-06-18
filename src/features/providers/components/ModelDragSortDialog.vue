<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card min-w="320px">
      <q-card-section>
        <div class="text-h6">
          {{ $t("modelDragSortDialog.title") }}
        </div>
      </q-card-section>
      <q-card-section p-2>
        <q-list>
          <vue-draggable
            v-model="list"
            ghost-class="bg-sec-c"
            :animation="200"
          >
            <model-item
              v-for="model of list"
              :key="model"
              :model
              clickable
              rd
            />
          </vue-draggable>
        </q-list>
      </q-card-section>
      <q-card-actions>
        <q-btn
          flat
          icon="sym_o_sort_by_alpha"
          color="primary"
          :label="$t('modelDragSortDialog.sortByName')"
          @click="sortByName"
          no-caps
        />
        <q-space />
        <q-btn
          flat
          color="primary"
          :label="$t('modelDragSortDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :label="$t('modelDragSortDialog.confirm')"
          @click="onDialogOK(list)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar"
import { ref } from "vue"
import { VueDraggable } from "vue-draggable-plus"

import ModelItem from "@/features/providers/components/ModelItem.vue"

const props = defineProps<{
  models: string[]
}>()

const list = ref([...props.models])

defineEmits([...useDialogPluginComponent.emits])

function sortByName () {
  list.value.sort((a, b) => a.localeCompare(b))
}

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()
</script>
