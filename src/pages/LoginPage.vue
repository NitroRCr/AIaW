<template>
  <q-layout>
    <q-page-container>
      <q-page
        class="flex flex-center flex-col gradient-bg"
      >
        <div class="title">
          🟣 Cyber AI
        </div>
        <q-card
          :class="[$q.dark.isActive ? 'bg-grey-10' : 'bg-white']"
          min-w="320px"
        >
          <q-card-section>
            <q-option-group
              v-model="authType"
              :options="authTypeOptions"
              type="radio"
              inline
              dense
              class="q-mt-md q-mb-md"
            />
          </q-card-section>
          <q-card-section p-0>
            <q-list>
              <q-item>
                <q-item-section>
                  <q-input
                    stack-label
                    type="email"
                    v-model="email"
                    label="Email"
                    :rules="[emailRule]"
                  />
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-input
                    stack-label
                    v-model="password"
                    label="Password"
                    type="password"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
          <q-card-actions align="center">
            <q-btn
              color="primary"
              class="full-width"
              :label="buttonCaption"
              :loading
              :disable="!valid"
              @click="
                authType === 'sign-in'
                  ? signIn(email, password)
                  : signUp(email, password)
              "
            />
          </q-card-actions>
          <q-separator class="q-my-md" />
          <q-card-actions align="center">
            <q-btn
              color="secondary"
              outline
              class="full-width"
              label="With Wallet"
              icon="img:svg/keplr.svg"
              :loading="walletLoading"
              @click="handleWalletAuth"
            />
          </q-card-actions>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import { useAuth } from "@/features/auth/composables/useAuth"
import { useWalletAuth } from "@/features/auth/composables/useWalletAuth"

const router = useRouter()
const authType = ref<"sign-in" | "sign-up">("sign-in")
const authTypeOptions = [
  { label: "Sign In", value: "sign-in" },
  { label: "Sign Up", value: "sign-up" },
]
const buttonCaption = computed(() =>
  authType.value === "sign-in" ? "Sign In" : "Sign Up"
)

const loading = ref(false)
const password = ref("")
const email = ref("")
const valid = computed(
  () =>
    email.value.length > 0 &&
    password.value.length > 0 &&
    emailRule(email.value)
)

const emailRule = (val) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return pattern.test(val) || "Please enter a valid email"
}

const { signIn, signUp } = useAuth({
  loading,
  onComplete: () => {
    router.push("/")
  }
})

// Wallet authentication
const { isLoading: walletLoading, authenticateWithWallet } = useWalletAuth({
  onAuthSuccess: () => {
    router.push("/")
  }
})

const handleWalletAuth = async () => {
  try {
    await authenticateWithWallet()
  } catch (error) {
    // Error is already handled in useWalletAuth
    console.error("Wallet authentication error:", error)
  }
}

const $q = useQuasar()
</script>
<style scoped>
.title {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--q-primary);
  font-family: 'Material Symbols Outlined';
  margin-bottom: 1.5rem;
}

.gradient-bg {
  min-height: 100vh;
  /* background: linear-gradient(135deg, #6dd5ed 10%, #2193b0 100%); */
}
</style>
