<template>
  <view-common-header
    v-if="showHeader"
    @toggle-drawer="$emit('toggle-drawer')"
  >
    <q-toolbar-title>
      {{ title }}
    </q-toolbar-title>
  </view-common-header>

  <q-page-container v-if="showPageContainer">
    <q-page
      p-2
      :style-fn="pageFhStyle"
    >
      <div>
        <a-input
          :label="searchLabel"
          outlined
          v-model="query"
        />
      </div>
      <q-virtual-scroll
        mt-2
        v-slot="{ item, index }"
        :items="filteredItems"
      >
        <q-item :key="index">
          <q-item-section avatar>
            <slot
              name="avatar"
              :item="item"
              :index="index"
            >
              <a-avatar :avatar="item.avatar" />
            </slot>
          </q-item-section>
          <q-item-section>
            <q-item-label>
              <slot
                name="title"
                :item="item"
                :index="index"
              >
                {{ item.name }}
              </slot>
            </q-item-label>
            <q-item-label caption>
              <slot
                name="subtitle"
                :item="item"
                :index="index"
              >
                {{ item.description }}
              </slot>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <slot
              name="actions"
              :item="item"
              :index="index"
            >
              <q-btn
                unelevated
                bg-pri-c
                text-on-pri-c
                :label="actionLabel"
                @click="$emit('action', item)"
              >
                <q-menu v-if="actionMenuItems.length > 0">
                  <q-list>
                    <q-item
                      v-for="menuItem in actionMenuItems"
                      :key="menuItem.key"
                      clickable
                      v-close-popup
                      @click="$emit('menu-action', menuItem.key, item)"
                    >
                      <q-item-section>
                        {{ menuItem.label }}
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </slot>
          </q-item-section>
        </q-item>
      </q-virtual-scroll>
      <q-inner-loading :showing="loading" />

      <!-- Empty state -->
      <div
        v-if="!loading && filteredItems.length === 0"
        class="text-center q-pa-lg"
      >
        <slot name="empty-state">
          <q-icon
            name="sym_o_folder_open"
            size="4em"
            class="text-grey-5 q-mb-md"
          />
          <div class="text-h6 text-grey-6">
            {{ emptyStateMessage }}
          </div>
        </slot>
      </div>
    </q-page>
  </q-page-container>

  <!-- Content without page container (for embedded use) -->
  <div v-else>
    <div>
      <a-input
        :label="searchLabel"
        outlined
        v-model="query"
      />
    </div>
    <q-virtual-scroll
      mt-2
      v-slot="{ item, index }"
      :items="filteredItems"
    >
      <q-item :key="index">
        <q-item-section avatar>
          <slot
            name="avatar"
            :item="item"
            :index="index"
          >
            <a-avatar :avatar="item.avatar" />
          </slot>
        </q-item-section>
        <q-item-section>
          <q-item-label>
            <slot
              name="title"
              :item="item"
              :index="index"
            >
              {{ item.name }}
            </slot>
          </q-item-label>
          <q-item-label caption>
            <slot
              name="subtitle"
              :item="item"
              :index="index"
            >
              {{ item.description }}
            </slot>
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <slot
            name="actions"
            :item="item"
            :index="index"
          >
            <q-btn
              unelevated
              bg-pri-c
              text-on-pri-c
              :label="actionLabel"
              @click="$emit('action', item)"
            >
              <q-menu v-if="actionMenuItems.length > 0">
                <q-list>
                  <q-item
                    v-for="menuItem in actionMenuItems"
                    :key="menuItem.key"
                    clickable
                    v-close-popup
                    @click="$emit('menu-action', menuItem.key, item)"
                  >
                    <q-item-section>
                      {{ menuItem.label }}
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </slot>
        </q-item-section>
      </q-item>
    </q-virtual-scroll>
    <q-inner-loading :showing="loading" />

    <!-- Empty state -->
    <div
      v-if="!loading && filteredItems.length === 0"
      class="text-center q-pa-lg"
    >
      <slot name="empty-state">
        <q-icon
          name="sym_o_folder_open"
          size="4em"
          class="text-grey-5 q-mb-md"
        />
        <div class="text-h6 text-grey-6">
          {{ emptyStateMessage }}
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import { caselessIncludes, pageFhStyle } from "@/shared/utils/functions"

import ViewCommonHeader from "@/layouts/components/ViewCommonHeader.vue"

interface ActionMenuItem {
  key: string
  label: string
}

interface Props {
  title: string
  searchLabel: string
  actionLabel: string
  emptyStateMessage: string
  items: any[]
  loading?: boolean
  actionMenuItems?: ActionMenuItem[]
  searchFields?: string[]
  showHeader?: boolean
  showPageContainer?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  actionMenuItems: () => [],
  searchFields: () => ['name', 'description'],
  showHeader: true,
  showPageContainer: true
})

defineEmits<{
  'toggle-drawer': []
  'action': [item: any]
  'menu-action': [key: string, item: any]
}>()

const query = ref("")

const filteredItems = computed(() => {
  if (!query.value.trim()) {
    return props.items
  }

  const searchQuery = query.value.toLowerCase()

  return props.items.filter(item =>
    props.searchFields.some(field =>
      item[field] && caselessIncludes(String(item[field]), searchQuery)
    )
  )
})
</script>
