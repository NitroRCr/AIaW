import { useQuasar } from "quasar"

/**
 * Service for requesting PIN code via $q.dialog
 * Used by plugins to obtain PIN from the user
 */
class PinModalService {
  private $q: ReturnType<typeof useQuasar> | null = null

  /**
   * Initialization of the service with Quasar instance
   * Must be called from Vue context
   */
  initialize() {
    if (!this.$q) {
      this.$q = useQuasar()
    }
  }

  showError(message: string) {
    // Automatically initialize if not yet initialized
    if (!this.$q) {
      this.initialize()
    }

    this.$q.notify({
      message,
      color: "negative",
    })
  }

  /**
   * Request PIN from the user via $q.dialog
   * @param title Dialog title
   * @param message Message to the user
   * @returns Promise with the result
   */
  async requestPin(
    title: string = "PIN Required",
    message: string = "Enter your PIN to continue"
  ): Promise<{ success: boolean; pin?: string }> {
    // Automatically initialize if not yet initialized
    if (!this.$q) {
      this.initialize()
    }

    return new Promise((resolve, reject) => {
      this.$q.dialog({
        title,
        message,
        prompt: {
          model: "",
          type: "text",
          inputmode: "numeric",
          maxlength: 4,
          // Use one-time-code to indicate this is not a password to save
          ...({
            autocomplete: "one-time-code",
            spellcheck: false,
            "data-lpignore": "true",
            "data-1p-ignore": "true",
            "data-form-type": "pin",
            "data-bitwarden-watching": "false",
            "data-password-manager-ignore": "true",
            "data-no-password-manager": "true",
            role: "textbox",
            "aria-label": "4-digit PIN code",
            pattern: "[0-9]{4}",
            placeholder: "Enter 4-digit PIN",
            style: "-webkit-text-security: disc; text-security: disc; font-family: text-security-disc, monospace; letter-spacing: 0.2em;"
          } as any)
        },
        cancel: true,
        persistent: true,
      }).onOk((pin: string) => {
        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          reject(new Error("Please enter a valid 4-digit PIN"))

          return
        }

        resolve({ success: true, pin })
      }).onCancel(() => {
        resolve({ success: false })
      })
    })
  }
}

// Create and export service instance
const pinModalService = new PinModalService()

export { pinModalService, PinModalService }
