# Technology Context

## Core Stack
| Category        | Technologies              |
|-----------------|---------------------------|
| UI Framework    | Vue 3 + Quasar            |
| State Management| Pinia                     |
| Security        | WebCrypto + AES-GCM       |
| Storage         | IndexedDB + Supabase      |
| Blockchain      | Cosmos SDK                |
| Testing         | Jest + Testing Library    |
| Build           | Vite 4+                   |

## Key Dependencies
```mermaid
graph TD
    A[quasar] --> B((Vue 3))
    A --> C[Pinia]
    D[Supabase] --> E[Postgres]
    F[Cosmos] --> G[Tendermint]
    H[Vite] --> I[Rollup]
```

## Development Practices
- Atomic component design
- Composable-driven architecture
- End-to-end encryption by default
- Automated type generation (scripts/generate-types.js)

## Architectural Debt
```mermaid
graph TD
    AD[Architectural Debt] --> W[Wallet Implementation]
    AD --> D[Dialog System]
    AD --> P[Plugins]
    W --> W1[Duplicated crypto logic]
    W --> W2[No common interface]
    D --> D1[Store-LLM coupling]
    D --> D2[No middleware layer]
    P --> P1[Assistant dependencies]
    P --> P2[Workspace hooks]
```

## Store Hydration Pattern
```mermaid
sequenceDiagram
    Auth->>UserStore: Initialize
    UserStore->>FeatureStores: Hydrate state
    FeatureStores->>Supabase: Subscribe to changes
    Supabase->>FeatureStores: Push realtime updates
    FeatureStores->>UI: Trigger reactive updates
```

**Key Debt Items:**
- **Wallet Implementation Duplication**
  - Cosmos vs Kepler wallets share 73% similar code
  - No common interface for blockchain operations

- **Dialog System Coupling**
  - Store directly manages LLM stream connections
  - Message processing lacks middleware layer

- **Plugin Tight Coupling**
  - Assistant-specific hooks in plugin API
  - Workspace dependencies in plugin initialization

## Composable Services
- Standardized LLM interaction pattern:
  ```typescript
  export const useLlmDialog = (workspaceId, dialogId, assistant) => {
    // 1. Inject stores
    // 2. Configure LLM stream
    // 3. Expose standardized methods
  }
  ```
