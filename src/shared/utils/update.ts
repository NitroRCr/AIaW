import { LiveUpdate } from "@capawesome/capacitor-live-update"
import { Loading, Notify, QNotifyAction } from "quasar"

import { localData } from "@/shared/utils/localData"

import { fetch, IsCapacitor, IsWeb } from "./platformApi"

import { i18n } from "@/boot/i18n"
import version from "@/version.json"

const BaseURL = "https://github.com/NitroRCr/AIaW/releases/latest/download"
type Version = typeof version

async function checkUpdate () {
  if (IsWeb) return

  const res = await fetch(`${BaseURL}/version.json`)

  if (!res.ok) return

  const latest: Version = await res.json()

  if (latest.versionCode <= version.versionCode) return

  const force = version.versionCode <= latest.forceUpdateFrom

  if (IsCapacitor) {
    await capLiveUpdate(latest, force)
  }
}

function wrapNotify (message: string, actions: QNotifyAction[]) {
  return Notify.create({
    message,
    actions: actions.map((a) => ({ ...a, textColor: "inv-pri" })),
    color: "inv-sur",
    textColor: "inv-on-sur",
  })
}

function isUpdateIgnored (version: string) {
  return localData.ignoredUpdate === version
}

function ignoreUpdate (version: string) {
  localData.ignoredUpdate = version
}

const { t } = i18n.global

async function capLiveUpdate (latest: Version, force: boolean) {
  if (latest.capChannel === version.capChannel) {
    force &&
      Loading.show({
        message: t("update.updating"),
      })
    await LiveUpdate.downloadBundle({
      url: `${BaseURL}/spa_bundle_${latest.version}.zip`,
      bundleId: latest.version,
    })
    await LiveUpdate.setNextBundle({
      bundleId: latest.version,
    })
    force && (await LiveUpdate.reload())
  } else if (force && !isUpdateIgnored(latest.version)) {
    wrapNotify(t("update.updateFound", { version: latest.version }), [
      {
        label: t("update.ignore"),
        handler: () => {
          ignoreUpdate(latest.version)
        },
      },
      {
        label: t("update.download"),
        handler: () => {
          window.open(`${BaseURL}/AIaW_${latest.version}.apk`)
        },
      },
    ])
  }
}

async function ready () {
  IsCapacitor && (await LiveUpdate.ready())
}

export { checkUpdate, ready }
