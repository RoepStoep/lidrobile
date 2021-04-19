import {
  Plugins,
  PushNotification,
  PushNotificationToken,
  PushNotificationActionPerformed
} from '@capacitor/core'
import { fetchText } from './http'
import challengesApi from './lidraughts/challenges'
import router from './router'
import session from './session'
import settings from './settings'
import { handleXhrError } from './utils'
import { isForeground } from './utils/appMode'

const { PushNotifications } = Plugins

export default {
  init() {
    PushNotifications.addListener('registration',
      ({ value }: PushNotificationToken) => {
        console.debug('Push registration success, FCM token: ' + value)

        fetchText(`/mobile/register/firebase/${value}`, {
          method: 'POST'
        })
        .catch(handleXhrError)
      }
    )

    PushNotifications.addListener('registrationError',
      (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error))
      }
    )

    PushNotifications.addListener('pushNotificationReceived',
      (notification: PushNotification) => {
        if (isForeground()) {
          switch (notification.data['lidraughts.type']) {
            case 'corresAlarm':
            case 'gameTakebackOffer':
            case 'gameDrawOffer':
            case 'challengeAccept':
            case 'gameMove':
            case 'gameFinish':
              session.refresh()
              break
          }
        }
      }
    )

    PushNotifications.addListener('pushNotificationActionPerformed',
      (action: PushNotificationActionPerformed) => {
        if (action.actionId === 'tap') {
          switch (action.notification.data['lidraughts.type']) {
            case 'challengeAccept':
              challengesApi.refresh()
              router.goTo(`/game/${action.notification.data['lidraughts.challengeId']}`)
              break
            case 'challengeCreate':
              router.goTo(`/game/${action.notification.data['lidraughts.challengeId']}`)
              break
            case 'corresAlarm':
            case 'gameMove':
            case 'gameFinish':
            case 'gameTakebackOffer':
            case 'gameDrawOffer':
              router.goTo(`/game/${action.notification.data['lidraughts.fullId']}`)
              break
            case 'newMessage':
              router.goTo(`/inbox/${action.notification.data['lidraughts.threadId']}`)
              break
          }
        }
      }
    )
  },

  register(): Promise<void> {
    if (settings.general.notifications.allow()) {
      PushNotifications.requestPermission().then(result => {
        if (result.granted) {
          return PushNotifications.register()
        } else {
          return Promise.reject('Permission to use push denied')
        }
      })
    }

    return Promise.resolve()
  },

  unregister(): Promise<string> {
    return fetchText('/mobile/unregister', { method: 'POST' })
  }
}

