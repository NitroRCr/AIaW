import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { platform } from "@tauri-apps/plugin-os"
import { Notify } from "quasar"

import { TransportConf } from "@/shared/types"
import { JSONEqual } from "@/shared/utils/functions"
import { fetch } from "@/shared/utils/platformApi"

import { TauriShellClientTransport } from "@/features/platform/utils/tauriShellTransport"

import { SSEClientTransport } from "./mcpSseTransport"

import { i18n } from "@/boot/i18n"
import { version } from "@/version.json"

const KeepAliveTimeout = 300e3

const pool = new Map<
  string,
  {
    conf: TransportConf
    client: Client
    timeoutId: number
  }
>()

const { t } = i18n.global

export async function getClient (key: string, transportConf: TransportConf) {
  if (pool.has(key)) {
    const item = pool.get(key)
    const { conf, client, timeoutId } = item

    if (JSONEqual(conf, transportConf)) {
      window.clearTimeout(timeoutId)
      item.timeoutId = window.setTimeout(() => {
        client.close()
      }, KeepAliveTimeout)

      return client
    } else {
      await client.close()
    }
  }

  const client = new Client(
    {
      name: "aiaw",
      version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  )
  Notify.create({
    message: t("mcpClient.connectingMcpServer"),
  })

  if (transportConf.type === "stdio") {
    const pf = platform()
    await client.connect(
      new TauriShellClientTransport({
        command: pf === "windows" ? "cmd" : "sh",
        args: [pf === "windows" ? "/c" : "-c", transportConf.command],
        env: transportConf.env,
        cwd: transportConf.cwd,
      })
    )
  } else {
    await client.connect(new SSEClientTransport(new URL(transportConf.url),
      { fetch })).catch(err => {
      client.close()
      throw err
    })
  }

  const timeoutId = window.setTimeout(() => {
    client.close()
  }, KeepAliveTimeout)
  pool.set(key, { conf: transportConf, client, timeoutId })
  client.onclose = () => {
    window.clearTimeout(pool.get(key).timeoutId)
    pool.delete(key)
  }
  client.onerror = (err) => {
    console.error(err)
  }

  return client
}
