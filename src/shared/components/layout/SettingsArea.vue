<template>
  <div
    px-2
    flex
    text-on-sur-var
  >
    <dark-switch-btn />
    <q-space w-3 />
    <q-btn
      flat
      dense
      to="/plugins"
      icon="sym_o_extension"
      :label="t('mainLayout.plugins')"
    />
    <q-space w-3 />

    <q-btn
      flat
      dense
      round
    >
      <a-avatar
        :avatar="myProfile.avatar"
      />
      <q-menu>
        <q-list>
          <menu-item
            to="/account"
            icon="sym_o_account_circle"
            :label="myProfile.name"
            class="highlight-label"
          />
          <!-- <menu-item
            to="/plugins"
            icon="sym_o_extension"
            :label="t('mainLayout.plugins')"
          /> -->
          <menu-item
            to="/settings"
            min-h-0
            icon="sym_o_settings"
            :label="t('mainLayout.settings')"
          />

          <!-- <menu-item
            icon="sym_o_book_2"
            :label="t('mainLayout.usageGuide')"
            href="https://docs.aiaw.app/usage/"
            target="_blank"
          />
          <q-item
            clickable
            v-close-popup
            min-h-0
            href="https://github.com/NitroRCr/AIaW"
            target="_blank"
          >
            <q-item-section
              avatar
              min-w-0
            >
              <q-avatar
                icon="svguse:/svg/github.svg#icon"
                size="20px"
                font-size="20px"
              />
            </q-item-section>
            <q-item-section>GitHub</q-item-section>
          </q-item> -->

          <q-separator spaced />
          <menu-item
            v-if="IsWeb"
            icon="sym_o_download"
            :label="t('mainLayout.localClient')"
            href="https://github.com/NitroRCr/AIaW/releases/latest"
            target="_blank"
          />
          <menu-item
            v-else
            icon="sym_o_web"
            :label="t('mainLayout.webVersion')"
            href="https://aiaw.app"
            target="_blank"
          />
          <menu-item
            icon="sym_o_logout"
            :label="t('mainLayout.logout')"
            @click="signOut"
            bg-secondary
          />
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import AAvatar from "@/shared/components/avatar/AAvatar.vue"
import DarkSwitchBtn from "@/shared/components/DarkSwitchBtn.vue"
import MenuItem from "@/shared/components/menu/MenuItem.vue"
import { IsWeb } from "@/shared/utils/platformApi"

import { useAuth } from "@/features/auth/composables/useAuth"
import { useProfileStore } from "@/features/profile/store"
const { myProfile } = storeToRefs(useProfileStore())
const router = useRouter()

const { signOut } = useAuth({
  onComplete: () => {
    router.replace("/")
  }
})
const { t } = useI18n()

</script>

<style scoped>
.q-item {
  min-width: 200px;
  margin-bottom: 1px;
}

.highlight-label {
  font-weight: bold;
  /* color: var(--q-primary); */
}
</style>
