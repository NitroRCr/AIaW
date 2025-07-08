<template>
  <q-item
    v-bind="$attrs"
    clickable
    dense
    :to="props.to"
    @click="props.onClick"
    :active="props.active"
    rounded
    :class="{ 'small text-primary': props.small }"
  >
    <q-item-section
      side
      :class="{ 'small text-primary': props.small }"
      v-if="direction === 'left'"
    >
      <q-icon
        name="sym_o_arrow_left"
        color="{'primary': props.small}"
      />
    </q-item-section>
    <q-item-section
      side
      :class="{ 'pl-2': props.padding }"
    >
      <q-icon
        :name="props.icon"
        :size="props.small ? '16px' : '24px'"
        v-if="typeof props.icon === 'string'"
      />
      <a-avatar
        v-else
        :avatar="props.icon"
        size="24px"
      />
      <!-- <q-tooltip v-if="props.small">
        {{ props.title }}
      </q-tooltip> -->
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
  small?: boolean | null
}>(), {
  active: null,
  to: null,
  direction: null,
  onClick: undefined,
  padding: false,
  small: false,
})

</script>
<style scoped>
.q-item {
  min-height: 40px;
  border-radius: 10px;
  margin: 0 6px 0 6px;
}
.small {
  font-size: 13px;
  min-height: 32px;
  padding: 0 28px;
}
</style>
