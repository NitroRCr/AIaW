<template>
  <router-view @toggle-drawer="drawerOpen = !drawerOpen" />
  <q-page-container>
    <q-page
      :style-fn="pageFhStyle"
      class="q-pa-md"
    >
      <q-card
        flat
        bordered
      >
        <q-card-section>
          <h3 class="text-h6 q-ma-none">
            Cyberlinks
          </h3>
        </q-card-section>
        <q-separator />
        <q-list separator>
          <q-item
            v-for="link in cyberlinks"
            :key="link.id"
            clickable
            v-ripple
            class="q-py-md"
          >
            <q-item-section
              avatar
              top
            >
              <q-icon
                name="sym_o_link"
                color="primary"
                size="32px"
              />
            </q-item-section>

            <q-item-section>
              <q-item-label
                class="text-body1"
                style="word-break: break-word"
              >
                {{ link.value }}
              </q-item-label>
              <q-item-label
                caption
                class="q-mt-sm row items-center"
              >
                <q-chip
                  :label="link.type"
                  color="secondary"
                  text-color="white"
                  size="sm"
                  class="q-mr-sm"
                />
                <span>{{ link.fid }}</span>
              </q-item-label>
            </q-item-section>

            <q-item-section
              side
              top
            >
              <q-item-label caption>
                {{
                  new Date(link.created_at).toLocaleString()
                }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-inner-loading :showing="loading" />
      </q-card>
      <div
        v-if="error"
        class="text-negative q-mt-md"
      >
        {{ error }}
      </div>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, provide, ref, onMounted, watch } from "vue"

import { useCallApi } from "@/shared/composables/callApi"
import { IsTauri } from "@/shared/utils/platformApi"

import { useAuthStore } from "@/features/auth/store/auth"
import { usePluginsStore } from "@/features/plugins/store"
import { useActiveWorkspace } from "@/features/workspaces/composables/useActiveWorkspace"

import { getLocalStorageWalletState } from "@/services/blockchain/kepler/KeplerWallet"

const pageFhStyle = (offset: number, height: number) => ({
  height: `${height - offset}px`,
  overflowY: "auto",
})

const cyberlinks = ref<
  {
    id: number
    fid: string
    type: string
    from: string
    to:string
    value: string
    owner: string
    created_at: string
  }[]
>([])
const loading = ref(false)
const error = ref<string | null>(null)

const drawerOpen = ref(false)
const drawerBreakpoint = 960
const $q = useQuasar()
const rightDrawerAbove = computed(() => $q.screen.width > drawerBreakpoint)
provide("rightDrawerAbove", rightDrawerAbove)

const pluginsStore = usePluginsStore()
const { workspaceId } = useActiveWorkspace()
const { callApi } = useCallApi(workspaceId, ref(null))
const authStore = useAuthStore()

onMounted(async () => {
  loading.value = true
  error.value = null

  if (!pluginsStore.isLoaded) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => pluginsStore.isLoaded,
        (loaded) => {
          if (loaded) {
            stop()
            resolve()
          }
        }
      )
    })
  }

  let owner: string | undefined

  if (authStore.granterSigner) {
    const accounts = await authStore.granterSigner.getAccounts()
    owner = accounts[0]?.address
  } else if (!IsTauri) {
    const walletState = getLocalStorageWalletState()
    owner = walletState.address
  }

  if (!owner) {
    error.value = "User not logged in. Please connect your wallet."
    loading.value = false

    return
  }

  const pluginWithTool = pluginsStore.plugins.find((p) =>
    p.apis.some((a) => a.name === "query_cyberlinks")
  )

  if (pluginWithTool) {
    const api = pluginWithTool.apis.find((a) => a.name === "query_cyberlinks")

    if (api) {
      const { result, error: apiError } = await callApi(
        pluginWithTool,
        api,
        { owner }
      )

      if (apiError) {
        error.value = `Error loading cyberlinks: ${apiError}`
        console.error(error.value)
      } else if (
        result &&
        result[0] &&
        result[0].type === "text" &&
        result[0].contentText
      ) {
        try {
          cyberlinks.value = JSON.parse(result[0].contentText)
        } catch (e) {
          error.value = "Failed to parse cyberlinks data."
          console.error(e)
        }
      } else {
        error.value = "Received unexpected data format for cyberlinks."
        console.error("Unexpected result format:", result)
      }
    } else {
      error.value = "query_cyberlinks API not found on the plugin."
      console.error(error.value)
    }
  } else {
    error.value =
      "No plugin with the 'query_cyberlinks' tool is available or enabled."
    console.error(error.value)
  }

  loading.value = false
})
</script>
