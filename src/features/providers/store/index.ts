import { Object as TObject } from "@sinclair/typebox"
import { defineStore } from "pinia"
import { computed, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import { Provider, ProviderType } from "@/shared/types"
import { removeDuplicates } from "@/shared/utils/functions"
import {
  modelOptions as baseModelOptions,
  ProviderTypes,
} from "@/shared/utils/values"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/data/supabase/client"
import { CustomProvider, mapDbToCustomProvider, mapDbToSubprovider, mapSubproviderToDb, Subprovider } from "@/services/data/types/provider"

const extractCustomProviderId = (provider: Provider) => {
  if (provider.type.startsWith("custom:")) {
    return provider.type.split("custom:")[1]
  }

  return null
}

// const mapCustomProvider = (provider: any) => {
//   return {
//     ...provider,
//     avatar: (provider.avatar as Avatar) || {
//       type: "icon",
//       icon: "sym_o_dashboard_customize",
//       hue: Math.floor(Math.random() * 360),
//     },
//     fallback_provider: provider.fallback_provider as Provider,
//     subproviders: (provider.subproviders || []).map((sp) => ({
//       ...sp,
//       model_map: sp.model_map as Record<string, string>,
//       provider: sp.provider as Provider,
//     })),
//   } as CustomProvider
// }

export const useProvidersStore = defineStore("providers", () => {
  const providersMap = reactive<Record<string, CustomProvider>>({})
  const providers = computed(() => Object.values(providersMap))
  const isSaving = ref(false)
  const hasChanges = ref(false)

  watch(providersMap, () => {
    hasChanges.value = true
  }, { deep: true })

  const fetchCustomProviders = async () => {
    // Fetch all custom providers with their subproviders in one query
    const { data: providersData, error: providersError } = await supabase
      .from("custom_providers")
      .select("*, subproviders(*)")

    if (providersError) {
      console.error(providersError)

      return
    }

    const providersResult = providersData.map(mapDbToCustomProvider)

    // Map providers and their subproviders
    Object.assign(
      providersMap,
      providersResult.reduce(
        (acc, provider) => {
          acc[provider.id] = provider

          return acc
        },
        {} as Record<string, CustomProvider>
      )
    )
    hasChanges.value = false
  }

  function createProvider (provider: Provider, options, stack) {
    if (provider.type.startsWith("custom:")) {
      const p = providersMap[extractCustomProviderId(provider)]

      return p && createCustomProvider(p, options, stack)
    } else {
      return ProviderTypes.find((pt) => pt.name === provider.type)?.constructor(
        { ...provider.settings, ...options }
      )
    }
  }

  function createCustomProvider (
    provider: CustomProvider,
    options,
    stack = []
  ) {
    return (modelId: string, modelOptions) => {
      if (stack.includes(provider.id)) return null

      for (const subprovider of provider.subproviders) {
        if (!subprovider.provider) continue

        if (modelId in subprovider.modelMap) {
          const p = createProvider(subprovider.provider, options, [
            ...stack,
            provider.id,
          ])

          return p?.(subprovider.modelMap[modelId], modelOptions)
        }
      }

      if (provider.fallbackProvider) {
        return createProvider(provider.fallbackProvider, options, [
          ...stack,
          provider.id,
        ])?.(modelId, modelOptions)
      }

      return null
    }
  }

  async function getModelList (
    provider: Provider,
    stack = []
  ): Promise<string[]> {
    if (provider.type && provider.type.startsWith("custom:")) {
      const p = providersMap[extractCustomProviderId(provider)]

      return p && (await getCustomModelList(p, stack))
    } else {
      const pt = ProviderTypes.find((pt) => pt.name === provider.type)

      return pt?.getModelList ? await pt.getModelList(provider.settings) : []
    }
  }

  async function getCustomModelList (
    provider: CustomProvider,
    stack = []
  ) {
    if (stack.includes(provider.id)) return []

    const list = provider.subproviders
      .map((sp) => Object.keys(sp.modelMap))
      .flat()
    provider.fallbackProvider &&
      list.push(
        ...(await getModelList(provider.fallbackProvider, [
          ...stack,
          provider.id,
        ]))
      )

    return removeDuplicates(list)
  }
  const providerTypes = computed<ProviderType[]>(() => [
    ...Object.values(providersMap).map((p) => ({
      name: `custom:${p.id}`,
      label: p.name,
      avatar: p.avatar,
      settings: TObject({}),
      initialSettings: {},
      constructor: (options) => createCustomProvider(p, options),
      getModelList: () => getCustomModelList(p),
    })),
    ...ProviderTypes,
  ])
  const modelOptions = computed(() =>
    removeDuplicates([
      ...baseModelOptions,
      ...Object.values(providersMap).flatMap((p) =>
        p.subproviders.flatMap((sp) => Object.keys(sp.modelMap))
      ),
    ])
  )
  const { t } = useI18n()

  async function upsertSubproviders (
    provider: CustomProvider,
    subproviders: Subprovider[]
  ) {
    if (subproviders.length === 0) {
      return []
    }

    const { data: subprovidersData, error: subprovidersError } = await supabase
      .from("subproviders")
      .upsert(
        subproviders.map((sp) => mapSubproviderToDb(provider.id, sp))
      )
      .select("*")

    if (subprovidersError) {
      console.error(subprovidersError)

      return
    }

    return subprovidersData.map(mapDbToSubprovider)
  }

  async function add (props: Partial<CustomProvider> = {}) {
    isSaving.value = true

    // Convert subproviders to the local DB shape if present
    const { subproviders = [], ...providerItem } = props
    const { data, error } = await supabase
      .from("custom_providers")
      .insert({
        name: t("stores.providers.newProvider"),
        avatar: {
          type: "icon",
          icon: "sym_o_dashboard_customize",
          hue: Math.floor(Math.random() * 360),
        },
        ...providerItem,
      })
      .select("*, subproviders(*)")
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error(error)
      throw error
    }

    const providerResult = mapDbToCustomProvider(data)

    providerResult.subproviders = (await upsertSubproviders(
      providerResult,
      subproviders
    ))
    providersMap[data.id] = providerResult

    return providersMap[data.id] as CustomProvider
  }

  async function update (id: string, changes) {
    isSaving.value = true

    const { subproviders = [], ...providerItem } = changes
    let providerResult: CustomProvider = providersMap[id]

    if (Object.keys(providerItem).length > 0) {
      const { data, error } = await supabase
        .from("custom_providers")
        .update(providerItem)
        .eq("id", id)
        .select("*, subproviders(*)")
        .single()

      if (error) {
        console.error(error)

        return
      }

      providerResult = mapDbToCustomProvider(data)
    }

    providerResult.subproviders = (await upsertSubproviders(
      providerResult,
      subproviders
    )) as Subprovider[]
    providersMap[id] = providerResult

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    return providerResult
  }

  async function put (provider: CustomProvider) {
    if (provider.id) {
      return await update(provider.id, provider)
    } else {
      return await add(provider)
    }
  }

  async function delete_ (id: string) {
    const { error } = await supabase
      .from("custom_providers")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)

      return
    }

    delete providersMap[id]
  }

  async function deleteSubprovider (providerId: string, subproviderId: string) {
    const { error } = await supabase
      .from("subproviders")
      .delete()
      .eq("id", subproviderId)
      .eq("custom_provider_id", providerId)

    if (error) {
      console.error(error)

      return
    }

    providersMap[providerId].subproviders = providersMap[
      providerId
    ].subproviders.filter((sp) => sp.id !== subproviderId)
  }

  async function init () {
    Object.assign(providersMap, {})
    await fetchCustomProviders()
  }

  useUserLoginCallback(init)

  return {
    init,
    providers,
    providerTypes,
    modelOptions,
    add,
    update,
    put,
    delete: delete_,
    deleteSubprovider,
    isSaving,
    hasChanges,
  }
})
