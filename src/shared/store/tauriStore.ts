import { Store } from "@tauri-apps/plugin-store"

import { IsTauri } from "@/shared/utils/platformApi"

const store = IsTauri ? await Store.load("settings.json") : null

export async function saveMnemonic (mnemonic: string) {
  await store.set("mnemonic", mnemonic)
  await store.save()
}

export async function getMnemonic (): Promise<string | null> {
  console.log("getMnemonic")
  const mnemonic = await store.get("mnemonic")

  return (mnemonic as string) || null
}

export async function removeMnemonic () {
  await store.delete("mnemonic")
  await store.save()
}
