<template>
  <div
    px-2
    flex
    text-on-sur-var
    items-center
  >
    <dark-switch-btn />
    <q-space w-3 />
    <q-btn
      flat
      dense
      round
      icon="sym_o_settings"
    >
      <q-menu max-height="50vh">
        <q-list>
          <div v-if="isLoggedIn">
            <q-item
              clickable
              to="/assistants"
              active-class="route-active"
              v-close-popup
              min-h-0
            >
              <q-item-section
                avatar
                min-w-0
              >
                <q-icon name="sym_o_robot_2" />
              </q-item-section>
              <q-item-section>
                {{ t("mainLayout.assistants") }}
              </q-item-section>
            </q-item>
            <q-item
              clickable
              to="/plugins"
              active-class="route-active"
              v-close-popup
              min-h-0
            >
              <q-item-section
                avatar
                min-w-0
              >
                <q-icon name="sym_o_extension" />
              </q-item-section>
              <q-item-section>
                {{ t("mainLayout.plugins") }}
              </q-item-section>
            </q-item>
            <q-item
              clickable
              to="/settings"
              active-class="route-active"
              v-close-popup
              min-h-0
            >
              <q-item-section
                avatar
                min-w-0
              >
                <q-icon name="sym_o_settings" />
              </q-item-section>
              <q-item-section>
                {{ t("mainLayout.settings") }}
              </q-item-section>
            </q-item>
            <q-separator spaced />
          </div>
          <menu-item
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
          </q-item>
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
        </q-list>
      </q-menu>
    </q-btn>

    <account-btn
      flat
      no-caps
    />
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import MenuItem from "@/shared/components/menu/MenuItem.vue"
import DarkSwitchBtn from "@/shared/components/ui/DarkSwitchBtn.vue"
import { useUserStore } from "@/shared/store/user"
import { IsWeb } from "@/shared/utils/platformApi"

import AccountBtn from "@/features/auth/components/AccountBtn.vue"

const { isLoggedIn } = storeToRefs(useUserStore())

const { t } = useI18n()
</script>
