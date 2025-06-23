<template>
  <q-page>
    <q-card>
      <q-card-section
        :class="{
          'bg-red text-white': warning,
          'bg-grey-3': !warning,
          'shadow-1': true
        }"
      >
        <div class="row items-center q-gutter-sm">
          <q-icon
            :name="warning ? 'sym_o_warning' : 'sym_o_info'"
            size="sm"
          />
          <div class="text-weight-medium">
            {{ title }}
          </div>
        </div>

        <!-- Additional content slot -->
        <div
          v-if="$slots.default"
          class="q-mt-md"
        >
          <slot />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  warning?: boolean
}>()
</script>
