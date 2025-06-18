import { Loading } from 'quasar'
import { register } from 'register-service-worker'

import { localData } from '@/shared/utils/localData'

import { i18n } from '@/boot/i18n'
import version from '@/version.json'

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

let newVersion = null

const { t } = i18n.global

register(process.env.SERVICE_WORKER_FILE, {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready (/* registration */) {
    // console.log('Service worker is active.')
  },

  registered (/* registration */) {
    // console.log('Service worker has been registered.')
  },

  cached (/* registration */) {
    // console.log('Content has been cached for offline use.')
  },

  updatefound(registration) {
    // console.log('New content is downloading.')
    fetch('/version.json')
      .then(res => res.json())
      .then(data => {
        newVersion = data
        version.versionCode <= newVersion.forceUpdateFrom && registration.active && Loading.show({
          message: t('update.updating')
        })
      })
  },

  updated(/* registration */) {
    // console.log('New content is available; please refresh.')
    if (!newVersion) return

    if (version.versionCode > newVersion.forceUpdateFrom) return

    const lastReload = localData.lastReloadTimestamp

    if (lastReload && Date.now() - lastReload < 5000) {
      // Prevent infinite reloads
      return
    }

    localData.lastReloadTimestamp = Date.now()
    // if directly reload without timeout, the content won't be updated. I don't know why.
    setTimeout(() => {
      location.reload()
    }, 100)
  },

  offline () {
    // console.log('No internet connection found. App is running in offline mode.')
  },

  error (/* err */) {
    // console.error('Error during service worker registration:', err)
  }
})
