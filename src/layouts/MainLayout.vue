<template>
  <q-layout view="lHr LpR lFf">
    <q-drawer
      v-model="uiStore.mainDrawerOpen"
      show-if-above
      :width="locale.startsWith('zh') ? 250 : 270"
      :breakpoint="1200"
      bg-sur-c
      flex
      flex-col
    >
      <div
        text-xl
        px-4
        pt-4
      >
        <svg
          fill-on-sur-var
          h="24px"
          viewBox="0 0 636 86"
          cursor-pointer
          @click="notifyVersion"
        >
          <use
            xlink:href="/banner.svg#default"
          />
        </svg>
      </div>
      <q-separator spaced />
      <div
        px-4
        py-2
        text-sec
      >
        {{ t('mainLayout.workspace', 4) }}
      </div>
      <workspace-nav mt-2 />
      <q-list
        mt-a
        mb-2
      >
        <q-item
          clickable
          to="/assistants"
          active-class="route-active"
          item-rd
        >
          <q-item-section avatar>
            <q-icon name="sym_o_robot_2" />
          </q-item-section>
          <q-item-section>
            {{ t('mainLayout.assistants') }}
          </q-item-section>
        </q-item>
        <q-item
          clickable
          to="/plugins"
          active-class="route-active"
          item-rd
        >
          <q-item-section avatar>
            <q-icon name="sym_o_extension" />
          </q-item-section>
          <q-item-section>
            {{ t('mainLayout.plugins') }}
          </q-item-section>
        </q-item>
        <q-item
          clickable
          to="/settings"
          active-class="route-active"
          item-rd
        >
          <q-item-section avatar>
            <q-icon name="sym_o_settings" />
          </q-item-section>
          <q-item-section>
            {{ t('mainLayout.settings') }}
          </q-item-section>
        </q-item>
        <q-separator spaced />
        <div
          px-2
          flex
          text-on-sur-var
          items-center
        >
          <account-btn
            v-if="DexieDBURL"
            flat
            no-caps
          />
          <q-btn
            v-else
            flat
            dense
            round
            icon="sym_o_book_2"
            :title="t('mainLayout.usageGuide')"
            href="https://docs.aiaw.app/usage/"
            target="_blank"
          />
          <q-space />
          <dark-switch-btn />
          <q-btn
            flat
            dense
            round
            icon="sym_o_more_vert"
          >
            <q-menu>
              <q-list>
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
        </div>
      </q-list>
    </q-drawer>
    <router-view />
  </q-layout>
</template>

<script setup>
import WorkspaceNav from 'src/components/WorkspaceNav.vue'
import { useUiStateStore } from 'src/stores/ui-state'
import { useRoute } from 'vue-router'
import AccountBtn from 'src/components/AccountBtn.vue'
import DarkSwitchBtn from 'src/components/DarkSwitchBtn.vue'
import MenuItem from 'src/components/MenuItem.vue'
import { DexieDBURL } from 'src/utils/config'
import { useQuasar } from 'quasar'
import version from 'src/version.json'
import { useI18n } from 'vue-i18n'
import { useOpenLastWorkspace } from 'src/composables/open-last-workspace'
import { IsWeb } from 'src/utils/platform-api'

defineOptions({
  name: 'MainLayout'
})

const uiStore = useUiStateStore()
const route = useRoute()

const { openLastWorkspace } = useOpenLastWorkspace()
route.path === '/' && openLastWorkspace()

const { t, locale } = useI18n()
const $q = useQuasar()
function notifyVersion() {
  $q.notify({
    message: `${t('mainLayout.currentVersion')}: ${version.version}`,
    color: 'inv-sur',
    textColor: 'inv-on-sur',
    actions: [{
      label: t('mainLayout.changeLog'),
      handler: () => {
        window.open('https://github.com/NitroRCr/AIaW/releases', '_blank')
      },
      textColor: 'inv-pri'
    }]
  })
}
</script>
