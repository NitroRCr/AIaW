<template>
  <q-expansion-item
    v-if="item.type === 'folder'"
    :label="item.name"
    :content-inset-level="0.5"
    item-rd
    :header-class="[{ 'route-active': item.id === selected }, 'py-1.5 min-h-0']"
    @update:model-value="accept === 'folder' && (selected = item.id)"
    v-model="expanded"
    switch-toggle-side
  >
    <template #header>
      <q-item-section
        avatar
        min-w-0
      >
        <a-avatar
          size="32px"
          :avatar="item.avatar"
        />
      </q-item-section>
      <q-item-section>
        {{ item.name }}
      </q-item-section>
      <menu-button :menu-ref="toRef(menuFolderRef)" />
      <q-menu
        ref="menuFolderRef"
        context-menu
      >
        <q-list style="min-width: 100px">
          <menu-item
            icon="sym_o_add"
            :label="$t('workspaceListItem.newWorkspace')"
            @click="addWorkspace(item.id)"
          />
          <menu-item
            icon="sym_o_create_new_folder"
            :label="$t('workspaceListItem.newFolder')"
            @click="addFolder(item.id)"
          />
          <menu-item
            icon="sym_o_move_item"
            :label="$t('workspaceListItem.moveTo')"
            @click="moveItem(item, [item.id])"
          />
          <menu-item
            icon="sym_o_delete"
            :label="$t('workspaceListItem.delete')"
            @click="deleteItem(item)"
            hover:text-err
          />
          <menu-item
            icon="sym_o_settings"
            :label="$t('workspaceListItem.settings')"
            :to="`/workspaces/${item.id}/settings`"
            hover:text-err
          />
        </q-list>
      </q-menu>
    </template>
    <template #default>
      <workspace-list-item
        v-for="child in workspaces"
        :key="child.id"
        :item="child"
        :accept
        v-model:selected="selected"
        mx-0
      />
    </template>
  </q-expansion-item>

  <q-item
    v-else-if="accept === 'workspace'"
    clickable
    @click="selected = item.id"
    :class="{ 'route-active': item.id === selected }"
    item-rd
    py-1.5
    min-h-0
  >
    <q-item-section
      avatar
      min-w-0
    >
      <a-avatar
        size="32px"
        :avatar="item.avatar"
      />
    </q-item-section>
    <q-item-section>{{ item.name }}</q-item-section>
    <menu-button :menu-ref="toRef(menuWorkspaceRef)" />
    <q-menu
      ref="menuWorkspaceRef"
      context-menu
    >
      <q-list style="min-width: 100px">
        <menu-item
          icon="sym_o_move_item"
          :label="$t('workspaceListItem.moveTo')"
          @click="moveItem(item)"
        />
        <menu-item
          icon="sym_o_delete"
          :label="$t('workspaceListItem.delete')"
          @click="deleteItem(item)"
          hover:text-err
        />
        <menu-item
          icon="sym_o_settings"
          :label="$t('workspaceListItem.settings')"
          :to="`/workspaces/${item.id}/settings`"
          hover:text-err
        />
      </q-list>
    </q-menu>
  </q-item>
</template>

<script setup lang="ts">
import { QMenu } from "quasar"
import { ref, watch, toRef } from "vue"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import MenuButton from "@/shared/components/menu/MenuButton.vue"
import MenuItem from "@/shared/components/menu/MenuItem.vue"

import { useRootWorkspace } from "@/features/workspaces/composables"
import { useWorkspaceActions } from "@/features/workspaces/composables/workspaceActions"

import type { WorkspaceMapped } from "@/services/supabase/types"

const props = defineProps<{
  item: WorkspaceMapped
  accept: "workspace" | "folder"
}>()

const { addWorkspace, addFolder, moveItem, deleteItem } = useWorkspaceActions()
const workspaces = useRootWorkspace(props.item.id)

const selected = defineModel<string>("selected")
const expanded = ref(false)

const menuFolderRef = ref<QMenu | null>(null)
const menuWorkspaceRef = ref<QMenu | null>(null)

watch(
  selected,
  () => {
    if (workspaces.value.some((c) => c.id === selected.value)) {
      expanded.value = true
    }
  },
  { immediate: true }
)
</script>
