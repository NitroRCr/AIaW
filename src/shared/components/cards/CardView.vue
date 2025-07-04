<template>
  <div class="card-view">
    <div class="card-view__header">
      <div class="card-view__actions">
        <q-btn
          icon="sym_o_add"
          :label="addButtonCaption"
          color="primary"
          unelevated
          @click="$emit('add')"
          class="q-mr-sm"
        />
        <q-btn
          icon="sym_o_search"
          :label="findButtonCaption"
          color="secondary"
          outline
          @click="$emit('find')"
        />
      </div>
    </div>

    <div class="card-view__grid">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">

interface Props {
  addButtonCaption?: string
  findButtonCaption?: string
}

interface Emits {
  (e: 'add'): void
  (e: 'find'): void
}

withDefaults(defineProps<Props>(), {
  addButtonCaption: 'Add',
  findButtonCaption: 'Find'
})

defineEmits<Emits>()
</script>

<style lang="scss" scoped>
.card-view {
  &__header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
  }

  &__actions {
    display: flex;
    align-items: center;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
}
</style>
