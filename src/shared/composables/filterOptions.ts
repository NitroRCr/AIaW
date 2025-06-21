import { MaybeRef, ref, unref } from "vue"

export function useFilterOptions (options: MaybeRef<string[]>) {
  const filteredOptions = ref([])

  function filterFn (val, update, abort) {
    // allow empty value
    // if (!val) {
    //   abort()
    //   return
    // }

    update(() => {
      filteredOptions.value = unref(options).filter((v) =>
        !!v || v.toLowerCase().includes(val.toLowerCase())
      )
    })
  }

  return {
    filteredOptions,
    filterFn,
  }
}
