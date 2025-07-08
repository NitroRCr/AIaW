<template>
  <q-item
    clickable
    dense
    :to="props.to"
    @click="props.onClick"
    :active="props.active"
  >
    <q-item-section
      side
      v-if="direction === 'left'"
    >
      <q-icon name="sym_o_arrow_left" />
    </q-item-section>
    <q-item-section
      side
      :class="{ 'pl-4': props.padding }"
    >
      <q-icon
        :name="props.icon"
        v-if="typeof props.icon === 'string'"
      />
      <a-avatar
        v-else
        :avatar="props.icon"
        size="24px"
      />
    </q-item-section>
    <q-item-section>
      {{ props.title }}
    </q-item-section>
    <q-item-section
      side
      v-if="direction === 'right'"
    >
      <q-icon name="sym_o_arrow_right" />
    </q-item-section>
  </q-item>
  <slot />
</template>
<script setup lang="ts">
import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { Avatar } from "@/shared/types"

const props = withDefaults(defineProps<{
  onClick?:() => void
  icon: string | Avatar
  title: string
  direction?: "left" | "right" | null
  to?: string | null
  active?: boolean | null
  padding?: boolean | null
}>(), {
  active: null,
  to: null,
  direction: null,
  onClick: undefined,
  padding: false,
})

</script>
<style scoped>
.q-item {
  min-height: 40px;
  margin-bottom: 1px;
}
</style>
