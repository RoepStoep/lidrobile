import {
  PushNotifications,
  PushNotificationSchema,
  Token,
  ActionPerformed
} from '@capacitor/push-notifications'
import { fetchText } from './http'
import challengesApi from './lidraughts/challenges'
import Badge from './badge'
import router from './router'
import session from './session'
import settings from './settings'
import { handleXhrError } from './utils'
import { isForeground } from './utils/appMode'

export default {
  init() {
    PushNotifications.addListener('registration',
      ({ value }: Token) => {
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
      (notification: PushNotificationSchema) => {
        if (isForeground()) {
          switch (notification.data['lidraughts.type']) {
            case 'corresAlarm':
            case 'gameTakebackOffer':
            case 'gameDrawOffer':
              session.refresh()
              break
            case 'challengeAccept':
            case 'gameMove':
            case 'gameFinish':
              session.refresh()
              .then(() => {
                if (Capacitor.platform === 'ios') {
                  Badge.setNumber({ badge: session.myTurnGames().length })
                }
              })
              break
          }
        }
      }
    )

    PushNotifications.addListener('pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        if (action.actionId === 'tap') {
          switch (action.notification.data['lidraughts.type']) {
            case 'challengeAccept':
              challengesApi.refresh()
              router.set(`/game/${action.notification.data['lidraughts.challengeId']}`)
              break
            case 'challengeCreate':
              router.set(`/game/${action.notification.data['lidraughts.challengeId']}`)
              break
            case 'corresAlarm':
            case 'gameMove':
            case 'gameFinish':
            case 'gameTakebackOffer':
            case 'gameDrawOffer':
              router.set(`/game/${action.notification.data['lidraughts.fullId']}`)
              break
            case 'newMessage':
              router.set(`/inbox/${action.notification.data['lidraughts.threadId']}`)
              break
          }
        }
      }
    )
  },

  async register(): Promise<void> {
    if (settings.general.notifications.enable()) {
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
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

