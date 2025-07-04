# Auth Services

## PIN Modal Service

The `pinModalService` provides a clean way for plugins to request PIN codes from users through Quasar's `$q.dialog` instead of custom components.

### Overview

This service solves the problem of requesting PIN authentication from plugins that run outside of Vue component context. Instead of using "oldschool" `prompt()` or complex component-based solutions, it leverages Quasar's native dialog system.

### Features

- 🎨 **Modern UI**: Uses Quasar's native `$q.dialog` for consistent design
- 🔌 **Plugin-friendly**: Works from any context, not just Vue components
- 🚀 **Promise-based API**: Clean async/await interface
- 🔄 **Auto-initialization**: Automatically initializes when needed
- ✅ **Input validation**: Ensures 4-digit PIN format
- 🎯 **Platform-aware**: Designed for lazy loading on Web platform
- 🔒 **Password Manager Protection**: Prevents password managers from saving PIN codes

### Usage

#### Basic Example

```typescript
import { pinModalService } from "@/services"

// Request PIN from user
const result = await pinModalService.requestPin(
  "Blockchain Authentication",
  "Enter your PIN to access blockchain functions"
)

if (result.success && result.pin) {
  console.log("PIN entered:", result.pin)
} else {
  console.log("User cancelled or invalid PIN")
}
```

#### In Plugins

```typescript
// Helper function for grantee authentication
const requestPinForGranteeIfNeeded = async (authStore: any): Promise<boolean> => {
  if (!IsWeb) return true
  if (authStore.granteeSigner) return true

  if (!authStore.walletInfo?.mnemonic) {
    throw new Error("Grantee wallet not found. Please set up your grantee wallet first.")
  }

  try {
    const result = await pinModalService.requestPin(
      "Blockchain Authentication",
      "Enter your PIN to access blockchain functions"
    )

    if (!result.success || !result.pin) {
      return false
    }

    await authStore.connectGranteeWallet(authStore.walletInfo.mnemonic, result.pin)
    return true
  } catch (error) {
    console.error("Failed to authenticate with PIN:", error)
    return false
  }
}
```

### API Reference

#### `pinModalService.requestPin(title?, message?)`

**Parameters:**
- `title` (string, optional): Dialog title. Default: "PIN Required"
- `message` (string, optional): Dialog message. Default: "Enter your PIN to continue"

**Returns:** `Promise<{ success: boolean; pin?: string }>`
- `success`: `true` if user entered valid 4-digit PIN, `false` if cancelled or invalid
- `pin`: The entered PIN (only present when `success` is `true`)

#### `pinModalService.initialize()`

Manually initialize the service with Quasar instance. Usually called automatically, but can be called explicitly from Vue context.

### Architecture

```
Plugin Context          Vue Context           User Interface
     |                      |                      |
     v                      v                      v
requestPin() ──────► $q.dialog() ──────► Quasar Dialog
     │                      │                      │
     │                      │                      │
     └─────── Promise ──────┴───── onOk/onCancel ───┘
```

### Integration

The service is automatically initialized in `App.vue`:

```typescript
import { pinModalService } from "@/services"

// Initialize pinModalService with Quasar instance
pinModalService.initialize()
```

### Comparison with Alternatives

| Approach | Pros | Cons |
|----------|------|------|
| `prompt()` | Simple, works everywhere | Old-school UI, poor UX |
| Custom Component | Full control, beautiful UI | Complex setup, Vue context required |
| **`pinModalService`** | **Modern UI, simple API, works anywhere** | **Requires Quasar framework** |

### Security Features

The service includes several security measures to protect PIN codes:

- **Password Manager Prevention**: Uses multiple strategies to prevent password managers from treating PIN as a password:
  - `autocomplete="one-time-code"` - Indicates this is a one-time PIN, not a password to save
  - `type="text"` - Avoids password field detection that triggers breach checking
  - `data-lpignore="true"` - LastPass prevention
  - `data-1p-ignore="true"` - 1Password prevention
  - `data-bitwarden-watching="false"` - Bitwarden prevention
  - `data-form-type="pin"` - Indicates this is a PIN input
  - `data-password-manager-ignore="true"` - Universal prevention attribute
  - `spellcheck="false"` - Disables spell checking

- **Visual Security**: Masks input digits while maintaining text input type:
  - `-webkit-text-security: disc` - WebKit browsers (Chrome, Safari) show dots instead of numbers
  - `text-security: disc` - Standard CSS property for text masking
  - `letter-spacing: 0.2em` - Improved visual spacing for masked characters

- **Input Validation**: Ensures exactly 4-digit PIN format with regex validation
- **Numeric Only**: Pattern and inputmode restrict to numbers only
- **Memory Safety**: PIN is not stored in component state
- **User Control**: Easy cancellation without saving partial input

### Use Cases

- **Blockchain Operations**: Request PIN before sensitive transactions
- **Authentication**: Lazy-load user credentials when needed
- **Plugin Security**: Secure plugin operations without complex setup
- **Web Platform**: Provide better UX than native `prompt()` dialogs
