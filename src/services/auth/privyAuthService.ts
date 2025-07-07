import Privy, { LocalStorage } from '@privy-io/js-sdk-core'

export const privyAuthService = new Privy({
  appId: import.meta.env.VITE_PRIVY_APP_ID,
  storage: new LocalStorage(),
})
