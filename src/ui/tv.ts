import { Plugins } from '@capacitor/core'
import * as Mithril from 'mithril'
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
  channel?: string
}

interface State {
  round: OnlineRound,
  emptyTV?: boolean
}

const TV: Mithril.Component<TVAttrs, State> = {
  oninit(vnode) {
    sleepUtils.keepAwake()

    const onChannelChange = () => router.set('/tv', true)
    const onFeatured = () => router.set('/tv', true)

    if (vnode.attrs.channel) {
      settings.tv.channel(vnode.attrs.channel)
    }

    xhr.featured(settings.tv.channel(), vnode.attrs.flip)
    .then(d => {
      d.tv = settings.tv.channel()
      this.round = new OnlineRound(false, vnode.attrs.id, d, vnode.attrs.flip, onFeatured, onChannelChange)
    })
    .catch(e => {
      this.emptyTV = e.status === 404 && e.body.error === 'No game found'
      if (!this.emptyTV) {
        handleXhrError(e)
      } else {
        Plugins.Toast.show({ text: i18n('noGameFound'), duration: 'short' })
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
