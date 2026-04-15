import { until } from '@vueuse/core'
import { useQuasar } from 'quasar'
import MigrationAlertDialog from 'src/components/MigrationAlertDialog.vue'
import { useUserDataStore } from 'src/stores/user-data'

export function useMigrationAlert() {
  const store = useUserDataStore()
  const $q = useQuasar()
  until(() => store.ready).toBeTruthy().then(() => {
    if (store.data.migrationAlertDismissed) return
    $q.dialog({
      component: MigrationAlertDialog
    }).onOk(dismiss => {
      if (dismiss) {
        store.data.migrationAlertDismissed = true
      } else {
        window.open('https://docs.aiaw.app/migration/', '_blank')
      }
    })
  })
}
