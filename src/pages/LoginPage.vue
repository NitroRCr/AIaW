<template>
  <q-layout>
    <q-page-container>
      <q-page
        class="flex flex-center flex-col gradient-bg"
      >
        <div class="title">
          Cyber AI
        </div>
        <q-card
          :class="[$q.dark.isActive ? 'bg-grey-10' : 'bg-white']"
          min-w="320px"
        >
          <q-card-section>
            <div class="text-h6">
              Authorization
            </div>
          </q-card-section>
          <q-card-section>
            <div v-if="step === 1">
              <q-input
                filled
                type="email"
                v-model="email"
                label="Email"
                :rules="[emailRule]"
                :disable="loading"
                @keyup.enter="sendCode"
              />
              <q-btn
                color="primary"
                class="full-width q-mt-md"
                :label="'Send Code'"
                :loading="loading"
                :disable="!emailRule(email)"
                @click="sendCode"
              />
            </div>
            <div v-else>
              <q-input
                filled
                type="text"
                v-model="code"
                label="Enter code from email"
                maxlength="6"
                :disable="loading"
                @keyup.enter="loginWithCode"
              />
              <q-btn
                color="primary"
                class="full-width q-mt-md"
                :label="'Login'"
                :loading="loading"
                :disable="code.length !== 6"
                @click="loginWithCode"
              />
              <q-btn
                flat
                class="full-width q-mt-sm"
                :label="'Back'"
                :disable="loading"
                @click="step = 1"
              />
            </div>
            <div
              v-if="error"
              class="text-negative q-mt-md"
            >
              {{ error }}
            </div>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { usePrivyAuth } from '@/features/auth/composables'

import { privyAuthService } from '@/services/auth/privyAuthService'

const $q = useQuasar()
const router = useRouter()

const step = ref(1)
const email = ref('')
const code = ref('')
const loading = ref(false)
const error = ref('')

const emailRule = (val: string) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return pattern.test(val) || 'Please enter a valid email'
}

async function sendCode() {
  error.value = ''
  loading.value = true
  try {
    await privyAuthService.auth.email.sendCode(email.value)
    $q.notify({ message: 'Code sent to your email', color: 'positive' })
    step.value = 2
  } catch (e: any) {
    error.value = e?.message || 'Failed to send code'
  } finally {
    loading.value = false
  }
}

async function loginWithCode() {
  error.value = ''
  loading.value = true
  try {
    await usePrivyAuth().loginWithEmail(email.value, code.value)

    $q.notify({ message: 'Login successful', color: 'positive' })
    router.push('/')
  } catch (e: any) {
    error.value = e?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #000;
  font-family: 'Material Symbols Outlined';
  margin-bottom: 1.5rem;
}

.gradient-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #6dd5ed 10%, #2193b0 100%);
}
</style>
