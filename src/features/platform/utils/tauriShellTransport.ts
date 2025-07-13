import {
  serializeMessage,
  deserializeMessage,
} from "@modelcontextprotocol/sdk/shared/stdio.js"
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js"
import { Command, Child } from "@tauri-apps/plugin-shell"

/**
 * Read buffer (based on string implementation) for splitting continuous standard output stream data into lines and parsing it into JSON-RPC messages.
 */
class BrowserReadBuffer {
  private _buffer: string = ""

  /**
   * Append data to the buffer, the data should be a string.
   */
  append (chunk: string): void {
    this._buffer += chunk
  }

  /**
   * Read a complete message (split by "\n"), if there is no complete message, return null.
   */
  readMessage (): JSONRPCMessage | null {
    const index = this._buffer.indexOf("\n")

    if (index === -1) {
      return null
    }

    const line = this._buffer.substring(0, index)
    this._buffer = this._buffer.substring(index + 1)

    return deserializeMessage(line)
  }

  /**
   * Clear the buffer.
   */
  clear (): void {
    this._buffer = ""
  }
}

/**
 * Definition of parameters for starting the Tauri Shell process.
 */
export type TauriShellServerParameters = {
  /**
   * The executable file to start.
   */
  command: string
  /**
   * Command line arguments passed to the executable file.
   */
  args?: string[]
  /**
   * Environment variables used when starting the process.
   */
  env?: Record<string, string>
  /**
   * The working directory of the process.
   */
  cwd?: string
}

/**
 * Transport implementation based on @tauri-apps/plugin-shell —— used to call backend processes in the browser (frontend) environment.
 *
 * This class communicates with the subprocess according to the JSON-RPC protocol. It caches the stdout output of the subprocess through BrowserReadBuffer,
 * and when a complete message ending with a newline is detected, it publishes the message through the onmessage callback.
 */
export class TauriShellClientTransport implements Transport {
  private _child?: Child
  private _readBuffer: BrowserReadBuffer = new BrowserReadBuffer()
  private _serverParams: TauriShellServerParameters
  // Use TextDecoder to convert Uint8Array to string.
  private _decoder: TextDecoder = new TextDecoder("utf-8")

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  constructor (server: TauriShellServerParameters) {
    this._serverParams = server
  }

  /**
   * Start the subprocess, and set event listeners for stdout and stderr to receive data and error information.
   */
  async start (): Promise<void> {
    const command = Command.create(
      this._serverParams.command,
      this._serverParams.args ?? [],
      {
        cwd: this._serverParams.cwd,
        env: this._serverParams.env,
        encoding: "utf-8",
      }
    )

    // When the command execution fails, call the onerror callback.
    command.on("error", (error: string) => {
      this.onerror?.(new Error(error))
    })

    // When the subprocess closes, clean up the child object and call the onclose callback.
    command.on("close", () => {
      this._child = undefined
      this.onclose?.()
    })

    // Process the data output by the subprocess stdout (possibly string or Uint8Array).
    command.stdout.on("data", (chunk: string | Uint8Array) => {
      try {
        let chunkText: string

        if (typeof chunk === "string") {
          chunkText = chunk
        } else {
          // If it is Uint8Array, use TextDecoder to convert it to a string
          chunkText = this._decoder.decode(chunk, { stream: true })
        }

        this._readBuffer.append(chunkText)
        this.processReadBuffer()
      } catch (error) {
        this.onerror?.(error as Error)
      }
    })

    // Process the data output by the subprocess stderr, wrap it as an Error and pass it to the onerror callback.
    command.stderr.on("data", (chunk: string | Uint8Array) => {
      let errorText: string

      if (typeof chunk === "string") {
        errorText = chunk
      } else {
        errorText = this._decoder.decode(chunk, { stream: true })
      }

      this.onerror?.(new Error(errorText))
    })

    // Start the subprocess, subsequent data will be distributed through the stdout/stderr events.
    this._child = await command.spawn()
  }

  /**
   * Send JSON-RPC messages to the subprocess.
   */
  async send (message: JSONRPCMessage): Promise<void> {
    if (!this._child) {
      throw new Error("Not connected")
    }

    const json = serializeMessage(message)
    await this._child.write(json)
  }

  /**
   * Close the transport, terminate the subprocess, and clear the buffer.
   */
  async close (): Promise<void> {
    if (this._child) {
      await this._child.kill()
      this._child = undefined
      this.onclose?.()
    }

    this._readBuffer.clear()
  }

  /**
   * Extract complete JSON-RPC messages from the buffer and pass them out through the onmessage callback.
   */
  private processReadBuffer (): void {
    while (true) {
      try {
        const message = this._readBuffer.readMessage()

        if (message === null) {
          break
        }

        this.onmessage?.(message)
      } catch (error) {
        this.onerror?.(error as Error)
      }
    }
  }
}
