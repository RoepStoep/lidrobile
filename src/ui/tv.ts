import { Toast } from '@capacitor/toast'
import h from 'mithril/hyperscript'
import router from '../router'
import socket from '../socket'
import * as helper from './helper'
import i18n from '../i18n'
import * as sleepUtils from '../utils/sleep'
import { handleXhrError } from '../utils'
import redraw from '../utils/redraw'
import * as xhr from '../xhr'
import settings from '../settings'
import OnlineRound from './shared/round/OnlineRound'
import roundView, { emptyTV, LoadingBoard  } from './shared/round/view/roundView'

interface TVAttrs {
  id: string
  color: Color
  flip: boolean
}

interface State {
  round: OnlineRound,
  emptyTV?: boolean
}

const TV: Mithril.Component<TVAttrs, State> = {
  oninit(vnode) {
    sleepUtils.keepAwake()

    xhr.featured(settings.tv.channel(), vnode.attrs.flip)
    .then(d => {
      d.tv = settings.tv.channel()
      this.round = new OnlineRound(false, vnode.attrs.id, d, vnode.attrs.flip, router.reload)
    })
    .catch(e => {
      this.emptyTV = e.status === 404 && e.body.error === 'No game found'
      if (!this.emptyTV) {
        handleXhrError(e)
      } else {
        Toast.show({ text: i18n('noGameFound'), position: 'center', duration: 'short' })
        redraw()
      }
    })
  },

  oncreate: helper.viewFadeIn,

  onremove() {
    sleepUtils.allowSleepAgain()
    socket.destroy()
    if (this.round) {
      this.round.unload()
    }
  },

  view() {
    if (this.round) {
      return roundView(this.round)
    } else if (this.emptyTV) {
      return emptyTV(settings.tv.channel(), () => router.set('/tv', true))
    } else {
      return h(LoadingBoard)
    }
  }
}

export default TV
