<template>
  <q-dialog ref="dialogRef">
    <q-card min-w="320px">
      <q-card-section>
        <div class="text-h6">
          Authorization
        </div>
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
                filled
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
                v-model="password"
                label="Password"
                type="password"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('subscribeDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
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
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar"
import { computed, ref } from "vue"

import { useAuth } from "@/features/auth/composables/useAuth"

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
const { dialogRef, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const { signIn, signUp } = useAuth(loading, onDialogOK)
</script>
