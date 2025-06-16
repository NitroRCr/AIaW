import MainLayout from "@/layouts/MainLayout.vue"
import ErrorNotFound from "@/pages/ErrorNotFound.vue"
import { i18n } from "@/boot/i18n"
import AccountPage from "@/pages/AccountPage.vue"
import AssistantsPage from "@/pages/AssistantsPage.vue"
import ChatsPage from "@/pages/ChatsPage.vue"
import EmptyPage from "@/pages/EmptyPage.vue"
import PluginsPage from "@/pages/PluginsPage.vue"
import SetProvider from "@/pages/SetProvider.vue"
import WorkspacePage from "@/pages/WorkspacePage.vue"
import AssistantsMarket from "@/features/assistants/views/AssistantsMarket.vue"
import AssistantView from "@/features/assistants/views/AssistantView.vue"
import ChatSettings from "@/features/chats/views/ChatSettings.vue"
import ChatView from "@/features/chats/views/ChatView.vue"
import CustomProvider from "@/features/providers/views/CustomProvider.vue"
import DialogView from "@/features/dialogs/views/DialogView.vue"
import PluginAdjust from "@/features/plugins/views/PluginAdjust.vue"
import PluginSettings from "@/features/plugins/views/PluginSettings.vue"
import PluginsMarket from "@/features/plugins/views/PluginsMarket.vue"
import SettingsView from "@/features/settings/views/SettingsView.vue"
import ShortcutKeys from "@/shared/views/ShortcutKeys.vue"
import WorkspaceIndex from "@/features/workspaces/views/WorkspaceIndex.vue"
import WorkspaceSettings from "@/features/workspaces/views/WorkspaceSettings.vue"
import { RouteRecordRaw } from "vue-router"
import CyberlinksPage from "@/pages/CyberlinksPage.vue"
import SettingsPage from "@/pages/SettingsPage.vue"

const { t } = i18n.global

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: MainLayout,
    children: [
      {
        path: "/workspaces/:workspaceId/",
        component: WorkspacePage,
        props: (route) => ({ id: route.params.workspaceId }),
        children: [
          { path: "", component: WorkspaceIndex, props: (route) => ({ id: route.params.workspaceId }) },
          { path: "settings", component: WorkspaceSettings, props: (route) => ({ id: route.params.workspaceId }) },
          {
            path: "dialogs/:dialogId",
            component: DialogView,
            props: (route) => ({ id: route.params.dialogId }),
          },
          {
            path: "chats/:chatId",
            component: ChatView,
            props: (route) => ({ id: route.params.chatId }),
          },

          {
            path: "assistants/:assistantId",
            component: AssistantView,
            props: (route) => ({ id: route.params.assistantId }),
          },
          {
            path: "assistants/:assistantId/plugins/:pluginId",
            component: PluginAdjust,
            props: (route) => ({
              id: route.params.pluginId,
              assistantId: route.params.assistantId,
            }),
          },
        ],
      },
      {
        path: "/settings/",
        component: SettingsPage,
        children: [
          {
            path: "",
            component: SettingsView,
            meta: { title: t("routes.settings") },
          },
          {
            path: "shortcut-keys",
            component: ShortcutKeys,
            meta: { title: t("routes.shortcutKeys") },
          },
          { path: "providers/:id", component: CustomProvider, props: true },
        ],
      },
      {
        path: "/plugins/",
        component: PluginsPage,
        children: [
          {
            path: "",
            component: PluginsMarket,
            meta: { title: t("routes.pluginsMarket") },
          },
          {
            path: ":pluginId",
            component: PluginSettings,
            props: (route) => ({ id: route.params.pluginId }),
          },
        ],
      },
      {
        path: "/assistants/",
        component: AssistantsPage,
        children: [
          {
            path: "",
            component: AssistantsMarket,
            meta: { title: t("routes.assistantsMarket") },
          },
          {
            path: ":assistantId",
            component: AssistantView,
            props: (route) => ({ id: route.params.assistantId }),
          },
          {
            path: ":assistantId/plugins/:pluginId",
            component: PluginAdjust,
            props: (route) => ({
              id: route.params.pluginId,
              assistantId: route.params.assistantId,
            }),
          },
        ],
      },
      {
        path: "/chats/",
        component: ChatsPage,
        children: [
          // { path: '', component: ChatView, meta: { title: t('routes.chatsMarket') } }
          {
            path: ":chatId/settings",
            component: ChatSettings,
            props: (route) => ({ id: route.params.chatId }),
          },
          {
            path: ":chatId",
            component: ChatView,
            props: (route) => ({ id: route.params.chatId }),
          },
        ],
      },
      { path: "/set-provider", component: SetProvider },
      {
        path: "/account",
        component: AccountPage,
        meta: { title: t("routes.account"), requiresAuth: true },
      },
      {
        path: "/cyberlinks",
        component: CyberlinksPage,
        meta: { title: t("routes.cyberlinks") },
      },
      { path: "/", component: EmptyPage },

      // Always leave this as last one,
      // but you can also remove it
      {
        path: "/:catchAll(.*)*",
        component: ErrorNotFound,
        props: {
          drawerToggle: true,
          timeout: 0,
        },
      },
    ],
  },
]

export default routes
