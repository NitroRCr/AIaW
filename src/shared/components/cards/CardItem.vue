<template>
  <q-card
    class="card-component"
    flat
    bordered
  >
    <div
      v-if="props.badge"
      class="card-component__badge"
      :style="props.badgeColor ? { background: badgeBgComputed } : {}"
    >
      <span class="card-component__badge-text">{{ props.badge }}</span>
      <q-btn
        v-if="showMoreBtn"
        class="card-component__badge-more-btn"
        icon="sym_o_more_vert"
        dense
        round
        size="sm"
        color="info"
        @click.stop
      >
        <slot name="menu" />
      </q-btn>
    </div>
    <q-card-section class="card-component__header">
      <div class="card-component__avatar">
        <AAvatar
          :avatar="props.avatar"
        />
      </div>

      <div
        class="card-component__info"
        mr-2
      >
        <div class="card-component__name">
          {{ props.name }}
        </div>

        <div
          v-if="props.subtitle"
          class="card-component__subtitle"
        >
          {{ props.subtitle }}
        </div>
        <div
          v-if="props.description"
          class="card-component__description"
        >
          {{ props.description }}
        </div>
      </div>
    </q-card-section>

    <q-card-section
      v-if="$slots.default"
      class="card-component__content"
    >
      <slot />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { Avatar } from '@/shared/types'

const props = defineProps<{
  name: string
  description?: string
  avatar: Avatar
  showMoreBtn?: boolean
  badge?: string
  badgeColor?: string
  subtitle?: string
}>()

const badgeBgComputed = computed(() => {
  if (!props.badgeColor) return ''

  return props.badgeColor.startsWith('--')
    ? `var(${props.badgeColor})`
    : props.badgeColor
})
</script>

<style lang="scss" scoped>
.card-component {
  min-height: 160px;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }

  &__header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    position: relative;
  }

  &__avatar {
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
    color: var(--q-primary);
    word-break: break-word;
  }

  &__description, &__subtitle {
    font-size: 14px;
    margin-top: 4px;

    color: var(--q-secondary);
    line-height: 1.4;
    word-break: break-word;
  }

  &__subtitle {
    margin-top: auto;
    font-size: 10px;
  }

  &__content {
    padding: 0 16px 16px;
    flex: 1;
  }

  &__badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    text-align: left;
    z-index: 3;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    letter-spacing: 0.5px;
    background: var(--q-primary);
    color: #fff;
    position: relative;
    min-height: 32px;

  }

  &__badge-text {
    font-size: 13px;
    font-weight: 600;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badge-more-btn {
    z-index: 4;
  }
}

</style>
